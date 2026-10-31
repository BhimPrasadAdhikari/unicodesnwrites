"""Task registry. Add your own task module here to train on it."""
from . import countdown, logic, units

TASKS = {"countdown": countdown, "units": units, "logic": logic}


def get_task(name):
    if name not in TASKS:
        raise SystemExit(f"Unknown task {name!r}. Choose from: {', '.join(TASKS)}")
    return TASKS[name]
