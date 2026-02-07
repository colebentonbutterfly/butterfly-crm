# Butterfly Assets CRM (Vercel + Next.js)

This is a branded internal CRM for Butterfly Assets LLC:
- Leads
- Deals + compliance tasks (auto-created)
- Post-close Assets (model included)

## 1) Local setup
```bash
npm install
```

## 2) Create DB
Use **Vercel Postgres** (recommended) or any Postgres.
Set `.env` with:
- DATABASE_URL=postgres://...
- NEXTAUTH_SECRET=...
- NEXTAUTH_URL=http://localhost:3000
- ADMIN_EMAIL=you@domain.com
- ADMIN_PASSWORD=YourStrongPassword!

Create `.env` from `.env.example` below.

## 3) Prisma migrate + seed
```bash
npx prisma migrate dev --name init
npm run seed
```

## 4) Run
```bash
npm run dev
```

Visit:
- http://localhost:3000/signin

## Deploy to Vercel
1. Push repo to GitHub
2. Import into Vercel
3. Add Vercel Postgres + env vars
4. Run migrations (Vercel build will generate Prisma client; run migrate via Vercel CLI or locally against prod DB)

## Next iterations (already planned)
- Stage movement locks based on required tasks
- Deal → Asset auto creation on close
- Document uploads via Vercel Blob
- Activity log + audit trail
- Role-based permissions across routes
