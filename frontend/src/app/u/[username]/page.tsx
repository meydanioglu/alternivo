import { CalendarDays, Globe, Heart, MessageSquare, Rocket } from "lucide-react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { UserAvatar } from "@/components/account/user-avatar";
import { ApplicationGrid } from "@/components/catalog/application-card";
import { ReviewCard } from "@/components/catalog/review-card";
import { Container, EmptyState } from "@/components/layout/page-parts";
import { GithubIcon, LinkedinIcon, XIcon } from "@/components/ui/brand-icons";
import { site } from "@/config/site";
import { apiBaseUrl } from "@/lib/api/client";
import type { ApplicationSummary, Review } from "@/lib/api/types";
import { getCurrentUser } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

interface Profile {
  username: string;
  displayName: string;
  bio: string | null;
  avatarUrl: string | null;
  website: string | null;
  twitter: string | null;
  gitHub: string | null;
  linkedIn: string | null;
  joinedAt: string;
  showLikes: boolean;
  activity: { reviews: Review[]; liked: ApplicationSummary[]; launched: ApplicationSummary[] };
}

type Props = { params: Promise<{ username: string }> };

async function load(username: string): Promise<Profile | null> {
  const response = await fetch(`${apiBaseUrl}/api/v1/profiles/${encodeURIComponent(username)}`, { cache: "no-store" });
  return response.ok ? ((await response.json()) as Profile) : null;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { username } = await params;
  const p = await load(username);
  if (!p) return { title: "Profile not found", robots: { index: false } };
  return {
    title: `${p.displayName} (@${p.username})`,
    description: p.bio ?? `${p.displayName}'s reviews and launched products on ${site.name}.`,
    alternates: { canonical: `/u/${p.username}` },
  };
}

export default async function PublicProfilePage({ params }: Props) {
  const { username } = await params;
  const [p, me] = await Promise.all([load(username), getCurrentUser()]);
  if (!p) notFound();
  const isMe = me?.username === p.username;

  const links = [
    p.website && { href: p.website, label: new URL(p.website).hostname.replace(/^www\./, ""), icon: <Globe className="size-4" /> },
    p.twitter && { href: p.twitter, label: "X", icon: <XIcon className="size-4" /> },
    p.gitHub && { href: p.gitHub, label: "GitHub", icon: <GithubIcon className="size-4" /> },
    p.linkedIn && { href: p.linkedIn, label: "LinkedIn", icon: <LinkedinIcon className="size-4" /> },
  ].filter(Boolean) as { href: string; label: string; icon: React.ReactNode }[];

  return (
    <Container className="max-w-5xl py-10">
      <header className="flex flex-col gap-5 border-b border-border pb-8 sm:flex-row sm:items-center">
        <UserAvatar name={p.displayName} url={p.avatarUrl} size="lg" />
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{p.displayName}</h1>
          <p className="text-muted">@{p.username}</p>
          {p.bio && <p className="mt-2 max-w-2xl whitespace-pre-line text-foreground/85">{p.bio}</p>}
          <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-muted">
            <span className="inline-flex items-center gap-1.5">
              <CalendarDays className="size-4" aria-hidden="true" /> Joined{" "}
              {new Intl.DateTimeFormat("en", { month: "long", year: "numeric" }).format(new Date(p.joinedAt))}
            </span>
            {links.map((l) => (
              <a key={l.href} href={l.href} target="_blank" rel="noopener nofollow ugc" className="inline-flex items-center gap-1.5 hover:text-foreground">
                {l.icon} {l.label}
              </a>
            ))}
          </div>
        </div>
        {isMe && (
          <a href="/settings" className="self-start rounded-lg border border-border px-3 py-1.5 text-sm font-medium hover:border-accent/50">
            Edit profile
          </a>
        )}
      </header>

      <div className="mt-8 grid grid-cols-3 gap-3 text-center sm:max-w-md">
        {[
          { n: p.activity.reviews.length, label: "Reviews" },
          { n: p.activity.launched.length, label: "Launches" },
          { n: p.showLikes ? p.activity.liked.length : "—", label: "Likes" },
        ].map((s) => (
          <div key={s.label} className="rounded-xl border border-border bg-surface p-3">
            <p className="text-xl font-bold tabular-nums">{s.n}</p>
            <p className="text-xs text-muted">{s.label}</p>
          </div>
        ))}
      </div>

      {p.activity.launched.length > 0 && (
        <section className="mt-10">
          <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold">
            <Rocket className="size-5 text-accent" aria-hidden="true" /> Launched products
          </h2>
          <ApplicationGrid apps={p.activity.launched} />
        </section>
      )}

      <section className="mt-10">
        <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold">
          <MessageSquare className="size-5 text-accent" aria-hidden="true" /> Reviews
        </h2>
        {p.activity.reviews.length === 0 ? (
          <EmptyState title="No reviews yet" />
        ) : (
          <div className="grid gap-3 lg:grid-cols-2">
            {p.activity.reviews.map((r) => (
              <ReviewCard key={r.id} review={r} showApplication />
            ))}
          </div>
        )}
      </section>

      {p.showLikes && p.activity.liked.length > 0 && (
        <section className="mt-10">
          <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold">
            <Heart className="size-5 text-accent" aria-hidden="true" /> Liked apps
          </h2>
          <ApplicationGrid apps={p.activity.liked} />
        </section>
      )}
    </Container>
  );
}
