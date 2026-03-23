interface CardProps {
  children: React.ReactNode;
  className?: string;
}

export default function Card({ children, className = "" }: CardProps) {
  return (
    <div
      className={`bg-surface/80 rounded-2xl border border-warm-white/8 p-5 hover:shadow-md hover:shadow-black/10 transition-all duration-300 ${className}`}
    >
      {children}
    </div>
  );
}
