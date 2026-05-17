import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { ConfirmDialog } from "../components/ConfirmDialog";
import { Modal } from "../components/Modal";
import { PageHeader } from "../components/PageHeader";
import { UploadPreviewTable } from "../components/UploadPreviewTable";
import {
  deleteUpload,
  downloadUpload,
  listUploads,
  uploadFile,
} from "../api/uploads";
import { getReference } from "../api/reference";
import type {
  ReferenceData,
  UploadProcessResult,
  UploadedFile,
} from "../types/api";

function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

// ── Expected columns reference — single source of truth for the help panel ──
interface ColumnSpec {
  name: string;
  required: boolean;
  description: string;
  example: string;
}

const EXPECTED_COLUMNS: ColumnSpec[] = [
  { name: "service_date", required: true, description: "Date of the interaction", example: "2026-05-15" },
  { name: "student_id", required: true, description: "Unique student identifier", example: "2024-00123" },
  { name: "student_name", required: true, description: "Full name of the student", example: "Juan Dela Cruz" },
  { name: "service_name", required: true, description: "Must match the target office below", example: "Library" },
  { name: "time", required: false, description: "Time of service in 24-hour format", example: "10:30:00" },
  { name: "year_level", required: false, description: "1st Year, 2nd Year, …, 5th Year", example: "3rd Year" },
  { name: "department", required: false, description: "Student's program", example: "BSIT" },
  { name: "status", required: false, description: "Completed, In Progress, Cancelled, No Show. Defaults to Completed.", example: "Completed" },
  { name: "response_time_minutes", required: false, description: "How long the service took, in minutes", example: "12" },
  { name: "satisfaction_rating", required: false, description: "Integer 1–5", example: "5" },
  { name: "notes", required: false, description: "Optional free-text", example: "Borrowed thesis reference" },
];

