// app/components/cms/lesson-items/types/SliderMoverEditor.tsx
"use client";

import React, { useMemo, useState } from "react";
import {
  getDefaultContent,
  sliderMoverContentSchema,
  type SliderMoverContent,
  type SliderThresholdInterface,
} from "@/utils/cms";
import {
  SCREEN_WIDTH,
  SCREEN_HEIGHT,
  relToPxX,
  relToPxY,
  relToPxW,
  relToPxH,
  pxToRelX,
  pxToRelY,
  pxToRelW,
  pxToRelH,
} from "@/utils/cms/viewport";

/** Coerce potentially messy DB payloads (e.g., strings, empty values) into valid SliderMoverContent */
function coerceFromDb(raw: unknown): SliderMoverContent {
  const fallback = getDefaultContent("slider-mover");

  const isRecord = (v: unknown): v is Record<string, unknown> =>
    typeof v === "object" && v !== null;

  const read = (obj: unknown, key: string): unknown =>
    isRecord(obj) ? (obj as Record<string, unknown>)[key] : undefined;

  const asString = (v: unknown): string | undefined =>
    typeof v === "string" ? v : undefined;

  const toNum = (v: unknown, d = 0): number => {
    if (typeof v === "number" && Number.isFinite(v)) return v;
    if (typeof v === "string") {
      const s = v.trim();
      if (s === "") return d;
      const n = Number(s);
      return Number.isFinite(n) ? n : d;
    }
    return d;
  };

  const clamp01 = (n: number) => Math.max(0, Math.min(1, n));

  const relX = (v: unknown) => {
    const n = toNum(v, 0);
    return clamp01(n > 1 ? pxToRelX(n) : n);
  };
  const relY = (v: unknown) => {
    const n = toNum(v, 0);
    return clamp01(n > 1 ? pxToRelY(n) : n);
  };
  const relW = (v: unknown) => {
    const n = toNum(v, 0.2);
    return clamp01(n > 1 ? pxToRelW(n) : n);
  };
  const relH = (v: unknown) => {
    const n = toNum(v, 0.1);
    return clamp01(n > 1 ? pxToRelH(n) : n);
  };

  try {
    const c = isRecord(raw) ? raw : {};

    const min = toNum(read(c, "min"), fallback.min);
    const max = toNum(read(c, "max"), fallback.max);
    const step = toNum(read(c, "step"), fallback.step);
    const defaultValue = toNum(read(c, "defaultValue"), fallback.defaultValue);

    const label = asString(read(c, "label")) ?? fallback.label;

    const bgRaw = read(c, "bg");
    const bg = {
      src: asString(read(bgRaw, "src")) ?? "",
      color: asString(read(bgRaw, "color")) ?? "#ffffff",
    };

    const overlayRaw = read(c, "overlay");
    const overlayOpacity = clamp01(toNum(read(overlayRaw, "opacity"), 0)); // handles "" → 0
    const overlay = {
      src: asString(read(overlayRaw, "src")) ?? "",
      opacity: overlayOpacity,
    };

    const itemsRaw = read(c, "items");
    const items = Array.isArray(itemsRaw)
      ? itemsRaw.map((itUnknown): SliderMoverContent["items"][number] => {
          const it = isRecord(itUnknown) ? itUnknown : {};
          const posRaw = read(it, "position");
          const initRaw = read(posRaw, "initial");
          const finalRaw = read(posRaw, "final");
          const sizeRaw = read(it, "size");

          return {
            title: asString(read(it, "title")) ?? "Movable",
            src: asString(read(it, "src")) ?? "",
            color: asString(read(it, "color")) ?? "#999999",
            position: {
              initial: {
                x: relX(read(initRaw, "x")),
                y: relY(read(initRaw, "y")),
              },
              final: {
                x: relX(read(finalRaw, "x")),
                y: relY(read(finalRaw, "y")),
              },
            },
            size: {
              width: relW(read(sizeRaw, "width")),
              height: relH(read(sizeRaw, "height")),
            },
          };
        })
      : fallback.items;

    const thresholdsRaw = read(c, "thresholds");
    const thresholds: SliderThresholdInterface[] = Array.isArray(thresholdsRaw)
      ? thresholdsRaw.map((tUnknown) => {
          const t = isRecord(tUnknown) ? tUnknown : {};
          return {
            min: toNum(read(t, "min"), min),
            max: toNum(read(t, "max"), max),
            message: asString(read(t, "message")) ?? "",
          };
        })
      : [];

    return sliderMoverContentSchema.parse({
      min,
      max,
      step,
      defaultValue,
      label,
      items,
      thresholds,
      bg,
      overlay,
    });
  } catch {
    return sliderMoverContentSchema.parse(fallback);
  }
}


