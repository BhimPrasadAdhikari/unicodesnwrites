# Lightsail autoscaler

`handler.py` is deployed as Lambda `unicodesnwrites-autoscaler` (ap-south-1, Python 3.13,
128 MB) with role `unicodesnwrites-autoscaler` (Lightsail get/update/tag + its own logs).
EventBridge rule `unicodesnwrites-autoscaler-5min` invokes it every 5 minutes. Logs:
CloudWatch `/aws/lambda/unicodesnwrites-autoscaler`, kept 14 days.

Update the code:

```powershell
python -c "import zipfile;z=zipfile.ZipFile('autoscaler.zip','w');z.write('handler.py');z.close()"
aws lambda update-function-code --region ap-south-1 --function-name unicodesnwrites-autoscaler --zip-file fileb://autoscaler.zip
```
