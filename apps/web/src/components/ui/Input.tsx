import { InputHTMLAttributes, forwardRef } from "react";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, className = "", ...props }, ref) => {
    return (
      <div className="w-full">
        {label && (
          <label className="block text-sm text-muted mb-1.5">
            {label}
          </label>
        )}
        <input
          ref={ref}
          className={`w-full bg-warm-cream border-[0.5px] border-hairline rounded px-4 py-3 text-charcoal placeholder:text-muted/60 focus:outline-none focus:border-olive transition-all duration-200 ${
            error ? "border-rose" : ""
          } ${className}`}
          {...props}
        />
        {error && <p className="mt-1 text-sm text-rose">{error}</p>}
      </div>
    );
  }
);

Input.displayName = "Input";

export default Input;
