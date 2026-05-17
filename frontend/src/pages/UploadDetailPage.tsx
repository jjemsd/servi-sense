import { Link, useNavigate, useParams } from "react-router-dom";
import { PageHeader } from "../components/PageHeader";
import { UploadPreviewTable } from "../components/UploadPreviewTable";

export function UploadDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const uploadId = Number(id);
  if (!Number.isFinite(uploadId) || uploadId <= 0) {
    return (
      <>
        <PageHeader title="Upload not found" />
        <div className="banner banner-error">
          That upload id is not valid. <Link to="/uploads">Back to uploads</Link>
        </div>
      </>
    );
  }

  return (
    <>
      <PageHeader
        title="Upload contents"
        subtitle="Every row in the uploaded file, exactly as imported."
        actions={
          <button
            className="btn btn-secondary"
            onClick={() => navigate("/uploads")}
          >
            ← Back to uploads
          </button>
        }
      />

      <UploadPreviewTable uploadId={uploadId} pageSize={100} showHeader />
    </>
  );
}