import Link from "next/link";
import { Container } from "@/components/layout/page-parts";
import { SearchCommand } from "@/components/search/search-command";
import { buttonClass } from "@/components/ui/styles";

export default function NotFound() {
  return (
    <Container className="flex flex-col items-center py-20 text-center">
      <p className="text-sm font-semibold text-accent">404</p>
      <h1 className="mt-2 text-3xl font-bold tracking-tight">Page not found</h1>
      <p className="mt-2 max-w-md text-muted">The page you are looking for does not exist or has moved. Try searching instead.</p>
      <div className="mt-6 w-full max-w-md">
        <SearchCommand />
      </div>
      <Link href="/" className={buttonClass("secondary", "md", "mt-6")}>
        Back to home
      </Link>
    </Container>
  );
}
