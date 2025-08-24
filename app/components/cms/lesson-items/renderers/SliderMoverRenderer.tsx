// app/components/cms/lesson-items/renderers/SliderMoverRenderer.tsx
"use client";

import * as React from "react";
import type { SliderMoverContent } from "@/utils/cms";
import {
  SCREEN_WIDTH,
  SCREEN_HEIGHT,
  relToPxX,
  relToPxY,
  relToPxW,
  relToPxH,
} from "@/utils/cms/viewport";

type Props = {
  content: SliderMoverContent;
  value?: number;            // falls back to content.defaultValue
  className?: string;
  showGrid?: boolean;
};

/**
 * Pixel-accurate renderer for Slider Mover.
 * Semantics: x is fraction of SCREEN_WIDTH from the left; y is fraction of SCREEN_HEIGHT from the top.
 * width is relative to screen width; height is relative to screen height.
 * Top-left positioning (no centering).
 */
export default function SliderMoverRenderer({
  content,
  value,
  className = "",
  showGrid = false,
}: Props) {
  const v = value ?? content.defaultValue;
  const t =
    content.max === content.min ? 0 : (v - content.min) / (content.max - content.min);

  const lerp = (a: number, b: number, tt: number) => a + (b - a) * tt;
  const overlayOpacity = Math.max(0, Math.min(1, Number(content.overlay.opacity ?? 0)));

  const items = content.items.map((it, idx) => {
    const xRel = lerp(it.position.initial.x, it.position.final.x, t);
    const yRel = lerp(it.position.initial.y, it.position.final.y, t);

    const wPx = relToPxW(it.size.width);
    const hPx = relToPxH(it.size.height);
    const left = relToPxX(xRel); // top-left directly
    const top = relToPxY(yRel);

    return {
      key: idx,
      title: it.title,
      src: it.src,
      color: it.color,
      left,
      top,
      wPx,
      hPx,
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

      {/* Items */}
      {items.map((p) =>
        p.src ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            key={p.key}
            src={p.src}
            alt=""
            className="absolute object-contain"
            style={{ left: p.left, top: p.top, width: p.wPx, height: p.hPx }}
            title={p.title}
          />
        ) : (
          <div
            key={p.key}
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
          style={{ opacity: overlayOpacity, zIndex: 20, pointerEvents: "none" }}
        />
      ) : null}
    </div>
  );
}
