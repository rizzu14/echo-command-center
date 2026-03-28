interface LoadingSpinnerProps {
  size?: number;
  color?: string;
}

export function LoadingSpinner({ size = 20, color = 'var(--color-accent-blue)' }: LoadingSpinnerProps) {
  return (
    <div
      style={{
        width: size,
        height: size,
        border: `2px solid var(--color-border)`,
        borderTopColor: color,
        borderRadius: '50%',
        animation: 'spin 0.7s linear infinite',
        flexShrink: 0,
      }}
    />
  );
}
