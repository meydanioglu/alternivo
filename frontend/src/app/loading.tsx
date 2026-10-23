import { Container, LoadingSkeleton } from "@/components/layout/page-parts";

export default function Loading() {
  return (
    <Container className="py-8">
      <div className="mb-6 h-8 w-64 animate-pulse rounded bg-surface-secondary motion-reduce:animate-none" />
      <LoadingSkeleton rows={9} />
    </Container>
  );
}
