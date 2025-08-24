// app/components/cms/lesson-items/renderers/ImageOverlayRenderer.tsx
"use client";

import * as React from "react";
import type { ImageOverlayContent } from "@/utils/cms";

type Props = {
  content: ImageOverlayContent;
  className?: string;
  /** Optional visual tweak for preview only (not in schema) */
  overlayOpacity?: number; // 0..1, default 1
};

export default function ImageOverlayRenderer({
  content,
  className = "",
  overlayOpacity = 1,
}: Props) {
  const { imageSrc, overlaySrc } = content;

  return (
    <div className={`relative w-full overflow-hidden rounded-lg border border-gray-200 ${className}`}>
      {/* Base image */}
      {imageSrc ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={imageSrc} alt="" className="block w-full object-contain" />
      ) : (
        <div className="flex h-40 items-center justify-center text-xs text-gray-400">
          Base image (imageSrc) not set
        </div>
      )}

      {/* Overlay image */}
      {overlaySrc ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={overlaySrc}
          alt=""
          className="pointer-events-none absolute inset-0 h-full w-full object-contain"
          style={{ opacity: overlayOpacity }}
        />
      ) : null}
    </div>
  );
}
