"use client";

import {
  Activity,
  AppWindow,
  ArrowLeftRight,
  Flag,
  FolderTree,
  Inbox,
  LayoutDashboard,
  MessageSquare,
  Signpost,
  Users,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cx } from "@/components/ui/styles";

const ITEMS = [
  { href: "/admin", label: "Genel bakış", icon: LayoutDashboard, exact: true },
  { href: "/admin/analytics", label: "Ziyaretçiler", icon: Activity },
  { href: "/admin/apps", label: "Uygulamalar", icon: AppWindow },
  { href: "/admin/submissions", label: "Gönderimler", icon: Inbox },
  { href: "/admin/alternatives", label: "Alternatif önerileri", icon: ArrowLeftRight },
  { href: "/admin/reviews", label: "Yorumlar", icon: MessageSquare },
  { href: "/admin/reports", label: "Şikayetler", icon: Flag },
  { href: "/admin/categories", label: "Kategoriler", icon: FolderTree },
  { href: "/admin/users", label: "Kullanıcılar", icon: Users },
  { href: "/admin/redirects", label: "Yönlendirmeler", icon: Signpost },
];

export function AdminNav({ displayName, roles }: { displayName: string; roles: string[] }) {
  const pathname = usePathname();
  return (
    <aside className="lg:sticky lg:top-20 lg:self-start">
      <div className="mb-3 rounded-xl border border-border bg-surface p-3">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted">Yönetim paneli</p>
        <p className="mt-1 truncate text-sm font-semibold">{displayName}</p>
        <p className="truncate text-xs text-muted">{roles.join(", ")}</p>
      </div>
      <nav aria-label="Yönetim" className="flex gap-1 overflow-x-auto pb-1 lg:flex-col lg:overflow-visible">
        {ITEMS.map(({ href, label, icon: Icon, exact }) => {
          const active = exact ? pathname === href : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? "page" : undefined}
              className={cx(
                "flex shrink-0 items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition",
                active ? "bg-accent text-accent-foreground" : "text-foreground/80 hover:bg-surface-secondary",
              )}
            >
              <Icon className="size-4" aria-hidden="true" /> {label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
