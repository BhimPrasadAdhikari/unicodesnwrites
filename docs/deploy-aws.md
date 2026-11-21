# Hosting on AWS (Lightsail containers)

Production runs as one Docker container on an Amazon Lightsail container service:

- **Service:** `unicodesnwrites` in `ap-south-1`, power `small` (0.5 vCPU, 1 GB), scale 1.
- **Image:** built from `Dockerfile` (Next.js `output: 'standalone'`, switched on by `NEXT_OUTPUT=standalone`).
- **Deploys:** `.github/workflows/deploy-aws.yml` runs on every push to `main`. It builds the image, pushes it to the service and creates a new deployment that keeps the current environment variables. If the new container fails `/api/health`, Lightsail keeps the previous one serving.
- **Auth:** GitHub OIDC assumes `arn:aws:iam::240939827156:role/unicodesnwrites-github-deploy` (main branch of this repo only, Lightsail deploy actions only). Set the repository variable `AWS_DEPLOY_ROLE_ARN` to that ARN.
- **Secrets:** only in the Lightsail deployment environment (console → Container services → unicodesnwrites → Deployments → Modify). They never pass through GitHub. To change one, edit it in the console and save; that makes a new deployment.
- **Domain:** `unicodesnwrites.tech` and `www.unicodesnwrites.tech` are attached to the service with a Lightsail certificate. DNS points them at the service's public hostname.
- **Crons:** the newsletter scheduler is called by `.github/workflows/newsletter-scheduler.yml`.
- **Uploads:** files still go to Vercel Blob (`BLOB_READ_WRITE_TOKEN`).
