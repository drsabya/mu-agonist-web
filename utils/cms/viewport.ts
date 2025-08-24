// utils/cms/viewport.ts
// Reusable viewport constants + helpers for percentage ↔ px conversions.
export const SCREEN_WIDTH = 340; // px (x & width are relative to this)
export const SCREEN_HEIGHT = 640; // px (y & height are relative to this)

export const relToPxX = (x: number) => x * SCREEN_WIDTH;
export const relToPxY = (y: number) => y * SCREEN_HEIGHT;
export const relToPxW = (w: number) => w * SCREEN_WIDTH;
export const relToPxH = (h: number) => h * SCREEN_HEIGHT;

export const pxToRelX = (px: number) => px / SCREEN_WIDTH;
export const pxToRelY = (px: number) => px / SCREEN_HEIGHT;
export const pxToRelW = (px: number) => px / SCREEN_WIDTH;
export const pxToRelH = (px: number) => px / SCREEN_HEIGHT;
