// app/components/cms/lesson-items/types/MediaOverlayEditor.tsx
"use client";

import React, { useMemo, useState } from "react";
import {
  getDefaultContent,
  mediaOverlayContentSchema,
  type MediaOverlayContent,
} from "@/utils/cms";

type MediaType = "image" | "svg" | "video";
type OverlayType = "image" | "svg";

export default function MediaOverlayEditor({
  itemId,
  initialContent,
  onSave,
}: {
  itemId: string;
  initialContent?: MediaOverlayContent | null;
  /** Server action that persists JSON `content` for this lesson_item_id */
  onSave: (formData: FormData) => Promise<void>;
}) {
  // ---- seed from schema + defaults ----
  const seed = useMemo<MediaOverlayContent>(() => {
    if (initialContent) {
      const parsed = mediaOverlayContentSchema.safeParse(initialContent);
      if (parsed.success) return parsed.data;
    }
    return getDefaultContent("media-overlay");
  }, [initialContent]);

  const [content, setContent] = useState<MediaOverlayContent>(seed);

  // ---- validation (client hint; server should validate again) ----
  const parse = mediaOverlayContentSchema.safeParse(content);
  const isValid = parse.success;
  const errors = !parse.success ? parse.error.issues : [];

  // ---- styles (match your BaseEditor spacing) ----
  const inputClass =
    "mt-1 w-full rounded-lg border border-gray-300 px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-black/50";
  const labelText = "text-xs text-gray-600";

  // keep hidden JSON in sync with state
  const json = useMemo(() => JSON.stringify(content), [content]);

  // ---- helpers ----
  const setMediaType = (next: MediaType) => {
    setContent((c) => {
      if (next === c.media.type) return c;
      if (next === "video") {
        return { ...c, media: { type: "video", src: "", hasAudio: true } };
      }
      // image or svg => drop hasAudio
      return {
        ...c,
        media: { type: next, src: "" } as MediaOverlayContent["media"],
      };
    });
  };

  const setOverlayType = (next: OverlayType) => {
    setContent((c) => {
      if (next === c.overlay.type) return c;
      return { ...c, overlay: { type: next, src: "" } };
    });
  };

  return (
    <form
      action={onSave}
      className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm"
    >
      <input type="hidden" name="lesson_item_id" value={itemId} />
      <input type="hidden" name="content" value={json} />

      <div className="mb-4 flex items-center justify-between gap-3">
        <h3 className="text-lg font-semibold">Media Overlay — Content</h3>
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
        {/* Media (base) */}
        <div className="sm:col-span-2 grid grid-cols-1 gap-2 sm:grid-cols-5">
          <label className="block sm:col-span-2">
            <span className={labelText}>Base Media Type</span>
            <select
              className={inputClass}
              value={content.media.type}
              onChange={(e) => setMediaType(e.target.value as MediaType)}
            >
              <option value="image">Image</option>
              <option value="svg">SVG</option>
              <option value="video">Video</option>
            </select>
          </label>

          <label className="block sm:col-span-3">
            <span className={labelText}>
              Base Media URL{" "}
              {content.media.type === "video"
                ? "(video src)"
                : "(image/svg src)"}
            </span>
            <input
              className={inputClass}
              placeholder="https://…"
              value={content.media.src}
              onChange={(e) =>
                setContent((c): MediaOverlayContent => {
                  const src = e.target.value;
                  const m = c.media;
                  switch (m.type) {
                    case "video":
                      return {
                        ...c,
                        media: { type: "video", src, hasAudio: m.hasAudio },
                      };
                    case "image":
                      return { ...c, media: { type: "image", src } };
                    case "svg":
                      return { ...c, media: { type: "svg", src } };
                  }
                })
              }
            />
          </label>

          {content.media.type === "video" && (
            <label className="mt-2 inline-flex items-center gap-2 sm:col-span-5">
              <input
                type="checkbox"
                className="h-4 w-4 rounded border-gray-300"
                checked={
                  content.media.type === "video"
                    ? content.media.hasAudio
                    : false
                }
                onChange={(e) =>
                  setContent((c): MediaOverlayContent => {
                    const m = c.media;
                    if (m.type !== "video") return c;
                    return {
                      ...c,
                      media: {
                        type: "video",
                        src: m.src,
                        hasAudio: e.target.checked,
                      },
                    };
                  })
                }
              />
              <span className="text-xs text-gray-700">
                This video has audio
              </span>
            </label>
          )}
        </div>

        {/* Overlay */}
        <div className="sm:col-span-2 grid grid-cols-1 gap-2 sm:grid-cols-5">
          <label className="block sm:col-span-2">
            <span className={labelText}>Overlay Type</span>
            <select
              className={inputClass}
              value={content.overlay.type}
              onChange={(e) => setOverlayType(e.target.value as OverlayType)}
            >
              <option value="image">Image</option>
              <option value="svg">SVG</option>
            </select>
          </label>

          <label className="block sm:col-span-3">
            <span className={labelText}>
              Overlay URL{" "}
              {content.overlay.type === "svg" ? "(svg src)" : "(image src)"}
            </span>
            <input
              className={inputClass}
              placeholder="https://…"
              value={content.overlay.src}
              onChange={(e) =>
                setContent((c) => ({
                  ...c,
                  overlay: { ...c.overlay, src: e.target.value },
                }))
              }
            />
          </label>
        </div>

        {/* Options */}
        <div className="sm:col-span-2">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-sm font-semibold">Options (optional)</span>
            <button
              type="button"
              onClick={() =>
                setContent((c) => ({
                  ...c,
                  options: [
                    ...c.options,
                    { title: "", isCorrect: false, feedback: "" },
                  ],
                }))
              }
              className="rounded-md border border-gray-300 px-3 py-1.5 text-xs hover:bg-gray-50"
            >
              + Add option
            </button>
          </div>

          {content.options.length === 0 ? (
            <p className="text-xs text-gray-500">No options added yet.</p>
          ) : (
            <div className="space-y-3">
              {content.options.map((opt, idx) => (
                <div
                  key={idx}
                  className="rounded-lg border border-gray-200 p-3"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-600">
                      Option #{idx + 1}
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        setContent((c) => ({
                          ...c,
                          options: c.options.filter((_, i) => i !== idx),
                        }))
                      }
                      className="text-xs text-red-600 hover:underline"
                    >
                      Remove
                    </button>
                  </div>

                  <label className="mt-2 block">
                    <span className={labelText}>Title</span>
                    <input
                      className={inputClass}
                      value={opt.title}
                      onChange={(e) =>
                        setContent((c) => {
                          const next = [...c.options];
                          next[idx] = { ...next[idx], title: e.target.value };
                          return { ...c, options: next };
                        })
                      }
                    />
                  </label>

                  <label className="mt-2 block">
                    <span className={labelText}>Feedback</span>
                    <textarea
                      rows={2}
                      className={inputClass}
                      value={opt.feedback}
                      onChange={(e) =>
                        setContent((c) => {
                          const next = [...c.options];
                          next[idx] = {
                            ...next[idx],
                            feedback: e.target.value,
                          };
                          return { ...c, options: next };
                        })
                      }
                    />
                  </label>

                  <label className="mt-3 inline-flex items-center gap-2">
                    <input
                      type="checkbox"
                      className="h-4 w-4 rounded border-gray-300"
                      checked={opt.isCorrect}
                      onChange={(e) =>
                        setContent((c) => {
                          const next = [...c.options];
                          next[idx] = {
                            ...next[idx],
                            isCorrect: e.target.checked,
                          };
                          return { ...c, options: next };
                        })
                      }
                    />
                    <span className="text-xs text-gray-700">
                      Correct option
                    </span>
                  </label>
                </div>
              ))}
            </div>
          )}
        </div>

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

      {/* Preview (stacked overlay) */}
      <div className="mt-6">
        <h4 className="mb-2 text-sm font-semibold">Preview</h4>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {/* Combined preview with overlay on top */}
          <div className="rounded-lg border border-gray-200 p-2">
            <p className="mb-2 text-xs text-gray-500">
              Combined (base + overlay)
            </p>
            <div className="relative h-48 w-full overflow-hidden rounded bg-gray-50">
              {/* Base */}
              {content.media.src ? (
                content.media.type === "video" ? (
                  <video
                    src={content.media.src}
                    className="absolute inset-0 h-full w-full object-contain"
                    autoPlay
                    muted
                    loop
                    playsInline
                  />
                ) : (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={content.media.src}
                    alt=""
                    className="absolute inset-0 h-full w-full object-contain"
                  />
                )
              ) : (
                <div className="absolute inset-0 flex items-center justify-center text-xs text-gray-400">
                  Base not set
                </div>
              )}

              {/* Overlay */}
              {content.overlay.src ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={content.overlay.src}
                  alt=""
                  className="absolute inset-0 h-full w-full object-contain pointer-events-none"
                />
              ) : null}
            </div>

            {content.media.type === "video" && (
              <p className="mt-2 text-[11px] text-gray-500">
                Video preview is autoplayed & muted in editor. Audio track:{" "}
                <span className="font-medium">
                  {content.media.hasAudio ? "present" : "absent"}
                </span>
              </p>
            )}
          </div>

          {/* Raw sources */}
          <div className="rounded-lg border border-gray-200 p-2">
            <p className="mb-2 text-xs text-gray-500">Sources</p>
            <dl className="text-xs">
              <dt className="font-medium text-gray-700">Base</dt>
              <dd className="mb-2 break-words text-gray-600">
                {content.media.type} — {content.media.src || <em>not set</em>}
              </dd>
              <dt className="font-medium text-gray-700">Overlay</dt>
              <dd className="break-words text-gray-600">
                {content.overlay.type} —{" "}
                {content.overlay.src || <em>not set</em>}
              </dd>
            </dl>

            {content.reference?.trim() ? (
              <p className="mt-3 text-[11px] italic text-gray-500">
                {content.reference}
              </p>
            ) : null}
          </div>
        </div>
      </div>
    </form>
  );
}
