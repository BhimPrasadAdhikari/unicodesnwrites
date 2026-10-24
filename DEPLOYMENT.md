# Deployment Guide - unicodesnwrites.tech

## Prerequisites

- GitHub account with repository access
- Vercel account (connected to GitHub)
- MongoDB Atlas account
- Stripe account (live mode)
- SendGrid account (or email provider)
- Domain registrar access

## Environment Variables

See `.env.example` for all required variables.

### Production Variables

Copy these to Vercel → Project → Settings → Environment Variables:

```
MONGODB_URI=mongodb+srv://...
NEXTAUTH_URL=https://unicodesnwrites.tech
NEXTAUTH_SECRET=[32+ character random string]
EMAIL_HOST=smtp.sendgrid.net
EMAIL_PORT=587
EMAIL_USER=apikey
EMAIL_PASSWORD=SG.xxx
EMAIL_FROM=noreply@unicodesnwrites.tech
STRIPE_SECRET_KEY=sk_live_xxx
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_xxx
STRIPE_WEBHOOK_SECRET=whsec_live_xxx
BLOB_READ_WRITE_TOKEN=vercel_blob_xxx
SENTRY_DSN=https://xxx@sentry.io/xxx
```

## Deployment Steps

### 1. Database Setup

1. Create MongoDB Atlas cluster
2. Configure network access (0.0.0.0/0 for serverless)
3. Create database user
4. Copy connection string
5. Add to Vercel env vars

### 2. Email Service

1. Set up SendGrid account
2. Authenticate domain (DNS records)
3. Create API key
4. Add to Vercel env vars (EMAIL_USER=apikey, EMAIL_PASSWORD=SG...)

### 3. Stripe Configuration

1. Switch to live mode
2. Recreate products
3. Configure production webhook (`https://unicodesnwrites.tech/api/webhooks/stripe`)
4. Add keys to Vercel env vars

### 4. Vercel Deployment

1. Connect GitHub repository
2. Configure environment variables
3. Deploy (automatic on push to main)
4. Configure custom domain (`unicodesnwrites.tech`)
5. Update DNS records (A record to 76.76.21.21 or CNAME to cname.vercel-dns.com)
6. Verify SSL certificate

### 5. Post-Deployment

1. Run database seed script (optional, requires connecting locally to prod DB):
   ```bash
   MONGODB_URI="mongodb+srv://..." npm run seed:prod
   ```
2. Create admin user
3. Test all critical flows:
   - Admin login
   - Blog post creation
   - Product purchase
   - Newsletter signup
   - Contact form
4. Monitor error logs (Sentry)

## Error Monitoring (Sentry)

1. Create Sentry project
2. Run wizard: `npx @sentry/wizard@latest -i nextjs`
3. Add `SENTRY_AUTH_TOKEN` to Vercel env vars

## Rollback Procedure

If deployment fails:

1. In Vercel dashboard, navigate to "Deployments"
2. Find last working deployment
3. Click "..." → "Promote to Production"
4. Verify site working
5. Fix issues in new branch
6. Redeploy when ready

## Troubleshooting

### Build Failures

- Check build logs in Vercel
- Verify all env vars set
- Run `npm run build` locally to reproduce
- Check for TypeScript errors

### Database Connection Issues

- Verify MONGODB_URI correct
- Check Atlas network access (0.0.0.0/0)
- Verify database user credentials
- Test connection locally

### Email Not Sending

- Verify SendGrid API key valid
- Check domain authentication (DNS)
- Review SendGrid activity logs
- Test with script locally: `node scripts/test-email.ts`
