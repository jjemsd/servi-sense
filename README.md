# ServiSense v2

Student Services Utilization & Performance Analytics System.
React + TypeScript frontend, FastAPI + PostgreSQL backend.

> **You are on Stage 4: Frontend Foundation.**
> ✅ Stage 1 — scaffolding (FastAPI shell, CORS, env vars, Render deploy)
> ✅ Stage 2 — auth (bcrypt, session cookies, login/logout/me, seeded users)
> ✅ Stage 3 — CRUD endpoints (records, services, users, uploads, reference)
> ✅ Stage 4 — frontend foundation (Vite + React + TS, routing, auth, layout shell)
> ⏳ Stage 5 — frontend pages (records, add record, upload, analytics, settings, users)
> ⏳ Stage 6 — frontend deployment + CORS lockdown

---

## What works after Stage 4

- A real login page that authenticates against the deployed backend
- Auth context with `useAuth()` hook for any component
- Protected routes (redirect to /login if not signed in)
- Admin-only routes (`/settings`, `/users` — redirect to dashboard if non-admin)
- Sidebar navigation that adapts to role (admin sees extra sections)
- Dashboard page that pulls live data from the backend
- All other pages exist as styled placeholder cards (Stage 5 fills them in)
- Vite dev proxy: frontend on :5173 forwards `/api` calls to backend on :8000

---

## Demo accounts (seeded on first backend startup)

| Username | Password | Role | Assigned office |
|----------|----------|------|-----------------|
| `admin` | `admin123` | admin | (any) |
| `guidance` | `guidance123` | staff | Guidance Counseling |
| `library` | `library123` | staff | Library |

---

## Run it locally

### Backend (terminal 1)

```bash
cd backend
python -m venv .venv
source .venv/bin/activate    # Windows: .venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env         # Windows: copy .env.example .env
uvicorn app.main:app --reload
```

Backend will run at **http://localhost:8000** (Swagger UI at `/docs`).

### Frontend (terminal 2)

```bash
cd frontend
npm install
npm run dev
```

Frontend will run at **http://localhost:5173**. Open it and you'll see the login page on the navy gradient background. Sign in with `admin / admin123` and you should land on the Dashboard with live data from the backend.

---

## How the dev setup avoids cookie pain

In development:
- Frontend served by Vite at `http://localhost:5173`
- All `/api/*` requests are proxied to `http://localhost:8000` by Vite
- The browser sees everything as same-origin
- Session cookies just work (SameSite=Lax, no Secure required)

In production (Stage 6):
- Frontend deployed to `https://servisense-web.onrender.com`
- Backend deployed to `https://servisense-api.onrender.com`
- Different origins, so backend sets `SameSite=None; Secure` cookies
- CORS is configured with explicit allowed origin (no `*`) and `allow_credentials=true`

This is all already wired up — you only need to set `VITE_API_URL` on the frontend and `CORS_ORIGINS` on the backend at deploy time.

---

## Repo layout

```
servisense/
├── backend/                  ← FastAPI + SQLAlchemy + Postgres
│   ├── app/                  ← lifespan, routers, models, schemas, auth, seed
│   └── requirements.txt
├── frontend/                 ← Vite + React + TypeScript
│   ├── src/
│   │   ├── App.tsx           ← router
│   │   ├── api/              ← typed API client (auth, records, …)
│   │   ├── auth/             ← AuthContext, ProtectedRoute
│   │   ├── components/       ← Layout, Sidebar, PageHeader
│   │   ├── pages/            ← LoginPage, DashboardPage, AboutPage, stubs
│   │   ├── types/api.ts      ← TS types matching backend Pydantic
│   │   └── styles/           ← global.css, layout.css, login.css
│   ├── package.json
│   └── vite.config.ts        ← dev proxy /api → :8000
├── render.yaml
└── README.md
```

---

## What's next

- **Stage 5:** Build out the actual pages (records list with filters/pagination, add-record form, upload UI with error display, analytics with charts, services catalog editor, user management table)
- **Stage 6:** Deploy frontend to Render as a static site, lock down CORS to the real frontend URL
