// app/components/cms/lesson-items/types/DragDropEditor.tsx
"use client";

import * as React from "react";
import { useEffect, useState } from "react";
import type {
  DragDropContent,
  DragDropItem,
  DragDropTarget,
} from "@/utils/cms/types";
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
  initialContent: DragDropContent | null;
  onSave: (formData: FormData) => Promise<void>;
};

type Tab = "items" | "targets" | "bg";
type FinalMode = "one" | "multiple" | "none";

const slug = (s: string) =>
  s
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9\-]/g, "");

// ----- Draft factories -----
const blankDraftItem = (): DragDropItem => ({
  id: "",
  title: "",
  src: "",
  group: "",
  position: { initial: { x: 0, y: 0 } },
  size: { width: 0, height: 0 },
});

const blankDraftTarget = (): DragDropTarget => ({
  id: "",
  title: "",
  src: "",
  position: { x: 0, y: 0 },
  size: { width: 0, height: 0 },
  color: "#ffffff",
  accepts: [],
  feedback: { text: "", src: "" },
});

// ----- Coerce incoming -----
function coerceContent(raw: DragDropContent | null): DragDropContent {
  if (raw && isContentValid("drag-drop", raw)) return raw as DragDropContent;
  return getDefaultContent("drag-drop");
}

export default function DragDropEditor({
  itemId,
  initialContent,
  onSave,
}: Props) {
  const [content, setContent] = useState<DragDropContent>(() =>
    coerceContent(initialContent)
  );
  const [tab, setTab] = useState<Tab>("targets");

  // ----- Draft item -----
  const [draftItem, setDraftItem] = useState<DragDropItem>(blankDraftItem);
  const [finalMode, setFinalMode] = useState<FinalMode>("one");

  useEffect(() => {
    setDraftItem((d) => ({
      ...d,
      id: d.title ? `drag-${slug(d.title)}` : "",
    }));
  }, [draftItem.title]);

  useEffect(() => {
    setDraftItem((d) => {
      const next = { ...d, position: { ...d.position } };
      if (finalMode === "one") {
        if (!next.position.final) next.position.final = { x: 0, y: 0 };
        delete next.position.finals;
      } else if (finalMode === "multiple") {
        if (!next.position.finals) next.position.finals = {};
        delete next.position.final;
      } else {
        delete next.position.final;
        delete next.position.finals;
      }
      return next;
    });
  }, [finalMode]);

  // ----- Draft target -----
  const [draftTarget, setDraftTarget] = useState<DragDropTarget>(
    blankDraftTarget()
  );

  useEffect(() => {
    setDraftTarget((t) => ({
      ...t,
      id: t.title ? `target-${slug(t.title)}` : "",
    }));
  }, [draftTarget.title]);

  // ----- Helpers -----
  const update = (fn: (prev: DragDropContent) => DragDropContent) =>
    setContent((prev) => fn(structuredClone(prev)));

  const addItem = () => {
    if (!draftItem.id || !draftItem.title) return;
    update((prev) => ({
      ...prev,
      items: [...prev.items, structuredClone(draftItem)],
    }));
    setDraftItem(blankDraftItem());
    setFinalMode("one");
  };

  const removeItemAt = (idx: number) => {
    update((prev) => {
      const idToRemove = prev.items[idx]?.id;
      const items = prev.items.slice();
      items.splice(idx, 1);
      const targets = prev.targets.map((t) => ({
        ...t,
        accepts: idToRemove
          ? t.accepts.filter((id) => id !== idToRemove)
          : t.accepts,
      }));
      return { ...prev, items, targets };
    });
  };

  const addTarget = () => {
    if (!draftTarget.id) return;
    update((prev) => ({
      ...prev,
      targets: [...prev.targets, structuredClone(draftTarget)],
    }));
    setDraftTarget(blankDraftTarget());
  };

  const removeTargetAt = (idx: number) => {
    update((prev) => {
      const targets = prev.targets.slice();
      targets.splice(idx, 1);
      return { ...prev, targets };
    });
  };

  const toggleTargetAccept = (targetIndex: number, itemId: string) => {
    update((prev) => {
      const targets = prev.targets.slice();
      const t = { ...targets[targetIndex] };
      const exists = t.accepts.includes(itemId);
      t.accepts = exists
        ? t.accepts.filter((i) => i !== itemId)
        : [...t.accepts, itemId];
      targets[targetIndex] = t;
      return { ...prev, targets };
    });
  };

  const handleSave = async () => {
    const fd = new FormData();
    fd.append("lesson_item_id", itemId);
    fd.append("content", JSON.stringify(content));
    await onSave(fd);
  };

  const previewStageClass =
    "bg-white border border-slate-200 relative overflow-hidden";

  return (
    <div className="flex flex-col gap-6">
      {/* --------- Preview (Initial / Final) --------- */}
      <div className="flex flex-wrap items-start justify-center gap-4">
        {/* Initial */}
        <div
          className={previewStageClass}
          style={{
            width: SCREEN_WIDTH,
            height: SCREEN_HEIGHT,
            backgroundColor: content.bg.color,
            backgroundImage: content.bg.src
              ? `url(${content.bg.src})`
              : undefined,
            backgroundSize: "cover",
            backgroundPosition: "center",
          }}
        >
          {content.targets.map((t) => (
            <div
              key={t.id}
              aria-label={t.title}
              style={{
                position: "absolute",
                left: relToPxX(t.position.x),
                top: relToPxY(t.position.y),
                width: relToPxX(t.size.width),
                height: relToPxY(t.size.height),
                backgroundColor: t.src
                  ? "transparent"
                  : t.color || "transparent",
              }}
            >
              {t.src ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={t.src}
                  alt={t.title || t.id}
                  style={{
                    width: "100%",
                    height: "100%",
                    objectFit: "contain",
                  }}
                />
              ) : null}
            </div>
          ))}
          {content.items.map((it) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              key={it.id}
              src={it.src}
              alt={it.title}
              style={{
                position: "absolute",
                left: relToPxX(it.position.initial.x),
                top: relToPxY(it.position.initial.y),
                width: relToPxX(it.size.width),
                height: relToPxY(it.size.height),
                objectFit: "contain",
                pointerEvents: "none",
              }}
            />
          ))}
        </div>

        {/* Final (single-final preview only) */}
        <div
          className={previewStageClass}
          style={{
            width: SCREEN_WIDTH,
            height: SCREEN_HEIGHT,
            backgroundColor: content.bg.color,
            backgroundImage: content.bg.src
              ? `url(${content.bg.src})`
              : undefined,
            backgroundSize: "cover",
            backgroundPosition: "center",
          }}
        >
          {content.targets.map((t) => (
            <div
              key={t.id}
              aria-label={t.title}
              style={{
                position: "absolute",
                left: relToPxX(t.position.x),
                top: relToPxY(t.position.y),
                width: relToPxX(t.size.width),
                height: relToPxY(t.size.height),
                backgroundColor: t.src
                  ? "transparent"
                  : t.color || "transparent",
              }}
            >
              {t.src ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={t.src}
                  alt={t.title || t.id}
                  style={{
                    width: "100%",
                    height: "100%",
                    objectFit: "contain",
                  }}
                />
              ) : null}
            </div>
          ))}
          {content.items.map((it) =>
            it.position.final ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                key={it.id}
                src={it.src}
                alt={it.title}
                style={{
                  position: "absolute",
                  left: relToPxX(it.position.final.x),
                  top: relToPxY(it.position.final.y),
                  width: relToPxX(it.size.width),
                  height: relToPxY(it.size.height),
                  objectFit: "contain",
                  pointerEvents: "none",
                }}
              />
            ) : null
          )}
        </div>
      </div>

      {/* --------- Tabs --------- */}
      <div className="flex w-full flex-wrap items-center justify-center gap-2 rounded-md bg-stone-100 p-2 text-sm">
        {(["items", "targets", "bg"] as Tab[]).map((t) => (
          <label
            key={t}
            className={`cursor-pointer flex items-center gap-2 rounded-md px-4 py-2 ${
              tab === t ? "bg-white shadow" : ""
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

      {/* --------- Items Panel --------- */}
      {tab === "items" && (
        <div className="flex flex-col gap-4">
          {/* Final mode */}
          <div className="flex items-center justify-between gap-2 rounded-md bg-amber-300 p-3 text-sm font-semibold">
            {[
              { label: "one final position", val: "one" },
              { label: "multiple final positions", val: "multiple" },
              { label: "no final position", val: "none" },
            ].map((o) => (
              <label
                key={o.val}
                className="flex cursor-pointer items-center gap-2"
              >
                <input
                  type="radio"
                  name="finalMode"
                  value={o.val}
                  checked={finalMode === (o.val as FinalMode)}
                  onChange={() => setFinalMode(o.val as FinalMode)}
                  className="h-4 w-4"
                />
                {o.label}
              </label>
            ))}
          </div>

          {/* Existing items */}
          {content.items.length > 0 && (
            <ul className="w-full rounded-lg border p-4">
              {content.items.map((item, index) => (
                <li
                  key={item.id || index}
                  className="flex w-full items-center justify-between gap-4 border-b p-2"
                >
                  <div className="space-y-1">
                    <div className="font-semibold">{item.title}</div>
                    <div className="text-xs text-gray-500">{item.src}</div>
                    <div className="flex flex-wrap gap-3 text-xs">
                      <span>
                        Initial X: {item.position.initial.x.toFixed(3)}
                      </span>
                      <span>
                        Initial Y: {item.position.initial.y.toFixed(3)}
                      </span>
                      {"final" in item.position && item.position.final ? (
                        <>
                          <span>
                            Final X: {item.position.final.x.toFixed(3)}
                          </span>
                          <span>
                            Final Y: {item.position.final.y.toFixed(3)}
                          </span>
                        </>
                      ) : item.position.finals ? (
                        <details className="cursor-pointer text-xs">
                          <summary>Multiple Finals</summary>
                          <div className="mt-1 space-y-0.5">
                            {Object.entries(item.position.finals).map(
                              ([tid, pos]) => (
                                <div key={tid} className="font-mono">
                                  <b>{tid}</b>: X {pos.x.toFixed(3)}, Y{" "}
                                  {pos.y.toFixed(3)}
                                </div>
                              )
                            )}
                          </div>
                        </details>
                      ) : null}
                    </div>
                  </div>
                  <button
                    className="cursor-pointer text-red-600 hover:underline"
                    onClick={() => removeItemAt(index)}
                  >
                    Delete
                  </button>
                </li>
              ))}
            </ul>
          )}

          {/* Draft item editor */}
          <div className="rounded-lg border border-b-4 border-sky-500 bg-sky-50 p-4 text-sky-700">
            <div className="text-black font-semibold">
              {draftItem.title || "New item"}
            </div>
            <div className="mt-2 flex flex-wrap gap-6 text-xs font-semibold">
              <span>Initial X: {draftItem.position.initial.x.toFixed(3)}</span>
              <span>Initial Y: {draftItem.position.initial.y.toFixed(3)}</span>
              <span>Width: {draftItem.size.width.toFixed(3)}</span>
              <span>Height: {draftItem.size.height.toFixed(3)}</span>
              {draftItem.position.final && (
                <>
                  <span>Final X: {draftItem.position.final.x.toFixed(3)}</span>
                  <span>Final Y: {draftItem.position.final.y.toFixed(3)}</span>
                </>
              )}
            </div>

            <button
              onClick={addItem}
              className="mt-3 cursor-pointer bg-sky-800 px-3 py-2 text-white"
            >
              Add Item +
            </button>
          </div>

          <input
            className="w-full rounded border p-2"
            type="text"
            placeholder="Title"
            value={draftItem.title}
            onChange={(e) =>
              setDraftItem((d) => ({
                ...d,
                title: e.target.value,
              }))
            }
          />

          <div className="italic w-full rounded border bg-stone-200 p-2 font-semibold">
            ID:{" "}
            <span className="font-mono break-all">{`"${draftItem.id}"`}</span>
          </div>

          <input
            className="w-full rounded border p-2"
            type="text"
            placeholder="Src"
            value={draftItem.src}
            onChange={(e) =>
              setDraftItem((d) => ({
                ...d,
                src: e.target.value,
              }))
            }
          />

          <input
            className="w-full rounded border p-2"
            type="text"
            placeholder="Group"
            value={draftItem.group || ""}
            onChange={(e) =>
              setDraftItem((d) => ({
                ...d,
                group: e.target.value,
              }))
            }
          />

          <p className="mt-2 text-sm">
            <b>Enter pixel values.</b> They are stored as fractions of{" "}
            <b>
              {SCREEN_WIDTH}px × {SCREEN_HEIGHT}px
            </b>
            .
          </p>

          {/* Initial position (px) */}
          <div className="grid grid-cols-2 gap-3">
            <input
              className="w-full rounded border p-2"
              type="number"
              placeholder="Initial X (px)"
              value={Math.round(relToPxX(draftItem.position.initial.x)) || ""}
              onChange={(e) => {
                const px = Number(e.target.value || 0);
                setDraftItem((d) => ({
                  ...d,
                  position: {
                    ...d.position,
                    initial: { ...d.position.initial, x: pxToRelX(px) },
                  },
                }));
              }}
            />
            <input
              className="w-full rounded border p-2"
              type="number"
              placeholder="Initial Y (px)"
              value={Math.round(relToPxY(draftItem.position.initial.y)) || ""}
              onChange={(e) => {
                const px = Number(e.target.value || 0);
                setDraftItem((d) => ({
                  ...d,
                  position: {
                    ...d.position,
                    initial: { ...d.position.initial, y: pxToRelY(px) },
                  },
                }));
              }}
            />
          </div>

          {/* Size (px) */}
          <div className="grid grid-cols-2 gap-3">
            <input
              className="w-full rounded border p-2"
              type="number"
              placeholder="Width (px)"
              value={Math.round(relToPxX(draftItem.size.width)) || ""}
              onChange={(e) => {
                const px = Number(e.target.value || 0);
                setDraftItem((d) => ({
                  ...d,
                  size: { ...d.size, width: pxToRelX(px) },
                }));
              }}
            />
            <input
              className="w-full rounded border p-2"
              type="number"
              placeholder="Height (px)"
              value={Math.round(relToPxY(draftItem.size.height)) || ""}
              onChange={(e) => {
                const px = Number(e.target.value || 0);
                setDraftItem((d) => ({
                  ...d,
                  size: { ...d.size, height: pxToRelY(px) },
                }));
              }}
            />
          </div>

          {/* Final coords (single) */}
          {finalMode === "one" && (
            <>
              <p className="mt-2 font-semibold">Single Final Position (px)</p>
              <div className="grid grid-cols-2 gap-3">
                <input
                  className="w-full rounded border p-2"
                  type="number"
                  placeholder="Final X (px)"
                  value={
                    draftItem.position.final
                      ? Math.round(relToPxX(draftItem.position.final.x))
                      : ""
                  }
                  onChange={(e) => {
                    const px = Number(e.target.value || 0);
                    setDraftItem((d) => {
                      const next = { ...d, position: { ...d.position } };
                      if (!next.position.final)
                        next.position.final = { x: 0, y: 0 };
                      next.position.final.x = pxToRelX(px);
                      return next;
                    });
                  }}
                />
                <input
                  className="w-full rounded border p-2"
                  type="number"
                  placeholder="Final Y (px)"
                  value={
                    draftItem.position.final
                      ? Math.round(relToPxY(draftItem.position.final.y))
                      : ""
                  }
                  onChange={(e) => {
                    const px = Number(e.target.value || 0);
                    setDraftItem((d) => {
                      const next = { ...d, position: { ...d.position } };
                      if (!next.position.final)
                        next.position.final = { x: 0, y: 0 };
                      next.position.final.y = pxToRelY(px);
                      return next;
                    });
                  }}
                />
              </div>
            </>
          )}

          {/* Finals (multiple per target) */}
          {finalMode === "multiple" && (
            <>
              <p className="mt-2 font-semibold">
                Multiple Final Positions per Target
              </p>
              <div className="space-y-3">
                {content.targets.map((t) => {
                  const cur = draftItem.position.finals?.[t.id] ?? {
                    x: 0,
                    y: 0,
                  };
                  return (
                    <div
                      key={t.id}
                      className="w-full rounded border bg-white p-3"
                    >
                      <div className="mb-1 font-semibold">{t.id}</div>
                      <div className="grid grid-cols-2 gap-3">
                        <input
                          className="w-full rounded border p-2"
                          type="number"
                          placeholder={`Final X for ${t.id} (px)`}
                          value={Math.round(relToPxX(cur.x)) || ""}
                          onChange={(e) => {
                            const px = Number(e.target.value || 0);
                            setDraftItem((d) => {
                              const finals = { ...(d.position.finals || {}) };
                              const prev = finals[t.id] || { x: 0, y: 0 };
                              finals[t.id] = { ...prev, x: pxToRelX(px) };
                              return {
                                ...d,
                                position: { ...d.position, finals },
                              };
                            });
                          }}
                        />
                        <input
                          className="w-full rounded border p-2"
                          type="number"
                          placeholder={`Final Y for ${t.id} (px)`}
                          value={Math.round(relToPxY(cur.y)) || ""}
                          onChange={(e) => {
                            const px = Number(e.target.value || 0);
                            setDraftItem((d) => {
                              const finals = { ...(d.position.finals || {}) };
                              const prev = finals[t.id] || { x: 0, y: 0 };
                              finals[t.id] = { ...prev, y: pxToRelY(px) };
                              return {
                                ...d,
                                position: { ...d.position, finals },
                              };
                            });
                          }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      )}

      {/* --------- Targets Panel --------- */}
      {tab === "targets" && (
        <div className="flex flex-col gap-4">
          {/* Existing targets */}
          <ul className="space-y-4">
            {content.targets.map((t, idx) => (
              <li
                key={t.id || idx}
                className="flex flex-col gap-3 rounded border p-4"
              >
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3 text-sm font-semibold">
                    <span>{t.id}</span>
                    <input
                      type="color"
                      value={t.color || "#ffffff"}
                      onChange={(e) =>
                        update((prev) => {
                          const targets = prev.targets.slice();
                          targets[idx] = {
                            ...targets[idx],
                            color: e.target.value,
                          };
                          return { ...prev, targets };
                        })
                      }
                    />
                  </div>
                  <button
                    className="cursor-pointer text-red-600 hover:underline"
                    onClick={() => removeTargetAt(idx)}
                  >
                    delete
                  </button>
                </div>

                {/* Accepts list */}
                {t.accepts.length > 0 && (
                  <div className="flex items-center gap-2 text-xs font-semibold">
                    <div>Accepts:</div>
                    <div className="flex flex-wrap gap-2">
                      {t.accepts.map((id) => (
                        <button
                          key={id}
                          onClick={() => toggleTargetAccept(idx, id)}
                          className="cursor-pointer rounded border bg-gray-100 px-2 py-1 text-xs"
                          title="Remove from accepts"
                        >
                          {id} ×
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Add to accepts */}
                <div className="flex items-center gap-2 text-xs font-semibold">
                  <div>Add items to accept:</div>
                  <div className="flex flex-wrap gap-2">
                    {content.items.map((it) => {
                      const active = t.accepts.includes(it.id);
                      return (
                        <button
                          key={it.id}
                          onClick={() => toggleTargetAccept(idx, it.id)}
                          className={`cursor-pointer rounded border px-2 py-1 text-xs ${
                            active ? "bg-blue-200" : ""
                          }`}
                        >
                          {it.id} {active ? "added" : "+"}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </li>
            ))}
          </ul>

          {/* Draft target */}
          <div className="rounded-lg border border-b-4 border-teal-500 bg-sky-50 p-4 text-teal-700">
            <div className="text-black">
              {draftTarget.title || "New target"}
            </div>
            <div className="mt-2 flex flex-wrap gap-6 text-xs font-semibold">
              <span>Initial x: {draftTarget.position.x.toFixed(3)}</span>
              <span>Initial y: {draftTarget.position.y.toFixed(3)}</span>
              <span>Width: {draftTarget.size.width.toFixed(3)}</span>
              <span>Height: {draftTarget.size.height.toFixed(3)}</span>
            </div>
            <button
              onClick={addTarget}
              className="mt-3 cursor-pointer bg-teal-800 px-3 py-2 text-white"
            >
              Add target +
            </button>
          </div>

          <input
            className="w-full rounded border p-2"
            type="text"
            placeholder="Title"
            value={draftTarget.title || ""}
            onChange={(e) =>
              setDraftTarget((t) => ({
                ...t,
                title: e.target.value,
              }))
            }
          />

          <div className="w-full rounded border bg-slate-300 p-2">
            {draftTarget.id}
          </div>

          <input
            className="w-full rounded border p-2"
            type="text"
            placeholder="src"
            value={draftTarget.src || ""}
            onChange={(e) =>
              setDraftTarget((t) => ({
                ...t,
                src: e.target.value,
              }))
            }
          />

          <p className="text-sm">
            Values convert to fractions relative to{" "}
            <b>
              {SCREEN_WIDTH}px × {SCREEN_HEIGHT}px
            </b>
            .
          </p>

          <div className="grid grid-cols-2 gap-3">
            <input
              className="w-full rounded border p-2"
              type="number"
              placeholder="initial x (px)"
              value={Math.round(relToPxX(draftTarget.position.x)) || ""}
              onChange={(e) => {
                const px = Number(e.target.value || 0);
                setDraftTarget((t) => ({
                  ...t,
                  position: { ...t.position, x: pxToRelX(px) },
                }));
              }}
            />
            <input
              className="w-full rounded border p-2"
              type="number"
              placeholder="initial y (px)"
              value={Math.round(relToPxY(draftTarget.position.y)) || ""}
              onChange={(e) => {
                const px = Number(e.target.value || 0);
                setDraftTarget((t) => ({
                  ...t,
                  position: { ...t.position, y: pxToRelY(px) },
                }));
              }}
            />
            <input
              className="w-full rounded border p-2"
              type="number"
              placeholder="width (px)"
              value={Math.round(relToPxX(draftTarget.size.width)) || ""}
              onChange={(e) => {
                const px = Number(e.target.value || 0);
                setDraftTarget((t) => ({
                  ...t,
                  size: { ...t.size, width: pxToRelX(px) },
                }));
              }}
            />
            <input
              className="w-full rounded border p-2"
              type="number"
              placeholder="height (px)"
              value={Math.round(relToPxY(draftTarget.size.height)) || ""}
              onChange={(e) => {
                const px = Number(e.target.value || 0);
                setDraftTarget((t) => ({
                  ...t,
                  size: { ...t.size, height: pxToRelY(px) },
                }));
              }}
            />
          </div>

          <label className="flex items-center gap-2 rounded border p-2 text-sm">
            target color
            <input
              type="color"
              value={draftTarget.color || "#ffffff"}
              onChange={(e) =>
                setDraftTarget((t) => ({
                  ...t,
                  color: e.target.value,
                }))
              }
            />
          </label>

          {/* Optional feedback */}
          <div className="rounded-lg bg-gray-100 p-3">
            <div className="mb-1 text-xs">
              Add feedback if an item has multiple final positions.
            </div>
            <input
              className="mb-2 w-full rounded border p-2"
              type="text"
              placeholder="feedback text"
              value={draftTarget.feedback?.text || ""}
              onChange={(e) =>
                setDraftTarget((t) => ({
                  ...t,
                  feedback: {
                    ...(t.feedback || { text: "", src: "" }),
                    text: e.target.value,
                  },
                }))
              }
            />
            <input
              className="w-full rounded border p-2"
              type="text"
              placeholder="feedback image"
              value={draftTarget.feedback?.src || ""}
              onChange={(e) =>
                setDraftTarget((t) => ({
                  ...t,
                  feedback: {
                    ...(t.feedback || { text: "", src: "" }),
                    src: e.target.value,
                  },
                }))
              }
            />
          </div>
        </div>
      )}

      {/* --------- Background Panel --------- */}
      {tab === "bg" && (
        <div className="flex flex-col gap-4">
          <label className="flex items-center gap-4">
            <div className="flex-1">Background color:</div>
            <input
              type="color"
              className="h-8 w-12 cursor-pointer"
              value={content.bg.color}
              onChange={(e) =>
                update((prev) => ({
                  ...prev,
                  bg: { ...prev.bg, color: e.target.value },
                }))
              }
            />
          </label>
          <input
            type="text"
            placeholder="Background image URL"
            className="w-full rounded border p-2"
            value={content.bg.src}
            onChange={(e) =>
              update((prev) => ({
                ...prev,
                bg: { ...prev.bg, src: e.target.value },
              }))
            }
          />
          <textarea
            className="mt-2 w-full rounded border p-2"
            placeholder="Reference (optional)"
            value={content.reference || ""}
            onChange={(e) =>
              update((prev) => ({ ...prev, reference: e.target.value }))
            }
          />
        </div>
      )}

      {/* --------- Save --------- */}
      <div className="flex justify-end">
        <button
          onClick={handleSave}
          className="rounded bg-black px-4 py-2 text-white hover:bg-gray-800"
        >
          Save
        </button>
      </div>
    </div>
  );
}
