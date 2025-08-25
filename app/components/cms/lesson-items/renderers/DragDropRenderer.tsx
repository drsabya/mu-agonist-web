// app/components/cms/lesson-items/renderers/DragDropRenderer.tsx
"use client";

/* eslint-disable @next/next/no-img-element */
import * as React from "react";
import { useEffect, useRef, useState } from "react";
import type { DragDropContent } from "@/utils/cms/types";
import {
  SCREEN_WIDTH,
  SCREEN_HEIGHT,
  pxToRelX,
  pxToRelY,
  relToPxX,
  relToPxY,
} from "@/utils/cms/viewport";

type Props = {
  content: DragDropContent;
};

type ItemPos = { x: number; y: number }; // relative (0..1)

export default function DragDropRenderer({ content }: Props) {
  const stageRef = useRef<HTMLDivElement | null>(null);

  // live positions (top-left, relative)
  const [pos, setPos] = useState<Record<string, ItemPos>>({});
  // last accepted feedback (optional)
  const [feedback, setFeedback] = useState<{
    text?: string;
    src?: string;
  } | null>(null);
  // target highlight on successful drop
  const [highlightTid, setHighlightTid] = useState<string | null>(null);

  // initialize/reset on content change
  useEffect(() => {
    const init: Record<string, ItemPos> = {};
    for (const item of content.items) {
      init[item.id] = {
        x: item.position.initial.x,
        y: item.position.initial.y,
      };
    }
    setPos(init);
    setFeedback(null);
    setHighlightTid(null);
  }, [content]);

  // currently dragging
  const dragRef = useRef<{
    id: string;
    pointerId: number;
    offsetX: number;
    offsetY: number;
  } | null>(null);

  const beginDrag = (e: React.PointerEvent, id: string) => {
    const stage = stageRef.current;
    if (!stage) return;
    stage.setPointerCapture?.(e.pointerId);

    const rect = stage.getBoundingClientRect();
    const cur = pos[id];
    const leftPx = relToPxX(cur.x);
    const topPx = relToPxY(cur.y);

    const pointerX = e.clientX - rect.left;
    const pointerY = e.clientY - rect.top;

    dragRef.current = {
      id,
      pointerId: e.pointerId,
      offsetX: pointerX - leftPx,
      offsetY: pointerY - topPx,
    };
  };

  const moveDrag = (e: React.PointerEvent) => {
    const stage = stageRef.current;
    if (!stage || !dragRef.current) return;

    const rect = stage.getBoundingClientRect();
    const { id, offsetX, offsetY } = dragRef.current;

    // pointer relative to stage
    const pointerX = e.clientX - rect.left;
    const pointerY = e.clientY - rect.top;

    // top-left for item (px)
    let left = pointerX - offsetX;
    let top = pointerY - offsetY;

    // clamp inside stage
    const item = content.items.find((it) => it.id === id)!;
    const itemWpx = relToPxX(item.size.width);
    const itemHpx = relToPxY(item.size.height);
    left = Math.max(0, Math.min(SCREEN_WIDTH - itemWpx, left));
    top = Math.max(0, Math.min(SCREEN_HEIGHT - itemHpx, top));

    // store as relative
    const xRel = pxToRelX(left);
    const yRel = pxToRelY(top);

    setPos((prev) => ({ ...prev, [id]: { x: xRel, y: yRel } }));
  };

  const endDrag = () => {
    if (!dragRef.current) return;
    const { id } = dragRef.current;
    dragRef.current = null;

    // drop logic: if item center is inside an accepting target -> snap
    const item = content.items.find((it) => it.id === id)!;
    const cur = pos[id];
    const center = {
      x: cur.x + item.size.width / 2,
      y: cur.y + item.size.height / 2,
    };

    // choose first target that contains center and accepts item
    const target = content.targets.find((t) => {
      const withinX =
        center.x >= t.position.x && center.x <= t.position.x + t.size.width;
      const withinY =
        center.y >= t.position.y && center.y <= t.position.y + t.size.height;
      const accepts = t.accepts.includes(id);
      return withinX && withinY && accepts;
    });

    if (target) {
      // preferred snap: finals[targetId] > final > center of target
      let targetPos = item.position.finals?.[target.id];
      if (!targetPos && item.position.final) targetPos = item.position.final;
      if (!targetPos) {
        targetPos = {
          x: target.position.x + (target.size.width - item.size.width) / 2,
          y: target.position.y + (target.size.height - item.size.height) / 2,
        };
      }

      setPos((prev) => ({
        ...prev,
        [id]: { x: targetPos!.x, y: targetPos!.y },
      }));

      // visual feedback
      setHighlightTid(target.id);
      setTimeout(
        () => setHighlightTid((t) => (t === target.id ? null : t)),
        700
      );

      if (target.feedback && (target.feedback.text || target.feedback.src)) {
        setFeedback({ ...target.feedback });
        // auto-hide after 2.5s
        setTimeout(
          () => setFeedback((f) => (f === target.feedback ? null : f)),
          2500
        );
      }
    } else {
      // revert to initial if not accepted
      setPos((prev) => ({
        ...prev,
        [id]: { x: item.position.initial.x, y: item.position.initial.y },
      }));
    }
  };

  const stageStyle =
    "relative overflow-hidden border border-slate-200 bg-white touch-none select-none";

  return (
    <div className="flex flex-col items-center gap-3">
      <div
        ref={stageRef}
        className={stageStyle}
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
        onPointerMove={moveDrag}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
      >
        {/* Targets */}
        {content.targets.map((t) => (
          <div
            key={t.id}
            style={{
              position: "absolute",
              left: relToPxX(t.position.x),
              top: relToPxY(t.position.y),
              width: relToPxX(t.size.width),
              height: relToPxY(t.size.height),
              outline:
                highlightTid === t.id
                  ? "3px solid rgba(34,197,94,0.85)"
                  : "none",
              transition: "outline 180ms ease",
              backgroundColor: t.src ? "transparent" : t.color || "transparent",
            }}
            aria-label={t.title || t.id}
          >
            {t.src ? (
              <img
                src={t.src}
                alt={t.title || t.id}
                draggable={false}
                style={{ width: "100%", height: "100%", objectFit: "contain" }}
              />
            ) : null}
          </div>
        ))}

        {/* Draggable items */}
        {content.items.map((it) => {
          const p = pos[it.id] || it.position.initial;
          return (
            <img
              key={it.id}
              src={it.src}
              alt={it.title}
              draggable={false}
              onPointerDown={(e) => beginDrag(e, it.id)}
              style={{
                position: "absolute",
                left: relToPxX(p.x),
                top: relToPxY(p.y),
                width: relToPxX(it.size.width),
                height: relToPxY(it.size.height),
                objectFit: "contain",
                touchAction: "none",
                cursor: "grab",
                transition:
                  dragRef.current?.id === it.id
                    ? "none"
                    : "left 160ms, top 160ms",
                zIndex: 2,
              }}
            />
          );
        })}

        {/* Feedback bubble */}
        {feedback && (feedback.text || feedback.src) ? (
          <div
            className="absolute left-1/2 -translate-x-1/2 rounded-md bg-black/75 px-3 py-2 text-xs text-white"
            style={{ bottom: 12, zIndex: 3, maxWidth: SCREEN_WIDTH - 24 }}
          >
            {feedback.src ? (
              <div className="mb-2">
                <img
                  src={feedback.src}
                  alt="feedback"
                  style={{ maxWidth: "100%", height: "auto", display: "block" }}
                />
              </div>
            ) : null}
            {feedback.text ? <div>{feedback.text}</div> : null}
          </div>
        ) : null}
      </div>

      {content.reference ? (
        <div className="w-full max-w-md text-xs text-gray-500">
          {content.reference}
        </div>
      ) : null}
    </div>
  );
}
