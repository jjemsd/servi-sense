import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "../auth/AuthContext";
import { ConfirmDialog } from "../components/ConfirmDialog";
import { Modal } from "../components/Modal";
import { PageHeader } from "../components/PageHeader";
import { Pagination } from "../components/Pagination";
import { RecordForm } from "../components/RecordForm";
import {
  deleteRecord,
  listRecords,
  updateRecord,
} from "../api/records";
import { getReference } from "../api/reference";
import { listServices } from "../api/services";
import type {
  RecordCreate,
  RecordsFilters,
  ReferenceData,
  Service,
  ServiceRecord,
} from "../types/api";

const PAGE_SIZE = 25;

interface FilterState {
  office: string;
  department: string;
  service_id: string;
  date_from: string;
  date_to: string;
  search: string;
}

const emptyFilters: FilterState = {
  office: "",
  department: "",
  service_id: "",
  date_from: "",
  date_to: "",
  search: "",
};

export function RecordsPage() {
  const { user } = useAuth();
  const [records, setRecords] = useState<ServiceRecord[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState<FilterState>(emptyFilters);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [services, setServices] = useState<Service[]>([]);
  const [reference, setReference] = useState<ReferenceData | null>(null);

  const [editing, setEditing] = useState<ServiceRecord | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<ServiceRecord | null>(null);

  // Initial: load services + reference data
  useEffect(() => {
    Promise.all([listServices(), getReference()])
      .then(([s, r]) => {
        setServices(s);
        setReference(r);
      })
      .catch((e) => setError(e?.message ?? "Could not load reference data"));
  }, []);

  const filtersForApi = useMemo<RecordsFilters>(() => {
    const f: RecordsFilters = { page, page_size: PAGE_SIZE };
    if (filters.office) f.office = filters.office;
    if (filters.department) f.department = filters.department;
    if (filters.service_id) f.service_id = Number(filters.service_id);
    if (filters.date_from) f.date_from = filters.date_from;
    if (filters.date_to) f.date_to = filters.date_to;
    if (filters.search) f.search = filters.search;
    return f;
  }, [page, filters]);

  const fetchRecords = useCallback(() => {
    setLoading(true);
    listRecords(filtersForApi)
      .then((res) => {
        setRecords(res.items);
        setTotal(res.total);
        setError("");
      })
      .catch((e) => setError(e?.message ?? "Could not load records"))
      .finally(() => setLoading(false));
  }, [filtersForApi]);

  useEffect(() => {
    fetchRecords();
  }, [fetchRecords]);

  const handleFilter = (key: keyof FilterState, value: string) => {
    setPage(1);
    setFilters((f) => ({ ...f, [key]: value }));
  };

  const handleResetFilters = () => {
    setPage(1);
    setFilters(emptyFilters);
  };

  const handleUpdate = async (payload: RecordCreate) => {
    if (!editing) return;
    await updateRecord(editing.id, payload);
    setEditing(null);
    fetchRecords();
  };

  const handleDelete = async () => {
    if (!confirmDelete) return;
    await deleteRecord(confirmDelete.id);
    setConfirmDelete(null);
    fetchRecords();
  };

  return (
    <>
      <PageHeader
        title="Service Records"
        subtitle={
          user?.role === "staff"
            ? `Records for ${user.assigned_office}`
            : "All offices · admin view"
        }
      />

      {/* Filter bar */}
      <div className="filter-bar">
        {user?.role === "admin" && reference && (
          <div className="field">
            <label className="field-label">Office</label>
            <select
              className="select"
              value={filters.office}
              onChange={(e) => handleFilter("office", e.target.value)}
            >
              <option value="">All</option>
              {reference.offices.map((o) => (
                <option key={o} value={o}>{o}</option>
              ))}
            </select>
          </div>
        )}

        <div className="field">
          <label className="field-label">Department</label>
          <select
            className="select"
            value={filters.department}
            onChange={(e) => handleFilter("department", e.target.value)}
          >
            <option value="">All</option>
            {reference?.departments.map((d) => (
              <option key={d} value={d}>{d}</option>
            ))}
          </select>
        </div>

        <div className="field">
          <label className="field-label">From</label>
          <input
            type="date"
            className="input"
            value={filters.date_from}
            onChange={(e) => handleFilter("date_from", e.target.value)}
          />
        </div>

        <div className="field">
          <label className="field-label">To</label>
          <input
            type="date"
            className="input"
            value={filters.date_to}
            onChange={(e) => handleFilter("date_to", e.target.value)}
          />
        </div>

        <div className="field">
          <label className="field-label">Search</label>
          <input
            type="text"
            className="input"
            value={filters.search}
            onChange={(e) => handleFilter("search", e.target.value)}
            placeholder="Student ID or name"
          />
        </div>

        <div className="filter-actions">
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={handleResetFilters}
          >
            Reset
          </button>
        </div>
      </div>

      {error && <div className="banner banner-error">{error}</div>}

      {/* Table */}
      <div className="data-table-wrapper">
        <div className="data-table-scroll">
          <table className="data-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Time</th>
                <th>Student</th>
                <th>Department</th>
                <th>Service</th>
                <th className="col-actions">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr>
                  <td colSpan={6} className="empty-state">
                    Loading records…
                  </td>
                </tr>
              )}
              {!loading && records.length === 0 && (
                <tr>
                  <td colSpan={6} className="empty-state">
                    No records match these filters.
                  </td>
                </tr>
              )}
              {!loading &&
                records.map((r) => (
                  <tr key={r.id}>
                    <td>{r.service_date}</td>
                    <td className="muted tiny">{r.time?.slice(0, 5) || "—"}</td>
                    <td>
                      <div style={{ fontWeight: 500 }}>{r.student_name}</div>
                      <div className="muted tiny">{r.student_id}</div>
                    </td>
                    <td>{r.department || "—"}</td>
                    <td>
                      <div>{r.service_name}</div>
                      <div className="muted tiny">{r.office}</div>
                    </td>
                    <td className="col-actions">
                      <div className="row-actions">
                        <button
                          type="button"
                          className="text-link"
                          onClick={() => setEditing(r)}
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          className="text-link text-link-danger"
                          onClick={() => setConfirmDelete(r)}
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
        <Pagination
          page={page}
          pageSize={PAGE_SIZE}
          total={total}
          onPageChange={setPage}
        />
      </div>

      {/* Edit modal */}
      {editing && reference && (
        <Modal
          isOpen={true}
          onClose={() => setEditing(null)}
          title={`Edit record · ${editing.student_name}`}
          size="lg"
        >
          <RecordForm
            initial={editing}
            services={services}
            reference={reference}
            submitLabel="Save changes"
            onSubmit={handleUpdate}
            onCancel={() => setEditing(null)}
          />
        </Modal>
      )}

      {/* Delete confirmation */}
      <ConfirmDialog
        isOpen={confirmDelete !== null}
        title="Delete this record?"
        message={
          confirmDelete
            ? `This will permanently delete the record for ${confirmDelete.student_name} on ${confirmDelete.service_date}.`
            : ""
        }
        confirmLabel="Delete record"
        danger
        onConfirm={handleDelete}
        onCancel={() => setConfirmDelete(null)}
      />
    </>
  );
}