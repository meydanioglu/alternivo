import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AuthShell } from "@/components/account/auth-shell";
import { RegisterForm } from "@/components/account/auth-forms";
import { getCurrentUser } from "@/lib/auth/session";

export const metadata: Metadata = { title: "Create an account", robots: { index: false } };

type Props = { searchParams: Promise<{ next?: string }> };

export default async function RegisterPage({ searchParams }: Props) {
  const { next = "/account" } = await searchParams;
  if (await getCurrentUser()) redirect(next.startsWith("/") ? next : "/account");
  return (
    <AuthShell title="Create your account" subtitle="It takes less than a minute.">
      <RegisterForm next={next} />
    </AuthShell>
  );
}
