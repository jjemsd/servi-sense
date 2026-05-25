import { useEffect, useState, type FormEvent } from "react";
import type {
  RecordCreate,
  ReferenceData,
  Service,
  ServiceRecord,
} from "../types/api";
import { useAuth } from "../auth/AuthContext";

interface Props {
  initial?: ServiceRecord;
  services: Service[];
  reference: ReferenceData;
  submitLabel?: string;
  onSubmit: (payload: RecordCreate) => Promise<void>;
  onCancel?: () => void;
}

interface FormState {
  service_date: string;
  time: string;
  student_id: string;
  student_name: string;
  year_level: string;
  department: string;
  service_id: string;
  notes: string;
}

function emptyForm(): FormState {
  return {
    service_date: new Date().toISOString().slice(0, 10),
    time: "",
    student_id: "",
    student_name: "",
    year_level: "",
    department: "",
    service_id: "",
    notes: "",
  };
}

function fromRecord(r: ServiceRecord): FormState {
  return {
    service_date: r.service_date,
    time: r.time ? r.time.slice(0, 5) : "",
    student_id: r.student_id,
    student_name: r.student_name,
    year_level: r.year_level ?? "",
    department: r.department ?? "",
    service_id: String(r.service_id),
    notes: r.notes ?? "",
  };
}

export function RecordForm({
  initial,
  services,
  reference,
  submitLabel = "Save",
  onSubmit,
  onCancel,
}: Props) {
  const { user } = useAuth();
  const [form, setForm] = useState<FormState>(
    initial ? fromRecord(initial) : emptyForm(),
  );
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Restrict the service dropdown for staff users to their assigned office
  const selectableServices =
    user?.role === "staff" && user.assigned_office
      ? services.filter((s) => s.name === user.assigned_office)
      : services;

  // For staff with exactly one service, auto-pick it
  useEffect(() => {
    if (!form.service_id && selectableServices.length === 1) {
      setForm((f) => ({ ...f, service_id: String(selectableServices[0].id) }));
    }
  }, [selectableServices, form.service_id]);

  const update = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");

    if (!form.service_id) {
      setError("Please choose a service.");
      return;
    }

    const payload: RecordCreate = {
      service_date: form.service_date,
      time: form.time ? `${form.time}:00` : null,
      student_id: form.student_id.trim(),
      student_name: form.student_name.trim(),
      year_level: form.year_level || null,
      department: form.department || null,
      service_id: Number(form.service_id),
      notes: form.notes || null,
    };

    setSubmitting(true);
    try {
      await onSubmit(payload);
      // In "add" mode (no initial record), clear all fields so the next
      // record can be entered from a clean slate. In "edit" mode the parent
      // closes the modal, so there's nothing to reset.
      if (!initial) {
        setForm(emptyForm());
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form className="record-form" onSubmit={handleSubmit}>
      {error && <div className="banner banner-error">{error}</div>}

      <div className="form-grid">
        <div className="field">
          <label className="field-label">Service date *</label>
          <input
            type="date"
            className="input"
            value={form.service_date}
            onChange={(e) => update("service_date", e.target.value)}
            required
          />
        </div>

        <div className="field">
          <label className="field-label">Time</label>
          <input
            type="time"
            className="input"
            value={form.time}
            onChange={(e) => update("time", e.target.value)}
          />
        </div>

        <div className="field">
          <label className="field-label">Student ID *</label>
          <input
            type="text"
            className="input"
            value={form.student_id}
            onChange={(e) => update("student_id", e.target.value)}
            placeholder="e.g. 22-UR-0827"
            required
          />
        </div>

        <div className="field">
          <label className="field-label">Student name *</label>
          <input
            type="text"
            className="input"
            value={form.student_name}
            onChange={(e) => update("student_name", e.target.value)}
            required
          />
        </div>

        <div className="field">
          <label className="field-label">Year level</label>
          <select
            className="select"
            value={form.year_level}
            onChange={(e) => update("year_level", e.target.value)}
          >
            <option value="">—</option>
            {reference.year_levels.map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        </div>

        <div className="field">
          <label className="field-label">Department</label>
          <select
            className="select"
            value={form.department}
            onChange={(e) => update("department", e.target.value)}
          >
            <option value="">—</option>
            {reference.departments.map((d) => (
              <option key={d} value={d}>{d}</option>
            ))}
          </select>
        </div>

        <div className="field field-wide">
          <label className="field-label">Service *</label>
          <select
            className="select"
            value={form.service_id}
            onChange={(e) => update("service_id", e.target.value)}
            required
            disabled={selectableServices.length === 1 && user?.role === "staff"}
          >
            <option value="">— Choose —</option>
            {selectableServices.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name} · {s.category}
              </option>
            ))}
          </select>
        </div>

        <div className="field field-full">
          <label className="field-label">Notes</label>
          <textarea
            className="textarea"
            rows={3}
            value={form.notes}
            onChange={(e) => update("notes", e.target.value)}
            placeholder="Optional details about the interaction…"
          />
        </div>
      </div>

      <div className="form-actions">
        {onCancel && (
          <button
            type="button"
            className="btn btn-secondary"
            onClick={onCancel}
            disabled={submitting}
          >
            Cancel
          </button>
        )}
        <button
          type="submit"
          className="btn btn-primary"
          disabled={submitting}
        >
          {submitting ? "Saving…" : submitLabel}
        </button>
      </div>
    </form>
  );
}
