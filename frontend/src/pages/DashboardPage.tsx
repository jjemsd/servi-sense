import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { PageHeader } from "../components/PageHeader";
import { getAnalytics, type AnalyticsData } from "../api/analytics";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

export function DashboardPage() {
  const { user } = useAuth();
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    getAnalytics()
      .then(setData)
      .catch((e) => setError(e?.message ?? "Failed to load"));
  }, []);

  const greeting = user?.full_name || user?.username || "there";
  const kpis = data?.kpis;
  const byMonth = data?.by_month ?? [];
  const byOffice = data?.by_office ?? [];
  const byStatus = data?.by_status ?? [];
  const secondChartData = user?.role === "admin" ? byOffice : byStatus;

  return (
    <>
      <PageHeader
        title={`Welcome, ${greeting}`}
        subtitle={
          user?.role === "admin"
            ? "Cross-office overview · admin view"
            : `Overview · ${user?.assigned_office ?? "your office"}`
        }
        actions={
          <Link to="/records/add" className="btn btn-primary">
            + Add record
          </Link>
        }
      />

      {error && <div className="banner banner-error">{error}</div>}

      <div className="stats-grid">
        <Stat
          label="Total records"
          value={kpis?.total_records ?? "—"}
          subtitle="all-time"
        />
        <Stat
          label="Unique students"
          value={kpis?.unique_students ?? "—"}
          subtitle="served"
        />
        <Stat
          label="Avg satisfaction"
          value={
            kpis?.avg_satisfaction != null
              ? `${kpis.avg_satisfaction} ★`
              : "—"
          }
          subtitle="out of 5"
        />
        <Stat
          label="Services used"
          value={kpis?.active_services_used ?? "—"}
          subtitle="distinct"
        />
      </div>

      <div className="chart-grid">
        <div className="chart-panel">
          <div className="chart-panel-header">
            <div className="chart-panel-title">Monthly volume</div>
            <div className="chart-panel-subtitle">Records per month</div>
          </div>
          <div className="chart-panel-body">
            {byMonth.length === 0 ? (
              <div
                style={{
                  height: 240,
                  display: "grid",
                  placeItems: "center",
                  color: "var(--color-text-subtle)",
                }}
              >
                No data yet. Start by adding records.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={240}>
                <LineChart data={byMonth}>
                  <CartesianGrid stroke="#E5E8EE" strokeDasharray="3 3" />
                  <XAxis dataKey="label" stroke="#6B7280" fontSize={12} />
                  <YAxis stroke="#6B7280" fontSize={12} allowDecimals={false} />
                  <Tooltip />
                  <Line
                    type="monotone"
                    dataKey="count"
                    stroke="#D4AF37"
                    strokeWidth={2.5}
                    dot={{ fill: "#0B1F3A", r: 4 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        <div className="chart-panel">
          <div className="chart-panel-header">
            <div className="chart-panel-title">
              {user?.role === "admin" ? "By office" : "Status breakdown"}
            </div>
            <div className="chart-panel-subtitle">
              {user?.role === "admin"
                ? "Where records originate"
                : "Record outcomes"}
            </div>
          </div>
          <div className="chart-panel-body">
            {secondChartData.length === 0 ? (
              <div
                style={{
                  height: 240,
                  display: "grid",
                  placeItems: "center",
                  color: "var(--color-text-subtle)",
                }}
              >
                No data
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={secondChartData} layout="vertical">
                  <CartesianGrid stroke="#E5E8EE" strokeDasharray="3 3" />
                  <XAxis
                    type="number"
                    stroke="#6B7280"
                    fontSize={12}
                    allowDecimals={false}
                  />
                  <YAxis
                    dataKey="label"
                    type="category"
                    width={120}
                    stroke="#6B7280"
                    fontSize={12}
                  />
                  <Tooltip />
                  <Bar dataKey="count" fill="#0B1F3A" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>

      <p className="muted" style={{ marginTop: "var(--space-5)" }}>
        Need more depth? Visit the{" "}
        <Link to="/analytics" className="text-link">
          Analytics page
        </Link>
        .
      </p>
    </>
  );
}

function Stat({
  label,
  value,
  subtitle,
}: {
  label: string;
  value: string | number;
  subtitle?: string;
}) {
  return (
    <div className="stat-card">
      <div className="stat-label">{label}</div>
      <div className="stat-value">{value}</div>
      {subtitle && <div className="stat-subtitle">{subtitle}</div>}
    </div>
  );
}