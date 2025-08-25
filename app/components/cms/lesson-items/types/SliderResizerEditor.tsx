// app/components/cms/lesson-items/types/SliderResizerEditor.tsx
"use client";

import React, { useMemo, useState } from "react";
import {
  getDefaultContent,
  sliderResizerContentSchema,
  type SliderResizerContent,
  type SliderResizerItem,
  type SliderThresholdInterface,
} from "@/utils/cms";
import {
  SCREEN_WIDTH,
  SCREEN_HEIGHT,
  relToPxX,
  relToPxY,
  pxToRelX,
  pxToRelY,
} from "@/utils/cms/viewport";

/** Coerce potentially messy DB payloads (strings, empty values) into valid SliderResizerContent */
function coerceFromDb(raw: unknown): SliderResizerContent {
  const fallback = getDefaultContent("slider-resizer");

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
    const overlay = {
      src: asString(read(overlayRaw, "src")) ?? "",
      opacity: clamp01(toNum(read(overlayRaw, "opacity"), 0)), // "" -> 0
    };

    const itemsRaw = read(c, "items");
    const items: SliderResizerItem[] = Array.isArray(itemsRaw)
      ? itemsRaw.map((itUnknown): SliderResizerItem => {
          const it = isRecord(itUnknown) ? itUnknown : {};
          const posRaw = read(it, "position");
          return {
            title: asString(read(it, "title")) ?? "Resizable",
            src: asString(read(it, "src")) ?? "",
            color: asString(read(it, "color")) ?? "#999999",
            position: {
              x: clamp01(toNum(read(posRaw, "x"), 0.5)),
              y: clamp01(toNum(read(posRaw, "y"), 0.5)),
            },
            scaleFactor: toNum(read(it, "scaleFactor"), 1),
          };
        })
      : fallback.items;

    const thresholdsRaw = read(c, "thresholds");
    const thresholds: SliderThresholdInterface[] = Array.isArray(thresholdsRaw)
      ? thresholdsRaw.map((tUnknown) => {
          const t = isRecord(tUnknown) ? tUnknown : {};
          const tMin = toNum(read(t, "min"), min);
          const tMax = toNum(read(t, "max"), max);
          const tMsg = asString(read(t, "message")) ?? "";
          return { min: tMin, max: tMax, message: tMsg };
        })
      : [];

    const reference = asString(read(c, "reference")) ?? "";

    return sliderResizerContentSchema.parse({
      min,
      max,
      step,
      defaultValue,
      label,
      items,
      thresholds,
      bg,
      overlay,
      reference,
    });
  } catch {
    return sliderResizerContentSchema.parse(fallback);
  }
}

