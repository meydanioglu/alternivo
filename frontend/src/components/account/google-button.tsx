import { buttonClass } from "@/components/ui/styles";
import { googleConfig } from "@/lib/auth/integrations";

const ERRORS: Record<string, string> = {
  google: "Google sign-in failed. Please try again or use your e-mail and password.",
  google_state: "Your Google sign-in session expired. Please try again.",
};

/** "Continue with Google"; renders nothing until Google sign-in is configured in the admin panel. */
export async function GoogleButton({ next, error }: { next: string; error?: string }) {
  const config = await googleConfig();
  const message = error ? ERRORS[error] : undefined;
  if (!config.enabled && !message) return null;
  return (
    <div className="mb-5 flex flex-col gap-4">
      {message && (
        <p role="alert" className="rounded-lg border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger">
          {message}
        </p>
      )}
      {config.enabled && (
        <>
          {/* Plain link: the route handler sets the state cookie and redirects to Google. */}
          <a href={`/bff/auth/google/start?next=${encodeURIComponent(next)}`} className={buttonClass("outline", "md", "w-full")}>
            <svg viewBox="0 0 24 24" className="size-4" aria-hidden="true">
              <path fill="#4285F4" d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.4h6.5a5.6 5.6 0 0 1-2.4 3.6v3h3.9c2.3-2.1 3.5-5.2 3.5-8.7Z" />
              <path fill="#34A853" d="M12 24c3.2 0 6-1.1 8-2.9l-3.9-3c-1.1.7-2.5 1.2-4.1 1.2-3.1 0-5.8-2.1-6.7-5H1.3v3.1A12 12 0 0 0 12 24Z" />
              <path fill="#FBBC05" d="M5.3 14.3a7.2 7.2 0 0 1 0-4.6V6.6h-4a12 12 0 0 0 0 10.8l4-3.1Z" />
              <path fill="#EA4335" d="M12 4.8c1.8 0 3.3.6 4.6 1.8l3.4-3.4A12 12 0 0 0 1.3 6.6l4 3.1c.9-2.9 3.6-4.9 6.7-4.9Z" />
            </svg>
            Continue with Google
          </a>
          <div className="flex items-center gap-3 text-xs text-muted">
            <span className="h-px flex-1 bg-border" /> or with e-mail <span className="h-px flex-1 bg-border" />
          </div>
        </>
      )}
    </div>
  );
}
