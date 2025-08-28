import { z } from "zod";
import type { ContentType, ContentByTypeMap } from "./types";

// ----- Shared bits -----
const positionXY = z.object({ x: z.number(), y: z.number() });
const sizeWH = z.object({ width: z.number(), height: z.number() });

export const sliderThresholdSchema = z.object({
  min: z.number(),
  max: z.number(),
  message: z.string(),
});

// ----- DragDrop -----
const dragDropItemSchema = z.object({
  id: z.string(),
  title: z.string(),
  src: z.string(),
  group: z.string().optional(),
  position: z.object({
    initial: positionXY,
    final: positionXY.optional(),
    finals: z.record(z.string(), positionXY).optional(),
  }),
  size: sizeWH,
});

const dragDropTargetSchema = z.object({
  id: z.string(),
  title: z.string().optional(),
  src: z.string().optional(),
  position: positionXY,
  size: sizeWH,
  color: z.string().optional(),
  accepts: z.array(z.string()),
  feedback: z
    .object({
      text: z.string(),
      src: z.string(),
    })
    .optional(),
});

export const dragDropContentSchema = z.object({
  bg: z.object({ src: z.string(), color: z.string() }),
  items: z.array(dragDropItemSchema),
  targets: z.array(dragDropTargetSchema),
  reference: z.string().optional(),
});

// ----- MediaOverlay (replaces ImageOverlay) -----
const baseMediaSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("image"), src: z.string() }),
  z.object({ type: z.literal("svg"), src: z.string() }),
  z.object({
    type: z.literal("video"),
    src: z.string(),
    hasAudio: z.boolean(), // autoplay, starts at 0, no controls (render-time behavior)
  }),
]);

const overlayMediaSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("image"), src: z.string() }),
  z.object({ type: z.literal("svg"), src: z.string() }),
]);

export const mediaOverlayOptionSchema = z.object({
  title: z.string(),
  isCorrect: z.boolean(),
  feedback: z.string(),
});

export const mediaOverlayContentSchema = z.object({
  media: baseMediaSchema, // image | svg | video
  overlay: overlayMediaSchema, // image | svg
  options: z.array(mediaOverlayOptionSchema), // can be []
  reference: z.string(),
});

// ----- SliderResizer -----
export const sliderResizerItemSchema = z.object({
  title: z.string(),
  src: z.string(),
  color: z.string(),
  position: positionXY,
  scaleFactor: z.number(),
});

export const sliderResizerContentSchema = z.object({
  min: z.number(),
  max: z.number(),
  step: z.number(),
  defaultValue: z.number(),
  label: z.string(), // TS interface used `String`; accept primitive string
  items: z.array(sliderResizerItemSchema),
  thresholds: z.array(sliderThresholdSchema),
  bg: z.object({ src: z.string(), color: z.string() }),
  overlay: z.object({ src: z.string(), opacity: z.number().min(0).max(1) }),
  reference: z.string(),
});

// ----- SliderMover -----
export const sliderMoverItemSchema = z.object({
  title: z.string(),
  src: z.string(),
  color: z.string(),
  position: z.object({
    initial: positionXY,
    final: positionXY,
  }),
  size: sizeWH,
});

export const sliderMoverContentSchema = z.object({
  min: z.number(),
  max: z.number(),
  step: z.number(),
  defaultValue: z.number(),
  label: z.string(),
  items: z.array(sliderMoverItemSchema),
  thresholds: z.array(sliderThresholdSchema),
  bg: z.object({ src: z.string(), color: z.string() }),
  overlay: z.object({ src: z.string(), opacity: z.number().min(0).max(1) }),
});

// ----- TapHotspot -----
export const tapHotspotOptionSchema = z.object({
  title: z.string(),
  src: z.string(), // <-- added to mirror interface
  position: positionXY,
  size: sizeWH,
  feedback: z.object({
    text: z.string(),
    src: z.string(),
  }),
  isCorrect: z.boolean(),
});

export const tapHotspotContentSchema = z.object({
  bg: z.object({ src: z.string(), color: z.string() }),
  options: z.array(tapHotspotOptionSchema),
});

// ----- Map + helpers -----
const schemaMap: Record<ContentType, z.ZodTypeAny> = {
  "drag-drop": dragDropContentSchema,
  "media-overlay": mediaOverlayContentSchema,
  "slider-resizer": sliderResizerContentSchema,
  "slider-mover": sliderMoverContentSchema,
  "tap-hotspot": tapHotspotContentSchema,
};

export function getSchema<T extends ContentType>(type: T) {
  return schemaMap[type];
}

export function parseContent<T extends ContentType>(
  type: T,
  content: unknown
): ContentByTypeMap[T] {
  return getSchema(type).parse(content) as ContentByTypeMap[T];
}

export function isContentValid<T extends ContentType>(
  type: T,
  content: unknown
): content is ContentByTypeMap[T] {
  try {
    getSchema(type).parse(content);
    return true;
  } catch {
    return false;
  }
}