export default function SliderResizerEditor({
  itemId,
  initialContent,
  onSave,
}: {
  itemId: string;
  initialContent?: SliderResizerContent | null;
  onSave: (formData: FormData) => Promise<void>;
}) {
  // ---------- seed from DB sample → coerce → validate ----------
  const seed = useMemo<SliderResizerContent>(() => {
    const source = initialContent ?? getDefaultContent("slider-resizer");
    return coerceFromDb(source);
  }, [initialContent]);

  const [content, setContent] = useState<SliderResizerContent>(seed);
  const [lockDefault, setLockDefault] = useState<boolean>(false);
  const parse = sliderResizerContentSchema.safeParse(content);
  const isValid = parse.success;
  const issues = !parse.success ? parse.error.issues : [];
  const jsonValue = useMemo(() => JSON.stringify(content), [content]);

  // ----- helpers -----
  const inputClass =
    "mt-1 w-full rounded-lg border border-gray-300 px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-black/50";
  const labelText = "text-xs text-gray-600";
  const numberClass =
    "mt-1 w-full rounded-lg border border-gray-300 px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-black/50";

  const update = <K extends keyof SliderResizerContent>(
    key: K,
    value: SliderResizerContent[K]
  ) => setContent((c) => ({ ...c, [key]: value }));

  const updateItem = (i: number, patch: Partial<SliderResizerItem>) =>
    setContent((c) => {
      const items = [...c.items];
      items[i] = { ...items[i], ...patch };
      return { ...c, items };
    });

  const updateItemPos = (i: number, coord: "x" | "y", value: number) =>
    setContent((c) => {
      const items = [...c.items];
      const it = items[i];
      const next = Math.max(0, Math.min(1, value));
      items[i] = { ...it, position: { ...it.position, [coord]: next } };
      return { ...c, items };
    });

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

  // ----- New Item Builder (px inputs → center-relative when added) -----
  type NewItemBuilder = {
    title: string;
    src: string;
    color: string;
    x: number; // top-left px
    y: number; // top-left px
    width: number; // px
    height: number; // px (for center calc only)
    scaleFactor: number; // 1..5
  };
  const [builder, setBuilder] = useState<NewItemBuilder>({
    title: "",
    src: "",
    color: "#999999",
    x: 0,
    y: 0,
    width: Math.round(SCREEN_WIDTH * 0.2),
    height: Math.round(SCREEN_HEIGHT * 0.1),
    scaleFactor: 1,
  });

  const resetBuilder = () =>
    setBuilder({
      title: "",
      src: "",
      color: "#999999",
      x: 0,
      y: 0,
      width: Math.round(SCREEN_WIDTH * 0.2),
      height: Math.round(SCREEN_HEIGHT * 0.1),
      scaleFactor: 1,
    });

  const addItem = (b: NewItemBuilder) =>
    setContent((c) => {
      const centerX = b.x + b.width / 2;
      const centerY = b.y + b.height / 2;
      const next: SliderResizerItem = {
        title: b.title || "Resizable",
        src: b.src,
        color: b.src ? "#ffffff" : b.color || "#999999",
        position: { x: pxToRelX(centerX), y: pxToRelY(centerY) }, // center semantics
        scaleFactor: Math.max(1, Math.min(5, b.scaleFactor || 1)),
      };
      return { ...c, items: [...c.items, next] };
    });

  // ----- Preview (CENTER semantics + width scaling) -----
  const widthPxFor = (scale: number) =>
    ((Number(content.defaultValue) * Number(scale)) / 100) * SCREEN_WIDTH;

  const previewItems = content.items.map((it) => {
    const wPx = widthPxFor(it.scaleFactor);
    const left = relToPxX(it.position.x);
    const top = relToPxY(it.position.y);
    return {
      title: it.title,
      src: it.src,
      color: it.color,
      left,
      top,
      wPx,
      xRel: it.position.x,
      yRel: it.position.y,
      scale: it.scaleFactor,
    };
  });

  return (
    <form action={onSave} className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
      <input type="hidden" name="lesson_item_id" value={itemId} />
      <input type="hidden" name="content" value={jsonValue} />

      <div className="mb-4 flex items-center justify-between gap-3">
        <h3 className="text-lg font-semibold">Slider Resizer — Content</h3>
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
            positions are CENTER (0–1 of {SCREEN_WIDTH}×{SCREEN_HEIGHT})
          </span>
        </div>

        <div className="space-y-4">
          {content.items.map((it, i) => {
            const leftPx = relToPxX(it.position.x);
            const topPx = relToPxY(it.position.y);
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

                  <div className="grid grid-cols-2 gap-3">
                    <label className="block">
                      <span className={labelText}>Center x (0–1 of width)</span>
                      <input
                        type="number"
                        step="0.001"
                        min="0"
                        max="1"
                        className={numberClass}
                        value={it.position.x}
                        onChange={(e) => updateItemPos(i, "x", Number(e.target.value))}
                      />
                      <span className="mt-1 block text-[11px] text-gray-500">
                        ≈ {Math.round(leftPx)} px
                      </span>
                    </label>
                    <label className="block">
                      <span className={labelText}>Center y (0–1 of height)</span>
                      <input
                        type="number"
                        step="0.001"
                        min="0"
                        max="1"
                        className={numberClass}
                        value={it.position.y}
                        onChange={(e) => updateItemPos(i, "y", Number(e.target.value))}
                      />
                      <span className="mt-1 block text-[11px] text-gray-500">
                        ≈ {Math.round(topPx)} px
                      </span>
                    </label>
                  </div>

                  <label className="block">
                    <span className={labelText}>Scale factor (× width)</span>
                    <input
                      type="number"
                      step="1"
                      min="1"
                      max="5"
                      className={numberClass}
                      value={it.scaleFactor}
                      onChange={(e) =>
                        updateItem(i, { scaleFactor: Math.max(1, Number(e.target.value) || 1) })
                      }
                    />
                  </label>

                  <div className="sm:col-span-2 rounded-md bg-gray-50 p-2 text-[11px] text-gray-600">
                    <div className="flex flex-wrap gap-x-4 gap-y-1">
                      <span>center( x={it.position.x.toFixed(3)}, y={it.position.y.toFixed(3)} )</span>
                      <span>scale ×{it.scaleFactor}</span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
          {content.items.length === 0 && (
            <div className="rounded border border-dashed p-4 text-xs text-gray-500">
              No items yet.
            </div>
          )}
        </div>
      </div>

      {/* Add Item (px builder → center-relative) */}
      <div className="mt-6 rounded-lg border border-gray-200 p-4">
        <div className="mb-2 text-sm font-semibold">Add item (enter pixels; we convert to center)</div>
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
              <span className={labelText}>x (px, top-left)</span>
              <input
                type="number"
                className={numberClass}
                value={builder.x}
                onChange={(e) => setBuilder((b) => ({ ...b, x: Number(e.target.value) }))}
              />
            </label>
            <label className="block">
              <span className={labelText}>y (px, top-left)</span>
              <input
                type="number"
                className={numberClass}
                value={builder.y}
                onChange={(e) => setBuilder((b) => ({ ...b, y: Number(e.target.value) }))}
              />
            </label>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:col-span-2">
            <label className="block">
              <span className={labelText}>width (px)</span>
              <input
                type="number"
                className={numberClass}
                value={builder.width}
                onChange={(e) => setBuilder((b) => ({ ...b, width: Number(e.target.value) }))}
              />
            </label>
            <label className="block">
              <span className={labelText}>height (px)</span>
              <input
                type="number"
                className={numberClass}
                value={builder.height}
                onChange={(e) => setBuilder((b) => ({ ...b, height: Number(e.target.value) }))}
              />
            </label>
          </div>

          <label className="block">
            <span className={labelText}>Scale factor (1–5)</span>
            <input
              type="number"
              className={numberClass}
              min={1}
              max={5}
              value={builder.scaleFactor}
              onChange={(e) =>
                setBuilder((b) => ({ ...b, scaleFactor: Math.max(1, Number(e.target.value) || 1) }))
              }
            />
          </label>

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

      {/* Live Preview (center semantics, width scales with slider; clipped to container) */}
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

          {/* Items (CENTER positioning via translate -50%,-50%); allow growth; clip via container */}
          {previewItems.map((p, idx) =>
            p.src ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                key={idx}
                src={p.src}
                alt=""
                className="absolute object-contain"
                style={{
                  left: p.left,
                  top: p.top,
                  width: p.wPx,
                  transform: "translate(-50%, -50%)",
                  maxWidth: "none", // let it exceed container; overflow-hidden will clip
                }}
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
                  height: p.wPx,
                  transform: "translate(-50%, -50%)",
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
              style={{ opacity: content.overlay.opacity, zIndex: 20, pointerEvents: "none" }}
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

        {/* Quick summary */}
        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full text-left text-xs">
            <thead className="text-gray-500">
              <tr>
                <th className="px-2 py-1">Item</th>
                <th className="px-2 py-1">center x (rel / px)</th>
                <th className="px-2 py-1">center y (rel / px)</th>
                <th className="px-2 py-1">width (px at current)</th>
                <th className="px-2 py-1">scale</th>
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
                  <td className="px-2 py-1">{Math.round(p.wPx)}px</td>
                  <td className="px-2 py-1">×{p.scale}</td>
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
