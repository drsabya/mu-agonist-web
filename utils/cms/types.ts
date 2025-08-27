// Content type keys you pass via ?type=...
export type ContentType =
  | "drag-drop"
  | "slider-mover"
  | "slider-resizer"
  | "media-overlay";

export const ALLOWED_TYPES: ContentType[] = [
  "drag-drop",
  "slider-mover",
  "slider-resizer",
  "media-overlay",
];

// ===== Your exact interfaces =====
export interface DragDropContent {
  bg: { src: string; color: string };
  items: DragDropItem[];
  targets: DragDropTarget[];
  reference?: string;
}
export interface DragDropItem {
  id: string;
  title: string;
  src: string;
  // text: string;
  group?: string;
  position: {
    initial: { x: number; y: number };
    final?: { x: number; y: number };
    finals?: Record<string, { x: number; y: number }>;
  };
  size: { width: number; height: number };
}
export interface DragDropTarget {
  id: string;
  title?: string;
  src?: string;
  position: { x: number; y: number };
  size: { width: number; height: number };
  color?: string;
  accepts: string[];
  feedback?: { text: string; src: string };
}

// ===== Media Overlay (replaces ImageOverlay) =====
export type MediaKind = "image" | "svg" | "video";

export type BaseMedia =
  | { type: "image"; src: string }
  | { type: "svg"; src: string }
  | { type: "video"; src: string; hasAudio: boolean }; // autoplay, no controls, starts at 0 (render-time behavior)

export type OverlayMedia =
  | { type: "image"; src: string }
  | { type: "svg"; src: string };

export interface MediaOverlayOption {
  title: string;
  isCorrect: boolean;
  feedback: string;
}

export interface MediaOverlayContent {
  media: BaseMedia; // base can be image/svg/video
  overlay: OverlayMedia; // overlay is image/svg
  options: MediaOverlayOption[]; // can be []
  reference: string;
}

export interface SliderThresholdInterface {
  min: number;
  max: number;
  message: string;
}

export interface SliderResizerContent {
  min: number;
  max: number;
  step: number;
  defaultValue: number;
  label: string;
  items: SliderResizerItem[];
  thresholds: SliderThresholdInterface[];
  bg: { src: string; color: string };
  overlay: { src: string; opacity: number };
  reference: string;
}
export interface SliderResizerItem {
  title: string;
  src: string;
  color: string;
  position: { x: number; y: number };
  scaleFactor: number;
}

export interface SliderMoverItem {
  title: string;
  src: string;
  color: string;
  position: {
    initial: { x: number; y: number };
    final: { x: number; y: number };
  };
  size: { width: number; height: number };
}
export interface SliderMoverContent {
  min: number;
  max: number;
  step: number;
  defaultValue: number;
  label: string;
  items: SliderMoverItem[];
  thresholds: SliderThresholdInterface[];
  bg: { src: string; color: string };
  overlay: { src: string; opacity: number };
}

// Helpful mapping types for consumers
export type ContentByTypeMap = {
  "drag-drop": DragDropContent;
  "slider-mover": SliderMoverContent;
  "slider-resizer": SliderResizerContent;
  "media-overlay": MediaOverlayContent;
};

export type AnyContent =
  | DragDropContent
  | SliderMoverContent
  | SliderResizerContent
  | MediaOverlayContent;
