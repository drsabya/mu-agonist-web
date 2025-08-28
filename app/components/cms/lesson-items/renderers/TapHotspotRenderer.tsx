// app/components/cms/lesson-items/renderers/TapHotspotRenderer.tsx
"use client";

/* eslint-disable @next/next/no-img-element */
import * as React from "react";
import { useEffect, useRef, useState } from "react";
import type { TapHotspotContent } from "@/utils/cms/types";
import {
  SCREEN_WIDTH,
  SCREEN_HEIGHT,
  relToPxX,
  relToPxY,
} from "@/utils/cms/viewport";

type Props = {
  content: TapHotspotContent;
};

export default function TapHotspotRenderer({ content }: Props) {
  const stageRef = useRef<HTMLDivElement | null>(null);

  // last tapped hotspot index (for outline)
  const [activeIdx, setActiveIdx] = useState<number | null>(null);

  // feedback bubble (text + optional image)
  const [feedback, setFeedback] = useState<{
    text?: string;
    src?: string;
  } | null>(null);

  // auto-hide timers
  const hideTimer = useRef<number | null>(null);
  const clearTimer = () => {
    if (hideTimer.current) {
      window.clearTimeout(hideTimer.current);
      hideTimer.current = null;
    }
  };

  // reset on content change
  useEffect(() => {
    setActiveIdx(null);
    setFeedback(null);
    clearTimer();
  }, [content]);

  const triggerTap = (idx: number) => {
    setActiveIdx(idx);
    const opt = content.options[idx];
    const hasFeedback = !!(opt.feedback?.text || opt.feedback?.src);
    setFeedback(hasFeedback ? { ...opt.feedback } : null);

    try {
      if (navigator?.vibrate) navigator.vibrate(opt.isCorrect ? 30 : 15);
    } catch {}

    clearTimer();
    if (hasFeedback) {
      hideTimer.current = window.setTimeout(() => {
        setFeedback((f) => (f === opt.feedback ? null : f));
      }, 2500);
    }
  };

  useEffect(() => () => clearTimer(), []);

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
      >
        {/* Hotspot regions (click/tap targets) */}
        {content.options.map((o, i) => {
          const left = relToPxX(o.position.x);
          const top = relToPxY(o.position.y);
          const width = relToPxX(o.size.width);
          const height = relToPxY(o.size.height);

          const isActive = activeIdx === i;
          const outlineColor = isActive
            ? o.isCorrect
              ? "3px solid rgba(34,197,94,0.9)" // emerald-500
              : "3px solid rgba(244,63,94,0.9)" // rose-500
            : "2px dashed transparent"; // invisible when idle

          return (
            <button
              key={`${o.title}-${i}`}
              aria-label={o.title || `hotspot-${i + 1}`}
              onPointerDown={(e) => {
                e.preventDefault();
                triggerTap(i);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  triggerTap(i);
                }
              }}
              style={{
                position: "absolute",
                left,
                top,
                width,
                height,
                outline: outlineColor,
                transition: "outline 160ms ease",
                background: "transparent",
                cursor: "pointer",
              }}
              className="p-0 m-0 border-0"
            >
              {/* If an asset is provided, display it inside the tappable area */}
              {o.src ? (
                <img
                  src={o.src}
                  alt={o.title || `hotspot-${i + 1}`}
                  draggable={false}
                  style={{
                    width: "100%",
                    height: "100%",
                    objectFit: "contain",
                    pointerEvents: "none", // ensure the button receives the pointer events
                  }}
                />
              ) : null}
            </button>
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
    </div>
  );
}
