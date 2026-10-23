"use client";

import { Bookmark, BookmarkCheck, ChevronUp, Heart, Star } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useActionState, useState, useTransition } from "react";
import {
  createReviewAction,
  type FormState,
  setAlternativeVoteAction,
  setBookmarkAction,
  setLikeAction,
  suggestAlternativeAction,
} from "@/app/actions";
import { Field, FormMessage, SubmitButton, TextArea, TextInput } from "@/components/forms/form-kit";
import { buttonClass, cx } from "@/components/ui/styles";

function useSignInRedirect(path: string) {
  const router = useRouter();
  return () => router.push(`/login?next=${encodeURIComponent(path)}`);
}

export function LikeSaveButtons({ applicationId, path, signedIn, liked, likeCount, saved }: {
  applicationId: string;
  path: string;
  signedIn: boolean;
  liked: boolean;
  likeCount: number;
  saved: boolean;
}) {
  const [like, setLike] = useState({ voted: liked, count: likeCount });
  const [isSaved, setSaved] = useState(saved);
  const [error, setError] = useState<string>();
  const [pending, start] = useTransition();
  const signIn = useSignInRedirect(path);

  const toggleLike = () => {
    if (!signedIn) return signIn();
    const next = !like.voted;
    setLike({ voted: next, count: like.count + (next ? 1 : -1) });
    start(async () => {
      const result = await setLikeAction(applicationId, next);
      if ("error" in result) {
        setLike(like);
        setError(result.error);
      } else setLike(result);
    });
  };

  const toggleSave = () => {
    if (!signedIn) return signIn();
    const next = !isSaved;
    setSaved(next);
    start(async () => {
      const result = await setBookmarkAction(applicationId, next);
      if ("error" in result) {
        setSaved(!next);
        setError(result.error);
      }
    });
  };

  return (
    <div className="flex flex-col gap-2">
      <div className="flex gap-2">
        <button
          type="button"
          onClick={toggleLike}
          aria-pressed={like.voted}
          disabled={pending}
          className={buttonClass(like.voted ? "primary" : "outline", "md", "flex-1")}
        >
          <Heart className={cx("size-4", like.voted && "fill-current")} aria-hidden="true" />
          {like.voted ? "Liked" : "Like"}
          <span className="tabular-nums opacity-80">{like.count}</span>
        </button>
        <button
          type="button"
          onClick={toggleSave}
          aria-pressed={isSaved}
          disabled={pending}
          className={buttonClass("outline", "md", "flex-1")}
        >
          {isSaved ? <BookmarkCheck className="size-4" aria-hidden="true" /> : <Bookmark className="size-4" aria-hidden="true" />}
          {isSaved ? "Saved" : "Save"}
        </button>
      </div>
      {error && <p className="text-xs text-danger">{error}</p>}
    </div>
  );
}

export function AlternativeVoteButton({ relationshipId, count, path, signedIn }: {
  relationshipId: string;
  count: number;
  path: string;
  signedIn: boolean;
}) {
  const [state, setState] = useState({ voted: false, count });
  const [pending, start] = useTransition();
  const signIn = useSignInRedirect(path);

  const toggle = () => {
    if (!signedIn) return signIn();
    const next = !state.voted;
    setState({ voted: next, count: state.count + (next ? 1 : -1) });
    start(async () => {
      const result = await setAlternativeVoteAction(relationshipId, next);
      setState("error" in result ? state : result);
    });
  };

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={pending}
      aria-pressed={state.voted}
      title="Vote for this alternative"
      className={cx(
        "flex w-12 shrink-0 flex-col items-center rounded-lg border py-1.5 text-xs font-semibold tabular-nums transition",
        state.voted ? "border-accent bg-accent text-accent-foreground" : "border-border hover:border-accent hover:text-accent",
      )}
    >
      <ChevronUp className="size-4" aria-hidden="true" />
      {state.count}
      <span className="sr-only">votes</span>
    </button>
  );
}

