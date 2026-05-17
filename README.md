# ServiSense v2

Student Services Utilization & Performance Analytics System.
React + TypeScript frontend, FastAPI + PostgreSQL backend.

> **You are on Stage 3: Records, Services, Users, Uploads CRUD.**
> ✅ Stage 1 — scaffolding (FastAPI shell, CORS, env vars, Render deploy)
> ✅ Stage 2 — auth (bcrypt hashing, session cookies, login/logout/me, seeded users)
> ✅ Stage 3 — CRUD endpoints (records, services, users, uploads, reference)
> ⏳ Stage 4 — frontend layout shell, routing, auth context
> ⏳ Stage 5 — frontend pages
> ⏳ Stage 6 — frontend deployment + CORS lockdown

---

## API surface

All endpoints live under `/api/`. Open `https://your-api.onrender.com/docs` for the interactive Swagger UI.

| Endpoint | Auth | Description |
|----------|------|-------------|
| `POST /api/auth/login` | — | Login with username+password, sets cookie |
| `POST /api/auth/logout` | any | Clears session |
| `GET /api/auth/me` | any | Current user |
| `GET /api/reference` | any | Dropdown data (departments, offices, etc.) |
| `GET /api/services` | any | List active services |
| `POST/PATCH/DELETE /api/services` | admin | Manage service catalog |
| `GET /api/records` | any | List records (filtered+paginated; staff see own office only) |
| `POST/PATCH/DELETE /api/records` | any | Manage records (with office scoping) |
| `GET /api/users` | admin | List users |
| `POST/PATCH/DELETE /api/users` | admin | Manage users (with safeguards) |
| `POST /api/users/me/password` | any | Change own password |
| `POST /api/users/{id}/reset-password` | admin | Reset another user's password |
| `POST /api/uploads` | any | Bulk import via CSV/Excel |
| `GET /api/uploads` | any | List uploads (filtered by office for staff) |
| `GET /api/uploads/{id}/download` | any (scoped) | Download original file |
| `DELETE /api/uploads/{id}` | any (scoped) | Delete upload |

---

## Demo accounts (seeded on first startup)

| Username | Password | Role | Assigned office |
|----------|----------|------|-----------------|
| `admin` | `admin123` | admin | (any) |
| `guidance` | `guidance123` | staff | Guidance Counseling |
| `library` | `library123` | staff | Library |

**Change these passwords before any real deployment.**

---

## Repo layout

```
servisense/
├── backend/                ← FastAPI + SQLAlchemy + Postgres
│   ├── app/
│   │   ├── __init__.py
│   │   ├── main.py         ← app entry, lifespan, all routers
│   │   ├── config.py       ← env-var settings
│   │   ├── constants.py    ← reference data (departments, statuses, …)
│   │   ├── database.py     ← SQLAlchemy engine + get_db dependency
│   │   ├── models.py       ← ORM models
│   │   ├── schemas.py      ← Pydantic request/response shapes
│   │   ├── auth.py         ← bcrypt + session management + dependencies
│   │   ├── seed.py         ← idempotent default services + demo users
│   │   └── routers/
│   │       ├── __init__.py
│   │       ├── auth.py       ← login, logout, me
│   │       ├── records.py    ← record CRUD with filters
│   │       ├── services.py   ← service catalog (admin write)
│   │       ├── users.py      ← user management (admin) + self password
│   │       ├── uploads.py    ← CSV/Excel bulk import
│   │       └── reference.py  ← dropdown data
│   ├── requirements.txt
│   └── .env.example
├── frontend/               ← create this with Vite (Stage 4)
├── render.yaml
├── .gitignore
└── README.md
```

---

## Local development

### 1. Backend

```bash
cd backend
python -m venv .venv
source .venv/bin/activate    # Windows: .venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env         # Windows: copy .env.example .env
uvicorn app.main:app --reload --port 8000
```

Backend will run at **http://localhost:8000**.
Auto-generated API docs: **http://localhost:8000/docs**.

Verify it works by visiting:
- http://localhost:8000/         → `{"service": "ServiSense API", ...}`
- http://localhost:8000/api/health → `{"status": "healthy"}`

### 2. Frontend

From the **repo root** (not inside `backend/`):

```bash
npm create vite@latest frontend -- --template react-ts
cd frontend
npm install
npm install react-router-dom recharts
npm run dev
```

Frontend will run at **http://localhost:5173**.

### 3. Verify backend ↔ frontend connection

After scaffolding the frontend, replace the contents of `frontend/src/App.tsx` with:

```tsx
import { useEffect, useState } from "react";

function App() {
  const [health, setHealth] = useState<string>("checking...");

  useEffect(() => {
    fetch("http://localhost:8000/api/health")
      .then((r) => r.json())
      .then((data) => setHealth(data.status))
      .catch((err) => setHealth(`error: ${err.message}`));
  }, []);

  return (
    <div style={{ padding: "2rem", fontFamily: "sans-serif" }}>
      <h1>ServiSense v2</h1>
      <p>Backend status: <strong>{health}</strong></p>
    </div>
  );
}

export default App;
```

With both servers running, open http://localhost:5173/ — you should see:

> **ServiSense v2**
> Backend status: **healthy**

If you see `error: Failed to fetch`, the backend isn't running or CORS isn't configured. Restart the backend with `--reload` after editing `.env`.

---

## Tech stack

| Layer | Tech |
|-------|------|
| Frontend | React 18 + TypeScript + Vite |
| Routing | react-router-dom |
| Charts | Recharts |
| Backend | FastAPI 0.136 + Python 3.12 |
| ORM | SQLAlchemy 2.x |
| Database | PostgreSQL (prod) / SQLite (local-dev fallback) |
| Auth | Session cookies + bcrypt password hashing |
| Exports | fpdf2 (PDF) + openpyxl (Excel) |
| Deployment | Render.com |

---

## What's next

- **Stage 4:** Frontend layout shell, auth context, routing (Vite + React + TypeScript)
- **Stage 5:** Frontend pages (dashboard, records, add, upload, analytics, settings, users)
- **Stage 6:** Frontend deployment to Render + CORS lockdown
