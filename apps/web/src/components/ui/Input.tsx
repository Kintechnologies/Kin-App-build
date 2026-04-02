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
          <label className="block text-sm text-warm-white/70 mb-1.5">
            {label}
          </label>
        )}
        <input
          ref={ref}
          className={`w-full bg-background border border-warm-white/15 rounded-xl px-4 py-3 text-warm-white placeholder:text-warm-white/25 focus:outline-none focus:border-primary focus:shadow-md focus:shadow-primary/10 transition-all duration-200 ${
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
