interface KinMarkProps {
  size?: number;
  color?: string;
  className?: string;
}

export function KinMark({ size = 32, color = "#3C4A33", className }: KinMarkProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      className={className}
      aria-label="Kin"
    >
      <circle cx="32" cy="20" r="8" fill={color} />
      <circle cx="21.75" cy="37.9" r="9" fill={color} />
      <circle cx="42.25" cy="37.9" r="9" fill={color} />
    </svg>
  );
}
