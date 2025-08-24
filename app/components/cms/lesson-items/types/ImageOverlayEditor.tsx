// app/components/cms/lesson-items/types/ImageOverlayEditor.tsx
"use client";

import React, { useMemo, useState } from "react";
import {
  ImageOverlayContent,
  getDefaultContent,
  imageOverlayContentSchema,
} from "@/utils/cms";

export default function ImageOverlayEditor({
  itemId,
  initialContent,
  onSave,
}: {
  itemId: string;
  initialContent?: ImageOverlayContent | null;
  /** Server action that persists JSON `content` for this lesson_item_id */
  onSave: (formData: FormData) => Promise<void>;
}) {
  // ---- seed from your exact schema + defaults ----
  const seed = useMemo<ImageOverlayContent>(() => {
    if (initialContent) {
      const parsed = imageOverlayContentSchema.safeParse(initialContent);
      if (parsed.success) return parsed.data;
    }
    return getDefaultContent("image-overlay");
  }, [initialContent]);

  const [content, setContent] = useState<ImageOverlayContent>(seed);

  // ---- validation (client-side hint; server should validate again) ----
  const parse = imageOverlayContentSchema.safeParse(content);
  const isValid = parse.success;
  const errors = !parse.success ? parse.error.issues : [];

  // ---- styles (match your BaseEditor spacing) ----
  const inputClass =
    "mt-1 w-full rounded-lg border border-gray-300 px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-black/50";
  const labelText = "text-xs text-gray-600";

  // keep hidden JSON in sync with state
  const json = useMemo(() => JSON.stringify(content), [content]);

  return (
    <form action={onSave} className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
      <input type="hidden" name="lesson_item_id" value={itemId} />
      <input type="hidden" name="content" value={json} />

      <div className="mb-4 flex items-center justify-between gap-3">
        <h3 className="text-lg font-semibold">Image Overlay — Content</h3>
        <button
          type="submit"
          disabled={!isValid}
          className="inline-flex items-center rounded-lg bg-black px-4 py-2 text-sm font-medium text-white hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-black/50 disabled:cursor-not-allowed disabled:opacity-60"
        >
          Save content
        </button>
      </div>

      {!isValid && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-700">
          <p className="font-medium">Please fix the following:</p>
          <ul className="mt-1 list-disc pl-5">
            {errors.map((e, i) => (
              <li key={i}>
                {e.path.join(".")}: {e.message}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {/* Base image */}
        <label className="block sm:col-span-2">
          <span className={labelText}>Base Image URL (imageSrc)</span>
          <input
            className={inputClass}
            placeholder="https://…"
            value={content.imageSrc}
            onChange={(e) =>
              setContent((c) => ({ ...c, imageSrc: e.target.value }))
            }
          />
        </label>

        {/* Overlay image */}
        <label className="block sm:col-span-2">
          <span className={labelText}>Overlay Image URL (overlaySrc)</span>
          <input
            className={inputClass}
            placeholder="https://…"
            value={content.overlaySrc}
            onChange={(e) =>
              setContent((c) => ({ ...c, overlaySrc: e.target.value }))
            }
          />
        </label>

        {/* Reference */}
        <label className="block sm:col-span-2">
          <span className={labelText}>Reference</span>
          <textarea
            rows={2}
            className={inputClass}
            placeholder="e.g., Author. Year. Source…"
            value={content.reference}
            onChange={(e) =>
              setContent((c) => ({ ...c, reference: e.target.value }))
            }
          />
        </label>
      </div>

      {/* Simple preview */}
      <div className="mt-6">
        <h4 className="mb-2 text-sm font-semibold">Preview</h4>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="rounded-lg border border-gray-200 p-2">
            <p className="mb-2 text-xs text-gray-500">Base (imageSrc)</p>
            {content.imageSrc ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={content.imageSrc} alt="" className="w-full rounded" />
            ) : (
              <div className="flex h-32 items-center justify-center text-xs text-gray-400">
                Not set
              </div>
            )}
          </div>
          <div className="rounded-lg border border-gray-200 p-2">
            <p className="mb-2 text-xs text-gray-500">Overlay (overlaySrc)</p>
            {content.overlaySrc ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={content.overlaySrc} alt="" className="w-full rounded" />
            ) : (
              <div className="flex h-32 items-center justify-center text-xs text-gray-400">
                Not set
              </div>
            )}
          </div>
        </div>

        {content.reference?.trim() ? (
          <p className="mt-2 text-xs italic text-gray-500">{content.reference}</p>
        ) : null}
      </div>
    </form>
  );
}
