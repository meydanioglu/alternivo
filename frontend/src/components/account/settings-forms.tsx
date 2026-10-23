"use client";

import { Check, Globe, Loader2, X } from "lucide-react";
import { GithubIcon, LinkedinIcon, XIcon } from "@/components/ui/brand-icons";
import { useRouter } from "next/navigation";
import { type ReactNode, useActionState, useEffect, useRef, useState, useTransition } from "react";
import type { FormState } from "@/app/actions";
import {
  changePasswordAction,
  removeAvatarAction,
  saveLinksAction,
  savePrivacyAction,
  saveProfileAction,
  uploadAvatarAction,
} from "@/app/settings/actions";
import { UserAvatar } from "@/components/account/user-avatar";
import { Field, FormMessage, SubmitButton, TextArea, TextInput, inputClass } from "@/components/forms/form-kit";
import { buttonClass, cx } from "@/components/ui/styles";
import type { UserProfile } from "@/lib/auth/session";

export function SettingsCard({ id, icon, title, children }: { id: string; icon: ReactNode; title: string; children: ReactNode }) {
  return (
    <section id={id} className="scroll-mt-24 overflow-hidden rounded-xl border border-border bg-surface">
      <h2 className="flex items-center gap-2 border-b border-border px-5 py-4 font-semibold">
        {icon} {title}
      </h2>
      <div className="p-5">{children}</div>
    </section>
  );
}

function AvatarField({ user }: { user: UserProfile }) {
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const [url, setUrl] = useState(user.avatarUrl);
  const [error, setError] = useState<string>();
  const [pending, start] = useTransition();

  const upload = (file: File) => {
    setError(undefined);
    const form = new FormData();
    form.set("file", file);
    start(async () => {
      const r = await uploadAvatarAction(form);
      if (r.error) setError(r.error);
      else {
        setUrl(r.avatarUrl ?? null);
        router.refresh();
      }
    });
  };

  return (
    <div className="flex flex-col gap-2">
      <p className="text-sm font-medium">Avatar</p>
      <div className="flex items-center gap-4">
        <UserAvatar name={user.displayName} url={url} size="lg" className={cx(pending && "opacity-50")} />
        <div className="flex flex-col items-start gap-1">
          <button type="button" disabled={pending} onClick={() => input.current?.click()} className={buttonClass("outline", "sm")}>
            {pending && <Loader2 className="size-3.5 animate-spin" aria-hidden="true" />}
            {url ? "Replace" : "Upload"}
          </button>
          {url && (
            <button
              type="button"
              disabled={pending}
              onClick={() =>
                start(async () => {
                  const r = await removeAvatarAction();
                  if (r.error) setError(r.error);
                  else {
                    setUrl(null);
                    router.refresh();
                  }
                })
              }
              className="px-1 text-sm text-muted hover:text-danger"
            >
              Remove
            </button>
          )}
        </div>
        <input
          ref={input}
          type="file"
          accept="image/jpeg,image/png,image/gif,image/webp"
          className="sr-only"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) upload(f);
            e.target.value = "";
          }}
        />
      </div>
      <p className="text-xs text-muted">JPG, PNG, GIF or WebP. Max 1 MB. Square images look best.</p>
      {error && <p className="text-xs text-danger">{error}</p>}
    </div>
  );
}

function UsernameInput({ initial }: { initial: string }) {
  const [value, setValue] = useState(initial);
  const [status, setStatus] = useState<"idle" | "checking" | "ok" | "taken" | "invalid">(initial ? "ok" : "idle");

  useEffect(() => {
    const v = value.trim().toLowerCase();
    if (!v || v === initial) {
      setStatus(v ? "ok" : "idle");
      return;
    }
    if (!/^[a-z0-9_-]{3,30}$/.test(v)) {
      setStatus("invalid");
      return;
    }
    setStatus("checking");
    const t = window.setTimeout(async () => {
      try {
        const r = (await (await fetch(`/bff/username?u=${encodeURIComponent(v)}`)).json()) as { available: boolean; reason?: string };
        setStatus(r.available ? "ok" : r.reason === "taken" ? "taken" : "invalid");
      } catch {
        setStatus("idle");
      }
    }, 400);
    return () => window.clearTimeout(t);
  }, [value, initial]);

  return (
    <Field
      label="Username"
      name="username"
      error={status === "taken" ? "This username is taken." : status === "invalid" ? "3-30 characters: lowercase letters, numbers, \"-\" or \"_\"." : undefined}
      hint='3-30 characters: lowercase letters, numbers, "-" or "_". Your public profile lives at /u/username.'
    >
      <div className="relative">
        <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted">@</span>
        <input
          id="username"
          name="username"
          value={value}
          onChange={(e) => setValue(e.target.value.toLowerCase())}
          maxLength={30}
          autoComplete="username"
          className={cx(inputClass, "pl-8 pr-9")}
        />
        <span className="absolute right-3 top-1/2 -translate-y-1/2">
          {status === "checking" && <Loader2 className="size-4 animate-spin text-muted" aria-hidden="true" />}
          {status === "ok" && value && <Check className="size-4 text-success" aria-label="Available" />}
          {(status === "taken" || status === "invalid") && <X className="size-4 text-danger" aria-label="Not available" />}
        </span>
      </div>
    </Field>
  );
}

