# ServiSense v2

Student Services Utilization & Performance Analytics System.
React + TypeScript frontend, FastAPI + PostgreSQL backend.

> **You are on Stage 5: Full application is complete.**
> ✅ Stage 1 — scaffolding (FastAPI shell, CORS, env vars, Render deploy)
> ✅ Stage 2 — auth (bcrypt, session cookies, login/logout/me, seeded users)
> ✅ Stage 3 — CRUD endpoints (records, services, users, uploads, reference)
> ✅ Stage 4 — frontend foundation (routing, auth, layout shell)
> ✅ Stage 5 — frontend pages (all real, with analytics charts)
> ⏳ Stage 6 — frontend deployment to Render + CORS lockdown

The app is now fully functional end-to-end. Stage 6 is purely deployment.

---

## What works after Stage 5

**Pages** (every nav item is a real page now):

- **Dashboard** — KPI cards + monthly trend line chart + status/office bar chart
- **Records** — filters (office/dept/status/date range/search), paginated table, edit-in-modal, delete with confirm
- **Add Record** — full form with reference dropdowns, staff-locked to their service
- **Bulk Upload** — drag-and-drop, target office selector (admin), per-row error display, upload history with download/delete
- **Analytics** — 5 KPI cards + 6 Recharts visualizations (monthly trend, by office, by department, status pie, day-of-week, hour-of-day, satisfaction by office), with date range and office filters
- **My Account** (Profile) — account info + change-password form with confirmation
- **System Settings** (admin) — services catalog management (CRUD, activate/deactivate)
- **User Management** (admin) — users CRUD, role/office assignment, deactivate, password reset modal
- **About** — system overview

**Backend (new in Stage 5):**

- `GET /api/analytics` — single endpoint returning KPIs + 7 aggregations (by office, dept, status, month, day-of-week, hour-of-day, satisfaction-by-office). Role-scoped automatically, supports `office`, `date_from`, `date_to` query params.

**Verified with 17/17 backend integration tests:**

- KPIs compute correctly (total, completed, unique students, avg satisfaction, avg response time)
- All 7 aggregations populated
- Date range filtering works
- Admin office filter works
- **Staff cannot bypass office scoping** — even if they pass `?office=…`, the backend ignores it and scopes to their `assigned_office`
- Change-own-password endpoint works

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

Frontend will run at **http://localhost:5173**. Sign in as `admin / admin123` and you'll land on the live Dashboard with charts.

---

## Adding test data quickly

The dashboard/analytics look more interesting with data. Two options:

**A) Manually:** Sign in as admin → Add Record (a few times) or as `library` to scope to one office.

**B) Bulk:** Upload a CSV with columns:
```
service_date,time,student_id,student_name,year_level,department,service_name,status,response_time_minutes,satisfaction_rating,notes
2026-05-15,10:30:00,2024-00001,Juan Dela Cruz,3rd Year,BSIT,Library,Completed,5,5,
2026-05-15,11:00:00,2024-00002,Maria Santos,2nd Year,BSCoE,Library,Completed,3,4,
```

Each row's `service_name` must match a service name in the catalog.

---

## Repo layout

```
servisense/
├── backend/
│   ├── app/
│   │   ├── main.py
│   │   ├── config.py, database.py, constants.py
│   │   ├── models.py, schemas.py, auth.py, seed.py
│   │   └── routers/
│   │       ├── auth.py, records.py, services.py
│   │       ├── users.py, uploads.py, reference.py
│   │       └── analytics.py          ← new in Stage 5
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── App.tsx, main.tsx
│   │   ├── api/                      ← 8 typed modules
│   │   │   ├── client.ts             ← fetch wrapper, cookies, 401 events
│   │   │   ├── auth.ts, records.ts, services.ts
│   │   │   ├── users.ts, uploads.ts
│   │   │   ├── reference.ts
│   │   │   └── analytics.ts          ← new in Stage 5
│   │   ├── auth/                     ← AuthContext, ProtectedRoute
│   │   ├── components/
│   │   │   ├── Layout, Sidebar, PageHeader
│   │   │   ├── Modal, ConfirmDialog  ← new in Stage 5
│   │   │   ├── Pagination, StatusBadge   ← new in Stage 5
│   │   │   └── RecordForm            ← new in Stage 5 (shared add/edit)
│   │   ├── pages/                    ← 10 real pages, all functional
│   │   ├── types/api.ts
│   │   └── styles/
│   │       ├── global.css, layout.css, login.css
│   │       └── pages.css             ← new in Stage 5
│   ├── package.json, vite.config.ts
│   └── tsconfig.json + tsconfig.app.json + tsconfig.node.json
├── render.yaml
└── README.md
```

---

## How the dev setup avoids cookie pain

In development:
- Frontend served by Vite at `http://localhost:5173`
- All `/api/*` requests are proxied to `http://localhost:8000` by Vite
- Browser sees everything as same-origin → cookies just work (SameSite=Lax)

In production (Stage 6):
- Frontend deployed to `https://servisense-web.onrender.com`
- Backend deployed to `https://servisense-api.onrender.com`
- Different origins → backend sets `SameSite=None; Secure` cookies
- CORS configured with explicit allowed origin and `allow_credentials=true`

---

## What's next

**Stage 6** — the final stage, all deployment:

1. Add the static-site block back to `render.yaml` for the frontend
2. Set `VITE_API_URL` in Render's static-site env vars to the deployed backend URL
3. Lock down `CORS_ORIGINS` env var on the backend to the deployed frontend URL (not `*`)
4. Push, deploy, verify end-to-end with real cookies + CORS

After that, you're done — full-stack app live on Render.
