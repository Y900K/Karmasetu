# Deployment Runbook: Vercel and Render

This guide prepares KarmaSetu for production deployment on Vercel or Render with GitHub integration, MongoDB, and Sarvam API key configuration.

## 1. Required Environment Variables

Use the same values in local `.env`, Vercel Project Environment Variables, and Render Environment Variables.

- `MONGODB_URI`
- `MONGODB_DB_NAME`
- `SARVAM_API_KEY`
- `MONGODB_SETUP_KEY`

Optional tuning variables:
- `MONGODB_MAX_POOL_SIZE`
- `MONGODB_MIN_POOL_SIZE`
- `MONGODB_MAX_IDLE_MS`
- `MONGODB_CONNECT_TIMEOUT_MS`
- `MONGODB_SOCKET_TIMEOUT_MS`
- `MONGODB_SERVER_SELECTION_TIMEOUT_MS`
- `BLOB_READ_WRITE_TOKEN` (recommended for portable uploads via object storage)

## 2. Pre-Deploy Checks (Local)

1. Install dependencies.
- `npm ci`

2. Run lint and verification gate.
- `npm run ci:verify`

This gate now includes:
- Admin mutation guard coverage check
- Read and mutation-path smoke checks
- Health and latency assertions

3. Confirm health endpoint locally.
- `GET http://localhost:3000/api/health`

4. Confirm no keys are in client storage.
- Verify `SARVAM_API_KEY` is only used in server routes.

## 3. GitHub Setup

1. Push latest code to GitHub repository.
2. Ensure workflow exists:
- `.github/workflows/verification-gate.yml`
3. Confirm GitHub Actions passes on push/PR.

## 4. Vercel Deployment

1. Import repository into Vercel.
2. Framework preset:
- Next.js
3. Build command:
- `npm run build`
4. Output setting:
- default (Next.js)
5. Add environment variables for Production and Preview.
6. Deploy.

Post-deploy checks:
1. `GET /api/health` returns status `200`.
2. Login works for admin and trainee.
3. Admin dashboard loads and protected routes return `403` for unauthorized users.
4. Trainee dashboard loads and `/api/trainee/*` routes enforce trainee role.
5. Sarvam chat/tts/asr routes return safe fallback behavior on upstream failures.

## 5. Render Deployment

1. Create a new Web Service from GitHub repo.
2. Runtime:
- Node
3. Build command:
- `npm ci && npm run build`
4. Start command:
- `npm run start`
5. Set environment variables listed in Section 1.
6. Deploy.

Post-deploy checks:
1. `GET /api/health`
2. Run smoke gate against deployment URL:
- `SMOKE_BASE_URL=https://<your-render-url> npm run verify:gate`

## 6. MongoDB Production Preparation

1. Ensure IP/network access from Vercel/Render to MongoDB.
2. Use a least-privilege DB user.
3. Run index setup endpoint once (if required):
- `POST /api/mongodb/setup-indexes` with `x-setup-key`
4. Verify health telemetry counters after traffic.

## 7. Sarvam API Production Preparation

1. Keep `SARVAM_API_KEY` only in server environment variables.
2. Never expose key in client code or browser storage.
3. Monitor `/api/health` telemetry counters:
- `sarvam_chat_timeout`
- `sarvam_chat_fallback`
- `sarvam_chat_error`
- `sarvam_tts_timeout`
- `sarvam_tts_error`
- `sarvam_asr_timeout`
- `sarvam_asr_error`

## 8. Release Gate (Go/No-Go)

Go live only if all are true:
1. `npm run ci:verify` passes.
2. GitHub Action `Verification Gate` passes.
3. Deployed `/api/health` returns `ok: true` and MongoDB check is healthy.
4. Admin and trainee critical flows pass manual sanity checks.
