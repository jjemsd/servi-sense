# ServiSense v2

Student Services Utilization & Performance Analytics System.
React + TypeScript frontend, FastAPI + PostgreSQL backend.

> **You are on Stage 1: Project Scaffolding.**
> This is the minimal skeleton — auth, records, dashboard, etc. all come in later stages.

---

## Repo layout

```
servisense/
├── backend/                ← FastAPI + SQLAlchemy + Postgres
│   ├── app/
│   │   ├── __init__.py
│   │   ├── main.py         ← app entry, CORS, /api/health endpoint
│   │   ├── config.py       ← env-var settings
│   │   ├── database.py     ← SQLAlchemy engine + get_db dependency
│   │   └── routers/        ← (empty for now; routes go here in Stage 2+)
│   ├── requirements.txt
│   └── .env.example
├── frontend/               ← create this with Vite (see below)
├── render.yaml             ← deployment config for Render.com
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

Once Stage 1 runs end-to-end on your machine, the next stages are:

- **Stage 2:** Database models + auth (login/logout, bcrypt, seeded demo users)
- **Stage 3:** Records, services, users CRUD endpoints
- **Stage 4:** Frontend layout shell, auth context, routing
- **Stage 5:** Frontend pages (dashboard, records, add, upload, analytics, settings, users)
- **Stage 6:** Deployment to Render
