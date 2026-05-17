import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { PageHeader } from "../components/PageHeader";
import { RecordForm } from "../components/RecordForm";
import { createRecord } from "../api/records";
import { getReference } from "../api/reference";
import { listServices } from "../api/services";
import type {
  RecordCreate,
  ReferenceData,
  Service,
} from "../types/api";

export function AddRecordPage() {
  const navigate = useNavigate();
  const [services, setServices] = useState<Service[]>([]);
  const [reference, setReference] = useState<ReferenceData | null>(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    Promise.all([listServices(), getReference()])
      .then(([s, r]) => {
        setServices(s);
        setReference(r);
      })
      .catch((e) => setError(e?.message ?? "Could not load reference data"));
  }, []);

  const handleSubmit = async (payload: RecordCreate) => {
    setSuccess("");
    const created = await createRecord(payload);
    setSuccess(
      `Record #${created.id} saved for ${created.student_name} (${created.service_name}).`,
    );
    // Stay on page so the staff can quickly add another. Add a "Go to records"
    // link for when they're done.
  };

  if (!reference) {
    return (
      <>
        <PageHeader
          title="Add Record"
          subtitle="Log a new service interaction."
        />
        {error ? (
          <div className="banner banner-error">{error}</div>
        ) : (
          <p className="muted">Loading…</p>
        )}
      </>
    );
  }

  return (
    <>
      <PageHeader
        title="Add Record"
        subtitle="Log a new service interaction."
        actions={
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => navigate("/records")}
          >
            Back to records
          </button>
        }
      />

      {success && (
        <div className="banner banner-success" style={{ marginBottom: "1rem" }}>
          {success}
        </div>
      )}

      <div className="card" style={{ padding: "var(--space-5)" }}>
        <RecordForm
          services={services}
          reference={reference}
          submitLabel="Save record"
          onSubmit={handleSubmit}
        />
      </div>
    </>
  );
}
