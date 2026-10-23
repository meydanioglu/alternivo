import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import type { ReactNode } from "react";
import { AdminNav } from "@/components/admin/admin-nav";
import { Container } from "@/components/layout/page-parts";
import { getCurrentUser, isStaff } from "@/lib/auth/session";

export const metadata: Metadata = { title: "Yönetim paneli", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/admin");
  if (!isStaff(user)) notFound();

  return (
    <Container className="py-6">
      <div className="grid gap-6 lg:grid-cols-[14rem_minmax(0,1fr)]">
        <AdminNav displayName={user.displayName} roles={user.roles} />
        <div className="min-w-0">{children}</div>
      </div>
    </Container>
  );
}
