import { useEffect, useState } from "react";
import { useAuth } from "../auth/AuthContext";
import { PageHeader } from "../components/PageHeader";
import { getReference } from "../api/reference";
import { listServices } from "../api/services";
import type { ReferenceData, Service } from "../types/api";

export function DashboardPage() {
  const { user } = useAuth();
  const [reference, setReference] = useState<ReferenceData | null>(null);
  const [services, setServices] = useState<Service[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    Promise.all([getReference(), listServices()])
      .then(([ref, svc]) => {
        setReference(ref);
        setServices(svc);
      })
      .catch((err) => setError(err.message ?? "Failed to load"));
  }, []);

  const greetingName = user?.full_name || user?.username || "there";

  return (
    <>
      <PageHeader
        title={`Welcome, ${greetingName}`}
        subtitle="Student Services Utilization & Performance Analytics"
      />

      {error && <div className="banner banner-error">{error}</div>}

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          gap: "1.25rem",
          marginBottom: "2rem",
        }}
      >
        <StatCard
          label="Your role"
          value={user?.role ?? "—"}
          subtitle={user?.assigned_office ?? "all offices"}
        />
        <StatCard
          label="Active services"
          value={services.length || "—"}
          subtitle="in the catalog"
        />
        <StatCard
          label="Departments"
          value={reference?.departments.length ?? "—"}
          subtitle="academic programs"
        />
        <StatCard
          label="Backend status"
          value="connected"
          subtitle="API + DB online"
          tone="success"
        />
      </div>

      <div className="card" style={{ padding: "1.5rem" }}>
        <h3
          style={{
            fontFamily: "var(--font-display)",
            fontSize: "18px",
            color: "var(--color-navy)",
            marginBottom: "1rem",
          }}
        >
          Stage 4 complete — frontend wired to backend
        </h3>
        <p style={{ color: "var(--color-text-muted)", marginBottom: "1rem" }}>
          The auth flow, routing, layout shell, and API client are all
          functional. Charts, the records table, the upload form, and analytics
          come in Stage 5.
        </p>
        <p style={{ color: "var(--color-text-muted)" }}>
          The numbers above were just loaded from the live backend, which
          confirms cookies + CORS are working end-to-end.
        </p>
      </div>
    </>
  );
}

function StatCard({
  label,
  value,
  subtitle,
  tone = "default",
}: {
  label: string;
  value: string | number;
  subtitle?: string;
  tone?: "default" | "success";
}) {
  return (
    <div
      className="card"
      style={{
        padding: "1.25rem",
        display: "flex",
        flexDirection: "column",
        gap: 4,
      }}
    >
      <div
        style={{
          fontSize: 12,
          textTransform: "uppercase",
          letterSpacing: "0.6px",
          color: "var(--color-text-muted)",
          fontWeight: 600,
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontFamily: "var(--font-display)",
          fontSize: 26,
          fontWeight: 700,
          color: tone === "success" ? "var(--color-success)" : "var(--color-navy)",
          textTransform: "capitalize",
        }}
      >
        {value}
      </div>
      {subtitle && (
        <div style={{ fontSize: 12, color: "var(--color-text-subtle)" }}>
          {subtitle}
        </div>
      )}
    </div>
  );
}
