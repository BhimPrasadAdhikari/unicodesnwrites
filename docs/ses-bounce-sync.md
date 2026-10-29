# Amazon SES bounce and complaint sync

Newsletters go out through Amazon SES SMTP in **ap-south-1**. SES learns about bounces and
spam complaints after the SMTP conversation has ended, so without this setup a subscriber
whose mail bounced stays `confirmed` and every campaign keeps trying them (SES then drops the
message because the address is on the account suppression list, but the site never knows).

With it, SES publishes Bounce and Complaint notifications to an SNS topic, SNS posts them to
`POST /api/webhooks/ses`, and the site:

- **Permanent bounce**: unsubscribes each bounced recipient and tags them `bounced`.
- **Complaint**: unsubscribes each complaining recipient and tags them `complained`.
- **Transient/undetermined bounce, delivery, anything else**: does nothing (counts are logged).

Every message's SNS signature is verified against the AWS signing certificate, and only the
topic in `SES_SNS_TOPIC_ARN` is accepted; until that variable is set the endpoint returns 503
and does nothing. Each SNS `MessageId` is recorded in `WebhookEvent` (provider `ses`), so a
redelivery is skipped. Logs carry counts, never addresses. Past `NewsletterSend` records are
left as they are.

The app needs no AWS credentials for any of this. The commands below are run by the account
owner from a machine with the AWS CLI signed in to the account that owns the SES identity.

## 1. Create the SNS topic

Use a **Standard** topic (SES cannot publish to FIFO topics) in the same region as SES.

```sh
aws sns create-topic --name unicodesnwrites-ses-feedback --region ap-south-1
```

Note the `TopicArn` it prints, for example
`arn:aws:sns:ap-south-1:<ACCOUNT_ID>:unicodesnwrites-ses-feedback`.

Console: SNS → Topics → Create topic → Standard → name `unicodesnwrites-ses-feedback`.

Allow SES to publish to it. In the console: the topic → Edit → Access policy, and add this
statement to the `Statement` array (replace `<ACCOUNT_ID>`):

```json
{
  "Sid": "AllowSESPublish",
  "Effect": "Allow",
  "Principal": { "Service": "ses.amazonaws.com" },
  "Action": "SNS:Publish",
  "Resource": "arn:aws:sns:ap-south-1:<ACCOUNT_ID>:unicodesnwrites-ses-feedback",
  "Condition": {
    "StringEquals": { "AWS:SourceAccount": "<ACCOUNT_ID>" },
    "StringLike": { "AWS:SourceArn": "arn:aws:ses:ap-south-1:<ACCOUNT_ID>:identity/*" }
  }
}
```

## 2. Set `SES_SNS_TOPIC_ARN` in Vercel and redeploy

Do this **before** subscribing the endpoint: SNS sends its confirmation request the moment
the subscription is created, and the endpoint ignores it (503) until it knows the topic.

1. Vercel → the project → Settings → Environment Variables.
2. Add `SES_SNS_TOPIC_ARN` = the topic ARN from step 1, scope **Production**.
3. Deployments → the latest production deployment → Redeploy (env changes only apply to new
   deployments).

## 3. Subscribe the webhook to the topic

```sh
aws sns subscribe \
  --topic-arn arn:aws:sns:ap-south-1:<ACCOUNT_ID>:unicodesnwrites-ses-feedback \
  --protocol https \
  --notification-endpoint https://www.unicodesnwrites.tech/api/webhooks/ses \
  --region ap-south-1
```

Console: the topic → Create subscription → Protocol **HTTPS** → Endpoint
`https://www.unicodesnwrites.tech/api/webhooks/ses`.

Leave **raw message delivery off**: the endpoint needs the SNS envelope to check the
signature. Use the `www.` host exactly; SNS does not follow redirects.

The site confirms the subscription itself (it fetches the signed `SubscribeURL`, which must be
on `sns.<region>.amazonaws.com`). Vercel's function logs show
`SES webhook: confirmed SNS subscription to arn:aws:sns:...`.

