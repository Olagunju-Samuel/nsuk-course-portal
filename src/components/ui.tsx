import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode } from "react";
import { LoaderCircle, X } from "lucide-react";

export function Button({
  children,
  variant = "primary",
  loading,
  className = "",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost" | "danger";
  loading?: boolean;
}) {
  const styles = {
    primary: "bg-[#0b2948] text-white hover:bg-[#153c62] shadow-sm",
    secondary: "border border-[#d8dee6] bg-white text-[#0b2948] hover:border-[#0b2948]",
    ghost: "text-[#526274] hover:bg-[#f2f4f7]",
    danger: "border border-red-200 bg-red-50 text-red-700 hover:bg-red-100",
  };
  return (
    <button
      {...props}
      disabled={props.disabled || loading}
      className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-50 ${styles[variant]} ${className}`}
    >
      {loading && <LoaderCircle className="h-4 w-4 animate-spin" />}
      {children}
    </button>
  );
}

export function Field({
  label,
  hint,
  error,
  children,
}: {
  label: string;
  hint?: string;
  error?: string;
  children: ReactNode;
}) {
  return (
    <label className="block space-y-1.5 text-sm font-semibold text-[#24364b]">
      <span>{label}</span>
      {children}
      {hint && <span className="block text-xs font-normal text-[#6b7788]">{hint}</span>}
      {error && <span className="block text-xs font-normal text-red-700">{error}</span>}
    </label>
  );
}

export const inputClass =
  "min-h-11 w-full rounded-lg border border-[#d8dee6] bg-white px-3 py-2.5 text-sm text-[#182b40] outline-none transition placeholder:text-[#8c98a8] focus:border-[#b4872b] focus:ring-2 focus:ring-[#b4872b]/15";

export function Input(props: InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={`${inputClass} ${props.className || ""}`} />;
}

export function Select({
  children,
  className = "",
  ...props
}: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select {...props} className={`${inputClass} ${className}`}>
      {children}
    </select>
  );
}

export function Textarea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea {...props} className={`${inputClass} min-h-24 resize-y ${props.className || ""}`} />
  );
}

export function Badge({
  children,
  tone = "neutral",
}: {
  children: ReactNode;
  tone?: "neutral" | "success" | "warning" | "danger" | "navy";
}) {
  const styles = {
    neutral: "bg-[#eef1f4] text-[#526274]",
    success: "bg-emerald-50 text-emerald-700",
    warning: "bg-amber-50 text-amber-700",
    danger: "bg-red-50 text-red-700",
    navy: "bg-[#e8eef5] text-[#0b2948]",
  };
  return (
    <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${styles[tone]}`}>
      {children}
    </span>
  );
}

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="rounded-xl border border-dashed border-[#ccd4dd] bg-[#fafbfc] px-6 py-12 text-center">
      <h3 className="font-serif text-xl font-bold text-[#102a45]">{title}</h3>
      <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-[#657386]">{description}</p>
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function Modal({
  title,
  children,
  onClose,
  wide = false,
}: {
  title: string;
  children: ReactNode;
  onClose: () => void;
  wide?: boolean;
}) {
  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-[#06192b]/60 p-4 backdrop-blur-sm">
      <div
        className={`mx-auto my-8 rounded-2xl bg-white shadow-2xl ${wide ? "max-w-5xl" : "max-w-2xl"}`}
      >
        <div className="flex items-center justify-between border-b border-[#e5e9ee] px-6 py-4">
          <h2 className="font-serif text-xl font-bold text-[#0b2948]">{title}</h2>
          <button
            onClick={onClose}
            aria-label="Close dialog"
            className="rounded-lg p-2 text-[#687789] hover:bg-[#f0f3f6]"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="p-6">{children}</div>
      </div>
    </div>
  );
}

export function Toast({
  message,
  type,
  onClose,
}: {
  message: string;
  type: "success" | "error";
  onClose: () => void;
}) {
  return (
    <div
      className={`fixed bottom-5 right-5 z-[60] flex max-w-sm items-start gap-3 rounded-xl border px-4 py-3 text-sm shadow-xl ${
        type === "success"
          ? "border-emerald-200 bg-emerald-50 text-emerald-800"
          : "border-red-200 bg-red-50 text-red-800"
      }`}
    >
      <span className="font-medium">{message}</span>
      <button onClick={onClose} aria-label="Dismiss notification">
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
