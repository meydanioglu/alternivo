"use client";

import { CircleAlert, CircleCheck, Loader2 } from "lucide-react";
import { createContext, useContext, useEffect, useRef, useTransition } from "react";
import type { FormEvent, FormHTMLAttributes, InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from "react";
import { useFormStatus } from "react-dom";
import type { FormState } from "@/app/actions";
import { buttonClass, cx } from "@/components/ui/styles";

export const inputClass =
  "w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none transition placeholder:text-muted/70 focus:border-accent focus:ring-2 focus:ring-accent/25 aria-[invalid=true]:border-danger";

export function Field({ label, name, hint, error, children, optional }: {
  label: string;
  name: string;
  hint?: ReactNode;
  error?: string;
  optional?: boolean;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={name} className="text-sm font-medium">
        {label} {optional && <span className="font-normal text-muted">(optional)</span>}
      </label>
      {children}
      {error ? (
        <p id={`${name}-error`} className="text-xs text-danger">
          {error}
        </p>
      ) : hint ? (
        <p className="text-xs text-muted">{hint}</p>
      ) : null}
    </div>
  );
}

export function TextInput({ name, error, ...props }: InputHTMLAttributes<HTMLInputElement> & { name: string; error?: string }) {
  return (
    <input
      id={name}
      name={name}
      aria-invalid={error ? true : undefined}
      aria-describedby={error ? `${name}-error` : undefined}
      className={inputClass}
      {...props}
    />
  );
}

export function TextArea({ name, error, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement> & { name: string; error?: string }) {
  return (
    <textarea
      id={name}
      name={name}
      aria-invalid={error ? true : undefined}
      aria-describedby={error ? `${name}-error` : undefined}
      className={cx(inputClass, "min-h-28 resize-y")}
      {...props}
    />
  );
}

export function Select({ name, children, ...props }: SelectHTMLAttributes<HTMLSelectElement> & { name: string }) {
  return (
    <select id={name} name={name} className={inputClass} {...props}>
      {children}
    </select>
  );
}

export function CheckboxGroup({ name, legend, options, hint }: {
  name: string;
  legend: string;
  options: { value: string; label: string }[];
  hint?: string;
}) {
  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="mb-1.5 text-sm font-medium">
        {legend} <span className="font-normal text-muted">(optional)</span>
      </legend>
      <div className="flex flex-wrap gap-2">
        {options.map((o) => (
          <label
            key={o.value}
            className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-border px-3 py-1.5 text-sm transition has-[:checked]:border-accent has-[:checked]:bg-accent/10 has-[:checked]:text-accent"
          >
            <input type="checkbox" name={name} value={o.value} className="sr-only" />
            {o.label}
          </label>
        ))}
      </div>
      {hint && <p className="text-xs text-muted">{hint}</p>}
    </fieldset>
  );
}

export function SubmitButton({ children, className, variant = "primary", pending: pendingProp }: {
  children: ReactNode;
  className?: string;
  variant?: "primary" | "outline" | "ghost" | "secondary";
  /** For forms submitted with startTransition, where useFormStatus does not see the submission. */
  pending?: boolean;
}) {
  const status = useFormStatus();
  const formPending = useContext(ActionFormPending);
  const pending = pendingProp ?? (formPending || status.pending);
  return (
    <button type="submit" disabled={pending} className={buttonClass(variant, "md", cx("disabled:opacity-60", className))}>
      {pending && <Loader2 className="size-4 animate-spin" aria-hidden="true" />}
      {children}
    </button>
  );
}

export function FormMessage({ state }: { state: FormState }) {
  if (state.error) {
    return (
      <p role="alert" className="flex items-start gap-2 rounded-lg border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger">
        <CircleAlert className="mt-0.5 size-4 shrink-0" aria-hidden="true" /> {state.error}
      </p>
    );
  }
  if (state.ok) {
    return (
      <p role="status" className="flex items-start gap-2 rounded-lg border border-success/30 bg-success/10 px-3 py-2 text-sm text-success">
        <CircleCheck className="mt-0.5 size-4 shrink-0" aria-hidden="true" /> {state.ok}
      </p>
    );
  }
  return null;
}

const ActionFormPending = createContext(false);

/**
 * A form for a useActionState action that keeps what the user typed when the action returns an error. A plain
 * `<form action>` resets every field once the action finishes, which wipes the input on a validation error; here the
 * form is submitted in a transition instead (the clicked submit button's name/value is kept) and reset only on success.
 */
export function ActionForm({ action, state, children, ...rest }: Omit<FormHTMLAttributes<HTMLFormElement>, "action" | "onSubmit"> & {
  action: (data: FormData) => void;
  state?: FormState;
}) {
  const [pending, start] = useTransition();
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state?.ok && !state.error && !state.fieldErrors) ref.current?.reset();
  }, [state]);
  const onSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const submitter = (e.nativeEvent as SubmitEvent).submitter as HTMLElement | null;
    const data = new FormData(e.currentTarget, submitter);
    start(() => action(data));
  };
  return (
    <ActionFormPending.Provider value={pending}>
      <form ref={ref} onSubmit={onSubmit} {...rest}>
        {children}
      </form>
    </ActionFormPending.Provider>
  );
}
