# Production image for unicodesnwrites.tech on AWS (Lightsail container service).
# Built by .github/workflows/deploy-aws.yml. Runtime secrets are NOT baked in:
# they come from the Lightsail deployment's environment variables.

FROM node:22-bookworm-slim AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund

FROM node:22-bookworm-slim AS build
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1 NEXT_OUTPUT=standalone NODE_ENV=production
# Public values inlined into the client bundle at build time.
ARG NEXT_PUBLIC_APP_URL=https://unicodesnwrites.tech
ENV NEXT_PUBLIC_APP_URL=$NEXT_PUBLIC_APP_URL
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# Env validation runs while Next collects page data, so the build needs
# placeholder values. They exist only for this command and this throwaway
# stage; the real values come from the Lightsail deployment at runtime.
RUN MONGODB_URI=mongodb://127.0.0.1:27017/build     NEXTAUTH_URL=$NEXT_PUBLIC_APP_URL     NEXTAUTH_SECRET=build-only-placeholder-not-a-secret-000000     npm run build

FROM node:22-bookworm-slim AS run
WORKDIR /app
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 PORT=3000 HOSTNAME=0.0.0.0
RUN groupadd --system --gid 1001 nodejs && useradd --system --uid 1001 --gid nodejs nextjs
COPY --from=build --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=build --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=build --chown=nextjs:nodejs /app/public ./public
COPY --from=build --chown=nextjs:nodejs /app/content ./content
USER nextjs
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=30s CMD node -e "fetch('http://127.0.0.1:3000/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node", "server.js"]
