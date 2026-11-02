"use client";

import { useRef, useState } from "react";
import { uploadSubmissionMediaAction } from "@/app/actions";

const ACCEPT = "image/png,image/jpeg,image/webp,image/gif";

/**
 * Drag-and-drop (or click to choose) image upload. Each file is uploaded as soon as it is dropped; the stored URLs
 * travel with the form as hidden inputs named {name}.
 */
export function ImageDrop({ name, label, hint, max }: { name: string; label: string; hint: string; max: number }) {
  const input = useRef<HTMLInputElement>(null);
  const [urls, setUrls] = useState<string[]>([]);
  const [uploading, setUploading] = useState(0);
  const [over, setOver] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function add(files: FileList | null) {
    if (!files?.length) return;
    setError(null);
    const room = max === 1 ? 1 : max - urls.length;
    const picked = Array.from(files).filter((f) => f.type.startsWith("image/")).slice(0, Math.max(room, 0));
    if (picked.length === 0) {
      setError(room <= 0 ? `You can add up to ${max} images.` : "Use a PNG, JPG, WebP or GIF image.");
      return;
    }
    setUploading((n) => n + picked.length);
    await Promise.all(
      picked.map(async (file) => {
        const form = new FormData();
        form.set("file", file);
        const r = await uploadSubmissionMediaAction(form).catch(() => ({ error: `${file.name} could not be uploaded.`, url: undefined }));
        setUploading((n) => n - 1);
        if (r.url) setUrls((prev) => (max === 1 ? [r.url!] : [...prev, r.url!].slice(0, max)));
        else setError(r.error ?? "Upload failed.");
      }),
    );
  }

  const full = max > 1 && urls.length >= max;

  return (
    <div className="flex flex-col gap-2">
      <p className="text-sm font-medium">
        {label} <span className="font-normal text-muted">(optional)</span>
      </p>
      {!full && (
        <button
          type="button"
          onClick={() => input.current?.click()}
          onDragOver={(e) => {
            e.preventDefault();
            setOver(true);
          }}
          onDragLeave={() => setOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setOver(false);
            void add(e.dataTransfer.files);
          }}
          className={`flex min-h-28 flex-col items-center justify-center gap-1 rounded-[10px] border-2 border-dashed p-4 text-center text-sm transition-colors ${
            over ? "border-accent bg-accent/5" : "border-border hover:border-accent/60"
          }`}
        >
          <span className="font-medium">{uploading > 0 ? "Uploading…" : "Drag & drop images here, or click to choose"}</span>
          <span className="text-xs text-muted">{hint}</span>
        </button>
      )}
      <input
        ref={input}
        type="file"
        accept={ACCEPT}
        multiple={max > 1}
        hidden
        onChange={(e) => {
          void add(e.currentTarget.files);
          e.currentTarget.value = "";
        }}
      />
      {error && <p className="text-sm text-red-600">{error}</p>}
      {urls.length > 0 && (
        <ul className="flex flex-wrap gap-3">
          {urls.map((url) => (
            <li key={url} className="relative">
              {/* eslint-disable-next-line @next/next/no-img-element -- local preview of a just-uploaded file */}
              <img src={url} alt="" className={`rounded-md border border-border object-cover ${max === 1 ? "size-20" : "h-20 w-32"}`} />
              <button
                type="button"
                aria-label="Remove image"
                onClick={() => setUrls((prev) => prev.filter((u) => u !== url))}
                className="absolute -right-2 -top-2 grid size-6 place-items-center rounded-full border border-border bg-surface text-xs shadow"
              >
                ✕
              </button>
              <input type="hidden" name={name} value={url} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
