This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## KarmaSetu Overview

KarmaSetu is an industrial training and safety platform with:
- Trainee learning, progression, and certification workflows
- Admin course, assignment, certificate, and compliance operations
- Buddy AI support (chat, ASR, TTS) with safety fallback controls

Core backend surfaces:
- Auth: `app/api/auth/*`
- Admin APIs: `app/api/admin/*`
- Trainee APIs: `app/api/trainee/*`
- Certificate verification: `app/api/certificates/verify/[certId]/route.ts`
- Sarvam integration: `app/api/sarvam/*`

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

## MongoDB Setup (Step-by-Step)

1. Create a MongoDB URI.
- Atlas URI format:
	`mongodb+srv://<username>:<password>@<cluster-url>/<db-name>?retryWrites=true&w=majority&appName=<app-name>`
- Local URI format:
	`mongodb://127.0.0.1:27017/<db-name>`

2. Add values in your environment file.
- Open `.env` and set:
	- `MONGODB_URI=...`
	- `MONGODB_DB_NAME=...`

3. Restart the Next.js server after updating `.env`.
- `npm run dev`

4. Verify MongoDB connection.
- Open `http://localhost:3000/api/mongodb/ping`
- Success response:
	- `{ "ok": true, "message": "MongoDB connection successful." }`

5. (Optional) Create production-friendly indexes.
- Set `MONGODB_SETUP_KEY` in `.env`.
- Call `POST /api/mongodb/setup-indexes` with header `x-setup-key: <MONGODB_SETUP_KEY>`.
- Success response:
	- `{ "ok": true, "message": "MongoDB indexes ensured." }`

6. Review low-memory data plan.
- See `docs/mongodb-data-plan.md` for suggested collections, fields, indexes, and retention.

7. Use MongoDB in API routes or server code.
- Import from `lib/mongodb.ts`:

```ts
import { getMongoDb } from '@/lib/mongodb';

export async function GET() {
	const db = await getMongoDb();
	const users = await db.collection('users').find({}).limit(10).toArray();
	return Response.json({ users });
}
```

## Production Verification Runbook

1. Start app in your target environment.
- `npm run dev` (local) or `npm run start` (production build)

2. Check health endpoint.
- `GET /api/health`
- Expected:
	- `checks.mongodb.ok: true`
	- `checks.sarvam.configured: true` (if Sarvam is configured)

3. Run smoke checks.
- `npm run verify:smoke`
- Validates auth, admin/trainee portals, Mongo ping, and health endpoint.

3.1 Run full verification gate.
- `npm run verify:gate`
- Includes smoke checks plus health-gate assertions (Mongo latency and service response bounds).

3.2 Run CI-equivalent command locally.
- `npm run ci:verify`
- Runs:
	- admin mutation guard coverage check
	- lint
	- smoke checks (read + safe mutation paths)
	- health gate assertions

4. Tune MongoDB pool and timeouts (optional, recommended in production).
- Add to environment:
	- `MONGODB_MAX_POOL_SIZE=30`
	- `MONGODB_MIN_POOL_SIZE=5`
	- `MONGODB_MAX_IDLE_MS=45000`
	- `MONGODB_CONNECT_TIMEOUT_MS=10000`
	- `MONGODB_SOCKET_TIMEOUT_MS=45000`
	- `MONGODB_SERVER_SELECTION_TIMEOUT_MS=12000`

5. Observe Sarvam reliability counters.
- `GET /api/health` -> `telemetry.counters`
- Key counters:
	- `sarvam_chat_timeout`
	- `sarvam_chat_fallback`
	- `sarvam_chat_error`
	- `sarvam_tts_timeout`
	- `sarvam_tts_error`
	- `sarvam_asr_timeout`
	- `sarvam_asr_error`

## Deployment Guides

1. Vercel + Render + GitHub + MongoDB + Sarvam deployment runbook:
- See `docs/DEPLOYMENT_VERCEL_RENDER.md`

## Upload Storage Portability

By default, uploads fall back to local `public/uploads` storage.

For production portability across multiple instances, set:
- `BLOB_READ_WRITE_TOKEN`

When this token is present, upload and thumbnail assets are stored in object storage through Vercel Blob.