export default function SliderMoverEditor({
  itemId,
  initialContent,
  onSave,
}: {
  itemId: string;
  initialContent?: SliderMoverContent | null; // may include messy shapes from DB
  /** Server action that persists JSON `content` for this lesson_item_id */
  onSave: (formData: FormData) => Promise<void>;
}) {
  // ---------- seed from DB sample → coerce → validate ----------
  const seed = useMemo<SliderMoverContent>(() => {
    const source = initialContent ?? getDefaultContent("slider-mover");
    return coerceFromDb(source);
  }, [initialContent]);

  const [content, setContent] = useState<SliderMoverContent>(seed);
  const [lockDefault, setLockDefault] = useState<boolean>(false); // lock the slider (like Svelte)
  const parse = sliderMoverContentSchema.safeParse(content);
  const isValid = parse.success;
  const issues = !parse.success ? parse.error.issues : [];

  // ----- helpers -----
  const inputClass =
    "mt-1 w-full rounded-lg border border-gray-300 px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-black/50";
  const labelText = "text-xs text-gray-600";
  const numberClass =
    "mt-1 w-full rounded-lg border border-gray-300 px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-black/50";
  const jsonValue = useMemo(() => JSON.stringify(content), [content]);

  const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
  const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
  const tFromSlider = (v: number) =>
    content.max === content.min ? 0 : (v - content.min) / (content.max - content.min);

  const update = <K extends keyof SliderMoverContent>(key: K, value: SliderMoverContent[K]) =>
    setContent((c) => ({ ...c, [key]: value }));

  const updateItem = (i: number, patch: Partial<SliderMoverContent["items"][number]>) =>
    setContent((c) => {
      const items = [...c.items];
      items[i] = { ...items[i], ...patch };
      return { ...c, items };
    });

  const updateItemPos = (
    i: number,
    key: "initial" | "final",
    coord: "x" | "y",
    value: number
  ) =>
    setContent((c) => {
      const items = [...c.items];
      const it = items[i];
      const next = clamp01(value);
      items[i] = {
        ...it,
        position: { ...it.position, [key]: { ...it.position[key], [coord]: next } },
      };
      return { ...c, items };
    });

  const updateItemSize = (i: number, key: "width" | "height", value: number) =>
    setContent((c) => {
      const items = [...c.items];
      const it = items[i];
      items[i] = { ...it, size: { ...it.size, [key]: clamp01(value) } };
      return { ...c, items };
    });

  const addItem = (builder: NewItemBuilderState) =>
    setContent((c) => ({
      ...c,
      items: [
        ...c.items,
        {
          title: builder.title || "Movable",
          src: builder.src,
          color: builder.src ? "#ffffff" : builder.color || "#999999",
          position: {
            initial: { x: pxToRelX(builder.initialX), y: pxToRelY(builder.initialY) },
            final: { x: pxToRelX(builder.finalX), y: pxToRelY(builder.finalY) },
          },
          size: { width: pxToRelW(builder.width), height: pxToRelH(builder.height) },
        },
      ],
    }));

  const removeItem = (i: number) =>
    setContent((c) => {
      const items = [...c.items];
      items.splice(i, 1);
      return { ...c, items };
    });

  const moveItem = (i: number, dir: -1 | 1) =>
    setContent((c) => {
      const items = [...c.items];
      const j = i + dir;
      if (j < 0 || j >= items.length) return c;
      [items[i], items[j]] = [items[j], items[i]];
      return { ...c, items };
    });

  const addThreshold = () =>
    setContent((c) => ({
      ...c,
      thresholds: [...c.thresholds, { min: c.min, max: c.max, message: "" }],
    }));

  const updateThreshold = (i: number, patch: Partial<SliderThresholdInterface>) =>
    setContent((c) => {
      const th = [...c.thresholds];
      th[i] = { ...th[i], ...patch };
      return { ...c, thresholds: th };
    });

  const removeThreshold = (i: number) =>
    setContent((c) => {
      const th = [...c.thresholds];
      th.splice(i, 1);
      return { ...c, thresholds: th };
    });

  // ----- preview math (TOP-LEFT semantics) -----
  const t = tFromSlider(content.defaultValue);
  const previewItems = content.items.map((it) => {
    const x = lerp(it.position.initial.x, it.position.final.x, t);
    const y = lerp(it.position.initial.y, it.position.final.y, t);

    const wPx = relToPxW(it.size.width);
    const hPx = relToPxH(it.size.height);
    const left = relToPxX(x); // top-left (no centering)
    const top = relToPxY(y);

    return {
      title: it.title,
      src: it.src,
      color: it.color,
      left,
      top,
      wPx,
      hPx,
      xRel: x,
      yRel: y,
      wRel: it.size.width,
      hRel: it.size.height,
    };
  });

  // ----- New Item Builder (px inputs → relative when added) -----
  type NewItemBuilderState = {
    title: string;
    src: string;
    color: string;
    initialX: number; // px
    initialY: number; // px
    width: number; // px
    height: number; // px
    finalX: number; // px
    finalY: number; // px
  };
  const [builder, setBuilder] = useState<NewItemBuilderState>({
    title: "",
    src: "",
    color: "#999999",
    initialX: 0,
    initialY: 0,
    width: Math.round(SCREEN_WIDTH * 0.2),
    height: Math.round(SCREEN_HEIGHT * 0.1),
    finalX: 0,
    finalY: 0,
  });

  const resetBuilder = () =>
    setBuilder({
      title: "",
      src: "",
      color: "#999999",
      initialX: 0,
      initialY: 0,
      width: Math.round(SCREEN_WIDTH * 0.2),
      height: Math.round(SCREEN_HEIGHT * 0.1),
      finalX: 0,
      finalY: 0,
    });

  const builderRel = {
    initialX: pxToRelX(builder.initialX),
    initialY: pxToRelY(builder.initialY),
    width: pxToRelW(builder.width),
    height: pxToRelH(builder.height),
    finalX: pxToRelX(builder.finalX),
    finalY: pxToRelY(builder.finalY),
  };

  return (
    <form action={onSave} className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
      <input type="hidden" name="lesson_item_id" value={itemId} />
      <input type="hidden" name="content" value={jsonValue} />

      <div className="mb-4 flex items-center justify-between gap-3">
        <h3 className="text-lg font-semibold">Slider Mover — Content</h3>
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
            {issues.map((e, i) => (
              <li key={i}>
                {e.path.join(".")}: {e.message}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Top-level settings */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <label className="block">
          <span className={labelText}>Min</span>
          <input
            type="number"
            className={numberClass}
            value={content.min}
            onChange={(e) => update("min", Number(e.target.value))}
          />
        </label>
        <label className="block">
          <span className={labelText}>Max</span>
          <input
            type="number"
            className={numberClass}
            value={content.max}
            onChange={(e) => update("max", Number(e.target.value))}
          />
        </label>
        <label className="block">
          <span className={labelText}>Step</span>
          <input
            type="number"
            className={numberClass}
            step="0.01"
            value={content.step}
            onChange={(e) => update("step", Number(e.target.value))}
          />
        </label>
        <label className="block">
          <span className={labelText}>Default Value</span>
          <input
            type="number"
            className={numberClass}
            step="0.01"
            value={content.defaultValue}
            onChange={(e) => update("defaultValue", Number(e.target.value))}
            disabled={lockDefault}
          />
        </label>
        <label className="block sm:col-span-2">
          <span className={labelText}>Label</span>
          <input
            className={inputClass}
            value={content.label}
            onChange={(e) => update("label", e.target.value)}
          />
        </label>

        {/* Background & overlay */}
        <label className="block">
          <span className={labelText}>Background Image (bg.src)</span>
          <input
            className={inputClass}
            placeholder="https://…"
            value={content.bg.src}
            onChange={(e) => update("bg", { ...content.bg, src: e.target.value })}
          />
        </label>
        <label className="block">
          <span className={labelText}>Background Color (bg.color)</span>
          <input
            type="color"
            className="mt-1 h-10 w-full cursor-pointer rounded-lg border border-gray-300 p-1"
            value={content.bg.color}
            onChange={(e) => update("bg", { ...content.bg, color: e.target.value })}
          />
        </label>

        <label className="block">
          <span className={labelText}>Overlay Image (overlay.src)</span>
          <input
            className={inputClass}
            placeholder="https://…"
            value={content.overlay.src}
            onChange={(e) => update("overlay", { ...content.overlay, src: e.target.value })}
          />
        </label>
        <label className="block">
          <span className={labelText}>Overlay Opacity (0–1)</span>
          <input
            type="number"
            className={numberClass}
            step="0.01"
            min="0"
            max="1"
            value={content.overlay.opacity}
            onChange={(e) =>
              update("overlay", {
                ...content.overlay,
                opacity: Math.max(0, Math.min(1, Number(e.target.value))),
              })
            }
          />
        </label>
      </div>

      {/* Items (existing) */}
      <div className="mt-6">
        <div className="mb-2 flex items-center justify-between">
          <h4 className="text-sm font-semibold">Items</h4>
          <span className="text-xs text-gray-500">
            x/width relative to {SCREEN_WIDTH}px, y/height relative to {SCREEN_HEIGHT}px
          </span>
        </div>

        <div className="space-y-4">
          {content.items.map((it, i) => {
            const wPx = relToPxW(it.size.width);
            const hPx = relToPxH(it.size.height);
            const initLeft = relToPxX(it.position.initial.x);
            const initTop = relToPxY(it.position.initial.y);
            const finLeft = relToPxX(it.position.final.x);
            const finTop = relToPxY(it.position.final.y);

            return (
              <div key={i} className="rounded-lg border border-gray-200 p-3 sm:p-4">
                <div className="mb-2 flex items-center justify-between gap-2">
                  <div className="text-sm font-medium">Item {i + 1}</div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => moveItem(i, -1)}
                      className="rounded border border-gray-300 px-2 py-1 text-xs hover:bg-gray-50"
                    >
                      ↑
                    </button>
                    <button
                      type="button"
                      onClick={() => moveItem(i, 1)}
                      className="rounded border border-gray-300 px-2 py-1 text-xs hover:bg-gray-50"
                    >
                      ↓
                    </button>
                    <button
                      type="button"
                      onClick={() => removeItem(i)}
                      className="rounded border border-red-300 px-2 py-1 text-xs text-red-600 hover:bg-red-50"
                    >
                      Remove
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <label className="block">
                    <span className={labelText}>Title</span>
                    <input
                      className={inputClass}
                      value={it.title}
                      onChange={(e) => updateItem(i, { title: e.target.value })}
                    />
                  </label>
                  <label className="block">
                    <span className={labelText}>Color (fallback)</span>
                    <input
                      type="color"
                      className="mt-1 h-10 w-full cursor-pointer rounded-lg border border-gray-300 p-1"
                      value={it.color}
                      onChange={(e) => updateItem(i, { color: e.target.value })}
                    />
                  </label>
                  <label className="block sm:col-span-2">
                    <span className={labelText}>Image Src (optional)</span>
                    <input
                      className={inputClass}
                      placeholder="https://…"
                      value={it.src}
                      onChange={(e) => updateItem(i, { src: e.target.value })}
                    />
                  </label>

                  {/* Initial position (relative, top-left) */}
                  <div className="grid grid-cols-2 gap-3">
                    <label className="block">
                      <span className={labelText}>Initial x (0–1 of width)</span>
                      <input
                        type="number"
                        step="0.001"
                        min="0"
                        max="1"
                        className={numberClass}
                        value={it.position.initial.x}
                        onChange={(e) =>
                          updateItemPos(i, "initial", "x", Number(e.target.value))
                        }
                      />
                      <span className="mt-1 block text-[11px] text-gray-500">
                        ≈ {Math.round(initLeft)} px
                      </span>
                    </label>
                    <label className="block">
                      <span className={labelText}>Initial y (0–1 of height)</span>
                      <input
                        type="number"
                        step="0.001"
                        min="0"
                        max="1"
                        className={numberClass}
                        value={it.position.initial.y}
                        onChange={(e) =>
                          updateItemPos(i, "initial", "y", Number(e.target.value))
                        }
                      />
                      <span className="mt-1 block text-[11px] text-gray-500">
                        ≈ {Math.round(initTop)} px
                      </span>
                    </label>
                  </div>

                  {/* Final position (relative, top-left) */}
                  <div className="grid grid-cols-2 gap-3">
                    <label className="block">
                      <span className={labelText}>Final x (0–1 of width)</span>
                      <input
                        type="number"
                        step="0.001"
                        min="0"
                        max="1"
                        className={numberClass}
                        value={it.position.final.x}
                        onChange={(e) =>
                          updateItemPos(i, "final", "x", Number(e.target.value))
                        }
                      />
                      <span className="mt-1 block text-[11px] text-gray-500">
                        ≈ {Math.round(finLeft)} px
                      </span>
                    </label>
                    <label className="block">
                      <span className={labelText}>Final y (0–1 of height)</span>
                      <input
                        type="number"
                        step="0.001"
                        min="0"
                        max="1"
                        className={numberClass}
                        value={it.position.final.y}
                        onChange={(e) =>
                          updateItemPos(i, "final", "y", Number(e.target.value))
                        }
                      />
                      <span className="mt-1 block text-[11px] text-gray-500">
                        ≈ {Math.round(finTop)} px
                      </span>
                    </label>
                  </div>

                  {/* Size (relative to screen width/height) */}
                  <div className="grid grid-cols-2 gap-3">
                    <label className="block">
                      <span className={labelText}>Width (0–1 of width)</span>
                      <input
                        type="number"
                        step="0.001"
                        min="0"
                        max="1"
                        className={numberClass}
                        value={it.size.width}
                        onChange={(e) =>
                          updateItemSize(i, "width", Number(e.target.value))
                        }
                      />
                      <span className="mt-1 block text-[11px] text-gray-500">
                        ≈ {Math.round(wPx)} px
                      </span>
                    </label>
                    <label className="block">
                      <span className={labelText}>Height (0–1 of height)</span>
                      <input
                        type="number"
                        step="0.001"
                        min="0"
                        max="1"
                        className={numberClass}
                        value={it.size.height}
                        onChange={(e) =>
                          updateItemSize(i, "height", Number(e.target.value))
                        }
                      />
                      <span className="mt-1 block text-[11px] text-gray-500">
                        ≈ {Math.round(hPx)} px
                      </span>
                    </label>
                  </div>

                  {/* Quick relative summary */}
                  <div className="sm:col-span-2 rounded-md bg-gray-50 p-2 text-[11px] text-gray-600">
                    <div className="flex flex-wrap gap-x-4 gap-y-1">
                      <span>
                        init( x={it.position.initial.x.toFixed(3)}, y={it.position.initial.y.toFixed(3)} )
                      </span>
                      <span>
                        final( x={it.position.final.x.toFixed(3)}, y={it.position.final.y.toFixed(3)} )
                      </span>
                      <span>
                        size( w={it.size.width.toFixed(3)}, h={it.size.height.toFixed(3)} )
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Add Item (px builder like Svelte) */}
      <div className="mt-6 rounded-lg border border-gray-200 p-4">
        <div className="mb-2 text-sm font-semibold">Add item (enter pixels; we convert to relative)</div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <label className="block">
            <span className={labelText}>Title</span>
            <input
              className={inputClass}
              value={builder.title}
              onChange={(e) => setBuilder((b) => ({ ...b, title: e.target.value }))}
            />
          </label>
          <label className="block">
            <span className={labelText}>Image Src (optional)</span>
            <input
              className={inputClass}
              placeholder="https://…"
              value={builder.src}
              onChange={(e) => setBuilder((b) => ({ ...b, src: e.target.value }))}
            />
          </label>
          {!builder.src && (
            <label className="block">
              <span className={labelText}>Color (used if no image)</span>
              <input
                type="color"
                className="mt-1 h-10 w-full cursor-pointer rounded-lg border border-gray-300 p-1"
                value={builder.color}
                onChange={(e) => setBuilder((b) => ({ ...b, color: e.target.value }))}
              />
            </label>
          )}

          <div className="grid grid-cols-2 gap-3 sm:col-span-2">
            <label className="block">
              <span className={labelText}>Initial x (px)</span>
              <input
                type="number"
                className={numberClass}
                value={builder.initialX}
                onChange={(e) =>
                  setBuilder((b) => ({ ...b, initialX: Number(e.target.value) }))
                }
              />
              <span className="mt-1 block text-[11px] text-gray-500">
                rel ≈ {builderRel.initialX.toFixed(3)}
              </span>
            </label>
            <label className="block">
              <span className={labelText}>Initial y (px)</span>
              <input
                type="number"
                className={numberClass}
                value={builder.initialY}
                onChange={(e) =>
                  setBuilder((b) => ({ ...b, initialY: Number(e.target.value) }))
                }
              />
              <span className="mt-1 block text-[11px] text-gray-500">
                rel ≈ {builderRel.initialY.toFixed(3)}
              </span>
            </label>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:col-span-2">
            <label className="block">
              <span className={labelText}>Width (px)</span>
              <input
                type="number"
                className={numberClass}
                value={builder.width}
                onChange={(e) =>
                  setBuilder((b) => ({ ...b, width: Number(e.target.value) }))
                }
              />
              <span className="mt-1 block text-[11px] text-gray-500">
                rel ≈ {builderRel.width.toFixed(3)}
              </span>
            </label>
            <label className="block">
              <span className={labelText}>Height (px)</span>
              <input
                type="number"
                className={numberClass}
                value={builder.height}
                onChange={(e) =>
                  setBuilder((b) => ({ ...b, height: Number(e.target.value) }))
                }
              />
              <span className="mt-1 block text-[11px] text-gray-500">
                rel ≈ {builderRel.height.toFixed(3)}
              </span>
            </label>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:col-span-2">
            <label className="block">
              <span className={labelText}>Final x (px)</span>
              <input
                type="number"
                className={numberClass}
                value={builder.finalX}
                onChange={(e) =>
                  setBuilder((b) => ({ ...b, finalX: Number(e.target.value) }))
                }
              />
              <span className="mt-1 block text-[11px] text-gray-500">
                rel ≈ {builderRel.finalX.toFixed(3)}
              </span>
            </label>
            <label className="block">
              <span className={labelText}>Final y (px)</span>
              <input
                type="number"
                className={numberClass}
                value={builder.finalY}
                onChange={(e) =>
                  setBuilder((b) => ({ ...b, finalY: Number(e.target.value) }))
                }
              />
              <span className="mt-1 block text-[11px] text-gray-500">
                rel ≈ {builderRel.finalY.toFixed(3)}
              </span>
            </label>
          </div>

          <div className="sm:col-span-2 flex items-center justify-end gap-2">
            <button
              type="button"
              className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm hover:bg-gray-50"
              onClick={resetBuilder}
            >
              Reset
            </button>
            <button
              type="button"
              className="rounded-lg bg-black px-3 py-1.5 text-sm font-medium text-white hover:opacity-90"
              onClick={() => {
                addItem(builder);
                resetBuilder();
              }}
            >
              Add item +
            </button>
          </div>
        </div>
      </div>

      {/* Thresholds */}
      <div className="mt-6">
        <div className="mb-2 flex items-center justify-between">
          <h4 className="text-sm font-semibold">Threshold messages</h4>
          <button
            type="button"
            onClick={addThreshold}
            className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm hover:bg-gray-50"
          >
            + Add threshold
          </button>
        </div>
        <div className="space-y-3">
          {content.thresholds.map((th, i) => (
            <div key={i} className="grid grid-cols-1 gap-3 sm:grid-cols-4">
              <label className="block">
                <span className={labelText}>Min</span>
                <input
                  type="number"
                  className={numberClass}
                  value={th.min}
                  onChange={(e) => updateThreshold(i, { min: Number(e.target.value) })}
                />
              </label>
              <label className="block">
                <span className={labelText}>Max</span>
                <input
                  type="number"
                  className={numberClass}
                  value={th.max}
                  onChange={(e) => updateThreshold(i, { max: Number(e.target.value) })}
                />
              </label>
              <label className="block sm:col-span-2">
                <span className={labelText}>Message</span>
                <input
                  className={inputClass}
                  value={th.message}
                  onChange={(e) => updateThreshold(i, { message: e.target.value })}
                />
              </label>
              <div className="sm:col-span-4 flex justify-end">
                <button
                  type="button"
                  onClick={() => removeThreshold(i)}
                  className="rounded border border-red-300 px-2 py-1 text-xs text-red-600 hover:bg-red-50"
                >
                  Remove
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Live Preview (pixel-accurate, TOP-LEFT semantics) */}
      <div className="mt-8">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <h4 className="text-sm font-semibold">
            Live Preview ({SCREEN_WIDTH}×{SCREEN_HEIGHT}px)
          </h4>
          <div className="flex items-center gap-3 text-sm">
            <span className="text-gray-600">{content.label}</span>
            <input
              type="range"
              min={content.min}
              max={content.max}
              step={content.step}
              value={content.defaultValue}
              onChange={(e) => update("defaultValue", Number(e.target.value))}
              disabled={lockDefault}
            />
            <span className="tabular-nums">{content.defaultValue}</span>
            <label className="ml-2 inline-flex items-center gap-2 text-xs">
              <input
                type="checkbox"
                className="h-4 w-4"
                checked={lockDefault}
                onChange={(e) => setLockDefault(e.target.checked)}
              />
              Lock default value
            </label>
          </div>
        </div>

        <div
          className="relative overflow-hidden rounded-lg border border-gray-200"
          style={{
            width: SCREEN_WIDTH,
            height: SCREEN_HEIGHT,
            backgroundColor: content.bg.color,
          }}
        >
          {/* Background image */}
          {content.bg.src ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={content.bg.src}
              alt=""
              className="absolute inset-0 h-full w-full object-cover"
            />
          ) : null}

          {/* Items (top-left positioning) */}
          {previewItems.map((p, idx) =>
            p.src ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                key={idx}
                src={p.src}
                alt=""
                className="absolute object-contain"
                style={{ left: p.left, top: p.top, width: p.wPx, height: p.hPx }}
                title={p.title}
              />
            ) : (
              <div
                key={idx}
                className="absolute rounded"
                style={{
                  left: p.left,
                  top: p.top,
                  width: p.wPx,
                  height: p.hPx,
                  backgroundColor: p.color,
                }}
                title={p.title}
              />
            )
          )}

          {/* Overlay ABOVE items */}
          {content.overlay.src ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={content.overlay.src}
              alt=""
              className="absolute inset-0 h-full w-full object-cover"
              style={{ opacity: content.overlay.opacity, zIndex: 20 }}
            />
          ) : null}

          {/* Label plaque */}
          {content.label?.trim() ? (
            <div className="absolute bottom-2 left-2 z-30 rounded border bg-white px-2 py-1 text-xs font-semibold">
              {content.label} {Number(content.defaultValue).toFixed(1)}
            </div>
          ) : null}
        </div>

        {/* Threshold messages (strict between) */}
        <div className="mt-3 space-y-2">
          {content.thresholds
            .filter((th) => content.defaultValue > th.min && content.defaultValue < th.max)
            .map((th, i) => (
              <div key={i} className="rounded border bg-white p-3 text-sm">
                {th.message}
              </div>
            ))}
        </div>

        {/* Dimensions summary */}
        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full text-left text-xs">
            <thead className="text-gray-500">
              <tr>
                <th className="px-2 py-1">Item</th>
                <th className="px-2 py-1">x (rel / px)</th>
                <th className="px-2 py-1">y (rel / px)</th>
                <th className="px-2 py-1">w (rel / px)</th>
                <th className="px-2 py-1">h (rel / px)</th>
              </tr>
            </thead>
            <tbody>
              {previewItems.map((p, i) => (
                <tr key={i} className="border-t">
                  <td className="px-2 py-1">{p.title || `Item ${i + 1}`}</td>
                  <td className="px-2 py-1">
                    {p.xRel.toFixed(3)} / {Math.round(p.left)}px
                  </td>
                  <td className="px-2 py-1">
                    {p.yRel.toFixed(3)} / {Math.round(p.top)}px
                  </td>
                  <td className="px-2 py-1">
                    {p.wRel.toFixed(3)} / {Math.round(p.wPx)}px
                  </td>
                  <td className="px-2 py-1">
                    {p.hRel.toFixed(3)} / {Math.round(p.hPx)}px
                  </td>
                </tr>
              ))}
              {previewItems.length === 0 && (
                <tr>
                  <td className="px-2 py-2 text-gray-500" colSpan={5}>
                    No items yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </form>
  );
}
