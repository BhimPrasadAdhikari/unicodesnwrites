"""Scales the unicodesnwrites Lightsail container service between MIN and MAX nodes.

Lightsail container services have no autoscaling, so EventBridge runs this every
5 minutes. It reads the service's CPU and memory (average over 5-minute periods):

  scale OUT by one node when CPU or memory averaged over the last 10 minutes is
            above SCALE_OUT_PERCENT;
  scale IN  by one node when both stayed below SCALE_IN_PERCENT for the last
            30 minutes (measured on the larger node count, so it is a safe
            margin: 2 nodes at 30% is ~60% on one).

It does nothing while a deployment or another resize is in progress, and waits
COOLDOWN_MINUTES after any resize. DRY_RUN=1 only logs the decision.
"""
import datetime as dt
import json
import os

import boto3

SERVICE = os.environ.get("SERVICE_NAME", "unicodesnwrites")
MIN_NODES = int(os.environ.get("MIN_NODES", "1"))
MAX_NODES = int(os.environ.get("MAX_NODES", "2"))
OUT_PCT = float(os.environ.get("SCALE_OUT_PERCENT", "70"))
IN_PCT = float(os.environ.get("SCALE_IN_PERCENT", "30"))
COOLDOWN = dt.timedelta(minutes=int(os.environ.get("COOLDOWN_MINUTES", "15")))
DRY_RUN = os.environ.get("DRY_RUN") == "1"

lightsail = boto3.client("lightsail")


def averages(metric, minutes):
    now = dt.datetime.now(dt.timezone.utc)
    data = lightsail.get_container_service_metric_data(
        serviceName=SERVICE,
        metricName=metric,
        startTime=now - dt.timedelta(minutes=minutes),
        endTime=now,
        period=300,
        statistics=["Average"],
    )["metricData"]
    return [point["average"] for point in data if "average" in point]


def handler(event, context):
    service = lightsail.get_container_services(serviceName=SERVICE)["containerServices"][0]
    scale, state = service["scale"], service["state"]
    if state != "RUNNING":
        return log(scale=scale, state=state, action="wait", reason="service is not RUNNING")

    last_change = max(
        [d["createdAt"] for d in [service.get("currentDeployment") or {}] if d.get("createdAt")]
        + [service.get("createdAt")],
    )
    tags = {t["key"]: t["value"] for t in service.get("tags", [])}
    if "autoscaler:lastResize" in tags:
        last_change = max(last_change, dt.datetime.fromisoformat(tags["autoscaler:lastResize"]))
    if dt.datetime.now(dt.timezone.utc) - last_change < COOLDOWN:
        return log(scale=scale, action="wait", reason="cooldown")

    cpu10, mem10 = averages("CPUUtilization", 10), averages("MemoryUtilization", 10)
    cpu30, mem30 = averages("CPUUtilization", 30), averages("MemoryUtilization", 30)
    hot = any(v > OUT_PCT for v in cpu10 + mem10) and bool(cpu10 or mem10)
    cool = len(cpu30) >= 5 and all(v < IN_PCT for v in cpu30 + mem30)

    target = scale
    if hot and scale < MAX_NODES:
        target = scale + 1
    elif cool and scale > MIN_NODES:
        target = scale - 1
    if target == scale:
        return log(scale=scale, action="none", cpu10=cpu10, mem10=mem10, cpu30=cpu30, mem30=mem30)

    if not DRY_RUN:
        lightsail.update_container_service(serviceName=SERVICE, scale=target)
        lightsail.tag_resource(
            resourceName=SERVICE,
            tags=[{"key": "autoscaler:lastResize", "value": dt.datetime.now(dt.timezone.utc).isoformat()}],
        )
    return log(scale=scale, target=target, action="resize", dry_run=DRY_RUN, cpu10=cpu10, mem10=mem10)


def log(**fields):
    print(json.dumps(fields, default=str))
    return fields
