import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AuthShell } from "@/components/account/auth-shell";
import { LoginForm } from "@/components/account/auth-forms";
import { GoogleButton } from "@/components/account/google-button";
import { getCurrentUser } from "@/lib/auth/session";

export const metadata: Metadata = { title: "Sign in", robots: { index: false } };

type Props = { searchParams: Promise<{ next?: string; error?: string }> };

export default async function LoginPage({ searchParams }: Props) {
  const { next = "/account", error } = await searchParams;
  if (await getCurrentUser()) redirect(next.startsWith("/") ? next : "/account");
  return (
    <AuthShell title="Welcome back" subtitle="Sign in to like, review and submit apps.">
      <GoogleButton next={next} error={error} />
      <LoginForm next={next} />
    </AuthShell>
  );
}
