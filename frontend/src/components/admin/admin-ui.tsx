"use client";

import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { type ReactNode, useState, useTransition } from "react";
import { buttonClass, cx } from "@/components/ui/styles";

/** A button that runs a server action, optionally after a confirmation, then refreshes the page. */
export function ActionButton({ action, children, confirm, variant = "outline", className }: {
  action: () => Promise<{ error?: string }>;
  children: ReactNode;
  confirm?: string;
  variant?: "primary" | "outline" | "ghost" | "secondary";
  className?: string;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string>();
  return (
    <span className="inline-flex flex-col">
      <button
        type="button"
        disabled={pending}
        onClick={() => {
          if (confirm && !window.confirm(confirm)) return;
          setError(undefined);
          start(async () => {
            const result = await action();
            if (result.error) setError(result.error);
            else router.refresh();
          });
        }}
        className={buttonClass(variant, "sm", cx("disabled:opacity-60", className))}
      >
        {pending && <Loader2 className="size-3.5 animate-spin" aria-hidden="true" />}
        {children}
      </button>
      {error && <span className="mt-1 max-w-48 text-xs text-danger">{error}</span>}
    </span>
  );
}
