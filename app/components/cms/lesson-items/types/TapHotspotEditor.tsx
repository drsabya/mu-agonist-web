// app/components/cms/lesson-items/types/TapHotspotEditor.tsx
"use client";

/* Monochrome, minimal, draggable hotspots (image-only), with labeled inputs and live (0..1) values */

import * as React from "react";
import { useEffect, useState, useRef } from "react";
import type { TapHotspotContent, TapHotspotOption } from "@/utils/cms/types";
import { isContentValid, getDefaultContent } from "@/utils/cms";
import {
  SCREEN_WIDTH,
  SCREEN_HEIGHT,
  pxToRelX,
  pxToRelY,
  relToPxX,
  relToPxY,
} from "@/utils/cms/viewport";

type Props = {
  itemId: string;
  initialContent: TapHotspotContent | null;
  onSave: (formData: FormData) => Promise<void>;
};

type Tab = "options" | "bg";

// ----- Draft factory -----
const blankDraftOption = (): TapHotspotOption => ({
  title: "",
  src: "",
  position: { x: 0, y: 0 },
  size: { width: 0, height: 0 },
  feedback: { text: "", src: "" },
  isCorrect: false,
});

// ----- Coerce incoming -----
function coerceContent(raw: TapHotspotContent | null): TapHotspotContent {
  if (raw && isContentValid("tap-hotspot", raw))
    return raw as TapHotspotContent;
  return getDefaultContent("tap-hotspot");
}

