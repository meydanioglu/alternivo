import { Eye, ExternalLink, Link2, Lock, ShieldCheck, UserRound } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { UserAvatar } from "@/components/account/user-avatar";
import { LinksSettings, PrivacySettings, ProfileSettings, SecuritySettings, SettingsCard } from "@/components/account/settings-forms";
import { Container } from "@/components/layout/page-parts";
import { GithubIcon } from "@/components/ui/brand-icons";
import { buttonClass } from "@/components/ui/styles";
import { googleConfig } from "@/lib/auth/integrations";
import { getCurrentUser } from "@/lib/auth/session";

export const metadata: Metadata = { title: "Settings", robots: { index: false } };

const NAV = [
  { href: "#profile", label: "Profile", icon: UserRound },
  { href: "#links", label: "Social links", icon: Link2 },
  { href: "#privacy", label: "Privacy", icon: Eye },
  { href: "#security", label: "Security", icon: ShieldCheck },
  { href: "#connected", label: "Connected accounts", icon: Lock },
];

export default async function SettingsPage() {
  const [user, google] = await Promise.all([getCurrentUser(), googleConfig()]);
  if (!user) redirect("/login?next=/settings");

  return (
    <Container className="max-w-5xl py-8">
      <header className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <UserAvatar name={user.displayName} url={user.avatarUrl} size="md" />
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
            <p className="text-sm text-muted">{user.username ? `@${user.username}` : user.email}</p>
          </div>
        </div>
        {user.username ? (
          <Link href={`/u/${user.username}`} className={buttonClass("primary", "md")}>
            <ExternalLink className="size-4" aria-hidden="true" /> View public profile
          </Link>
        ) : (
          <span className="text-sm text-muted">Pick a username to get a public profile.</span>
        )}
      </header>

      <div className="grid gap-8 md:grid-cols-[12rem_minmax(0,1fr)]">
        <nav aria-label="Settings" className="flex gap-1 overflow-x-auto md:sticky md:top-24 md:flex-col md:self-start">
          {NAV.map(({ href, label, icon: Icon }) => (
            <a key={href} href={href} className="flex shrink-0 items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium text-foreground/80 hover:bg-surface-secondary">
              <Icon className="size-4 text-muted" aria-hidden="true" /> {label}
            </a>
          ))}
          <Link href="/account" className="mt-2 hidden rounded-lg px-3 py-2 text-sm text-muted hover:text-foreground md:block">
            ← Back to account
          </Link>
        </nav>

        <div className="flex flex-col gap-6">
          <SettingsCard id="profile" icon={<UserRound className="size-4 text-muted" />} title="Profile">
            <ProfileSettings user={user} />
          </SettingsCard>
          <SettingsCard id="links" icon={<Link2 className="size-4 text-muted" />} title="Social links">
            <LinksSettings user={user} />
          </SettingsCard>
          <SettingsCard id="privacy" icon={<Eye className="size-4 text-muted" />} title="Privacy">
            <PrivacySettings user={user} />
          </SettingsCard>
          <SettingsCard id="security" icon={<ShieldCheck className="size-4 text-muted" />} title="Security">
            <SecuritySettings email={user.email} />
          </SettingsCard>
          <SettingsCard id="connected" icon={<Lock className="size-4 text-muted" />} title="Connected accounts">
            <ul className="flex flex-col gap-3">
              {[
                {
                  name: "Google",
                  icon: <span className="text-base font-bold">G</span>,
                  status: google.enabled ? "Sign in with the Google account that uses this e-mail to link it automatically." : "Coming soon",
                },
                { name: "GitHub", icon: <GithubIcon className="size-4" />, status: "Coming soon" },
              ].map((p) => (
                <li key={p.name} className="flex items-center justify-between gap-3 rounded-lg border border-border p-4">
                  <span className="flex items-center gap-3 text-sm font-medium">
                    <span className="grid size-8 place-items-center rounded-full bg-surface-secondary">{p.icon}</span>
                    {p.name}
                  </span>
                  <span className="max-w-64 text-right text-xs text-muted">{p.status}</span>
                </li>
              ))}
            </ul>
            <p className="mt-3 text-xs text-muted">You can always sign in with your e-mail and password as well.</p>
          </SettingsCard>
        </div>
      </div>
    </Container>
  );
}
