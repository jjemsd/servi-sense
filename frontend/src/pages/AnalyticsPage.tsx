import { useCallback, useEffect, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
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

// Brand palette — one color per office series.
const PALETTE = [
  "#0B1F3A",
  "#D4AF37",
  "#1A3460",
  "#8B6914",
  "#243E6E",
  "#E8CC6A",
  "#5A7FBF",
  "#0F8A5F",
  "#B7791F",
  "#5A6B8C",
];

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

  // Office series for the comparison charts. When more than one office is
  // present (admin viewing "All offices"), charts render one series per
  // office with a legend. With a single office (staff, or a specific office
  // selected) the charts collapse to a single series and the legend hides.
  const offices = data?.series_offices ?? [];
  const multi = offices.length > 1;

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
            {/* Trend over time — one line per office when comparing */}
            <Panel
              title="Monthly trend"
              subtitle={
                multi
                  ? "Records per month, compared across offices"
                  : "Records per month in the selected range"
              }
            >
              {data.by_month.length === 0 ? (
                <EmptyChart />
              ) : (
                <ResponsiveContainer width="100%" height={280}>
                  <LineChart data={data.by_month_by_office}>
                    <CartesianGrid stroke="#E5E8EE" strokeDasharray="3 3" />
                    <XAxis dataKey="label" stroke="#6B7280" fontSize={12} />
                    <YAxis stroke="#6B7280" fontSize={12} allowDecimals={false} />
                    <Tooltip />
                    {multi && <Legend wrapperStyle={{ fontSize: 12 }} />}
                    {offices.map((office, i) => (
                      <Line
                        key={office}
                        type="monotone"
                        dataKey={office}
                        stroke={PALETTE[i % PALETTE.length]}
                        strokeWidth={2.5}
                        dot={{ r: 3 }}
                      />
                    ))}
                  </LineChart>
                </ResponsiveContainer>
              )}
            </Panel>

            {/* By office — the overall comparison (admin only) */}
            {user?.role === "admin" && (
              <Panel
                title="By office"
                subtitle="Total records per office"
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
                      <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                        {data.by_office.map((_, i) => (
                          <Cell key={i} fill={PALETTE[i % PALETTE.length]} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </Panel>
            )}

            {/* By department — stacked by office */}
            <Panel
              title="By department"
              subtitle={
                multi
                  ? "Requesting programs, stacked by office"
                  : "Top requesting programs"
              }
            >
              {data.by_department.length === 0 ? (
                <EmptyChart />
              ) : (
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={data.by_department_by_office}>
                    <CartesianGrid stroke="#E5E8EE" strokeDasharray="3 3" />
                    <XAxis dataKey="label" stroke="#6B7280" fontSize={12} />
                    <YAxis stroke="#6B7280" fontSize={12} allowDecimals={false} />
                    <Tooltip />
                    {multi && <Legend wrapperStyle={{ fontSize: 12 }} />}
                    {offices.map((office, i) => (
                      <Bar
                        key={office}
                        dataKey={office}
                        stackId="dept"
                        fill={PALETTE[i % PALETTE.length]}
                      />
                    ))}
                  </BarChart>
                </ResponsiveContainer>
              )}
            </Panel>

            {/* By day of week — stacked by office */}
            <Panel
              title="By day of week"
              subtitle={
                multi ? "Weekly distribution, by office" : "Weekly distribution"
              }
            >
              <ResponsiveContainer width="100%" height={280}>
                <BarChart
                  data={data.by_dow_by_office.map((b) => ({
                    ...b,
                    short: String(b.label).slice(0, 3),
                  }))}
                >
                  <CartesianGrid stroke="#E5E8EE" strokeDasharray="3 3" />
                  <XAxis dataKey="short" stroke="#6B7280" fontSize={12} />
                  <YAxis stroke="#6B7280" fontSize={12} allowDecimals={false} />
                  <Tooltip />
                  {multi && <Legend wrapperStyle={{ fontSize: 12 }} />}
                  {offices.map((office, i) => (
                    <Bar
                      key={office}
                      dataKey={office}
                      stackId="dow"
                      fill={PALETTE[i % PALETTE.length]}
                    />
                  ))}
                </BarChart>
              </ResponsiveContainer>
            </Panel>

            {/* By hour of day — stacked by office */}
            <Panel
              title="By hour of day"
              subtitle={
                multi ? "Peak service hours, by office" : "Peak service hours"
              }
            >
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={data.by_hour_by_office}>
                  <CartesianGrid stroke="#E5E8EE" strokeDasharray="3 3" />
                  <XAxis dataKey="hour" stroke="#6B7280" fontSize={12} />
                  <YAxis stroke="#6B7280" fontSize={12} allowDecimals={false} />
                  <Tooltip />
                  {multi && <Legend wrapperStyle={{ fontSize: 12 }} />}
                  {offices.map((office, i) => (
                    <Bar
                      key={office}
                      dataKey={office}
                      stackId="hour"
                      fill={PALETTE[i % PALETTE.length]}
                    />
                  ))}
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