export default function TapHotspotEditor({
  itemId,
  initialContent,
  onSave,
}: Props) {
  const [content, setContent] = useState<TapHotspotContent>(() =>
    coerceContent(initialContent)
  );
  const [tab, setTab] = useState<Tab>("options");

  // Draft option
  const [draft, setDraft] = useState<TapHotspotOption>(blankDraftOption);

  // Helpers
  const update = (fn: (prev: TapHotspotContent) => TapHotspotContent) =>
    setContent((prev) => fn(structuredClone(prev)));

  const addOption = () => {
    if (!draft.title) return;
    update((prev) => ({
      ...prev,
      options: [...prev.options, structuredClone(draft)],
    }));
    setDraft(blankDraftOption());
  };

  const removeOptionAt = (idx: number) => {
    update((prev) => {
      const options = prev.options.slice();
      options.splice(idx, 1);
      return { ...prev, options };
    });
  };

  const toggleCorrectAt = (idx: number) => {
    update((prev) => {
      const options = prev.options.slice();
      options[idx] = { ...options[idx], isCorrect: !options[idx].isCorrect };
      return { ...prev, options };
    });
  };

  const handleSave = async () => {
    const fd = new FormData();
    fd.append("lesson_item_id", itemId);
    fd.append("content", JSON.stringify(content));
    await onSave(fd);
  };

  // number input helper (avoid NaN loops)
  const roundOrEmpty = (n?: number) =>
    typeof n === "number" && isFinite(n) ? Math.round(n) : "";

  // Focus title on fresh draft
  const titleRef = useRef<HTMLInputElement | null>(null);
  useEffect(() => {
    if (!draft.title && titleRef.current) titleRef.current.focus();
  }, [draft.title]);

  const uid = React.useId();

  // ----- Dragging (preview) -----
  const stageRef = useRef<HTMLDivElement | null>(null);
  const draggingIdx = useRef<number | null>(null);
  const dragMeta = useRef<{
    pointerId: number;
    offsetX: number;
    offsetY: number;
  } | null>(null);

  const beginDrag = (e: React.PointerEvent, idx: number) => {
    const stage = stageRef.current;
    if (!stage) return;

    stage.setPointerCapture?.(e.pointerId);
    draggingIdx.current = idx;

    const rect = stage.getBoundingClientRect();

    const opt = content.options[idx];
    const leftPx = relToPxX(opt.position.x);
    const topPx = relToPxY(opt.position.y);

    const pointerX = e.clientX - rect.left;
    const pointerY = e.clientY - rect.top;

    dragMeta.current = {
      pointerId: e.pointerId,
      offsetX: pointerX - leftPx,
      offsetY: pointerY - topPx,
    };
  };

  const moveDrag = (e: React.PointerEvent) => {
    const stage = stageRef.current;
    if (!stage || draggingIdx.current === null || !dragMeta.current) return;

    const optIndex = draggingIdx.current;
    const rect = stage.getBoundingClientRect();
    const { offsetX, offsetY } = dragMeta.current;

    const pointerX = e.clientX - rect.left;
    const pointerY = e.clientY - rect.top;

    let left = pointerX - offsetX;
    let top = pointerY - offsetY;

    const opt = content.options[optIndex];
    const wpx = relToPxX(opt.size.width);
    const hpx = relToPxY(opt.size.height);

    // clamp
    left = Math.max(0, Math.min(SCREEN_WIDTH - wpx, left));
    top = Math.max(0, Math.min(SCREEN_HEIGHT - hpx, top));

    const xRel = pxToRelX(left);
    const yRel = pxToRelY(top);

    // update option position live
    setContent((prev) => {
      const next = structuredClone(prev);
      next.options[optIndex].position = { x: xRel, y: yRel };
      return next;
    });
  };

  const endDrag = (e?: React.PointerEvent) => {
    if (
      !stageRef.current ||
      draggingIdx.current === null ||
      !dragMeta.current
    ) {
      draggingIdx.current = null;
      dragMeta.current = null;
      return;
    }
    try {
      stageRef.current.releasePointerCapture?.(dragMeta.current.pointerId);
    } catch {}
    draggingIdx.current = null;
    dragMeta.current = null;
  };

  // Monochrome control styles
  const labelClass =
    "block text-xs font-medium tracking-wide text-gray-700 mb-1";
  const inputClass =
    "w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-gray-900/10";
  const sectionCard = "rounded-lg border border-gray-200 bg-white p-4";
  const subtleBtn =
    "inline-flex items-center justify-center rounded-md border border-gray-300 px-3 py-2 text-sm font-medium text-gray-800 hover:bg-gray-50";
  const primaryBtn =
    "inline-flex items-center justify-center rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-black";

  return (
    <div className="flex flex-col gap-6">
      {/* --------- Preview (drag to reposition; image-only) --------- */}
      <div className="flex items-start justify-center">
        <div
          ref={stageRef}
          className="bg-white border border-gray-300 relative overflow-hidden rounded-md touch-none select-none"
          style={{
            width: SCREEN_WIDTH,
            height: SCREEN_HEIGHT,
            backgroundColor: content.bg.color,
            backgroundImage: content.bg.src
              ? `url(${content.bg.src})`
              : undefined,
            backgroundSize: "cover",
            backgroundPosition: "center",
            cursor: draggingIdx.current !== null ? "grabbing" : "default",
          }}
          onPointerMove={moveDrag}
          onPointerUp={endDrag}
          onPointerCancel={endDrag}
          onPointerLeave={(e) => {
            // If pointer leaves while dragging, end the drag gracefully
            if (draggingIdx.current !== null) endDrag(e as React.PointerEvent);
          }}
        >
          {content.options.map((o, i) => {
            const left = relToPxX(o.position.x);
            const top = relToPxY(o.position.y);
            const width = relToPxX(o.size.width);
            const height = relToPxY(o.size.height);

            return (
              <div
                key={`${o.title}-${i}`}
                aria-label={o.title}
                style={{
                  position: "absolute",
                  left,
                  top,
                  width,
                  height,
                  outline: "none", // no borders
                  backgroundColor: "transparent",
                  // Only draggable when an asset exists (you asked to position the src only)
                  pointerEvents: o.src ? "auto" : "none",
                  cursor:
                    o.src && draggingIdx.current === i
                      ? "grabbing"
                      : o.src
                      ? "grab"
                      : "default",
                }}
                onPointerDown={(e) => {
                  if (!o.src) return;
                  e.preventDefault();
                  beginDrag(e, i);
                }}
              >
                {o.src ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={o.src}
                    alt={o.title}
                    draggable={false}
                    style={{
                      width: "100%",
                      height: "100%",
                      objectFit: "contain",
                      filter: "grayscale(1)",
                      opacity: 0.9,
                      // Let the wrapper handle the pointer; keep the image passive
                      pointerEvents: "none",
                      userSelect: "none",
                    }}
                  />
                ) : null}
                {/* Title intentionally hidden in preview */}
              </div>
            );
          })}
        </div>
      </div>

      {/* --------- Tabs --------- */}
      <div className="flex w-full items-center justify-center">
        <div className="inline-flex rounded-md border border-gray-300 bg-white p-1 text-sm">
          {(["options", "bg"] as Tab[]).map((t) => (
            <label
              key={t}
              className={`cursor-pointer rounded px-3 py-1.5 ${
                tab === t ? "bg-gray-900 text-white" : "text-gray-700"
              }`}
            >
              <input
                type="radio"
                className="hidden"
                checked={tab === t}
                onChange={() => setTab(t)}
              />
              <span className="capitalize">{t}</span>
            </label>
          ))}
        </div>
      </div>

      {/* --------- Options Panel --------- */}
      {tab === "options" && (
        <div className="flex flex-col gap-4">
          {/* Existing options */}
          {content.options.length > 0 && (
            <ul className={sectionCard}>
              {content.options.map((opt, idx) => (
                <li
                  key={`${opt.title}-${idx}`}
                  className="flex w-full items-center justify-between gap-4 border-b border-gray-100 py-3 last:border-b-0"
                >
                  <div className="space-y-1">
                    <div className="font-semibold text-gray-900">
                      {opt.title || `Option ${idx + 1}`}
                    </div>
                    <div className="text-xs text-gray-500 break-all">
                      {opt.src}
                    </div>
                    <div className="flex flex-wrap gap-3 text-xs text-gray-700 font-mono">
                      <span>X:{opt.position.x.toFixed(3)}</span>
                      <span>Y:{opt.position.y.toFixed(3)}</span>
                      <span>W:{opt.size.width.toFixed(3)}</span>
                      <span>H:{opt.size.height.toFixed(3)}</span>
                      <span
                        className={`rounded-full border px-2 py-0.5 ${
                          opt.isCorrect
                            ? "border-gray-900 text-gray-900"
                            : "border-gray-300 text-gray-500"
                        }`}
                      >
                        {opt.isCorrect ? "correct" : "not-correct"}
                      </span>
                    </div>
                    <div className="text-[11px] text-gray-500 font-mono">
                      drag to move (image-only)
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      className={subtleBtn}
                      onClick={() => toggleCorrectAt(idx)}
                      title="Toggle correct"
                    >
                      {opt.isCorrect ? "Unmark" : "Mark"} correct
                    </button>
                    <button
                      className={subtleBtn}
                      onClick={() => removeOptionAt(idx)}
                      title="Delete option"
                    >
                      Delete
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}

          {/* Draft option editor */}
          <div className={sectionCard}>
            <div className="mb-3 text-sm font-semibold text-gray-900">
              {draft.title || "New option"}
            </div>

            {/* Title (reference-only; not shown in preview) */}
            <div className="mb-3">
              <label htmlFor={`${uid}-title`} className={labelClass}>
                Title (reference)
              </label>
              <input
                id={`${uid}-title`}
                ref={titleRef}
                className={inputClass}
                type="text"
                placeholder="e.g., Region A"
                value={draft.title}
                onChange={(e) =>
                  setDraft((d) => ({ ...d, title: e.target.value }))
                }
              />
            </div>

            {/* Asset src */}
            <div className="mb-4">
              <label htmlFor={`${uid}-src`} className={labelClass}>
                Hotspot asset URL (image/SVG)
              </label>
              <input
                id={`${uid}-src`}
                className={inputClass}
                type="text"
                placeholder="https://… (drag to position in preview)"
                value={draft.src}
                onChange={(e) =>
                  setDraft((d) => ({ ...d, src: e.target.value }))
                }
              />
            </div>

            {/* Correct toggle */}
            <label
              htmlFor={`${uid}-correct`}
              className="mb-4 inline-flex cursor-pointer select-none items-center gap-2 text-sm text-gray-800"
            >
              <input
                id={`${uid}-correct`}
                type="checkbox"
                className="h-4 w-4 accent-gray-900"
                checked={draft.isCorrect}
                onChange={(e) =>
                  setDraft((d) => ({ ...d, isCorrect: e.target.checked }))
                }
              />
              Mark as correct
            </label>

            {/* Feedback */}
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <div>
                <label htmlFor={`${uid}-fb-text`} className={labelClass}>
                  Feedback text
                </label>
                <input
                  id={`${uid}-fb-text`}
                  className={inputClass}
                  type="text"
                  placeholder="Shown after tap (optional)"
                  value={draft.feedback?.text || ""}
                  onChange={(e) =>
                    setDraft((d) => ({
                      ...d,
                      feedback: {
                        ...(d.feedback || { text: "", src: "" }),
                        text: e.target.value,
                      },
                    }))
                  }
                />
              </div>
              <div>
                <label htmlFor={`${uid}-fb-img`} className={labelClass}>
                  Feedback image URL
                </label>
                <input
                  id={`${uid}-fb-img`}
                  className={inputClass}
                  type="text"
                  placeholder="https://… (optional)"
                  value={draft.feedback?.src || ""}
                  onChange={(e) =>
                    setDraft((d) => ({
                      ...d,
                      feedback: {
                        ...(d.feedback || { text: "", src: "" }),
                        src: e.target.value,
                      },
                    }))
                  }
                />
              </div>
            </div>

            {/* Hint */}
            <p className="mt-4 text-xs text-gray-500">
              Enter pixel values below; they are stored as fractions of{" "}
              <span className="font-mono">
                {SCREEN_WIDTH}×{SCREEN_HEIGHT}
              </span>
              .
            </p>

            {/* Position (px) */}
            <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">
              <div>
                <label htmlFor={`${uid}-pos-x`} className={labelClass}>
                  X position (px)
                </label>
                <input
                  id={`${uid}-pos-x`}
                  className={inputClass}
                  type="number"
                  placeholder="X (px)"
                  value={roundOrEmpty(relToPxX(draft.position.x))}
                  onChange={(e) => {
                    const px = Number(e.target.value || 0);
                    setDraft((d) => ({
                      ...d,
                      position: { ...d.position, x: pxToRelX(px) },
                    }));
                  }}
                />
                <div className="mt-1 text-[11px] text-gray-600 font-mono">
                  stored: {draft.position.x.toFixed(4)}
                </div>
              </div>
              <div>
                <label htmlFor={`${uid}-pos-y`} className={labelClass}>
                  Y position (px)
                </label>
                <input
                  id={`${uid}-pos-y`}
                  className={inputClass}
                  type="number"
                  placeholder="Y (px)"
                  value={roundOrEmpty(relToPxY(draft.position.y))}
                  onChange={(e) => {
                    const px = Number(e.target.value || 0);
                    setDraft((d) => ({
                      ...d,
                      position: { ...d.position, y: pxToRelY(px) },
                    }));
                  }}
                />
                <div className="mt-1 text-[11px] text-gray-600 font-mono">
                  stored: {draft.position.y.toFixed(4)}
                </div>
              </div>
            </div>

            {/* Size (px) */}
            <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">
              <div>
                <label htmlFor={`${uid}-size-w`} className={labelClass}>
                  Width (px)
                </label>
                <input
                  id={`${uid}-size-w`}
                  className={inputClass}
                  type="number"
                  placeholder="Width (px)"
                  value={roundOrEmpty(relToPxX(draft.size.width))}
                  onChange={(e) => {
                    const px = Number(e.target.value || 0);
                    setDraft((d) => ({
                      ...d,
                      size: { ...d.size, width: pxToRelX(px) },
                    }));
                  }}
                />
                <div className="mt-1 text-[11px] text-gray-600 font-mono">
                  stored: {draft.size.width.toFixed(4)}
                </div>
              </div>
              <div>
                <label htmlFor={`${uid}-size-h`} className={labelClass}>
                  Height (px)
                </label>
                <input
                  id={`${uid}-size-h`}
                  className={inputClass}
                  type="number"
                  placeholder="Height (px)"
                  value={roundOrEmpty(relToPxY(draft.size.height))}
                  onChange={(e) => {
                    const px = Number(e.target.value || 0);
                    setDraft((d) => ({
                      ...d,
                      size: { ...d.size, height: pxToRelY(px) },
                    }));
                  }}
                />
                <div className="mt-1 text-[11px] text-gray-600 font-mono">
                  stored: {draft.size.height.toFixed(4)}
                </div>
              </div>
            </div>

            <div className="mt-4 flex items-center justify-between">
              <div className="text-xs text-gray-500">
                {draft.title
                  ? `Ready to add "${draft.title}"`
                  : "Fill the fields to add an option"}
              </div>
              <button onClick={addOption} className={primaryBtn}>
                Add option
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --------- Background Panel --------- */}
      {tab === "bg" && (
        <div className={sectionCard}>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <div className="md:col-span-1">
              <label htmlFor={`${uid}-bg-color`} className={labelClass}>
                Background color
              </label>
              <input
                id={`${uid}-bg-color`}
                type="color"
                className="h-10 w-full cursor-pointer rounded-md border border-gray-300 bg-white p-1"
                value={content.bg.color}
                onChange={(e) =>
                  update((prev) => ({
                    ...prev,
                    bg: { ...prev.bg, color: e.target.value },
                  }))
                }
              />
            </div>
            <div className="md:col-span-2">
              <label htmlFor={`${uid}-bg-src`} className={labelClass}>
                Background image URL
              </label>
              <input
                id={`${uid}-bg-src`}
                type="text"
                placeholder="https://…"
                className={inputClass}
                value={content.bg.src}
                onChange={(e) =>
                  update((prev) => ({
                    ...prev,
                    bg: { ...prev.bg, src: e.target.value },
                  }))
                }
              />
            </div>
          </div>
        </div>
      )}

      {/* --------- Save --------- */}
      <div className="flex justify-end">
        <button onClick={handleSave} className={primaryBtn}>
          Save
        </button>
      </div>
    </div>
  );
}
