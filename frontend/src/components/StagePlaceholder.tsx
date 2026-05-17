interface Props {
  title?: string;
  message?: string;
}

export function StagePlaceholder({
  title = "Coming in Stage 5",
  message = "This page will be implemented in the next stage.",
}: Props) {
  return (
    <div className="placeholder-card">
      <h3>{title}</h3>
      <p>{message}</p>
    </div>
  );
}
