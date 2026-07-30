# Deployment

Two options. Pick the first unless you have a reason not to.

| | Services | URL to share | CORS |
|---|---|---|---|
| **A — Single service (recommended)** | 1 on Render | one | none needed |
| B — Split hosting | Render + Vercel | frontend's | must be configured |

Both are free. Option A is simpler to set up and gives one link that serves the
whole dashboard; Express serves the built React app alongside the API from the
same origin. Option B keeps the frontend on Vercel's always-on CDN, which
avoids the cold start described below, at the cost of a second service and CORS
configuration.

> **Why not Vercel for the backend?** Its serverless functions have an ephemeral
> filesystem, so the SQLite cache would be wiped between invocations. Render runs a
> normal long-lived Node process. Railway, Fly.io and Koyeb work too.

---

## Step 1 — Push to GitHub

```bash
gh auth login          # once, if you have not already
gh repo create mini-analytics-dashboard --public --source=. --remote=origin --push
```

Confirm no `.env` file was included:

```bash
git ls-files | grep -c "\.env$"   # must print 0
```

---

# Option A — Single service on Render

The repo already contains `render.yaml` describing this setup, so Render can
configure itself.

1. Go to [render.com](https://render.com) and sign in with GitHub.
2. **New +** → **Blueprint**, then pick the repository. Render reads
   `render.yaml` and fills in the build and start commands.
3. When prompted, supply the two secrets marked `sync: false`:

   | Key | Value |
   |---|---|
   | `SHOPIFY_STORE_DOMAIN` | `your-store.myshopify.com` |
   | `SHOPIFY_ADMIN_ACCESS_TOKEN` | your `shpat_…` token |

   To publish a demo on seeded data instead, set `USE_MOCK_DATA` to `true` and
   leave both blank.
4. **Apply** and wait for the first build. It installs both workspaces, builds
   the frontend to `frontend/dist`, and starts Express, which detects the build
   and serves it.

Verify:

```bash
curl https://mini-analytics-dashboard.onrender.com/api/health
```

Then open the same URL in a browser — that is the dashboard, and the link you share.

### Setting it up by hand instead

If you would rather not use the blueprint: **New +** → **Web Service**, connect the
repo, leave **Root Directory** blank, and set

| Field | Value |
|---|---|
| **Build Command** | `npm install --include=dev && npm run build` |
| **Start Command** | `npm start` |
| **Health Check Path** | `/api/health` |
| **Instance Type** | Free |

plus the environment variables listed in `render.yaml`.

### The cold start

Free instances sleep after 15 minutes idle, and the next request takes roughly
30–50 seconds while the container wakes. Before demoing, open the URL a minute
ahead. To keep it warm, point a free pinger such as UptimeRobot at
`/api/health` every 10 minutes.

The SQLite cache lives on an ephemeral disk, so it resets on redeploy or wake.
That is harmless: it is a cache, and it repopulates on the first request.

---

# Option B — Split hosting

Deploy the **backend first**; you need its URL to configure the frontend, then come
back and set `CORS_ORIGIN` to the frontend's URL.

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
   | **Root Directory** | `backend` (API only — no frontend is built) |
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

---

# Verifying either option

Open the deployed URL (Render's for option A, Vercel's for option B) and confirm:

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
| **The URL shows JSON, not the dashboard** | Express found no `frontend/dist`. On option A the service must have **Root Directory blank** and build with `npm install --include=dev && npm run build`. A service left on `Root Directory: backend` only ever builds the API. |
| **Build fails, `vite: not found`** | Build command missing `--include=dev`. `NODE_ENV=production` makes npm skip devDependencies, and Vite is one. |
| **`"dataSource":"mock"` when you wanted live** | `USE_MOCK_DATA` is `true`, or the two Shopify variables are unset. The app falls back to seeded data rather than failing when credentials are absent. |
| "Cannot reach the API" | `VITE_API_BASE_URL` wrong, or Render service asleep — wait 40s and retry |
| CORS error in console | `CORS_ORIGIN` doesn't exactly match the Vercel origin |
| First load very slow | Free-tier cold start; expected |
| `SHOPIFY_AUTH_FAILED` | Token wrong or missing scopes — see the README |

> **Editing an existing service.** `render.yaml` is only read when a service is
> created from a Blueprint. If you made the service by hand, the dashboard
> settings win and changing the file has no effect — update **Settings → Build &
> Deploy** directly, then **Manual Deploy → Clear build cache & deploy**.

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
