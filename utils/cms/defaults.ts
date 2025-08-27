import type { ContentType, ContentByTypeMap } from "./types";

// Minimal valid seeds for a brand-new draft.
// Tweak to your preferred starter shapes/placeholders.
const templates: { [K in ContentType]: ContentByTypeMap[K] } = {
  "drag-drop": {
    bg: { src: "", color: "#ffffff" },
    items: [
      {
        id: "item-1",
        title: "Item",
        src: "",
        position: {
          initial: { x: 0.1, y: 0.1 },
          final: { x: 0.5, y: 0.5 },
        },
        size: { width: 0.12, height: 0.12 },
      },
    ],
    targets: [
      {
        id: "target-1",
        title: "Target",
        position: { x: 0.5, y: 0.5 },
        size: { width: 0.2, height: 0.2 },
        accepts: ["item-1"],
      },
    ],
    reference: "",
  },

  "media-overlay": {
    media: { type: "image", src: "" }, // change to { type: "video", src: "", hasAudio: true } when needed
    overlay: { type: "image", src: "" },
    options: [],
    reference: "",
  },

  "slider-resizer": {
    min: 0,
    max: 100,
    step: 1,
    defaultValue: 50,
    label: "Scale",
    items: [
      {
        title: "Resizable",
        src: "",
        color: "#999999",
        position: { x: 0.5, y: 0.5 },
        scaleFactor: 1,
      },
    ],
    thresholds: [],
    bg: { src: "", color: "#ffffff" },
    overlay: { src: "", opacity: 0 },
    reference: "",
  },

  "slider-mover": {
    min: 0,
    max: 100,
    step: 1,
    defaultValue: 0,
    label: "Position",
    items: [
      {
        title: "Movable",
        src: "",
        color: "#999999",
        position: {
          initial: { x: 0.2, y: 0.5 },
          final: { x: 0.8, y: 0.5 },
        },
        size: { width: 64, height: 64 },
      },
    ],
    thresholds: [],
    bg: { src: "", color: "#ffffff" },
    overlay: { src: "", opacity: 0 },
  },
};

// Return a deep copy so callers can mutate safely.
export function getDefaultContent<T extends ContentType>(
  type: T
): ContentByTypeMap[T] {
  const base = templates[type];
  // Deep clone (works server/client)
  return JSON.parse(JSON.stringify(base)) as ContentByTypeMap[T];
}
