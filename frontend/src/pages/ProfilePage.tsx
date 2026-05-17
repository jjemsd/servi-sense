import { useState, type FormEvent } from "react";
import { useAuth } from "../auth/AuthContext";
import { PageHeader } from "../components/PageHeader";
import { changeOwnPassword } from "../api/users";

export function ProfilePage() {
  const { user } = useAuth();
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [busy, setBusy] = useState(false);

  if (!user) return null;

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    if (next.length < 6) {
      setError("New password must be at least 6 characters.");
      return;
    }
    if (next !== confirm) {
      setError("New password and confirmation don't match.");
      return;
    }
    setBusy(true);
    try {
      await changeOwnPassword(current, next);
      setCurrent("");
      setNext("");
      setConfirm("");
      setSuccess("Password changed successfully.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not change password");
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <PageHeader title="My Account" subtitle="Your profile and security settings." />

      <div className="card" style={{ padding: "var(--space-5)", marginBottom: "var(--space-5)" }}>
        <h3 className="section-heading" style={{ marginTop: 0 }}>Account details</h3>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
            gap: "var(--space-4)",
          }}
        >
          <Detail label="Username" value={user.username} />
          <Detail label="Role" value={user.role} />
          <Detail label="Full name" value={user.full_name ?? "—"} />
          <Detail label="Email" value={user.email ?? "—"} />
          <Detail label="Assigned office" value={user.assigned_office ?? "—"} />
          <Detail
            label="Member since"
            value={new Date(user.created_at).toLocaleDateString()}
          />
        </div>
      </div>

      <div className="card" style={{ padding: "var(--space-5)" }}>
        <h3 className="section-heading" style={{ marginTop: 0 }}>Change password</h3>

        {error && <div className="banner banner-error">{error}</div>}
        {success && <div className="banner banner-success">{success}</div>}

        <form className="entity-form" onSubmit={submit}>
          <div className="form-grid">
            <div className="field field-full">
              <label className="field-label">Current password *</label>
              <input
                type="password"
                className="input"
                value={current}
                onChange={(e) => setCurrent(e.target.value)}
                required
              />
            </div>
            <div className="field">
              <label className="field-label">New password *</label>
              <input
                type="password"
                className="input"
                value={next}
                onChange={(e) => setNext(e.target.value)}
                minLength={6}
                required
              />
            </div>
            <div className="field">
              <label className="field-label">Confirm new password *</label>
              <input
                type="password"
                className="input"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                minLength={6}
                required
              />
            </div>
          </div>
          <div className="form-actions">
            <button type="submit" className="btn btn-primary" disabled={busy}>
              {busy ? "Updating…" : "Change password"}
            </button>
          </div>
        </form>
      </div>
    </>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="stat-label">{label}</div>
      <div
        style={{
          fontSize: 15,
          fontWeight: 500,
          color: "var(--color-text)",
          marginTop: 2,
          textTransform: label === "Role" ? "capitalize" : "none",
        }}
      >
        {value}
      </div>
    </div>
  );
}
