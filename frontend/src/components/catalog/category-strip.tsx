import {
  BookOpen,
  Bot,
  Brush,
  Camera,
  Code2,
  Gamepad2,
  Heart,
  Image as ImageIcon,
  MessageCircle,
  Music,
  Palette,
  PenLine,
  Search,
  Video,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";

const ITEMS: { label: string; slug: string; icon: LucideIcon }[] = [
  { label: "Video", slug: "video-generator", icon: Video },
  { label: "Image", slug: "image-generation", icon: ImageIcon },
  { label: "Art", slug: "graphic-design", icon: Brush },
  { label: "Chatbot", slug: "chatbots", icon: Bot },
  { label: "Chat", slug: "chat", icon: MessageCircle },
  { label: "Stories", slug: "stories", icon: BookOpen },
  { label: "Dating", slug: "dating", icon: Heart },
  { label: "Design", slug: "ui-ux-design", icon: Palette },
  { label: "Photography", slug: "photo-editing", icon: Camera },
  { label: "Audio", slug: "music-generation", icon: Music },
  { label: "Search", slug: "search-engines", icon: Search },
  { label: "Writing", slug: "writing-assistants", icon: PenLine },
  { label: "Coding", slug: "code-assistant", icon: Code2 },
  { label: "Game", slug: "gaming", icon: Gamepad2 },
];

/** Icon shortcuts to popular AI categories, shown under the hero search. Scrolls sideways on small screens. */
export function CategoryStrip() {
  return (
    <nav aria-label="Browse by category" className="-mx-4 overflow-x-auto px-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      <ul className="mx-auto flex w-max gap-1 sm:gap-2">
        {ITEMS.map(({ label, slug, icon: Icon }) => (
          <li key={slug}>
            <Link
              href={`/category/${slug}`}
              className="flex w-[4.5rem] flex-col items-center gap-2 rounded-[10px] px-1 py-3 text-xs text-muted transition-colors hover:bg-surface-secondary hover:text-foreground sm:w-20"
            >
              <Icon className="size-5" strokeWidth={1.6} aria-hidden="true" />
              {label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
