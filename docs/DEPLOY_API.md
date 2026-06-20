# Deploy API

| Piece | Host | URL |
|-------|------|-----|
| Website | GitHub Pages | `https://nostalgicgarethdev.github.io/unlockladder` |
| API | Vercel | `https://unlockladder-api.vercel.app` |

## Live API

Health check: `https://unlockladder-api.vercel.app/api/health`

## Redeploy API

```bash
cd api
vercel --prod
```

## Redeploy website (with API URL)

Push to `main` — GitHub Actions builds with `VITE_API_URL=https://unlockladder-api.vercel.app`.

## Local dev

```bash
npm install
npm run dev
```

Runs API on `:3001` and React on `:5173` (Vite proxies `/api`).

## Optional: Render

`render.yaml` is included if you prefer Render over Vercel.