// ── Detect a uniform "office mismatch" failure pattern in row errors ────────
//
// When a user uploads a file whose every row is for a different office than
// the target, we get N copies of the same error. Showing all of them as a
// scrollable list is overwhelming; we instead detect the pattern and present
// a single friendly summary banner.
const OFFICE_MISMATCH_RE = /service '([^']+)' does not match upload office '([^']+)'/;

interface ErrorPattern {
  type: "office-mismatch";
  fileOffice: string;
  uploadOffice: string;
  rowCount: number;
}

function detectErrorPattern(errors: string[]): ErrorPattern | null {
  if (errors.length === 0) return null;
  const first = errors[0].match(OFFICE_MISMATCH_RE);
  if (!first) return null;
  const [, fileOffice, uploadOffice] = first;
  // All errors must share the same office mismatch
  const allMatch = errors.every((e) => {
    const m = e.match(OFFICE_MISMATCH_RE);
    return m && m[1] === fileOffice && m[2] === uploadOffice;
  });
  if (!allMatch) return null;
  return {
    type: "office-mismatch",
    fileOffice,
    uploadOffice,
    rowCount: errors.length,
  };
}

export function UploadPage() {
  const { user } = useAuth();
  const [file, setFile] = useState<File | null>(null);
  const [targetOffice, setTargetOffice] = useState("");
  const [dragOver, setDragOver] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState<UploadProcessResult | null>(null);
  const [error, setError] = useState("");
  const [reference, setReference] = useState<ReferenceData | null>(null);
  const [uploads, setUploads] = useState<UploadedFile[]>([]);
  const [confirmDelete, setConfirmDelete] = useState<UploadedFile | null>(null);
  const [previewing, setPreviewing] = useState<UploadedFile | null>(null);
  const [helpOpen, setHelpOpen] = useState(true);

  const refresh = useCallback(() => {
    listUploads().then(setUploads).catch(() => undefined);
  }, []);

  useEffect(() => {
    getReference().then(setReference).catch(() => undefined);
    refresh();
  }, [refresh]);

  const handleUpload = async () => {
    if (!file) {
      setError("Choose a CSV or Excel file first.");
      return;
    }
    if (user?.role === "admin" && !targetOffice) {
      setError("Pick a target office.");
      return;
    }
    setUploading(true);
    setError("");
    setResult(null);
    try {
      const office = user?.role === "admin" ? targetOffice : undefined;
      const r = await uploadFile(file, office);
      setResult(r);
      setFile(null);
      refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const handleDownload = async (u: UploadedFile) => {
    try {
      const blob = await downloadUpload(u.id);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = u.filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Download failed");
    }
  };

  const handleDelete = async () => {
    if (!confirmDelete) return;
    await deleteUpload(confirmDelete.id);
    setConfirmDelete(null);
    refresh();
  };

  const pattern = result ? detectErrorPattern(result.errors) : null;

  return (
    <>
      <PageHeader
        title="Bulk Upload"
        subtitle="Import service records from a CSV or Excel file."
      />

      {/* ── Help panel: expected columns ───────────────────────────────── */}
      <div className="card" style={{ marginBottom: "var(--space-5)" }}>
        <button
          type="button"
          onClick={() => setHelpOpen((v) => !v)}
          style={{
            width: "100%",
            background: "transparent",
            border: "none",
            padding: "var(--space-4) var(--space-5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            cursor: "pointer",
            color: "var(--color-text)",
            fontFamily: "inherit",
          }}
        >
          <span style={{ fontWeight: 600, fontSize: 15 }}>
            ⓘ Expected file format
          </span>
          <span className="muted tiny">
            {helpOpen ? "Hide" : "Show"}
          </span>
        </button>
        {helpOpen && (
          <div
            style={{
              padding: "0 var(--space-5) var(--space-5)",
              borderTop: "1px solid var(--color-border)",
            }}
          >
            <p className="muted" style={{ margin: "var(--space-3) 0" }}>
              Your file must be a <code>.csv</code>, <code>.xlsx</code>, or{" "}
              <code>.xls</code> with the columns below. Column names are
              case-insensitive; extra columns are ignored.
            </p>

            <div
              className="data-table-wrapper"
              style={{ marginBottom: "var(--space-3)" }}
            >
              <div className="data-table-scroll">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Column</th>
                      <th>Required</th>
                      <th>Description</th>
                      <th>Example</th>
                    </tr>
                  </thead>
                  <tbody>
                    {EXPECTED_COLUMNS.map((c) => (
                      <tr key={c.name}>
                        <td>
                          <code style={{ fontSize: 13 }}>{c.name}</code>
                        </td>
                        <td>
                          <span
                            className={`badge ${c.required ? "badge-gold" : "badge-neutral"}`}
                          >
                            {c.required ? "Required" : "Optional"}
                          </span>
                        </td>
                        <td>{c.description}</td>
                        <td className="muted tiny">
                          <code>{c.example}</code>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <p className="muted tiny" style={{ margin: 0 }}>
              <strong>Important:</strong> every row's <code>service_name</code>{" "}
              must match the <strong>Target office</strong> you select below.
              Files mixing multiple offices need to be split, or uploaded as
              admin one office at a time.
            </p>
          </div>
        )}
      </div>

      {/* ── Drop zone ──────────────────────────────────────────────────── */}
      <div
        className={`upload-dropzone ${dragOver ? "is-drag" : ""}`}
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          const f = e.dataTransfer.files[0];
          if (f) setFile(f);
        }}
        style={{ marginBottom: "var(--space-4)" }}
      >
        <div
          style={{
            marginBottom: "var(--space-3)",
            color: "var(--color-text-muted)",
          }}
        >
          Drag &amp; drop a file here, or
        </div>
        <input
          id="upload-input"
          type="file"
          accept=".csv,.xls,.xlsx"
          style={{ display: "none" }}
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
        />
        <label htmlFor="upload-input" className="btn btn-secondary">
          Choose file
        </label>
        {file && (
          <div style={{ marginTop: "var(--space-3)" }}>
            <strong>{file.name}</strong>
            <span className="muted tiny"> · {formatBytes(file.size)}</span>
          </div>
        )}
      </div>

      <div
        className="card"
        style={{
          padding: "var(--space-5)",
          marginBottom: "var(--space-5)",
        }}
      >
        <div className="form-grid">
          {user?.role === "admin" ? (
            <div className="field field-wide">
              <label className="field-label">Target office *</label>
              <select
                className="select"
                value={targetOffice}
                onChange={(e) => setTargetOffice(e.target.value)}
              >
                <option value="">— Choose —</option>
                {reference?.offices.map((o) => (
                  <option key={o} value={o}>
                    {o}
                  </option>
                ))}
              </select>
              <div className="field-hint">
                Every row's <code>service_name</code> column must match this
                office.
              </div>
            </div>
          ) : (
            <div className="field field-wide">
              <label className="field-label">Target office</label>
              <div
                className="input"
                style={{
                  background: "var(--color-surface-alt)",
                  color: "var(--color-text-muted)",
                }}
              >
                {user?.assigned_office ?? "—"}
              </div>
              <div className="field-hint">
                You're locked to your assigned office. Every row's{" "}
                <code>service_name</code> must equal{" "}
                <strong>{user?.assigned_office}</strong>.
              </div>
            </div>
          )}
        </div>

        <div className="form-actions">
          <button
            type="button"
            className="btn btn-primary"
            disabled={!file || uploading}
            onClick={handleUpload}
          >
            {uploading ? "Uploading…" : "Upload & process"}
          </button>
        </div>
      </div>

      {error && (
        <div
          className="banner banner-error"
          style={{ marginBottom: "var(--space-4)" }}
        >
          {error}
        </div>
      )}

      {/* ── Result ─────────────────────────────────────────────────────── */}
      {result && (
        <div
          className="upload-result-card"
          style={{ marginBottom: "var(--space-6)" }}
        >
          <div className="upload-result-stats">
            <div className="upload-result-stat">
              <div className="stat-label">Total rows</div>
              <div className="stat-value">{result.total_rows}</div>
            </div>
            <div className="upload-result-stat">
              <div className="stat-label">Inserted</div>
              <div
                className="stat-value"
                style={{
                  color:
                    result.inserted > 0
                      ? "var(--color-success)"
                      : "var(--color-text-subtle)",
                }}
              >
                {result.inserted}
              </div>
            </div>
            <div className="upload-result-stat">
              <div className="stat-label">Errors</div>
              <div
                className="stat-value"
                style={{
                  color:
                    result.errors.length > 0
                      ? "var(--color-warning)"
                      : "var(--color-text-subtle)",
                }}
              >
                {result.errors.length}
              </div>
            </div>
          </div>

          {/* Aggregated friendly summary for uniform failure patterns */}
          {pattern?.type === "office-mismatch" && (
            <div
              className="banner banner-error"
              style={{ marginBottom: "var(--space-3)" }}
            >
              <strong>
                This file looks like it's for the "{pattern.fileOffice}" office,
                but you uploaded it as "{pattern.uploadOffice}".
              </strong>
              <br />
              All {pattern.rowCount} rows reference{" "}
              <code>{pattern.fileOffice}</code> as their service. Either:
              <ul style={{ margin: "var(--space-2) 0 0 var(--space-5)" }}>
                {user?.role === "admin" ? (
                  <li>
                    Re-upload with target office set to{" "}
                    <strong>{pattern.fileOffice}</strong>, or
                  </li>
                ) : (
                  <li>
                    Ask an admin to upload it — staff accounts are locked to
                    their own office (<strong>{user?.assigned_office}</strong>).
                  </li>
                )}
                <li>
                  Edit the file so each row's <code>service_name</code> equals{" "}
                  <strong>{pattern.uploadOffice}</strong>.
                </li>
              </ul>
            </div>
          )}

          {/* Raw row-by-row errors (collapsible if pattern was detected) */}
          {result.errors.length > 0 && !pattern && (
            <div className="upload-errors-list">
              <strong>Skipped rows</strong>
              <ul>
                {result.errors.map((err, i) => (
                  <li key={i}>{err}</li>
                ))}
              </ul>
            </div>
          )}

          {result.errors.length > 0 && pattern && (
            <details>
              <summary
                style={{
                  cursor: "pointer",
                  color: "var(--color-text-muted)",
                  fontSize: 13,
                  marginTop: "var(--space-2)",
                }}
              >
                Show all {result.errors.length} row-level error messages
              </summary>
              <div
                className="upload-errors-list"
                style={{ marginTop: "var(--space-3)" }}
              >
                <ul>
                  {result.errors.map((err, i) => (
                    <li key={i}>{err}</li>
                  ))}
                </ul>
              </div>
            </details>
          )}
        </div>
      )}

      {/* ── Upload history ──────────────────────────────────────────────── */}
      <h3 className="section-heading">Previously uploaded files</h3>
      <div className="data-table-wrapper">
        <div className="data-table-scroll">
          <table className="data-table">
            <thead>
              <tr>
                <th>Filename</th>
                <th>Office</th>
                <th>Size</th>
                <th>Uploaded by</th>
                <th>When</th>
                <th className="col-actions">Actions</th>
              </tr>
            </thead>
            <tbody>
              {uploads.length === 0 && (
                <tr>
                  <td colSpan={6} className="empty-state">
                    No uploads yet.
                  </td>
                </tr>
              )}
              {uploads.map((u) => (
                <tr key={u.id}>
                  <td>{u.filename}</td>
                  <td>{u.office ?? "—"}</td>
                  <td className="muted tiny">{formatBytes(u.size_bytes)}</td>
                  <td>{u.uploaded_by}</td>
                  <td className="muted tiny">
                    {new Date(u.uploaded_at).toLocaleString()}
                  </td>
                  <td className="col-actions">
                    <div className="row-actions">
                      <button
                        className="text-link"
                        title="View contents"
                        onClick={() => setPreviewing(u)}
                      >
                        👁 View
                      </button>
                      <button
                        className="text-link"
                        onClick={() => handleDownload(u)}
                      >
                        Download
                      </button>
                      <button
                        className="text-link text-link-danger"
                        onClick={() => setConfirmDelete(u)}
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Preview modal ───────────────────────────────────────────────── */}
      {previewing && (
        <Modal
          isOpen
          onClose={() => setPreviewing(null)}
          title={`Preview · ${previewing.filename}`}
          size="lg"
          footer={
            <>
              <button
                className="btn btn-secondary"
                onClick={() => setPreviewing(null)}
              >
                Close
              </button>
              <Link
                to={`/uploads/${previewing.id}`}
                className="btn btn-primary"
                onClick={() => setPreviewing(null)}
              >
                Open full page →
              </Link>
            </>
          }
        >
          <UploadPreviewTable
            uploadId={previewing.id}
            pageSize={25}
            maxHeight="55vh"
          />
        </Modal>
      )}

      <ConfirmDialog
        isOpen={confirmDelete !== null}
        title="Delete this upload?"
        message={
          confirmDelete
            ? `This will remove the file "${confirmDelete.filename}" from the audit trail. Records already imported from it are NOT removed.`
            : ""
        }
        confirmLabel="Delete file"
        danger
        onConfirm={handleDelete}
        onCancel={() => setConfirmDelete(null)}
      />
    </>
  );
}