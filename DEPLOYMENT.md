# Deployment

Both halves of this app deploy on free tiers. The recommended pairing:

| Part | Platform | Free tier |
|---|---|---|
| Frontend (React/Vite) | **Vercel** | Generous, no sleep, custom domain |
| Backend (Express/SQLite) | **Render** | 750 hrs/month; sleeps after 15 min idle |

Total cost: **$0**.

> **Why not both on Vercel?** Vercel's serverless functions have an ephemeral
> filesystem, so the SQLite cache would be wiped between invocations. Render runs a
> normal long-lived Node process, which the cache needs. Alternatives that also work:
> Railway, Fly.io, Koyeb, or Cyclic.

---

## Deploy order

Deploy the **backend first** — you need its URL to configure the frontend, then come
back and set the backend's `CORS_ORIGIN` to the frontend's URL.

---

## Step 1 — Push to GitHub

```bash
git init
git add .
git commit -m "Mini Analytics Dashboard"
git branch -M main
git remote add origin https://github.com/<you>/mini-analytics-dashboard.git
git push -u origin main
```

Confirm `.env` files are **not** in the repo:

```bash
git ls-files | grep -c "\.env$"   # must print 0
```

---

## Step 2 — Backend on Render

1. Go to [render.com](https://render.com) and sign in with GitHub.
2. **New +** → **Web Service**.
3. Connect the repository.
4. Configure:

   | Field | Value |
   |---|---|
   | **Name** | `mini-analytics-api` |
   | **Region** | Closest to you |
   | **Branch** | `main` |
   | **Root Directory** | `backend` |
   | **Runtime** | Node |
   | **Build Command** | `npm install` |
   | **Start Command** | `npm start` |
   | **Instance Type** | Free |

5. **Advanced** → **Health Check Path**: `/api/health`
6. Add environment variables:

   | Key | Value |
   |---|---|
   | `NODE_ENV` | `production` |
   | `CORS_ORIGIN` | `*` — tighten in step 4 |
   | `USE_MOCK_DATA` | `true` (or `false` with real credentials) |
   | `CACHE_TTL_MINUTES` | `15` |
   | `SHOPIFY_STORE_DOMAIN` | your `.myshopify.com` domain, if going live |
   | `SHOPIFY_ADMIN_ACCESS_TOKEN` | your `shpat_…` token, if going live |

7. **Create Web Service** and wait for the first deploy.
8. Verify:

   ```bash
   curl https://mini-analytics-api.onrender.com/api/health
   ```

   Expect `{"data":{"status":"ok",…}}`.

Copy the service URL — you need it next.

> **Free-tier sleep.** The service sleeps after 15 minutes idle; the next request
> takes ~30–50 seconds to wake it. For a demo, hit the URL a minute beforehand. A
> free uptime pinger (e.g. UptimeRobot every 10 minutes against `/api/health`) keeps
> it awake.

> **SQLite on Render free.** The disk is ephemeral, so the cache resets on redeploy
> or wake. That is harmless — the cache repopulates on the next request.

---

## Step 3 — Frontend on Vercel

1. Go to [vercel.com](https://vercel.com) and sign in with GitHub.
2. **Add New…** → **Project** → import the repository.
3. Configure:

   | Field | Value |
   |---|---|
   | **Framework Preset** | Vite |
   | **Root Directory** | `frontend` |
   | **Build Command** | `npm run build` |
   | **Output Directory** | `dist` |
   | **Install Command** | `npm install` |

4. Add an environment variable:

   | Key | Value |
   |---|---|
   | `VITE_API_BASE_URL` | `https://mini-analytics-api.onrender.com/api` |

   Include `/api`, and no trailing slash.

5. **Deploy**.

> `VITE_` variables are baked in at **build** time. Changing one requires a redeploy,
> not just a restart.

---

## Step 4 — Lock down CORS

Back in Render → your service → **Environment**, set:

```
CORS_ORIGIN = https://your-project.vercel.app
```

Save (this redeploys). Multiple origins are comma-separated:

```
CORS_ORIGIN = https://your-project.vercel.app,https://www.yourdomain.com
```

---

## Step 5 — Verify the deployment

Open the Vercel URL and confirm:

- [ ] KPI cards show numbers
- [ ] Both charts render
- [ ] Orders table populates; search and pagination work
- [ ] CSV export downloads
- [ ] Top selling products show images
- [ ] Low inventory highlights red under 5
- [ ] Dark mode toggles and survives a reload
- [ ] Refresh updates the "Updated …" timestamp
- [ ] Layout holds up on a phone
- [ ] Browser console is clean

If sections show the error state, check in order:

| Symptom | Likely cause |
|---|---|
| "Cannot reach the API" | `VITE_API_BASE_URL` wrong, or Render service asleep — wait 40s and retry |
| CORS error in console | `CORS_ORIGIN` doesn't exactly match the Vercel origin |
| First load very slow | Free-tier cold start; expected |
| `SHOPIFY_AUTH_FAILED` | Token wrong or missing scopes — see the README |

---

## Alternative: both on Railway

If you prefer one platform, [railway.app](https://railway.app) hosts both from the
same repo (free trial credit, then usage-based):

1. **New Project** → **Deploy from GitHub repo**.
2. Create two services from the same repo, with root directories `backend` and `frontend`.
3. Backend: start command `npm start`; frontend: `npm run build` then serve `dist`.
4. Set the same environment variables as above.

---

## Continuous deployment

Both platforms redeploy automatically on push to `main`. To deploy a change:

```bash
git add .
git commit -m "Describe the change"
git push
```

Vercel additionally builds a unique preview URL for every pull request.
