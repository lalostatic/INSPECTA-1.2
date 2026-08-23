import {
  type InputHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
  forwardRef,
} from "react";
import { cn } from "@/lib/utils";

const field =
  "flex h-11 w-full rounded-md border border-line bg-card px-3 text-sm text-ink placeholder:text-steel/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal/60 focus-visible:border-teal disabled:opacity-50";

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => <input ref={ref} className={cn(field, className)} {...props} />,
);
Input.displayName = "Input";

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(
  ({ className, ...props }, ref) => (
    <textarea ref={ref} className={cn(field, "h-24 py-2 resize-y", className)} {...props} />
  ),
);
Textarea.displayName = "Textarea";

export const NativeSelect = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement>>(
  ({ className, children, ...props }, ref) => (
    <select ref={ref} className={cn(field, "pr-8", className)} {...props}>
      {children}
    </select>
  ),
);
NativeSelect.displayName = "NativeSelect";

export function Field({
  label,
  hint,
  children,
  labelClassName,
}: {
  label: string;
  hint?: string;
  children: ReactNode;
  labelClassName?: string;
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className={cn("text-xs font-medium uppercase tracking-wider text-steel", labelClassName)}>{label}</span>
      {children}
      {hint ? <span className="text-xs text-steel">{hint}</span> : null}
    </label>
  );
}
