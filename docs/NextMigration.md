# Next.js Migration Plan

This repo now includes a Next.js (App Router) app under `frontend/` consolidating frontend and API routes.

## Goals
- Replace Node microservices + API Gateway with Next.js API routes.
- Reuse shared types and Prisma schema.
- Preserve existing routes/auth semantics during cutover.

## Structure
- `frontend/app/api/*/route.ts`: REST endpoints replacing microservices (users, orders, products, acceptance, billing, notifications).
- `frontend/middleware.ts`: Basic rate limiting (IP-based).
- `frontend/lib/{auth,prisma}.ts`: JWT helpers and Prisma client.
- `frontend/prisma/schema.prisma`: Ported from `backend/user-service`.

## Local Dev
```bash
# Install deps (root)
npm install

# Copy env
cp frontend/.env.example frontend/.env.local

# Dev Next.js app (port 5173)
npm run dev:frontend
```

## Database
```bash
# From Next app directory
cd frontend
npx prisma generate
npx prisma migrate dev
```

## Cutover Steps
1. Parity: Implement real logic inside Next API routes (use Prisma).
2. Auth: Port JWT issuance/verification to `lib/auth.ts`; align claims.
3. Traffic shift: Point frontend to `/api/...` in Next. Keep API Gateway as fallback.
4. Decommission: Remove `backend/*` services once traffic is fully on Next.

## Notes
- Notifications: Use SSE or a dedicated WS service if real-time scale is required.
- Rate limiting and CORS: Extend `middleware.ts` as needed per environment.
- Secrets: Use `.env.local` for dev, GitHub/host secrets for staging/prod.
