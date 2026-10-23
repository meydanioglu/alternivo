"use client";

import { Button, Checkbox, CheckboxGroup, Drawer, Label } from "@heroui/react";
import { SlidersHorizontal } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useState, useTransition } from "react";
import { cx } from "@/components/ui/styles";

export interface FilterOption {
  value: string;
  label: string;
  count?: number;
}

export interface FilterGroup {
  /** Query-string key for multi-select groups, e.g. "platform". */
  param: string;
  label: string;
  options: FilterOption[];
}

export interface ToggleOption {
  /** Boolean query-string key, e.g. "selfHosted". */
  param: string;
  label: string;
  count?: number;
}

interface FilterPanelProps {
  groups: FilterGroup[];
  toggles?: ToggleOption[];
}

function useFilterNavigation() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [pending, startTransition] = useTransition();

  const navigate = (mutate: (params: URLSearchParams) => void) => {
    const params = new URLSearchParams(searchParams.toString());
    mutate(params);
    params.delete("page");
    const qs = params.toString();
    startTransition(() => router.push(qs ? `${pathname}?${qs}` : pathname, { scroll: false }));
  };

  return { searchParams, navigate, pending };
}

function FilterControls({ groups, toggles = [] }: FilterPanelProps) {
  const { searchParams, navigate, pending } = useFilterNavigation();
  const activeToggles = toggles.filter((t) => searchParams.get(t.param) === "true").map((t) => t.param);
  const anyActive = groups.some((g) => searchParams.getAll(g.param).length > 0) || activeToggles.length > 0;

  return (
    <div className={cx("flex flex-col gap-6", pending && "opacity-70")} aria-busy={pending}>
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold">Filters</h2>
        {anyActive && (
          <Button
            size="sm"
            variant="ghost"
            onPress={() =>
              navigate((p) => {
                groups.forEach((g) => p.delete(g.param));
                toggles.forEach((t) => p.delete(t.param));
              })
            }
          >
            Clear all
          </Button>
        )}
      </div>

      {toggles.length > 0 && (
        <CheckboxGroup
          name="attributes"
          value={activeToggles}
          onChange={(values: string[]) =>
            navigate((p) => toggles.forEach((t) => (values.includes(t.param) ? p.set(t.param, "true") : p.delete(t.param))))
          }
        >
          <Label>Highlights</Label>
          {toggles.map((t) => (
            <Checkbox key={t.param} value={t.param}>
              <Checkbox.Content>
                <Checkbox.Control>
                  <Checkbox.Indicator />
                </Checkbox.Control>
                <span className="flex-1">{t.label}</span>
                {t.count !== undefined && <span className="text-xs tabular-nums text-muted">{t.count}</span>}
              </Checkbox.Content>
            </Checkbox>
          ))}
        </CheckboxGroup>
      )}

      {groups
        .filter((g) => g.options.length > 0)
        .map((group) => (
          <CheckboxGroup
            key={group.param}
            name={group.param}
            value={searchParams.getAll(group.param)}
            onChange={(values: string[]) =>
              navigate((p) => {
                p.delete(group.param);
                values.forEach((v) => p.append(group.param, v));
              })
            }
          >
            <Label>{group.label}</Label>
            {group.options.map((option) => (
              <Checkbox key={option.value} value={option.value}>
                <Checkbox.Content>
                  <Checkbox.Control>
                    <Checkbox.Indicator />
                  </Checkbox.Control>
                  <span className="flex-1">{option.label}</span>
                  {option.count !== undefined && <span className="text-xs tabular-nums text-muted">{option.count}</span>}
                </Checkbox.Content>
              </Checkbox>
            ))}
          </CheckboxGroup>
        ))}
    </div>
  );
}

/** Desktop sidebar + mobile drawer sharing one implementation. Filter state lives in the URL (shareable). */
export function FilterSidebar(props: FilterPanelProps) {
  return (
    <aside className="hidden w-60 shrink-0 lg:block" aria-label="Filters">
      <div className="sticky top-20 max-h-[calc(100vh-6rem)] overflow-y-auto pr-2">
        <FilterControls {...props} />
      </div>
    </aside>
  );
}

export function MobileFilterDrawer(props: FilterPanelProps) {
  const [isOpen, setIsOpen] = useState(false);
  const searchParams = useSearchParams();
  const count =
    props.groups.reduce((n, g) => n + searchParams.getAll(g.param).length, 0) +
    (props.toggles ?? []).filter((t) => searchParams.get(t.param) === "true").length;

  return (
    <div className="lg:hidden">
      <Button variant="secondary" size="sm" onPress={() => setIsOpen(true)}>
        <SlidersHorizontal className="size-4" aria-hidden="true" />
        Filters{count > 0 ? ` (${count})` : ""}
      </Button>
      <Drawer.Backdrop isOpen={isOpen} onOpenChange={setIsOpen}>
        <Drawer.Content placement="bottom">
          <Drawer.Dialog aria-label="Filters">
            <Drawer.Handle />
            <Drawer.Body className="max-h-[70vh] overflow-y-auto">
              <FilterControls {...props} />
            </Drawer.Body>
            <Drawer.Footer>
              <Button slot="close" fullWidth>
                Show results
              </Button>
            </Drawer.Footer>
          </Drawer.Dialog>
        </Drawer.Content>
      </Drawer.Backdrop>
    </div>
  );
}
