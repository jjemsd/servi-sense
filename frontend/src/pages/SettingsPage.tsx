import { useEffect, useState, type FormEvent } from "react";
import { ConfirmDialog } from "../components/ConfirmDialog";
import { Modal } from "../components/Modal";
import { PageHeader } from "../components/PageHeader";
import {
  createService,
  deleteService,
  listServices,
  updateService,
} from "../api/services";
import { getReference } from "../api/reference";
import type {
  ReferenceData,
  Service,
  ServiceCategory,
  ServiceCreate,
  ServiceUpdate,
} from "../types/api";

export function SettingsPage() {
  const [services, setServices] = useState<Service[]>([]);
  const [reference, setReference] = useState<ReferenceData | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const [editing, setEditing] = useState<Service | null>(null);
  const [adding, setAdding] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<Service | null>(null);

  const refresh = () => {
    setLoading(true);
    listServices(true)
      .then(setServices)
      .catch((e) => setError(e?.message ?? "Could not load services"))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    refresh();
    getReference().then(setReference).catch(() => undefined);
  }, []);

  const handleCreate = async (payload: ServiceCreate) => {
    await createService(payload);
    setAdding(false);
    refresh();
  };

  const handleUpdate = async (id: number, payload: ServiceUpdate) => {
    await updateService(id, payload);
    setEditing(null);
    refresh();
  };

  const handleToggleActive = async (s: Service) => {
    try {
      await updateService(s.id, { is_active: !s.is_active });
      refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not update service");
    }
  };

  const handleDelete = async () => {
    if (!confirmDelete) return;
    try {
      await deleteService(confirmDelete.id);
      setConfirmDelete(null);
      refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not delete service");
      setConfirmDelete(null);
    }
  };

  return (
    <>
      <PageHeader
        title="System Settings"
        subtitle="Manage the services catalog. Renaming a service automatically updates every existing record and staff assignment."
        actions={
          <button
            className="btn btn-primary"
            onClick={() => setAdding(true)}
            disabled={!reference}
          >
            + Add service
          </button>
        }
      />

      {error && <div className="banner banner-error">{error}</div>}

      <div className="data-table-wrapper">
        <div className="data-table-scroll">
          <table className="data-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Category</th>
                <th>Description</th>
                <th>Status</th>
                <th className="col-actions">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr><td colSpan={5} className="empty-state">Loading…</td></tr>
              )}
              {!loading && services.length === 0 && (
                <tr><td colSpan={5} className="empty-state">No services yet.</td></tr>
              )}
              {!loading && services.map((s) => (
                <tr key={s.id} style={{ opacity: s.is_active ? 1 : 0.55 }}>
                  <td style={{ fontWeight: 500 }}>{s.name}</td>
                  <td>{s.category}</td>
                  <td className="muted tiny">{s.description ?? "—"}</td>
                  <td>
                    <span className={`badge ${s.is_active ? "badge-success" : "badge-neutral"}`}>
                      {s.is_active ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td className="col-actions">
                    <div className="row-actions">
                      <button className="text-link" onClick={() => setEditing(s)}>
                        Edit
                      </button>
                      <button className="text-link" onClick={() => handleToggleActive(s)}>
                        {s.is_active ? "Deactivate" : "Activate"}
                      </button>
                      <button
                        className="text-link text-link-danger"
                        onClick={() => setConfirmDelete(s)}
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

      {/* Add modal */}
      {adding && reference && (
        <Modal
          isOpen
          onClose={() => setAdding(false)}
          title="Add service"
          size="md"
        >
          <ServiceFormBody
            categories={reference.service_categories}
            onSubmit={handleCreate}
            onCancel={() => setAdding(false)}
            submitLabel="Create service"
          />
        </Modal>
      )}

      {/* Edit modal */}
      {editing && reference && (
        <Modal
          isOpen
          onClose={() => setEditing(null)}
          title={`Edit · ${editing.name}`}
          size="md"
        >
          <ServiceFormBody
            initial={editing}
            categories={reference.service_categories}
            onSubmit={(payload) => handleUpdate(editing.id, payload)}
            onCancel={() => setEditing(null)}
            submitLabel="Save changes"
          />
        </Modal>
      )}

      <ConfirmDialog
        isOpen={confirmDelete !== null}
        title="Delete service?"
        message={
          confirmDelete
            ? `Permanently delete "${confirmDelete.name}". This will fail if any records reference it — in that case, deactivate it instead.`
            : ""
        }
        danger
        confirmLabel="Delete"
        onConfirm={handleDelete}
        onCancel={() => setConfirmDelete(null)}
      />
    </>
  );
}

interface ServiceFormProps {
  initial?: Service;
  categories: string[];
  submitLabel: string;
  onSubmit: (payload: ServiceCreate) => Promise<void>;
  onCancel: () => void;
}

function ServiceFormBody({
  initial,
  categories,
  submitLabel,
  onSubmit,
  onCancel,
}: ServiceFormProps) {
  const [name, setName] = useState(initial?.name ?? "");
  const [category, setCategory] = useState<ServiceCategory>(
    (initial?.category as ServiceCategory) ?? "Other",
  );
  const [description, setDescription] = useState(initial?.description ?? "");
  const [isActive, setIsActive] = useState(initial?.is_active ?? true);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      await onSubmit({
        name: name.trim(),
        category,
        description: description.trim() || undefined,
        is_active: isActive,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save");
    } finally {
      setBusy(false);
    }
  };

  return (
    <form className="entity-form" onSubmit={submit}>
      {error && <div className="banner banner-error">{error}</div>}
      <div className="form-grid">
        <div className="field field-full">
          <label className="field-label">Name *</label>
          <input
            className="input"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            minLength={2}
            maxLength={80}
          />
        </div>
        <div className="field">
          <label className="field-label">Category *</label>
          <select
            className="select"
            value={category}
            onChange={(e) => setCategory(e.target.value as ServiceCategory)}
          >
            {categories.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>
        <div className="field">
          <label className="field-label">Active</label>
          <select
            className="select"
            value={isActive ? "1" : "0"}
            onChange={(e) => setIsActive(e.target.value === "1")}
          >
            <option value="1">Active</option>
            <option value="0">Inactive</option>
          </select>
        </div>
        <div className="field field-full">
          <label className="field-label">Description</label>
          <textarea
            className="textarea"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            maxLength={500}
          />
        </div>
      </div>
      <div className="form-actions">
        <button
          type="button"
          className="btn btn-secondary"
          onClick={onCancel}
          disabled={busy}
        >
          Cancel
        </button>
        <button
          type="submit"
          className="btn btn-primary"
          disabled={busy}
        >
          {busy ? "Saving…" : submitLabel}
        </button>
      </div>
    </form>
  );
}
