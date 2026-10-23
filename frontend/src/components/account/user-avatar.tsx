import { cx } from "@/components/ui/styles";

const SIZES = { sm: "size-9 text-sm", md: "size-14 text-xl", lg: "size-24 text-3xl" } as const;

/** Member avatar: uploaded image, or a monogram on the brand colour. */
export function UserAvatar({ name, url, size = "md", className }: {
  name: string;
  url?: string | null;
  size?: keyof typeof SIZES;
  className?: string;
}) {
  const box = cx("shrink-0 rounded-full", SIZES[size], className);
  if (url) {
    // eslint-disable-next-line @next/next/no-img-element -- first-party media, fixed size
    return <img src={url} alt="" className={cx(box, "object-cover")} />;
  }
  return (
    <span aria-hidden="true" className={cx(box, "grid place-items-center bg-accent font-bold text-accent-foreground")}>
      {name.trim().charAt(0).toUpperCase() || "?"}
    </span>
  );
}
