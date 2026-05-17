import { PageHeader } from "../components/PageHeader";
import { StagePlaceholder } from "../components/StagePlaceholder";

export function RecordsPage() {
  return (
    <>
      <PageHeader
        title="Service Records"
        subtitle="Browse, filter, and manage individual service utilization records."
      />
      <StagePlaceholder />
    </>
  );
}

export function AddRecordPage() {
  return (
    <>
      <PageHeader
        title="Add Record"
        subtitle="Log a new service interaction."
      />
      <StagePlaceholder />
    </>
  );
}

export function UploadPage() {
  return (
    <>
      <PageHeader
        title="Bulk Upload"
        subtitle="Import multiple service records at once via CSV or Excel."
      />
      <StagePlaceholder />
    </>
  );
}

export function AnalyticsPage() {
  return (
    <>
      <PageHeader
        title="Analytics"
        subtitle="Trends, peak hours, satisfaction, and cross-office comparisons."
      />
      <StagePlaceholder />
    </>
  );
}

export function SettingsPage() {
  return (
    <>
      <PageHeader
        title="System Settings"
        subtitle="Manage the services catalog and office mappings."
      />
      <StagePlaceholder />
    </>
  );
}

export function UsersPage() {
  return (
    <>
      <PageHeader
        title="User Management"
        subtitle="Add, edit, deactivate, or reset passwords for system users."
      />
      <StagePlaceholder />
    </>
  );
}