function StarInput({ error }: { error?: string }) {
  const [value, setValue] = useState(0);
  return (
    <fieldset>
      <legend className="mb-1.5 text-sm font-medium">Your rating</legend>
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((n) => (
          <label key={n} className="cursor-pointer" title={`${n} star${n > 1 ? "s" : ""}`}>
            <input type="radio" name="rating" value={n} className="sr-only" onChange={() => setValue(n)} />
            <Star className={cx("size-7 transition", n <= value ? "fill-amber-400 text-amber-400" : "text-muted")} aria-hidden="true" />
            <span className="sr-only">{n} stars</span>
          </label>
        ))}
      </div>
      {error && <p className="mt-1 text-xs text-danger">{error}</p>}
    </fieldset>
  );
}

export function ReviewForm({ applicationId, slug, name, signedIn }: {
  applicationId: string;
  slug: string;
  name: string;
  signedIn: boolean;
}) {
  const [state, action] = useActionState(createReviewAction, {} as FormState);
  const e = state.fieldErrors ?? {};

  if (!signedIn) {
    return (
      <div className="rounded-lg border border-dashed border-border p-5 text-center text-sm text-muted">
        Used {name}?{" "}
        <Link href={`/login?next=/software/${slug}`} className="font-medium text-accent hover:underline">
          Sign in to write a review
        </Link>
      </div>
    );
  }
  if (state.ok) return <FormMessage state={state} />;

  return (
    <div id="write-review" className="scroll-mt-24 rounded-lg border border-border bg-surface">
      <h3 className="border-b border-border px-5 py-4 font-semibold">Write a review of {name}</h3>
      <form action={action} className="flex flex-col gap-4 p-5">
        <input type="hidden" name="applicationId" value={applicationId} />
        <input type="hidden" name="slug" value={slug} />
        <FormMessage state={state} />
        <StarInput error={e.rating} />
        <Field label="Title" name="title" error={e.title}>
          <TextInput name="title" maxLength={120} required error={e.title} />
        </Field>
        <Field label="Your experience" name="body" error={e.body} hint="At least 30 characters.">
          <TextArea name="body" maxLength={5000} required error={e.body} />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Pros" name="pros" optional>
            <TextArea name="pros" maxLength={1000} className="min-h-20" />
          </Field>
          <Field label="Cons" name="cons" optional>
            <TextArea name="cons" maxLength={1000} className="min-h-20" />
          </Field>
        </div>
        <SubmitButton className="self-start">Post review</SubmitButton>
      </form>
    </div>
  );
}

export function SuggestAlternativeForm({ slug, name, signedIn }: { slug: string; name: string; signedIn: boolean }) {
  const [state, action] = useActionState(suggestAlternativeAction, {} as FormState);
  if (!signedIn) {
    return (
      <Link href={`/login?next=/software/${slug}/alternatives`} className={buttonClass("outline", "sm")}>
        Suggest an alternative
      </Link>
    );
  }
  if (state.ok) return <FormMessage state={state} />;
  return (
    <details className="rounded-lg border border-border bg-surface">
      <summary className="cursor-pointer list-none px-4 py-3 text-sm font-medium">
        <span className="text-accent">+</span> Suggest an alternative to {name}
      </summary>
      <form action={action} className="flex flex-col gap-3 border-t border-border p-4">
        <input type="hidden" name="slug" value={slug} />
        <FormMessage state={state} />
        <Field label="Alternative (app URL name)" name="alternativeSlug" error={state.fieldErrors?.alternativeSlug} hint="e.g. obsidian">
          <TextInput name="alternativeSlug" required maxLength={120} />
        </Field>
        <Field label="Why is it a good alternative?" name="note" optional>
          <TextArea name="note" maxLength={500} className="min-h-20" />
        </Field>
        <SubmitButton className="self-start">Send suggestion</SubmitButton>
      </form>
    </details>
  );
}
