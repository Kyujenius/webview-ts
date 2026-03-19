interface ActionErrorProps {
  error: Error | null | undefined;
}

function ActionError({ error }: ActionErrorProps) {
  if (!error) return null;

  return (
    <div className="result error">
      <strong>Error:</strong> {error.message}
    </div>
  );
}

export default ActionError;
