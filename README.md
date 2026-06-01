# ServiSense — Setup & Test Reference

**Student Services Utilization & Performance Analytics System**

A web application for logging and analyzing student-services usage (Guidance, Library, Clinic, Registrar, Cashier, etc.) across campus offices. FastAPI backend + React frontend, with role-based access and bulk CSV/Excel upload.

> This README is a quick-start + tester reference. It does **not** replace the original project README — it adds the things needed to actually run and test the system (accounts, DB location, schema, test data).

---

## 1. Test Accounts

These accounts are seeded automatically on first startup (see `backend/app/seed.py`). They are also included in `servisense_schema.sql`.

| Username   | Password      | Role  | Assigned Office       |
|------------|---------------|-------|-----------------------|
| `admin`    | `admin123`    | admin | — (all offices)       |
| `guidance` | `guidance123` | staff | Guidance Counseling   |
| `library`  | `library123`  | staff | Library               |

> ⚠️ These are **demo credentials**. Change them before any real deployment.

---

## 2. User Access Types (Roles)

The system has **two roles**:

### `admin`
- Full access to every office and all data.
- Can manage users (create/edit/deactivate staff and admins).
- Can manage the services/offices catalog (System Settings).
- Can view system-wide analytics across all offices.
- Can bulk-upload records for **any** office (must pick a target office).
- Not tied to a single office (`assigned_office` is `NULL`).

### `staff`
- Scoped to **their own assigned office only** (e.g. the `library` account only sees Library data).
- Can create and view service records for their office.
- Can bulk-upload records for their own office only (target office is forced).
- Cannot manage users or the global services catalog.
- Sees analytics limited to their office.

Auth is **server-side session based**: on login a session row is created in the `sessions` table and an httpOnly cookie (`servisense_session`, 12-hour lifetime) is set. Logout deletes the session row. Passwords are hashed with **bcrypt**.

---

## 3. Where the Database Is

The database location depends on environment (configured via the `DATABASE_URL` env var in `backend/app/config.py`):

### Local development (default)
- **SQLite** — file at `backend/servisense.db` (created automatically on first run).
- Default URL: `sqlite:///./servisense.db`
- Tables are auto-created at startup by SQLAlchemy (`Base.metadata.create_all`), and demo data is seeded if empty. **No manual DB setup needed for local dev.**

### Production (Render)
- **PostgreSQL**, provisioned by the Render Blueprint (`render.yaml`) as database **`servisense-db`** (plan `basic-256mb`).
- The backend service `servisense-api` receives the connection string automatically via the `DATABASE_URL` env var (`fromDatabase` binding).
- Old-style `postgres://` URLs are auto-normalized to `postgresql://` (see `backend/app/database.py`).

To point local dev at Postgres instead of SQLite, create `backend/.env`:
```env
DATABASE_URL=postgresql://user:password@localhost:5432/servisense
```

---

## 4. Database Schema & Test Data (included files)

| File                                | What it is |
|-------------------------------------|------------|
| `servisense_schema.sql`             | Full PostgreSQL schema (5 tables) + seed data (offices + the 3 demo users with real bcrypt hashes). |
| `test_data_guidance_counseling.xlsx`| 25 sample records for the **Guidance Counseling** office. |
| `test_data_library.xlsx`            | 25 sample records for the **Library** office. |
| `test_data_clinic_medical.xlsx`     | 25 sample records for the **Clinic / Medical** office. |
| `test_data_registrar.xlsx`          | 25 sample records for the **Registrar** office. |
| `test_data_cashier.xlsx`            | 25 sample records for the **Cashier** office. |

Each test-data file is a **separate workbook for one office** (the uploader reads only the first sheet, so separate files upload cleanly).

### Loading the schema manually (PostgreSQL)
```bash
createdb servisense
psql -d servisense -f servisense_schema.sql
```
*(For SQLite local dev you don't need this — the app builds the tables itself.)*

### Tables
- **users** — login, role, assigned office, bcrypt password hash.
- **services** — catalog of offices/services (FK target for records).
- **service_records** — one row per service event (student visiting an office).
- **uploaded_files** — audit trail of bulk CSV/Excel uploads.
- **sessions** — server-side auth sessions (cookie token store).

### Using the test data
Each file holds 25 records for one office. Required columns: `service_date, student_id, student_name, service_name`; optional: `time, year_level, department, notes`.

> Uploader rule: every row's `service_name` must match the office you upload for — that's why there's one file per office. Upload the matching file (staff to their own office; admin picks the target office).

---

## 5. Tech Stack

### Backend
- **Python 3.12**
- **FastAPI** (`fastapi[standard]` 0.136.x) — REST API
- **Uvicorn** — ASGI server
- **SQLAlchemy 2.0** — ORM
- **PostgreSQL** (prod, via `psycopg2-binary`) / **SQLite** (local dev)
- **bcrypt** — password hashing
- **pandas** + **openpyxl** — CSV/Excel parsing for bulk upload
- **fpdf2** — PDF report generation
- Server-side cookie sessions (no JWT)

### Frontend
- **React 19** + **TypeScript ~5.6**
- **Vite 6** — build tool / dev server
- **React Router 7**
- **Recharts** — analytics charts

### Deployment
- **Render** Blueprint (`render.yaml`): backend web service + managed Postgres + static-site frontend.

---

## 6. System Requirements

### Software
- **Python** ≥ 3.12
- **Node.js** ≥ 18 (Node 20+ recommended for Vite 6) and **npm**
- **PostgreSQL** ≥ 13 (production / optional locally) — not needed if using the default SQLite
- A modern browser (Chrome, Edge, Firefox, Safari)

### Hardware (development)
- ~2 GB free RAM, ~500 MB disk for dependencies. Any modern laptop is fine.

---

## 7. Running Locally

### Backend
```bash
cd backend
python -m venv .venv
# Windows: .venv\Scripts\activate   |   macOS/Linux: source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload
# API at http://127.0.0.1:8000  (docs at /docs)
```
On first run it creates `servisense.db` (SQLite) and seeds the offices + demo accounts.

### Frontend
```bash
cd frontend
npm install
npm run dev
# App at http://127.0.0.1:5173
```
The dev frontend talks to the API via `VITE_API_URL` (see `frontend/.env.development`). Allowed CORS origins default to `http://localhost:5173` / `http://127.0.0.1:5173`.

### Quick test
1. Open the frontend, log in as `admin / admin123`.
2. Go to Uploads → upload `test_data_library.xlsx` (or any office file) and pick the matching target office.
3. Check the Analytics page to see the seeded records visualized.
4. Log out, log back in as `library / library123` to confirm office-scoped access.
