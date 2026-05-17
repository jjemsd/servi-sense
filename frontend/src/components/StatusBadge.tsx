interface Props {
  status: string;
}

const toneMap: Record<string, string> = {
  Completed: "success",
  "In Progress": "info",
  Cancelled: "neutral",
  "No Show": "warning",
};

export function StatusBadge({ status }: Props) {
  const tone = toneMap[status] || "neutral";
  return <span className={`badge badge-${tone}`}>{status}</span>;
}
