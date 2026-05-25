import { useCallback, useEffect, useState } from "react";
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
import { useAuth } from "../auth/AuthContext";
import { PageHeader } from "../components/PageHeader";
import { getAnalytics, type AnalyticsData } from "../api/analytics";
import { getReference } from "../api/reference";
import type { ReferenceData } from "../types/api";

function StatCard({
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

interface PanelProps {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}

function Panel({ title, subtitle, children }: PanelProps) {
  return (
    <div className="chart-panel">
      <div className="chart-panel-header">
        <div className="chart-panel-title">{title}</div>
        {subtitle && <div className="chart-panel-subtitle">{subtitle}</div>}
      </div>
      <div className="chart-panel-body">{children}</div>
    </div>
  );
}

export function AnalyticsPage() {
  const { user } = useAuth();
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [reference, setReference] = useState<ReferenceData | null>(null);
  const [office, setOffice] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetch = useCallback(() => {
    setLoading(true);
    getAnalytics({
      office: office || undefined,
      date_from: dateFrom || undefined,
      date_to: dateTo || undefined,
    })
      .then((d) => {
        setData(d);
        setError("");
      })
      .catch((e) => setError(e?.message ?? "Could not load analytics"))
      .finally(() => setLoading(false));
  }, [office, dateFrom, dateTo]);

  useEffect(() => {
    getReference().then(setReference).catch(() => undefined);
  }, []);

  useEffect(() => {
    fetch();
  }, [fetch]);

  return (
    <>
      <PageHeader
        title="Analytics"
        subtitle={
          user?.role === "admin"
            ? "Cross-office performance and utilization trends."
            : `Performance overview for ${user?.assigned_office ?? "your office"}.`
        }
      />

      <div className="filter-bar">
        {user?.role === "admin" && reference && (
          <div className="field">
            <label className="field-label">Office</label>
            <select
              className="select"
              value={office}
              onChange={(e) => setOffice(e.target.value)}
            >
              <option value="">All offices</option>
              {reference.offices.map((o) => (
                <option key={o} value={o}>{o}</option>
              ))}
            </select>
          </div>
        )}
        <div className="field">
          <label className="field-label">From</label>
          <input
            type="date"
            className="input"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
          />
        </div>
        <div className="field">
          <label className="field-label">To</label>
          <input
            type="date"
            className="input"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
          />
        </div>
        <div className="filter-actions">
          <button
            className="btn btn-secondary btn-sm"
            onClick={() => {
              setOffice("");
              setDateFrom("");
              setDateTo("");
            }}
          >
            Reset
          </button>
        </div>
      </div>

      {error && <div className="banner banner-error">{error}</div>}
      {loading && !data && <p className="muted">Loading analytics…</p>}

      {data && (
        <>
          <div className="stats-grid">
            <StatCard
              label="Total records"
              value={data.kpis.total_records}
              subtitle="in selected range"
            />
            <StatCard
              label="Unique students"
              value={data.kpis.unique_students}
              subtitle="served"
            />
            <StatCard
              label="Services used"
              value={data.kpis.active_services_used}
              subtitle="distinct"
            />
          </div>

          <div className="chart-grid">
            {/* Trend over time */}
            <Panel
              title="Monthly trend"
              subtitle="Records per month in the selected range"
            >
              {data.by_month.length === 0 ? (
                <EmptyChart />
              ) : (
                <ResponsiveContainer width="100%" height={280}>
                  <LineChart data={data.by_month}>
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
            </Panel>

            {/* By office */}
            {user?.role === "admin" && (
              <Panel
                title="By office"
                subtitle="Where the records are coming from"
              >
                {data.by_office.length === 0 ? (
                  <EmptyChart />
                ) : (
                  <ResponsiveContainer width="100%" height={280}>
                    <BarChart data={data.by_office} layout="vertical">
                      <CartesianGrid stroke="#E5E8EE" strokeDasharray="3 3" />
                      <XAxis type="number" stroke="#6B7280" fontSize={12} allowDecimals={false} />
                      <YAxis dataKey="label" type="category" width={140} stroke="#6B7280" fontSize={12} />
                      <Tooltip />
                      <Bar dataKey="count" fill="#0B1F3A" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </Panel>
            )}

            {/* By department */}
            <Panel title="By department" subtitle="Top requesting programs">
              {data.by_department.length === 0 ? (
                <EmptyChart />
              ) : (
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={data.by_department}>
                    <CartesianGrid stroke="#E5E8EE" strokeDasharray="3 3" />
                    <XAxis dataKey="label" stroke="#6B7280" fontSize={12} />
                    <YAxis stroke="#6B7280" fontSize={12} allowDecimals={false} />
                    <Tooltip />
                    <Bar dataKey="count" fill="#D4AF37" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </Panel>

            {/* By day of week */}
            <Panel title="By day of week" subtitle="Weekly distribution">
              <ResponsiveContainer width="100%" height={280}>
                <BarChart
                  data={data.by_day_of_week.map((b) => ({
                    ...b,
                    short: b.label.slice(0, 3),
                  }))}
                >
                  <CartesianGrid stroke="#E5E8EE" strokeDasharray="3 3" />
                  <XAxis dataKey="short" stroke="#6B7280" fontSize={12} />
                  <YAxis stroke="#6B7280" fontSize={12} allowDecimals={false} />
                  <Tooltip />
                  <Bar dataKey="count" fill="#1A3460" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </Panel>

            {/* By hour of day */}
            <Panel title="By hour of day" subtitle="Peak service hours">
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={data.by_hour}>
                  <CartesianGrid stroke="#E5E8EE" strokeDasharray="3 3" />
                  <XAxis dataKey="hour" stroke="#6B7280" fontSize={12} />
                  <YAxis stroke="#6B7280" fontSize={12} allowDecimals={false} />
                  <Tooltip />
                  <Bar dataKey="count" fill="#243E6E" radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </Panel>
          </div>
        </>
      )}
    </>
  );
}

function EmptyChart() {
  return (
    <div
      style={{
        height: 280,
        display: "grid",
        placeItems: "center",
        color: "var(--color-text-subtle)",
        fontSize: 14,
      }}
    >
      No data for this range
    </div>
  );
}
