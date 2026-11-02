import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { SolutionView, solutionTitle } from "@/components/solutions/solution-view";
import { publishedSolutions, solutionPage } from "@/content/solutions/pages";
import { pageMetadata } from "@/lib/seo";
import { solutionIndexable } from "@/lib/solutions";

type Props = { params: Promise<{ slug: string }> };

export const dynamicParams = false;
export const generateStaticParams = () => publishedSolutions().map((p) => ({ slug: p.slug }));

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const page = solutionPage((await params).slug);
  if (!page) return {};
  return pageMetadata({ title: solutionTitle(page.title), description: page.description, path: `/solutions/${page.slug}`, noindex: !solutionIndexable(page) });
}

export default async function SolutionPageView({ params }: Props) {
  const page = solutionPage((await params).slug);
  if (!page) notFound();
  return <SolutionView page={page} />;
}
