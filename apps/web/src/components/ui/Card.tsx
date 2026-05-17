interface CardProps {
  children: React.ReactNode;
  className?: string;
}

export default function Card({ children, className = "" }: CardProps) {
  return (
    <div
      className={`bg-warm-cream rounded-lg border-[0.5px] border-hairline p-5 transition-all duration-300 ${className}`}
    >
      {children}
    </div>
  );
}
