import { ButtonHTMLAttributes, forwardRef } from "react";

type ButtonVariant = "primary" | "secondary" | "ghost";
type ButtonSize = "sm" | "md" | "lg";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
}

const variantStyles: Record<ButtonVariant, string> = {
  primary:
    "bg-olive text-warm-cream hover:bg-olive-dark active:bg-olive-dark",
  secondary:
    "bg-warm-cream border-[0.5px] border-hairline text-charcoal hover:border-olive hover:text-olive",
  ghost:
    "text-muted hover:text-charcoal hover:bg-sage-bg",
};

const sizeStyles: Record<ButtonSize, string> = {
  sm: "px-4 py-2 text-[12px]",
  md: "px-5 py-2.5 text-[13px]",
  lg: "px-7 py-3.5 text-[13px]",
};

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = "primary", size = "md", className = "", children, ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={`inline-flex items-center justify-center rounded font-medium uppercase tracking-[0.08em] transition-all duration-200 disabled:opacity-50 disabled:pointer-events-none ${variantStyles[variant]} ${sizeStyles[size]} ${className}`}
        {...props}
      >
        {children}
      </button>
    );
  }
);

Button.displayName = "Button";

export default Button;
