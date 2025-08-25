// app/components/cms/lesson-items/renderers/SliderResizerRenderer.tsx
"use client";

import * as React from "react";
import type { SliderResizerContent } from "@/utils/cms";
import {
  SCREEN_WIDTH,
  SCREEN_HEIGHT,
  relToPxX,
  relToPxY,
} from "@/utils/cms/viewport";

type Props = {
  content: SliderResizerContent;
  /** Falls back to content.defaultValue */
  value?: number;
  className?: string;
  showGrid?: boolean;
};

/**
 * Pixel-accurate renderer for Slider Resizer.
 * Semantics:
 * - position.{x,y} are CENTER coordinates (fractions of SCREEN_WIDTH/SCREEN_HEIGHT).
 * - width (px) = ((value * scaleFactor) / 100) * SCREEN_WIDTH.
 * - Images are positioned by center with translate(-50%, -50%); only width is set (object-contain preserves aspect).
 * - If no image, a square block (width × width) is drawn in fallback color.
 */
export default function SliderResizerRenderer({
  content,
  value,
  className = "",
  showGrid = false,
}: Props) {
  const v = value ?? content.defaultValue;
  const overlayOpacity = Math.max(0, Math.min(1, Number(content.overlay.opacity ?? 0)));

  const items = content.items.map((it, idx) => {
    const widthPx = ((Number(v) * Number(it.scaleFactor)) / 100) * SCREEN_WIDTH;
    const left = relToPxX(it.position.x);
    const top = relToPxY(it.position.y);

    return {
      key: idx,
      title: it.title,
      src: it.src,
      color: it.color,
      left,
      top,
      widthPx,
    };
  });

  return (
    <div
      className={`relative overflow-hidden rounded-lg border border-gray-200 ${className}`}
      style={{
        width: SCREEN_WIDTH,
        height: SCREEN_HEIGHT,
        backgroundColor: content.bg.color,
        backgroundImage: showGrid
          ? `
            linear-gradient(to right, rgba(0,0,0,0.06) 1px, transparent 1px),
            linear-gradient(to bottom, rgba(0,0,0,0.06) 1px, transparent 1px)
          `
          : undefined,
        backgroundSize: showGrid ? "34px 32px" : undefined,
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

      {/* Items (center positioning) */}
      {items.map((p) =>
        p.src ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            key={p.key}
            src={p.src}
            alt=""
            className="absolute object-contain"
            style={{
              left: p.left,
              top: p.top,
              width: p.widthPx,
              transform: "translate(-50%, -50%)",
            }}
            title={p.title}
          />
        ) : (
          <div
            key={p.key}
            className="absolute rounded"
            style={{
              left: p.left,
              top: p.top,
              width: p.widthPx,
              height: p.widthPx, // square placeholder
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
          style={{ opacity: overlayOpacity, zIndex: 20, pointerEvents: "none" }}
        />
      ) : null}
    </div>
  );
}
