import { useCallback, useEffect, useState } from "react";
import { Pagination } from "./Pagination";
import { getUploadPreview, type UploadPreview } from "../api/uploads";

interface Props {
  uploadId: number;
  /** Rows per page. Smaller (e.g. 25) for modal, larger for full page. */
  pageSize?: number;
  /** Maximum height of the scroll area. Defaults to "auto". */
  maxHeight?: number | string;
  /** Show the file metadata header above the table. */
  showHeader?: boolean;
}

function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

export function UploadPreviewTable({
  uploadId,
  pageSize = 25,
  maxHeight,
  showHeader = false,
}: Props) {
  const [data, setData] = useState<UploadPreview | null>(null);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetch = useCallback(() => {
    setLoading(true);
    getUploadPreview(uploadId, page, pageSize)
      .then((d) => {
        setData(d);
        setError("");
      })
      .catch((e) => setError(e?.message ?? "Could not load preview"))
      .finally(() => setLoading(false));
  }, [uploadId, page, pageSize]);

  useEffect(() => {
    fetch();
  }, [fetch]);

  if (loading && !data) {
    return <p className="muted">Loading preview…</p>;
  }
  if (error) {
    return <div className="banner banner-error">{error}</div>;
  }
  if (!data) {
    return null;
  }

  return (
    <>
      {showHeader && (
        <div
          className="card"
          style={{
            padding: "var(--space-4) var(--space-5)",
            marginBottom: "var(--space-4)",
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
            gap: "var(--space-3)",
          }}
        >
          <Field label="Filename" value={data.filename} />
          <Field label="Office" value={data.office ?? "—"} />
          <Field label="Size" value={formatBytes(data.size_bytes)} />
          <Field label="Total rows" value={String(data.total_rows)} />
          <Field label="Uploaded by" value={data.uploaded_by} />
          <Field
            label="When"
            value={
              data.uploaded_at
                ? new Date(data.uploaded_at).toLocaleString()
                : "—"
            }
          />
        </div>
      )}

      <div className="data-table-wrapper">
        <div
          className="data-table-scroll"
          style={maxHeight ? { maxHeight, overflowY: "auto" } : undefined}
        >
          <table className="data-table">
            <thead>
              <tr>
                <th style={{ width: 40 }}>#</th>
                {data.columns.map((col) => (
                  <th key={col}>{col}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.rows.length === 0 ? (
                <tr>
                  <td colSpan={data.columns.length + 1} className="empty-state">
                    No rows in this file.
                  </td>
                </tr>
              ) : (
                data.rows.map((row, i) => {
                  const rowNum = (data.page - 1) * data.page_size + i + 1;
                  return (
                    <tr key={i}>
                      <td className="muted tiny">{rowNum}</td>
                      {data.columns.map((col) => {
                        const v = row[col];
                        const display =
                          v === null || v === undefined
                            ? "—"
                            : typeof v === "boolean"
                              ? String(v)
                              : String(v);
                        return (
                          <td
                            key={col}
                            style={{
                              maxWidth: 240,
                              whiteSpace: "nowrap",
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              color:
                                v === null || v === undefined
                                  ? "var(--color-text-subtle)"
                                  : undefined,
                            }}
                            title={display}
                          >
                            {display}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
        {data.total_pages > 1 && (
          <Pagination
            page={data.page}
            pageSize={data.page_size}
            total={data.total_rows}
            onPageChange={setPage}
          />
        )}
      </div>
    </>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="stat-label">{label}</div>
      <div
        style={{
          fontSize: 14,
          fontWeight: 500,
          color: "var(--color-text)",
          marginTop: 2,
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
        }}
      >
        {value}
      </div>
    </div>
  );
}