## 4. Point the SES identity's notifications at the topic

```sh
aws ses set-identity-notification-topic --identity unicodesnwrites.tech \
  --notification-type Bounce \
  --sns-topic arn:aws:sns:ap-south-1:<ACCOUNT_ID>:unicodesnwrites-ses-feedback \
  --region ap-south-1

aws ses set-identity-notification-topic --identity unicodesnwrites.tech \
  --notification-type Complaint \
  --sns-topic arn:aws:sns:ap-south-1:<ACCOUNT_ID>:unicodesnwrites-ses-feedback \
  --region ap-south-1
```

Optional, to include the original email headers (subject, message id) in notifications; the
webhook does not need them:

```sh
aws ses set-identity-headers-in-notifications-enabled --identity unicodesnwrites.tech \
  --notification-type Bounce --enabled --region ap-south-1
aws ses set-identity-headers-in-notifications-enabled --identity unicodesnwrites.tech \
  --notification-type Complaint --enabled --region ap-south-1
```

Console: SES → Configuration → Identities → `unicodesnwrites.tech` → Notifications →
Feedback notifications → Edit → Bounce feedback and Complaint feedback = the topic; tick
"Include original email headers" if wanted. Leave Delivery feedback empty (the webhook ignores
deliveries, and they would cost an SNS request per email).

Email feedback forwarding can stay on; it is independent of the topic.

## 5. Verify

```sh
aws sns list-subscriptions-by-topic \
  --topic-arn arn:aws:sns:ap-south-1:<ACCOUNT_ID>:unicodesnwrites-ses-feedback \
  --region ap-south-1
```

The HTTPS subscription's `SubscriptionArn` must be a full ARN, not `PendingConfirmation`
(console: the topic → Subscriptions → Status **Confirmed**). If it is still pending, check
that the redeploy in step 2 finished, then select the subscription → Request confirmation.

`aws ses get-identity-notification-attributes --identities unicodesnwrites.tech --region ap-south-1`
should list the topic as `BounceTopic` and `ComplaintTopic`.

End to end: send a test email from the SES console (Identities → `unicodesnwrites.tech` →
Send test email) to the mailbox simulator scenario **Bounce**
(`bounce@simulator.amazonses.com`). Within a minute the Vercel logs show
`SES webhook: Bounce for 1 recipient(s); 0 subscriber(s) matched, 0 updated` (the simulator
address is not a subscriber).

## Reconcile the existing suppression list

Addresses that bounced before this was set up are already on the SES account suppression
list but still `confirmed` on the site. Export the list and upload it in Dashboard →
Subscribers → **Mark addresses as bounced**, which unsubscribes and tags `bounced` every
subscriber in the file (up to 5,000 addresses per upload) and reports matched, updated and
not-found counts. It is safe to upload the same file twice.

PowerShell:

```powershell
aws sesv2 list-suppressed-destinations --region ap-south-1 --output json |
  ConvertFrom-Json |
  Select-Object -ExpandProperty SuppressedDestinationSummaries |
  Select-Object @{ Name = 'email'; Expression = { $_.EmailAddress } }, Reason, LastUpdateTime |
  Export-Csv ses-suppressed.csv -NoTypeInformation -Encoding utf8
```

bash:

```sh
aws sesv2 list-suppressed-destinations --region ap-south-1 \
  --query 'SuppressedDestinationSummaries[].[EmailAddress,Reason]' --output text |
  awk 'BEGIN { print "email,reason" } { print $1 "," $2 }' > ses-suppressed.csv
```

The CLI follows pagination itself, so the file holds every suppressed address (both `BOUNCE`
and `COMPLAINT` reasons; add `--reasons BOUNCE` to export bounces only). Complaint entries are
tagged `bounced` too by the upload; either way they are unsubscribed. The CLI user needs
`ses:ListSuppressedDestinations`.

The file contains subscriber addresses: upload it, then delete it. Do not commit it.