export function ProfileSettings({ user }: { user: UserProfile }) {
  const [state, action] = useActionState(saveProfileAction, {} as FormState);
  return (
    <div className="flex flex-col gap-5">
      <AvatarField user={user} />
      <form action={action} className="flex flex-col gap-4">
        <FormMessage state={state} />
        <Field label="Name" name="displayName">
          <TextInput name="displayName" defaultValue={user.displayName} required minLength={2} maxLength={60} />
        </Field>
        <UsernameInput initial={user.username ?? ""} />
        <Field label="Bio" name="bio" optional>
          <TextArea name="bio" defaultValue={user.bio ?? ""} maxLength={500} placeholder="A short bio" className="min-h-24" />
        </Field>
        <SubmitButton className="self-start">Save</SubmitButton>
      </form>
    </div>
  );
}

const LINKS = [
  { name: "website", label: "Website", icon: Globe, placeholder: "https://yoursite.com", key: "website" },
  { name: "twitter", label: "X / Twitter", icon: XIcon, placeholder: "https://x.com/username", key: "twitter" },
  { name: "gitHub", label: "GitHub", icon: GithubIcon, placeholder: "https://github.com/username", key: "gitHub" },
  { name: "linkedIn", label: "LinkedIn", icon: LinkedinIcon, placeholder: "https://linkedin.com/in/username", key: "linkedIn" },
] as const;

export function LinksSettings({ user }: { user: UserProfile }) {
  const [state, action] = useActionState(saveLinksAction, {} as FormState);
  return (
    <form action={action} className="flex flex-col gap-4">
      <FormMessage state={state} />
      {LINKS.map(({ name, label, icon: Icon, placeholder, key }) => (
        <Field key={name} label={label} name={name} optional>
          <div className="relative">
            <Icon className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted" aria-hidden="true" />
            <input id={name} name={name} type="url" defaultValue={user[key] ?? ""} placeholder={placeholder} className={cx(inputClass, "pl-9")} />
          </div>
        </Field>
      ))}
      <SubmitButton className="self-start">Save links</SubmitButton>
    </form>
  );
}

function Toggle({ name, label, description, defaultChecked }: { name: string; label: string; description: string; defaultChecked: boolean }) {
  return (
    <label className="flex cursor-pointer items-start justify-between gap-4 rounded-lg border border-border p-4">
      <span>
        <span className="block text-sm font-medium">{label}</span>
        <span className="block text-xs text-muted">{description}</span>
      </span>
      <input type="checkbox" name={name} defaultChecked={defaultChecked} className="peer sr-only" />
      <span className="relative mt-0.5 h-6 w-11 shrink-0 rounded-full bg-surface-secondary transition peer-checked:bg-accent after:absolute after:left-0.5 after:top-0.5 after:size-5 after:rounded-full after:bg-white after:shadow after:transition peer-checked:after:translate-x-5" />
    </label>
  );
}

export function PrivacySettings({ user }: { user: UserProfile }) {
  const [state, action] = useActionState(savePrivacyAction, {} as FormState);
  return (
    <form action={action} className="flex flex-col gap-3">
      <FormMessage state={state} />
      <Toggle
        name="isProfilePublic"
        label="Public profile"
        description="Anyone can see your profile, reviews and launched products. When off, only you can see it."
        defaultChecked={user.isProfilePublic}
      />
      <Toggle name="showLikes" label="Show liked apps" description="List the apps you liked on your public profile." defaultChecked={user.showLikes} />
      <SubmitButton className="self-start">Save privacy</SubmitButton>
    </form>
  );
}

export function SecuritySettings({ email }: { email: string }) {
  const [state, action] = useActionState(changePasswordAction, {} as FormState);
  const e = state.fieldErrors ?? {};
  return (
    <form action={action} className="flex flex-col gap-4">
      <p className="text-sm text-muted">
        Signed in as <span className="font-medium text-foreground">{email}</span>
      </p>
      <FormMessage state={state} />
      <Field label="Current password" name="oldPassword" error={e.oldPassword}>
        <TextInput name="oldPassword" type="password" autoComplete="current-password" required error={e.oldPassword} />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="New password" name="newPassword" error={e.newPassword}>
          <TextInput name="newPassword" type="password" autoComplete="new-password" required minLength={10} error={e.newPassword} />
        </Field>
        <Field label="Confirm new password" name="confirmPassword" error={e.confirmPassword}>
          <TextInput name="confirmPassword" type="password" autoComplete="new-password" required error={e.confirmPassword} />
        </Field>
      </div>
      <SubmitButton className="self-start">Change password</SubmitButton>
    </form>
  );
}
