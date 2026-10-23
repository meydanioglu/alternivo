"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { setMemberLockAction, setMemberRolesAction } from "@/app/admin/actions";
import { chipClass, cx } from "@/components/ui/styles";

export interface Member {
  id: string;
  email: string;
  displayName: string | null;
  roles: string[];
  emailConfirmed: boolean;
  locked: boolean;
  createdAt: string;
}

const ROLES = [
  ["SuperAdmin", "Süper admin"],
  ["Admin", "Admin"],
  ["Editor", "Editör"],
  ["Moderator", "Moderatör"],
] as const;

export function MemberRow({ member, canEditRoles, joined }: { member: Member; canEditRoles: boolean; joined: string }) {
  const router = useRouter();
  const [roles, setRoles] = useState(member.roles);
  const [error, setError] = useState<string>();
  const [pending, start] = useTransition();

  const toggleRole = (role: string) => {
    const next = roles.includes(role) ? roles.filter((r) => r !== role) : [...roles, role];
    const previous = roles;
    setRoles(next);
    setError(undefined);
    start(async () => {
      const r = await setMemberRolesAction(member.id, next);
      if (r.error) {
        setRoles(previous);
        setError(r.error);
      } else router.refresh();
    });
  };

  const toggleLock = () => {
    if (!member.locked && !window.confirm(`${member.email} engellensin mi? Giriş yapamayacak.`)) return;
    start(async () => {
      const r = await setMemberLockAction(member.id, !member.locked);
      if (r.error) setError(r.error);
      else router.refresh();
    });
  };

  return (
    <tr className={cx(pending && "opacity-60")}>
      <td className="px-4 py-3">
        <p className="font-medium">{member.displayName ?? "—"}</p>
        <p className="text-xs text-muted">{member.email}</p>
        {error && <p className="mt-1 text-xs text-danger">{error}</p>}
      </td>
      <td className="px-4 py-3">
        <div className="flex flex-wrap gap-1">
          {ROLES.map(([value, label]) =>
            canEditRoles ? (
              <button
                key={value}
                type="button"
                disabled={pending}
                onClick={() => toggleRole(value)}
                aria-pressed={roles.includes(value)}
                className={cx(
                  "rounded-full border px-2.5 py-0.5 text-xs transition",
                  roles.includes(value) ? "border-accent bg-accent text-accent-foreground" : "border-border text-muted hover:border-accent/50",
                )}
              >
                {label}
              </button>
            ) : roles.includes(value) ? (
              <span key={value} className={chipClass("accent", "soft", "sm")}>
                {label}
              </span>
            ) : null,
          )}
          {roles.filter((r) => r !== "Member").length === 0 && !canEditRoles && <span className="text-xs text-muted">Üye</span>}
        </div>
      </td>
      <td className="px-4 py-3 text-xs">
        {member.locked ? (
          <span className={chipClass("danger", "soft", "sm")}>Engelli</span>
        ) : member.emailConfirmed ? (
          <span className="text-success">Doğrulanmış</span>
        ) : (
          <span className="text-muted">E-posta doğrulanmadı</span>
        )}
      </td>
      <td className="whitespace-nowrap px-4 py-3 text-xs text-muted">{joined}</td>
      <td className="px-4 py-3 text-right">
        <button
          type="button"
          onClick={toggleLock}
          disabled={pending}
          className={cx("rounded-md px-2.5 py-1 text-xs font-medium", member.locked ? "text-accent hover:underline" : "text-danger hover:underline")}
        >
          {member.locked ? "Engeli kaldır" : "Engelle"}
        </button>
      </td>
    </tr>
  );
}
