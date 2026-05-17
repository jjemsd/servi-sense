import { useEffect, useState, type FormEvent } from "react";
import { useAuth } from "../auth/AuthContext";
import { ConfirmDialog } from "../components/ConfirmDialog";
import { Modal } from "../components/Modal";
import { PageHeader } from "../components/PageHeader";
import {
  createUser,
  deleteUser,
  listUsers,
  resetPassword,
  updateUser,
} from "../api/users";
import { getReference } from "../api/reference";
import type {
  ReferenceData,
  Role,
  User,
  UserCreate,
  UserUpdate,
} from "../types/api";

export function UsersPage() {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [reference, setReference] = useState<ReferenceData | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState<User | null>(null);
  const [resetting, setResetting] = useState<User | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<User | null>(null);

  const refresh = () => {
    setLoading(true);
    listUsers()
      .then(setUsers)
      .catch((e) => setError(e?.message ?? "Could not load users"))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    refresh();
    getReference().then(setReference).catch(() => undefined);
  }, []);

  const handleCreate = async (payload: UserCreate) => {
    await createUser(payload);
    setAdding(false);
    refresh();
  };

  const handleUpdate = async (id: number, payload: UserUpdate) => {
    await updateUser(id, payload);
    setEditing(null);
    refresh();
  };

  const handleResetPassword = async (id: number, newPassword: string) => {
    await resetPassword(id, newPassword);
    setResetting(null);
  };

  const handleDelete = async () => {
    if (!confirmDelete) return;
    try {
      await deleteUser(confirmDelete.id);
      setConfirmDelete(null);
      refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not delete user");
      setConfirmDelete(null);
    }
  };

  return (
    <>
      <PageHeader
        title="User Management"
        subtitle="Add, edit, deactivate, or reset passwords for system users."
        actions={
          <button className="btn btn-primary" onClick={() => setAdding(true)}>
            + Add user
          </button>
        }
      />

      {error && <div className="banner banner-error">{error}</div>}

      <div className="data-table-wrapper">
        <div className="data-table-scroll">
          <table className="data-table">
            <thead>
              <tr>
                <th>Username</th>
                <th>Full name</th>
                <th>Email</th>
                <th>Role</th>
                <th>Office</th>
                <th>Status</th>
                <th className="col-actions">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr><td colSpan={7} className="empty-state">Loading…</td></tr>
              )}
              {!loading && users.length === 0 && (
                <tr><td colSpan={7} className="empty-state">No users.</td></tr>
              )}
              {!loading && users.map((u) => (
                <tr key={u.id} style={{ opacity: u.is_active ? 1 : 0.55 }}>
                  <td style={{ fontWeight: 500 }}>
                    {u.username}
                    {u.id === currentUser?.id && (
                      <span className="muted tiny"> (you)</span>
                    )}
                  </td>
                  <td>{u.full_name ?? "—"}</td>
                  <td className="muted tiny">{u.email ?? "—"}</td>
                  <td>
                    <span className={`badge ${u.role === "admin" ? "badge-gold" : "badge-info"}`}>
                      {u.role}
                    </span>
                  </td>
                  <td>{u.assigned_office ?? "—"}</td>
                  <td>
                    <span className={`badge ${u.is_active ? "badge-success" : "badge-neutral"}`}>
                      {u.is_active ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td className="col-actions">
                    <div className="row-actions">
                      <button className="text-link" onClick={() => setEditing(u)}>
                        Edit
                      </button>
                      <button className="text-link" onClick={() => setResetting(u)}>
                        Reset password
                      </button>
                      {u.id !== currentUser?.id && (
                        <button
                          className="text-link text-link-danger"
                          onClick={() => setConfirmDelete(u)}
                        >
                          Delete
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {adding && reference && (
        <Modal isOpen onClose={() => setAdding(false)} title="Add user" size="md">
          <UserFormBody
            offices={reference.offices}
            onSubmit={handleCreate}
            onCancel={() => setAdding(false)}
            submitLabel="Create user"
          />
        </Modal>
      )}

      {editing && reference && (
        <Modal
          isOpen
          onClose={() => setEditing(null)}
          title={`Edit · ${editing.username}`}
          size="md"
        >
          <UserFormBody
            initial={editing}
            offices={reference.offices}
            onSubmit={(payload) => handleUpdate(editing.id, payload as UserUpdate)}
            onCancel={() => setEditing(null)}
            submitLabel="Save changes"
          />
        </Modal>
      )}

      {resetting && (
        <Modal
          isOpen
          onClose={() => setResetting(null)}
          title={`Reset password · ${resetting.username}`}
          size="sm"
        >
          <ResetPasswordBody
            onSubmit={(pw) => handleResetPassword(resetting.id, pw)}
            onCancel={() => setResetting(null)}
          />
        </Modal>
      )}

      <ConfirmDialog
        isOpen={confirmDelete !== null}
        title="Delete user?"
        message={
          confirmDelete
            ? `Permanently delete "${confirmDelete.username}". This will revoke their sessions.`
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

// ── User form body (add + edit) ─────────────────────────────────────────────
interface UserFormProps {
  initial?: User;
  offices: string[];
  submitLabel: string;
  onSubmit: (payload: UserCreate) => Promise<void>;
  onCancel: () => void;
}

function UserFormBody({
  initial,
  offices,
  submitLabel,
  onSubmit,
  onCancel,
}: UserFormProps) {
  const isEdit = !!initial;
  const [username, setUsername] = useState(initial?.username ?? "");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState(initial?.full_name ?? "");
  const [email, setEmail] = useState(initial?.email ?? "");
  const [role, setRole] = useState<Role>((initial?.role as Role) ?? "staff");
  const [office, setOffice] = useState(initial?.assigned_office ?? "");
  const [isActive, setIsActive] = useState(initial?.is_active ?? true);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      const payload: UserCreate = {
        username: username.trim(),
        password,
        role,
        full_name: fullName || undefined,
        email: email || undefined,
        assigned_office: role === "staff" ? office : undefined,
      };
      // For edit, the API ignores username/password, so backend uses other fields.
      if (isEdit) {
        // Cast to UserUpdate-shaped object; client function in parent handles it.
        await onSubmit({
          ...payload,
          // omit password on edit (use reset-password flow instead)
          password: "",
        });
      } else {
        await onSubmit(payload);
      }
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
        <div className="field">
          <label className="field-label">Username *</label>
          <input
            className="input"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
            disabled={isEdit}
            minLength={3}
            maxLength={50}
            pattern="[a-zA-Z0-9_.\-]+"
          />
        </div>
        {!isEdit && (
          <div className="field">
            <label className="field-label">Password *</label>
            <input
              type="password"
              className="input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
            />
          </div>
        )}
        <div className="field">
          <label className="field-label">Full name</label>
          <input
            className="input"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
          />
        </div>
        <div className="field">
          <label className="field-label">Email</label>
          <input
            type="email"
            className="input"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>
        <div className="field">
          <label className="field-label">Role *</label>
          <select
            className="select"
            value={role}
            onChange={(e) => setRole(e.target.value as Role)}
          >
            <option value="staff">Staff</option>
            <option value="admin">Admin</option>
          </select>
        </div>
        {role === "staff" && (
          <div className="field">
            <label className="field-label">Assigned office *</label>
            <select
              className="select"
              value={office}
              onChange={(e) => setOffice(e.target.value)}
              required
            >
              <option value="">— Choose —</option>
              {offices.map((o) => (
                <option key={o} value={o}>{o}</option>
              ))}
            </select>
          </div>
        )}
        {isEdit && (
          <div className="field">
            <label className="field-label">Status</label>
            <select
              className="select"
              value={isActive ? "1" : "0"}
              onChange={(e) => setIsActive(e.target.value === "1")}
            >
              <option value="1">Active</option>
              <option value="0">Inactive</option>
            </select>
          </div>
        )}
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
        <button type="submit" className="btn btn-primary" disabled={busy}>
          {busy ? "Saving…" : submitLabel}
        </button>
      </div>
    </form>
  );
}

// ── Reset password body ──────────────────────────────────────────────────────
function ResetPasswordBody({
  onSubmit,
  onCancel,
}: {
  onSubmit: (newPassword: string) => Promise<void>;
  onCancel: () => void;
}) {
  const [pw, setPw] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (pw.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }
    setBusy(true);
    try {
      await onSubmit(pw);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not reset");
    } finally {
      setBusy(false);
    }
  };

  return (
    <form className="entity-form" onSubmit={submit}>
      {error && <div className="banner banner-error">{error}</div>}
      <div className="field">
        <label className="field-label">New password *</label>
        <input
          type="password"
          className="input"
          value={pw}
          onChange={(e) => setPw(e.target.value)}
          minLength={6}
          required
          autoFocus
        />
        <div className="field-hint">
          The user's existing sessions will be revoked. They will need to sign in again.
        </div>
      </div>
      <div className="form-actions">
        <button type="button" className="btn btn-secondary" onClick={onCancel} disabled={busy}>
          Cancel
        </button>
        <button type="submit" className="btn btn-primary" disabled={busy}>
          {busy ? "Resetting…" : "Reset password"}
        </button>
      </div>
    </form>
  );
}
