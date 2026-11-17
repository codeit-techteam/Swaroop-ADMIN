# PolyStoreX Admin

Internal admin panel for PolyStoreX. Operators manage catalogue, sellers, orders, documents, and notifications.

## Stack

- Next.js 15 (App Router) · React 19 · TypeScript
- Tailwind CSS · shadcn/ui
- Zustand · React Hook Form · Zod

## Getting started

Requires Node.js 20 or newer.

```bash
npm install
cp .env.example .env
npm run dev
```

Open [http://localhost:3002](http://localhost:3002).

Fill secrets in `.env` after copying the template. `.env` is gitignored. The only env file that belongs in git is `.env.example`, and that file must contain placeholders only.

For local API calls, uncomment `API_PROXY_TARGET` in `.env` and set `NEXT_PUBLIC_API_BASE_URL=/api/v1`. Next rewrites only `/api/v1/*`, so the admin's own `/api` route handlers stay on this app.

## Secrets

| Where | What goes there |
| --- | --- |
| `.env` | Local secrets and machine-specific values. Never commit. |
| `.env.local`, `.env.production`, `.env.*.local` | Optional local overrides. Never commit. |
| `.env.example` | Names and safe public defaults only. No keys, tokens, or passwords. |
| Vercel / DigitalOcean | Production and preview values. Set them in the host dashboard or CLI. |

`NEXT_PUBLIC_*` variables are compiled into the browser bundle. Do not put database URLs, JWT secrets, storage keys, or private API keys behind that prefix. `NEXT_PUBLIC_SELLER_APP_URL` must be the public seller origin in production so invitation links do not point at localhost.

Production builds read env from the host at build time. Changing a `NEXT_PUBLIC_*` value requires a new deploy.

## Scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Development server on port 3002 |
| `npm run build` | Production build |
| `npm start` | Production server |
| `npm run lint` | ESLint |
| `npm run typecheck` | TypeScript (`tsc --noEmit`) |

## Production

The current public deploy is Vercel (`https://swaroop-admin-pi.vercel.app`). The API is the DigitalOcean backend (`https://swaroop-backend-xzwkz.ondigitalocean.app`). A container build is also available via the Dockerfile for App Platform. Set production env vars on the host. Do not copy `.env` into the image or the repository.
