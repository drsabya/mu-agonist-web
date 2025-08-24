// Content type keys you pass via ?type=...
export type ContentType =
  | "drag-drop"
  | "slider-mover"
  | "slider-resizer"
  | "image-overlay";
export const ALLOWED_TYPES: ContentType[] = [
  "drag-drop",
  "slider-mover",
  "slider-resizer",
  "image-overlay",
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

export interface ImageOverlayContent {
  imageSrc: string;
  overlaySrc: string;
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
  "image-overlay": ImageOverlayContent;
};
export type AnyContent =
  | DragDropContent
  | SliderMoverContent
  | SliderResizerContent
  | ImageOverlayContent;
