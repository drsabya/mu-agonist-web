// app/components/cms/lesson-items/renderers/MediaOverlayRenderer.tsx
"use client";

import * as React from "react";
import Image from "next/image";
import type { MediaOverlayContent } from "@/utils/cms";

type Props = {
  content: MediaOverlayContent;
  className?: string;
  /** Optional visual tweak for preview only (not in schema) */
  overlayOpacity?: number; // 0..1, default 1
  /** Preview-only: loop the base video (if any). */
  loop?: boolean;
};

export default function MediaOverlayRenderer({
  content,
  className = "",
  overlayOpacity = 1,
  loop = true,
}: Props) {
  const { media, overlay } = content;

  const renderBase = () => {
    if (!media?.src?.trim()) {
      return (
        <div className="flex h-40 items-center justify-center text-xs text-gray-400">
          Base media not set
        </div>
      );
    }
    switch (media.type) {
      case "image":
      case "svg":
        return (
          <Image
            src={media.src}
            alt=""
            fill
            className="block w-full object-contain"
            sizes="100vw"
            priority
          />
        );
      case "video":
        return (
          <video
            src={media.src}
            className="block w-full"
            autoPlay
            muted
            loop={loop}
            playsInline
          />
        );
      default:
        return null;
    }
  };

  const renderOverlay = () => {
    // Overlay supports image/svg only
    return (
      <Image
        src={overlay.src}
        alt=""
        fill
        className="pointer-events-none object-contain"
        style={{ opacity: overlayOpacity }}
        sizes="100vw"
        priority
      />
    );
  };

  return (
    <div
      className={`relative w-full overflow-hidden rounded-lg border border-gray-200 ${className}`}
    >
      {renderBase()}
      {renderOverlay()}
    </div>
  );
}
