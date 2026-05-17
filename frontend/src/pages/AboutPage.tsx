import { PageHeader } from "../components/PageHeader";

export function AboutPage() {
  return (
    <>
      <PageHeader
        title="About ServiSense"
        subtitle="Student Services Utilization & Performance Analytics System"
      />

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
          gap: "1.25rem",
        }}
      >
        <section className="card" style={{ padding: "1.5rem" }}>
          <h3
            style={{
              fontFamily: "var(--font-display)",
              fontSize: 18,
              color: "var(--color-navy)",
              marginBottom: ".75rem",
            }}
          >
            What it does
          </h3>
          <p style={{ color: "var(--color-text-muted)", lineHeight: 1.6 }}>
            ServiSense tracks every interaction between students and campus
            offices — guidance, library, clinic, registrar, OSAA, cashier,
            ICTMO — and turns those records into dashboards, trend reports, and
            performance insights.
          </p>
        </section>

        <section className="card" style={{ padding: "1.5rem" }}>
          <h3
            style={{
              fontFamily: "var(--font-display)",
              fontSize: 18,
              color: "var(--color-navy)",
              marginBottom: ".75rem",
            }}
          >
            For administrators
          </h3>
          <p style={{ color: "var(--color-text-muted)", lineHeight: 1.6 }}>
            Manage the services catalog, create and manage user accounts, and
            view cross-office analytics. Admins have full read/write access to
            every office's records.
          </p>
        </section>

        <section className="card" style={{ padding: "1.5rem" }}>
          <h3
            style={{
              fontFamily: "var(--font-display)",
              fontSize: 18,
              color: "var(--color-navy)",
              marginBottom: ".75rem",
            }}
          >
            For office staff
          </h3>
          <p style={{ color: "var(--color-text-muted)", lineHeight: 1.6 }}>
            Each staff account is bound to one office. You can log individual
            service interactions, bulk-import them via CSV/Excel, and view
            analytics scoped to your own office.
          </p>
        </section>

        <section className="card" style={{ padding: "1.5rem" }}>
          <h3
            style={{
              fontFamily: "var(--font-display)",
              fontSize: 18,
              color: "var(--color-navy)",
              marginBottom: ".75rem",
            }}
          >
            Tech stack
          </h3>
          <ul
            style={{
              color: "var(--color-text-muted)",
              lineHeight: 1.7,
              paddingLeft: 18,
              margin: 0,
            }}
          >
            <li>React 19 + TypeScript + Vite</li>
            <li>FastAPI + SQLAlchemy + PostgreSQL</li>
            <li>Session-based auth with bcrypt</li>
            <li>Recharts for analytics visualizations</li>
            <li>Deployed on Render</li>
          </ul>
        </section>
      </div>
    </>
  );
}
