# Hosting on AWS (Lightsail containers)

Production runs as one Docker container on an Amazon Lightsail container service:

- **Service:** `unicodesnwrites` in `ap-south-1`, power `small` (0.5 vCPU, 1 GB), scale 1.
- **Image:** built from `Dockerfile` (Next.js `output: 'standalone'`, switched on by `NEXT_OUTPUT=standalone`).
- **Deploys:** `.github/workflows/deploy-aws.yml` runs on every push to `main`. It builds the image, pushes it to the service and creates a new deployment that keeps the current environment variables. If the new container fails `/api/health`, Lightsail keeps the previous one serving.
- **Auth:** GitHub OIDC assumes `arn:aws:iam::240939827156:role/unicodesnwrites-github-deploy` (main branch of this repo only, Lightsail deploy actions only). Set the repository variable `AWS_DEPLOY_ROLE_ARN` to that ARN.
- **Secrets:** only in the Lightsail deployment environment (console → Container services → unicodesnwrites → Deployments → Modify). They never pass through GitHub. To change one, edit it in the console and save; that makes a new deployment.
- **Domain:** `unicodesnwrites.tech` and `www.unicodesnwrites.tech` are attached to the service with a Lightsail certificate. DNS points them at the service's public hostname.
- **Crons:** the newsletter scheduler is called by `.github/workflows/newsletter-scheduler.yml`.
- **Uploads:** `lib/storage/files.ts` writes to S3 bucket `unicodesnwrites-media` (ap-south-1) when `S3_BUCKET` is set. Images and previews go under `public/` (world-readable, cached for a year); paid product files go under `private/`, are saved as `s3://…` references and are only served by `/api/download` through 5-minute signed links. The app uses IAM user `unicodesnwrites-app` (Put/Get/Delete on that bucket only) via `AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY` / `S3_BUCKET=unicodesnwrites-media` / `S3_REGION=ap-south-1` in the Lightsail environment. Without `S3_BUCKET` it falls back to Vercel Blob (`BLOB_READ_WRITE_TOKEN`), then to `public/uploads` in local dev. Existing Blob URLs keep working as long as the Blob store serves them.
- **Client IP:** off Vercel, `lib/utils/client-ip.ts` trusts only the last `X-Forwarded-For` entry (the one the Lightsail load balancer appends). `x-vercel-*` and `x-real-ip` are ignored there because visitors can send them. If another proxy is ever put in front (e.g. CloudFront), set `TRUSTED_PROXY_HOPS=2`.
- **Analytics:** Vercel Analytics renders only on Vercel; the site's own analytics (`/api/analytics/track`) works everywhere.
