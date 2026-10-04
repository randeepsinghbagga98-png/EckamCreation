type EckamAiErrorProps = {
  message: string;
  onRetry?: () => void;
};

export function EckamAiError({ message, onRetry }: EckamAiErrorProps) {
  return (
    <div className="eckam-ai-error" role="alert">
      <p>{message}</p>
      {onRetry ? (
        <button type="button" className="eckam-ai-retry" onClick={onRetry}>
          Retry
        </button>
      ) : null}
    </div>
  );
}
