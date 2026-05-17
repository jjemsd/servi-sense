import { useCallback, useEffect, useState } from "react";
import { useAuth } from "../auth/AuthContext";
import { ConfirmDialog } from "../components/ConfirmDialog";
import { PageHeader } from "../components/PageHeader";
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

  return (
    <>
      <PageHeader
        title="Bulk Upload"
        subtitle="Import service records from a CSV or Excel file."
      />

      {/* Drop zone */}
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
        <div style={{ marginBottom: "var(--space-3)", color: "var(--color-text-muted)" }}>
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

      <div className="card" style={{ padding: "var(--space-5)", marginBottom: "var(--space-5)" }}>
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
                  <option key={o} value={o}>{o}</option>
                ))}
              </select>
              <div className="field-hint">
                Every row's <code>service_name</code> column must match this office.
              </div>
            </div>
          ) : (
            <div className="field field-wide">
              <label className="field-label">Target office</label>
              <div
                className="input"
                style={{ background: "var(--color-surface-alt)", color: "var(--color-text-muted)" }}
              >
                {user?.assigned_office ?? "—"}
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

      {error && <div className="banner banner-error" style={{ marginBottom: "var(--space-4)" }}>{error}</div>}

      {/* Result */}
      {result && (
        <div className="upload-result-card" style={{ marginBottom: "var(--space-6)" }}>
          <div className="upload-result-stats">
            <div className="upload-result-stat">
              <div className="stat-label">Total rows</div>
              <div className="stat-value">{result.total_rows}</div>
            </div>
            <div className="upload-result-stat">
              <div className="stat-label">Inserted</div>
              <div className="stat-value" style={{ color: "var(--color-success)" }}>
                {result.inserted}
              </div>
            </div>
            <div className="upload-result-stat">
              <div className="stat-label">Errors</div>
              <div className="stat-value" style={{ color: "var(--color-warning)" }}>
                {result.errors.length}
              </div>
            </div>
          </div>
          {result.errors.length > 0 && (
            <div className="upload-errors-list">
              <strong>Skipped rows</strong>
              <ul>
                {result.errors.map((err, i) => (
                  <li key={i}>{err}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

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
