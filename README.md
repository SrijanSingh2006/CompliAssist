# CompliAssist Platform

CompliAssist is now a full-stack MSME compliance workspace built with React, Vite, and a lightweight Node backend.

## What works

- Protected login with a seeded demo account
- Persistent backend data for profile, settings, alerts, schemes, loans, assistant history, and document vault metadata
- API-backed dashboard and page interactions instead of hardcoded toast-only placeholders
- File upload, download, and delete in the document vault
- Production server that serves both the built frontend and `/api` routes

## Demo credentials

- Email: `admin@technova.com`
- Password: `demo123`

## Run locally

### Development

```bash
npm run dev
```

This starts:

- Vite frontend on `http://localhost:5173`
- Node backend on `http://localhost:8787`

Vite proxies `/api` requests to the backend automatically.

### Production build

```bash
npm run build
npm run start
```

The backend serves the compiled frontend from `dist/`.

## Useful scripts

- `npm run dev` - runs frontend and backend together
- `npm run dev:client` - runs Vite only
- `npm run dev:server` - runs the Node backend only
- `npm run build` - creates the production build
- `npm run start` - serves the production build and API
- `npm run lint` - runs ESLint
- `npm run reset:data` - restores the default seeded dataset
- `npm run smoke:test` - runs an isolated backend smoke test against temporary data

## Deployment

This app is deployable as a standard Node service because the backend serves the compiled frontend.

### Required runtime behavior

- Build step: `npm run build`
- Start command: `npm run start`
- Default port: `8787` via `PORT`

### Persistent storage

If you deploy to a platform with ephemeral storage, mounted volumes are recommended for persisted data and uploads.

Optional environment variables:

- `COMPLIASSIST_DATA_DIR` - directory used for `store.json`
- `COMPLIASSIST_UPLOAD_DIR` - directory used for uploaded files

### Docker

Build and run with Docker:

```bash
docker build -t compliassist .
docker run -p 8787:8787 compliassist
```

## Backend storage

The backend persists data under:

- `backend/data/store.json`
- `backend/uploads/`

These are created automatically on first run unless overridden by environment variables.
