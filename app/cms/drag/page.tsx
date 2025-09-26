"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

/** Roles and item model */
type Role = "none" | "draggable" | "target" | "tappable";
type Kind = "svg" | "image";

/** Single animation per item (no JSON) */
type AnimType =
  | "none"
  | "move"
  | "scale"
  | "rotate"
  | "opacity"
  | "jitter"
  | "pulse";
type EasingKind = "linear" | "easeInOut";

type Item = {
  id: string;
  kind: Kind;
  svg?: string;
  src?: string;

  cxPct: number; // [0..1]
  cyPct: number; // [0..1]
  wPct: number; // [0..1] width based on canvas width
  rot: number; // radians
  role: Role;

  // role meta
  correctTargetId?: string; // for draggables
  tapMessage?: string; // for tappables

  // "final position" for draggables
  finalCxPct?: number;
  finalCyPct?: number;

  // === Simple, user-facing animation config (single type) ===
  animType: AnimType;
  animDurationMs?: number; // default 700
  animDelayMs?: number; // default 0
  animEasing?: EasingKind; // default easeInOut

  // For move: where to move to (percent coords). Set via "Edit Anim Target".
  animMoveCxPct?: number;
  animMoveCyPct?: number;

  // For scale: final width as % of canvas width. Set via "Edit Anim Scale".
  animScaleWPct?: number;

  // For rotate: radians to add
  animRotateBy?: number;

  // For opacity: target alpha [0..1]
  animOpacityTo?: number;

  // Optional: if tappable, allow tap to trigger scene animation
  isSceneTrigger?: boolean;
};

type Snapshot = { items: Item[]; selectedId: string | null; canvasBg: string };

/** PREVIEW-ONLY state for positions & completion (does NOT mutate items) */
type PreviewPerItem = {
  cxPct: number;
  cyPct: number;
  completed: boolean; // true => hide in preview
};

/** Scene animation runtime overlay per item (applied on render) */
type AnimOverlay = {
  dxPx: number; // additional translation (pixels)
  dyPx: number;
  scale: number; // multiplicative
  rotDelta: number; // radians
  alpha: number; // multiplicative 0..1
};

const ROLE_META: Record<
  Role,
  { label: string; badgeBg: string; badgeText: string; outline: string }
> = {
  none: {
    label: "None",
    badgeBg: "bg-gray-700",
    badgeText: "text-white",
    outline: "2px solid rgba(31,41,55,0.9)",
  },
  draggable: {
    label: "Draggable",
    badgeBg: "bg-blue-700",
    badgeText: "text-white",
    outline: "2px dashed rgba(29,78,216,0.9)",
  },
  target: {
    label: "Target",
    badgeBg: "bg-emerald-700",
    badgeText: "text-white",
    outline: "2px dashed rgba(5,150,105,0.9)",
  },
  tappable: {
    label: "Tappable",
    badgeBg: "bg-fuchsia-700",
    badgeText: "text-white",
    outline: "2px dashed rgba(162,28,175,0.9)",
  },
};

const SNAP_MS = 280;

/** Global options */
const RESPECT_REDUCED_MOTION = true;

/** Scene trigger mode */
type SceneTriggerMode = "all-correct" | "tap" | "either";

/* --- Tiny monochrome icons (no deps) --- */
const I = {
  paste: (
    <svg className="size-4" viewBox="0 0 24 24" aria-hidden>
      <path
        d="M19 3h-4.18C14.4 1.84 13.3 1 12 1s-2.4.84-2.82 2H5a2 2 0 00-2 2v12a2 2 0 002 2h6v-2H5V5h2v2h10V5h2v5h2V5a2 2 0 00-2-2zM12 3a1 1 0 110 2 1 1 0 010-2zm5 10l-5 5-3-3-1.5 1.5 4.5 4.5 6.5-6.5L17 13z"
        fill="currentColor"
      />
    </svg>
  ),
  undo: (
    <svg className="size-4" viewBox="0 0 24 24" aria-hidden>
      <path
        d="M7 7V3L1 9l6 6v-4h7a4 4 0 010 8h-3v2h3a6 6 0 000-12H7z"
        fill="currentColor"
      />
    </svg>
  ),
  front: (
    <svg className="size-4" viewBox="0 0 24 24" aria-hidden>
      <path
        d="M3 3h8v2H5v6H3V3zm6 6h12v12H9V9zm2 2v8h8v-8h-8z"
        fill="currentColor"
      />
    </svg>
  ),
  back: (
    <svg className="size-4" viewBox="0 0 24 24" aria-hidden>
      <path
        d="M3 3h12v12H3V3zm2 2v8h8V5H5zm14 2v12H7v2h12a2 2 0 002-2V8h-2z"
        fill="currentColor"
      />
    </svg>
  ),
  forward: (
    <svg className="size-4" viewBox="0 0 24 24" aria-hidden>
      <path
        d="M4 4h10v2H6v10H4V4zm6 6h10v10H10V10zm2 2v6h6v-6h-6z"
        fill="currentColor"
      />
    </svg>
  ),
  backward: (
    <svg className="size-4" viewBox="0 0 24 24" aria-hidden>
      <path
        d="M4 4h10v10H4V4zm2 2v6h6V6H6zm10 2v10H8v2h10a2 2 0 002-2V8h-2z"
        fill="currentColor"
      />
    </svg>
  ),
  trash: (
    <svg className="size-4" viewBox="0 0 24 24" aria-hidden>
      <path
        d="M9 3h6l1 2h4v2H4V5h4l1-2zm1 6h2v8h-2V9zm4 0h2v8h-2V9zM7 9h2v8H7V9z"
        fill="currentColor"
      />
    </svg>
  ),
  duplicate: (
    <svg className="size-4" viewBox="0 0 24 24" aria-hidden>
      <path d="M8 8h12v12H8V8zm-4 4V4h12v2H6v6H4z" fill="currentColor" />
    </svg>
  ),
  info: (
    <svg className="size-4" viewBox="0 0 24 24" aria-hidden>
      <path
        d="M12 2a10 10 0 100 20 10 10 0 000-20zm1 15h-2v-6h2v6zm-1-8.5a1.5 1.5 0 110-3 1.5 1.5 0 010 3z"
        fill="currentColor"
      />
    </svg>
  ),
  close: (
    <svg className="size-4" viewBox="0 0 24 24" aria-hidden>
      <path
        d="M18.3 5.7L12 12l6.3 6.3-1.4 1.4L10.6 13.4 4.3 19.7 2.9 18.3 9.2 12 2.9 5.7 4.3 4.3 10.6 10.6 16.9 4.3z"
        fill="currentColor"
      />
    </svg>
  ),
  palette: (
    <svg className="size-4" viewBox="0 0 24 24" aria-hidden>
      <path
        d="M12 2a9 9 0 00-9 9c0 4.97 4.03 9 9 9h2a3 3 0 100-6h-2a3 3 0 01-3-3 3 3 0 013-3h2a3 3 0 000-6h-2z"
        fill="currentColor"
      />
    </svg>
  ),
  play: (
    <svg className="size-4" viewBox="0 0 24 24" aria-hidden>
      <path d="M8 5v14l11-7z" fill="currentColor" />
    </svg>
  ),
  stop: (
    <svg className="size-4" viewBox="0 0 24 24" aria-hidden>
      <path d="M6 6h12v12H6z" fill="currentColor" />
    </svg>
  ),
  check: (
    <svg className="size-4" viewBox="0 0 24 24" aria-hidden>
      <path
        d="M9 16.2l-3.5-3.6L4 14.2l5 5 11-11-1.5-1.4z"
        fill="currentColor"
      />
    </svg>
  ),
  layers: (
    <svg className="size-4" viewBox="0 0 24 24" aria-hidden>
      <path
        d="M12 4l9 5-9 5-9-5 9-5zm-7.5 9L12 18l7.5-5L21 15l-9 5-9-5 1.5-2z"
        fill="currentColor"
      />
    </svg>
  ),
  flag: (
    <svg className="size-4" viewBox="0 0 24 24" aria-hidden>
      <path d="M6 3v18H4V3h2zm2 0h11l-2 4 2 4H8V3z" fill="currentColor" />
    </svg>
  ),
};

/* ===== Utility funcs ===== */
function uid() {
  return Math.random().toString(36).slice(2, 10);
}
function canonicalize(s: string) {
  return s.replace(/\s+/g, " ").trim();
}
function stripXmlDoctype(s: string) {
  return s.replace(/<\?xml[^>]*\?>/gi, "").replace(/<!DOCTYPE[^>]*>/gi, "");
}
function namespaceSvgIds(svg: string, ns: string) {
  let out = stripXmlDoctype(svg);
  out = out.replace(/\bid="([\w:-]+)"/g, (_m, id) => `id="${id}_${ns}"`);
  out = out.replace(/\burl\(#([\w:-]+)\)/g, (_m, id) => `url(#${id}_${ns})`);
  out = out.replace(
    /\b(xlink:href|href)="#([\w:-]+)"/g,
    (_m, attr, id) => `${attr}="#${id}_${ns}"`
  );
  out = out.replace(/\baria-labelledby="([^"]+)"/g, (_m, ids) => {
    const replaced = ids
      .split(/\s+/)
      .map((id: string) => `${id}_${ns}`)
      .join(" ");
    return `aria-labelledby="${replaced}"`;
  });
  return out;
}
function extractFromSvgXml(xml: string): string[] {
  const cleaned = stripXmlDoctype(xml);
  const p = new DOMParser();
  const doc = p.parseFromString(cleaned, "image/svg+xml");
  const svgs = Array.from(doc.querySelectorAll("svg")).map((n) => n.outerHTML);
  const seen = new Set<string>();
  const out: string[] = [];
  for (const s of svgs) {
    const c = canonicalize(s);
    if (!seen.has(c)) {
      seen.add(c);
      out.push(s);
    }
  }
  if (out.length === 0 && cleaned.toLowerCase().includes("<svg"))
    out.push(cleaned);
  return out;
}
function extractFromHtml(html: string): string[] {
  const p = new DOMParser();
  const doc = p.parseFromString(html, "text/html");
  const svgs = Array.from(doc.querySelectorAll("svg")).map((n) => n.outerHTML);
  const seen = new Set<string>();
  const out: string[] = [];
  for (const s of svgs) {
    const c = canonicalize(s);
    if (!seen.has(c)) {
      seen.add(c);
      out.push(s);
    }
  }
  return out;
}
function extractFromPlain(text: string): string[] {
  const cleaned = stripXmlDoctype(text);
  const matches = cleaned.match(/<svg[\s\S]*?<\/svg>/gi) ?? [];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const m of matches) {
    const c = canonicalize(m);
    if (!seen.has(c)) {
      seen.add(c);
      out.push(m);
    }
  }
  if (out.length === 0 && cleaned.toLowerCase().includes("<svg"))
    out.push(cleaned);
  return out;
}
function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const fr = new FileReader();
    fr.onload = () => resolve(String(fr.result));
    fr.onerror = reject;
    fr.readAsDataURL(blob);
  });
}

/* ===== Easings ===== */
function ease(t: number, kind: EasingKind | undefined) {
  if (kind === "easeInOut") return t * t * (3 - 2 * t); // smoothstep
  return t;
}
/* ===== prefers-reduced-motion ===== */
function prefersReducedMotion(): boolean {
  if (!RESPECT_REDUCED_MOTION) return false;
  if (typeof window === "undefined" || !("matchMedia" in window)) return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/* ===== Shared standard for jitter / pulse (same for every object) ===== */
const STANDARD_JITTER = {
  amplitudePct: 0.01, // 1% of canvas
  frequency: 8, // Hz
  axes: "both" as "x" | "y" | "both",
};
const STANDARD_PULSE = {
  min: 0.95,
  max: 1.08,
  cycles: 2,
};

/* ============================
   Component
   ============================ */
export default function SvgCopyPage() {
  const canvasRef = useRef<HTMLDivElement>(null);

  const [items, setItems] = useState<Item[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // map item.id -> host div (for measuring)
  const hostRefs = useRef<Record<string, HTMLDivElement | null>>({});

  // canvas live size
  const [canvasSize, setCanvasSize] = useState<{ w: number; h: number }>({
    w: 0,
    h: 0,
  });

  // canvas background color
  const [canvasBg, setCanvasBg] = useState<string>("#ffffff");

  // info dialog + preview dialog
  const [showInfo, setShowInfo] = useState(false);
  const [previewDialog, setPreviewDialog] = useState<{
    open: boolean;
    title: string;
    message?: string;
  }>({
    open: false,
    title: "",
    message: "",
  });

  // preview mode
  const [previewMode, setPreviewMode] = useState(false);

  // layer visibility toggle (hide items where z != 0)
  const [hideNonZeroZ, setHideNonZeroZ] = useState(false);

  // selected element metrics (px)
  const [selInfo, setSelInfo] = useState<{
    x: number;
    y: number;
    w: number;
    h: number;
  }>({
    x: 0,
    y: 0,
    w: 0,
    h: 0,
  });

  /* ===== Scene Trigger Mode ===== */
  const [sceneTriggerMode, setSceneTriggerMode] =
    useState<SceneTriggerMode>("either");

  /* ===== Preview-only positions & completion ===== */
  const [previewMap, setPreviewMap] = useState<Record<string, PreviewPerItem>>(
    {}
  );
  const [animatingIds, setAnimatingIds] = useState<Set<string>>(new Set());
  const previewDragStartRef = useRef<{
    id: string;
    cxPct: number;
    cyPct: number;
  } | null>(null);

  // NEW: Track which draggables-with-target have been "placed":
  // - If item has final position: after it snaps/moves to final
  // - If item has NO final position: immediately upon correct drop
  const [placedSet, setPlacedSet] = useState<Set<string>>(new Set());
  const placedSetRef = useRef<Set<string>>(new Set());
  const setPlacedSafe = (updater: (prev: Set<string>) => Set<string>) => {
    setPlacedSet((prev) => {
      const next = updater(prev);
      placedSetRef.current = new Set(next);
      return next;
    });
  };

  // Initialize preview state on enter/exit Preview
  useEffect(() => {
    if (previewMode) {
      const m: Record<string, PreviewPerItem> = {};
      for (const it of items)
        m[it.id] = { cxPct: it.cxPct, cyPct: it.cyPct, completed: false };
      setPreviewMap(m);
      setAnimatingIds(new Set());
      previewDragStartRef.current = null;
      resetSceneAnim();
      setPlacedSafe(() => new Set());
    } else {
      setPreviewMap({});
      setAnimatingIds(new Set());
      previewDragStartRef.current = null;
      resetSceneAnim();
      setPlacedSafe(() => new Set());
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [previewMode, items]);

  /* ===== Undo stack ===== */
  const undoStackRef = useRef<Snapshot[]>([]);
  const pushSnapshot = useCallback(
    (snap?: Snapshot) => {
      const s: Snapshot = snap ?? {
        items: structuredClone(items),
        selectedId,
        canvasBg,
      };
      undoStackRef.current.push(s);
      if (undoStackRef.current.length > 100) undoStackRef.current.shift();
    },
    [items, selectedId, canvasBg]
  );
  const undo = useCallback(() => {
    const prev = undoStackRef.current.pop();
    if (!prev) return;
    setItems(prev.items);
    setSelectedId(prev.selectedId);
    setCanvasBg(prev.canvasBg);
  }, []);

  /* ===== Gesture state ===== */
  const isDraggingRef = useRef(false);
  const dragOffsetRef = useRef<{ dx: number; dy: number } | null>(null);
  const dragActiveIdRef = useRef<string | null>(null);

  const isResizingRef = useRef(false);
  const resizeStartRef = useRef<{
    cxPx: number;
    wPct: number;
    pointerX: number;
  } | null>(null);

  const isRotatingRef = useRef(false);
  const rotateStartRef = useRef<{
    cxPx: number;
    cyPx: number;
    startAngle: number;
    initialRot: number;
  } | null>(null);

  const gestureSnapSavedRef = useRef(false);

  const selectedIndex = useMemo(
    () => items.findIndex((it) => it.id === selectedId),
    [items, selectedId]
  );
  const selectedItem = useMemo(
    () => (selectedId ? items.find((i) => i.id === selectedId) ?? null : null),
    [items, selectedId]
  );

  const targetItems = useMemo(
    () => items.filter((i) => i.role === "target"),
    [items]
  );

  // Map of targetId -> 1-based number
  const targetIndexMap = useMemo(() => {
    const m: Record<string, number> = {};
    targetItems.forEach((t, i) => (m[t.id] = i + 1));
    return m;
  }, [targetItems]);

  /* ===== Responsive canvas size ===== */
  useEffect(() => {
    if (!canvasRef.current) return;
    const ro = new ResizeObserver((entries) => {
      for (const e of entries) {
        const cr = e.contentRect;
        setCanvasSize({ w: Math.round(cr.width), h: Math.round(cr.height) });
      }
    });
    ro.observe(canvasRef.current);
    return () => ro.disconnect();
  }, []);

  /* ===== Measure selected item ===== */
  useEffect(() => {
    const id = selectedId;
    const canvasEl = canvasRef.current;
    if (!id || !canvasEl) {
      setSelInfo({ x: 0, y: 0, w: 0, h: 0 });
      return;
    }
    const el = hostRefs.current[id];
    if (!el) return;

    const measure = () => {
      const r = el.getBoundingClientRect();
      const c = canvasEl.getBoundingClientRect();
      const x = Math.round(r.left - c.left);
      const y = Math.round(r.top - c.top);
      const w = Math.round(r.width);
      const h = Math.round(r.height);
      setSelInfo({ x, y, w, h });
    };
    measure();

    window.addEventListener("resize", measure);
    const t = setInterval(measure, 120);
    return () => {
      window.removeEventListener("resize", measure);
      clearInterval(t);
    };
  }, [items, selectedId, canvasSize]);

  /* ===== Add new items ===== */
  const addSvgItems = useCallback(
    (svgs: string[]) => {
      if (svgs.length === 0) return;
      pushSnapshot();
      const newItems: Item[] = svgs.map((svg, idx) => ({
        id: uid(),
        kind: "svg",
        svg,
        cxPct: 0.5 + (idx * 16) / Math.max(1, canvasSize.w),
        cyPct: 0.5 + (idx * 16) / Math.max(1, canvasSize.h),
        wPct: 0.5,
        rot: 0,
        role: "none",
        animType: "none",
        animDurationMs: 700,
        animDelayMs: 0,
        animEasing: "easeInOut",
      }));
      setItems((prev) => [...prev, ...newItems]);
      setSelectedId(newItems[newItems.length - 1].id);
    },
    [pushSnapshot, canvasSize.w, canvasSize.h]
  );

  const addImageItems = useCallback(
    (srcs: string[]) => {
      if (srcs.length === 0) return;
      pushSnapshot();
      const newItems: Item[] = srcs.map((src, idx) => ({
        id: uid(),
        kind: "image",
        src,
        cxPct: 0.5 + (idx * 16) / Math.max(1, canvasSize.w),
        cyPct: 0.5 + (idx * 16) / Math.max(1, canvasSize.h),
        wPct: 0.5,
        rot: 0,
        role: "none",
        animType: "none",
        animDurationMs: 700,
        animDelayMs: 0,
        animEasing: "easeInOut",
      }));
      setItems((prev) => [...prev, ...newItems]);
      setSelectedId(newItems[newItems.length - 1].id);
    },
    [pushSnapshot, canvasSize.w, canvasSize.h]
  );

  /* ===== Apply pasted payloads ===== */
  const applyPastedPayload = useCallback(
    async (
      payload: string,
      flavor: "image/svg+xml" | "text/html" | "text/plain"
    ) => {
      let svgs: string[] = [];
      if (flavor === "image/svg+xml") svgs = extractFromSvgXml(payload);
      else if (flavor === "text/html") svgs = extractFromHtml(payload);
      else svgs = extractFromPlain(payload);
      const nssvgs = svgs.map((s) => namespaceSvgIds(s, uid()));
      if (nssvgs.length) addSvgItems(nssvgs);
    },
    [addSvgItems]
  );

  /* ===== Paste (keyboard) - also supports image blobs ===== */
  useEffect(() => {
    const onPaste = async (e: ClipboardEvent) => {
      if (!e.clipboardData) return;
      const ae = document.activeElement as HTMLElement | null;
      if (
        ae &&
        (ae.tagName === "INPUT" ||
          ae.tagName === "TEXTAREA" ||
          ae.isContentEditable)
      )
        return;

      const itemsArr = Array.from(e.clipboardData.items || []);
      const imageMimes = ["image/png", "image/jpeg", "image/webp"];
      const imageSrcs: string[] = [];
      for (const it of itemsArr) {
        if (imageMimes.includes(it.type)) {
          const f = it.getAsFile();
          if (f) imageSrcs.push(await blobToDataUrl(f));
        }
      }
      if (imageSrcs.length) {
        addImageItems(imageSrcs);
        e.preventDefault();
        return;
      }

      const readItemsByType = async (mime: string): Promise<string | null> => {
        for (const it of itemsArr) {
          if (it.type === mime) {
            const f = it.getAsFile();
            if (f) return await f.text();
          }
        }
        return null;
      };

      let flavor: "image/svg+xml" | "text/html" | "text/plain" | null = null;
      let payload: string | null = null;

      payload = await readItemsByType("image/svg+xml");
      if (payload) {
        flavor = "image/svg+xml";
      } else {
        payload =
          (await readItemsByType("text/html")) ??
          e.clipboardData.getData("text/html");
        if (payload) flavor = "text/html";
        else {
          payload =
            (await readItemsByType("text/plain")) ??
            e.clipboardData.getData("text/plain");
          if (payload) flavor = "text/plain";
        }
      }

      if (!payload || !flavor) return;
      await applyPastedPayload(payload, flavor);
      e.preventDefault();
    };

    window.addEventListener("paste", onPaste);
    return () => window.removeEventListener("paste", onPaste);
  }, [applyPastedPayload, addImageItems]);

  /* ===== Mobile-friendly paste button ===== */
  const pasteFromClipboard = useCallback(async () => {
    try {
      const nav = navigator as Navigator & {
        clipboard?: {
          read?: () => Promise<ClipboardItem[]>;
          readText?: () => Promise<string>;
        };
      };
      if (nav.clipboard?.read) {
        const itemsC = await nav.clipboard.read();
        const imageSrcs: string[] = [];
        for (const ci of itemsC) {
          const mime = ci.types.find((t) =>
            ["image/png", "image/jpeg", "image/webp"].includes(t)
          );
          if (mime) {
            const blob = await ci.getType(mime);
            imageSrcs.push(await blobToDataUrl(blob));
          }
        }
        if (imageSrcs.length) {
          addImageItems(imageSrcs);
          return;
        }
        for (const ci of itemsC) {
          if (ci.types?.includes("image/svg+xml")) {
            const blob = await ci.getType("image/svg+xml");
            const payload = await blob.text();
            await applyPastedPayload(payload, "image/svg+xml");
            return;
          }
        }
        for (const ci of itemsC) {
          if (ci.types?.includes("text/html")) {
            const blob = await ci.getType("text/html");
            const payload = await blob.text();
            await applyPastedPayload(payload, "text/html");
            return;
          }
        }
        for (const ci of itemsC) {
          if (ci.types?.includes("text/plain")) {
            const blob = await ci.getType("text/plain");
            const payload = await blob.text();
            await applyPastedPayload(payload, "text/plain");
            return;
          }
        }
      }
      if (navigator.clipboard && "readText" in navigator.clipboard) {
        const text = await navigator.clipboard.readText();
        if (text) {
          await applyPastedPayload(text, "text/plain");
          return;
        }
      }
      alert(
        "Clipboard read not available. Try copying again, then Paste or use Cmd/Ctrl+V."
      );
    } catch (err) {
      console.error(err);
      alert("Could not access clipboard (permissions?).");
    }
  }, [applyPastedPayload, addImageItems]);

  /* ===== Keyboard shortcuts ===== */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const ae = document.activeElement as HTMLElement | null;
      const inEditor =
        ae &&
        (ae.tagName === "INPUT" ||
          ae.tagName === "TEXTAREA" ||
          ae.isContentEditable);

      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "z") {
        if (!previewMode && !inEditor) {
          e.preventDefault();
          undo();
        }
        return;
      }

      if (
        !previewMode &&
        (e.metaKey || e.ctrlKey) &&
        e.key.toLowerCase() === "d"
      ) {
        if (inEditor || !selectedId) return;
        e.preventDefault();
        const src = items.find((it) => it.id === selectedId);
        if (!src) return;
        pushSnapshot();
        const dupe: Item = {
          ...src,
          id: uid(),
          cxPct: src.cxPct + 18 / Math.max(1, canvasSize.w),
          cyPct: src.cyPct + 18 / Math.max(1, canvasSize.h),
        };
        setItems((prev) => [...prev, dupe]);
        setSelectedId(dupe.id);
        return;
      }

      if (
        !previewMode &&
        (e.key === "Delete" || e.key === "Backspace") &&
        selectedId
      ) {
        if (inEditor) return;
        e.preventDefault();
        pushSnapshot();
        setItems((prev) => prev.filter((it) => it.id !== selectedId));
        setSelectedId(null);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [
    selectedId,
    items,
    undo,
    pushSnapshot,
    canvasSize.w,
    canvasSize.h,
    previewMode,
  ]);

  /* ===== Z-order actions ===== */
  const bringForward = useCallback(() => {
    if (previewMode) return;
    if (selectedIndex < 0 || selectedIndex === items.length - 1) return;
    pushSnapshot();
    setItems((prev) => {
      const arr = prev.slice();
      const [it] = arr.splice(selectedIndex, 1);
      arr.splice(selectedIndex + 1, 0, it);
      return arr;
    });
  }, [selectedIndex, items.length, pushSnapshot, previewMode]);

  const sendBackward = useCallback(() => {
    if (previewMode) return;
    if (selectedIndex <= 0) return;
    pushSnapshot();
    setItems((prev) => {
      const arr = prev.slice();
      const [it] = arr.splice(selectedIndex, 1);
      arr.splice(selectedIndex - 1, 0, it);
      return arr;
    });
  }, [selectedIndex, pushSnapshot, previewMode]);

  const bringToFront = useCallback(() => {
    if (previewMode) return;
    if (selectedIndex < 0 || selectedIndex === items.length - 1) return;
    pushSnapshot();
    setItems((prev) => {
      const arr = prev.slice();
      const [it] = arr.splice(selectedIndex, 1);
      arr.push(it);
      return arr;
    });
  }, [selectedIndex, items.length, pushSnapshot, previewMode]);

  const sendToBack = useCallback(() => {
    if (previewMode) return;
    if (selectedIndex <= 0) return;
    pushSnapshot();
    setItems((prev) => {
      const arr = prev.slice();
      const [it] = arr.splice(selectedIndex, 1);
      arr.unshift(it);
      return arr;
    });
  }, [selectedIndex, pushSnapshot, previewMode]);

  /* ===== Canvas / Items pointer handlers ===== */
  const onCanvasPointerDown = () => {
    if (previewMode) return;
    setSelectedId(null);
  };

  const onItemPointerDown = (
    e: React.PointerEvent<HTMLDivElement>,
    id: string
  ) => {
    e.stopPropagation();
    const canvas = canvasRef.current;
    if (!canvas || sceneAnimRunningRef.current) return;

    const target = e.target as HTMLElement;

    // Preview: only drag draggable; tappable handled onClick
    if (previewMode) {
      const item = items.find((it) => it.id === id);
      if (!item || item.role !== "draggable") return;
      if (previewMap[id]?.completed) return;

      // If user starts dragging a placed item, un-place it
      if (placedSetRef.current.has(id)) {
        setPlacedSafe((prev) => {
          const n = new Set(prev);
          n.delete(id);
          return n;
        });
      }

      const startCx = previewMap[id]?.cxPct ?? item.cxPct;
      const startCy = previewMap[id]?.cyPct ?? item.cyPct;
      previewDragStartRef.current = { id, cxPct: startCx, cyPct: startCy };

      const rect = canvas.getBoundingClientRect();
      const pointerX = e.clientX - rect.left;
      const pointerY = e.clientY - rect.top;

      const cxPx = startCx * rect.width;
      const cyPx = startCy * rect.height;

      isDraggingRef.current = true;
      dragActiveIdRef.current = id;
      (e.currentTarget as Element).setPointerCapture?.(e.pointerId);
      dragOffsetRef.current = { dx: pointerX - cxPx, dy: pointerY - cyPx };
      return;
    }

    const isRotateHit = !!target.closest('[data-handle="rotate"]');
    const isResizeHit = !!target.closest('[data-handle="resize"]');

    // RESIZE
    if (isResizeHit) {
      if (selectedId !== id) {
        setSelectedId(id);
        return;
      }
      const rect = canvas.getBoundingClientRect();
      const pointerX = e.clientX - rect.left;
      const item = items.find((it) => it.id === id);
      if (!item) return;

      if (!gestureSnapSavedRef.current) {
        pushSnapshot();
        gestureSnapSavedRef.current = true;
      }

      isResizingRef.current = true;
      (e.currentTarget as Element).setPointerCapture?.(e.pointerId);
      resizeStartRef.current = {
        cxPx: item.cxPct * rect.width,
        wPct: item.wPct,
        pointerX,
      };
      return;
    }

    // ROTATE
    if (isRotateHit) {
      if (selectedId !== id) {
        setSelectedId(id);
        return;
      }
      const rect = canvas.getBoundingClientRect();
      const item = items.find((it) => it.id === id);
      if (!item) return;

      const pointerX = e.clientX - rect.left;
      const pointerY = e.clientY - rect.top;
      const cxPx = item.cxPct * rect.width;
      const cyPx = item.cyPct * rect.height;
      const dx = pointerX - cxPx;
      const dy = pointerY - cyPx;
      const startAngle = Math.atan2(dy, dx);

      if (!gestureSnapSavedRef.current) {
        pushSnapshot();
        gestureSnapSavedRef.current = true;
      }

      isRotatingRef.current = true;
      (e.currentTarget as Element).setPointerCapture?.(e.pointerId);
      rotateStartRef.current = { cxPx, cyPx, startAngle, initialRot: item.rot };
      return;
    }

    // SELECT or DRAG (edit mode)
    if (selectedId !== id) {
      setSelectedId(id);
      return;
    }

    // Begin DRAG (edit mode)
    const rect = canvas.getBoundingClientRect();
    const pointerX = e.clientX - rect.left;
    const pointerY = e.clientY - rect.top;

    const item = items.find((it) => it.id === id);
    if (!item) return;

    if (!gestureSnapSavedRef.current) {
      pushSnapshot();
      gestureSnapSavedRef.current = true;
    }

    const cxPx = item.cxPct * rect.width;
    const cyPx = item.cyPct * rect.height;

    isDraggingRef.current = true;
    dragActiveIdRef.current = id;
    (e.currentTarget as Element).setPointerCapture?.(e.pointerId);
    dragOffsetRef.current = { dx: pointerX - cxPx, dy: pointerY - cyPx };
  };

  const onItemPointerMove = (
    e: React.PointerEvent<HTMLDivElement>,
    id: string
  ) => {
    if (!canvasRef.current || sceneAnimRunningRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const pointerX = e.clientX - rect.left;
    const pointerY = e.clientY - rect.top;

    if (previewMode && isDraggingRef.current && dragOffsetRef.current) {
      const start = previewDragStartRef.current;
      if (!start || start.id !== id) return;

      const off = dragOffsetRef.current;
      const cxPx = pointerX - off.dx;
      const cyPx = pointerY - off.dy;
      const newCxPct = cxPx / rect.width;
      const newCyPct = cyPx / rect.height;

      setPreviewMap((prev) => ({
        ...prev,
        [id]: {
          ...(prev[id] ?? {
            cxPct: newCxPct,
            cyPct: newCyPct,
            completed: false,
          }),
          cxPct: newCxPct,
          cyPct: newCyPct,
        },
      }));
      return;
    }

    // RESIZE (edit only)
    if (!previewMode && isResizingRef.current && resizeStartRef.current) {
      const start = resizeStartRef.current;
      let targetWidthPx = Math.abs(pointerX - start.cxPx) * 2;
      const minPx = rect.width * 0.05;
      const maxPx = rect.width * 2.0;
      targetWidthPx = Math.max(minPx, Math.min(maxPx, targetWidthPx));
      const newWPct = targetWidthPx / rect.width;

      setItems((prev) =>
        prev.map((it) => (it.id === id ? { ...it, wPct: newWPct } : it))
      );
      return;
    }

    // ROTATE (edit only)
    if (!previewMode && isRotatingRef.current && rotateStartRef.current) {
      const st = rotateStartRef.current;
      const dx = pointerX - st.cxPx;
      const dy = pointerY - st.cyPx;
      const angle = Math.atan2(dy, dx);
      let newRot = st.initialRot + (angle - st.startAngle);
      if (e.shiftKey) {
        const snap = Math.PI / 12; // 15°
        newRot = Math.round(newRot / snap) * snap;
      }
      setItems((prev) =>
        prev.map((it) => (it.id === id ? { ...it, rot: newRot } : it))
      );
      return;
    }

    // DRAG (edit mode)
    if (!previewMode && isDraggingRef.current && dragOffsetRef.current) {
      const off = dragOffsetRef.current;
      const cxPx = pointerX - off.dx;
      const cyPx = pointerY - off.dy;
      const newCxPct = cxPx / rect.width;
      const newCyPct = cyPx / rect.height;
      setItems((prev) =>
        prev.map((it) =>
          it.id === id ? { ...it, cxPct: newCxPct, cyPct: newCyPct } : it
        )
      );
    }
  };

  const animateId = (id: string) => {
    setAnimatingIds((prev) => {
      const ns = new Set(prev);
      ns.add(id);
      return ns;
    });
    setTimeout(() => {
      setAnimatingIds((prev) => {
        const ns = new Set(prev);
        ns.delete(id);
        return ns;
      });
    }, SNAP_MS);
  };

  // Drop correctness (checks center-over-target at gesture end only)
  const checkCorrectDrop = useCallback(
    (dragId: string) => {
      const dragItem = items.find((i) => i.id === dragId);
      if (
        !dragItem ||
        dragItem.role !== "draggable" ||
        !dragItem.correctTargetId
      )
        return false;

      const dragHost = hostRefs.current[dragItem.id];
      const targetHost = hostRefs.current[dragItem.correctTargetId];
      if (!dragHost || !targetHost) return false;

      const dragRect = dragHost.getBoundingClientRect();
      const targetRect = targetHost.getBoundingClientRect();

      const cx = dragRect.left + dragRect.width / 2;
      const cy = dragRect.top + dragRect.height / 2;

      return (
        cx >= targetRect.left &&
        cx <= targetRect.right &&
        cy >= targetRect.top &&
        cy <= targetRect.bottom
      );
    },
    [items]
  );

  const endGesture = (e: React.PointerEvent<HTMLDivElement>) => {
    const activeId = dragActiveIdRef.current;

    isDraggingRef.current = false;
    dragOffsetRef.current = null;
    isResizingRef.current = false;
    resizeStartRef.current = null;
    isRotatingRef.current = false;
    rotateStartRef.current = null;
    dragActiveIdRef.current = null;
    (e.currentTarget as Element).releasePointerCapture?.(e.pointerId);
    gestureSnapSavedRef.current = false;

    if (previewMode && activeId) {
      const item = items.find((i) => i.id === activeId);
      if (!item) return;

      const success = checkCorrectDrop(activeId);

      if (success) {
        const hasFinal = item.finalCxPct != null && item.finalCyPct != null;

        if (hasFinal) {
          // Move (animate) to final position within preview state only
          setPreviewMap((prev) => {
            const cur = prev[activeId] ?? {
              cxPct: item.cxPct,
              cyPct: item.cyPct,
              completed: false,
            };
            return {
              ...prev,
              [activeId]: {
                ...cur,
                cxPct: item.finalCxPct!,
                cyPct: item.finalCyPct!,
                completed: false,
              },
            };
          });
          // Mark placed AFTER snapping to final (we mark now since snap is instant in preview data)
          setPlacedSafe((prev) => {
            const n = new Set(prev);
            n.add(activeId);
            return n;
          });
          animateId(activeId);
        } else {
          // No final position → mark completed (hide) in preview AND mark placed now
          setPreviewMap((prev) => {
            const cur = prev[activeId] ?? {
              cxPct: item.cxPct,
              cyPct: item.cyPct,
              completed: false,
            };
            return { ...prev, [activeId]: { ...cur, completed: true } };
          });
          setPlacedSafe((prev) => {
            const n = new Set(prev);
            n.add(activeId);
            return n;
          });
        }

        // Only show dialog if item had a non-empty message AND it's tappable; for drop, we generally skip dialog.
        // (Keeping the infrastructure minimal.)
        setPreviewDialog((d) => d); // no-op; preserves prior behavior (no auto dialog here)

        // Evaluate if scene animation should start (based on placed set)
        maybeStartSceneAnimationFromAllCorrect();
      } else {
        // Return to where it started (within preview)
        const start = previewDragStartRef.current;
        if (start && start.id === activeId) {
          setPreviewMap((prev) => {
            const cur = prev[activeId] ?? {
              cxPct: item.cxPct,
              cyPct: item.cyPct,
              completed: false,
            };
            return {
              ...prev,
              [activeId]: { ...cur, cxPct: start.cxPct, cyPct: start.cyPct },
            };
          });
          // Make sure it's not counted as placed
          setPlacedSafe((prev) => {
            const n = new Set(prev);
            n.delete(activeId);
            return n;
          });
          animateId(activeId);
        }
      }
    }
  };

  /* ===== Final-position editing (unchanged) ===== */
  const [finalEditId, setFinalEditId] = useState<string | null>(null);
  const isEditingFinal = useMemo(
    () => !!finalEditId && !previewMode,
    [finalEditId, previewMode]
  );
  const finalDragActiveRef = useRef<string | null>(null);
  const finalDragOffsetRef = useRef<{ dx: number; dy: number } | null>(null);
  const finalIsDraggingRef = useRef(false);

  const onFinalGhostPointerDown = (
    e: React.PointerEvent<HTMLDivElement>,
    item: Item
  ) => {
    if (!isEditingFinal) return;
    e.stopPropagation();
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const pointerX = e.clientX - rect.left;
    const pointerY = e.clientY - rect.top;

    const startCx = item.finalCxPct ?? item.cxPct;
    const startCy = item.finalCyPct ?? item.cyPct;

    const cxPx = startCx * rect.width;
    const cyPx = startCy * rect.height;

    finalIsDraggingRef.current = true;
    finalDragActiveRef.current = item.id;
    (e.currentTarget as Element).setPointerCapture?.(e.pointerId);
    finalDragOffsetRef.current = { dx: pointerX - cxPx, dy: pointerY - cyPx };

    if (item.finalCxPct == null || item.finalCyPct == null) {
      setItems((prev) =>
        prev.map((it) =>
          it.id === item.id
            ? { ...it, finalCxPct: it.cxPct, finalCyPct: it.cyPct }
            : it
        )
      );
    }
  };

  const onFinalGhostPointerMove = (
    e: React.PointerEvent<HTMLDivElement>,
    item: Item
  ) => {
    if (
      !isEditingFinal ||
      !finalIsDraggingRef.current ||
      !finalDragOffsetRef.current
    )
      return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const pointerX = e.clientX - rect.left;
    const pointerY = e.clientY - rect.top;
    const off = finalDragOffsetRef.current;

    const cxPx = pointerX - off.dx;
    const cyPx = pointerY - off.dy;

    const newCx = Math.max(0, Math.min(1, cxPx / rect.width));
    const newCy = Math.max(0, Math.min(1, cyPx / rect.height));

    setItems((prev) =>
      prev.map((it) =>
        it.id === item.id ? { ...it, finalCxPct: newCx, finalCyPct: newCy } : it
      )
    );
  };

  const endFinalGhostGesture = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isEditingFinal) return;
    finalIsDraggingRef.current = false;
    finalDragOffsetRef.current = null;
    finalDragActiveRef.current = null;
    (e.currentTarget as Element).releasePointerCapture?.(e.pointerId);
  };

  /* ===== Toolbar helpers ===== */
  const onDelete = () => {
    if (previewMode || !selectedId) return;
    pushSnapshot();
    setItems((prev) => prev.filter((it) => it.id !== selectedId));
    setSelectedId(null);
  };

  const onDuplicate = () => {
    if (previewMode || !selectedId) return;
    const src = items.find((it) => it.id === selectedId);
    if (!src) return;
    pushSnapshot();
    const dupe: Item = {
      ...src,
      id: uid(),
      cxPct: src.cxPct + 18 / Math.max(1, canvasSize.w),
      cyPct: src.cyPct + 18 / Math.max(1, canvasSize.h),
    };
    setItems((prev) => [...prev, dupe]);
    setSelectedId(dupe.id);
  };

  const onChangeRole = (role: Role) => {
    if (previewMode || !selectedId) return;
    pushSnapshot();
    setFinalEditId(null);
    setItems((prev) =>
      prev.map((it) =>
        it.id === selectedId
          ? {
              ...it,
              role,
              correctTargetId:
                role === "draggable" ? it.correctTargetId : undefined,
              tapMessage: role === "tappable" ? it.tapMessage : undefined,
              finalCxPct: role === "draggable" ? it.finalCxPct : undefined,
              finalCyPct: role === "draggable" ? it.finalCyPct : undefined,
            }
          : it
      )
    );
  };

  const onSetCorrectTarget = (targetId: string | "") => {
    if (previewMode || !selectedId) return;
    pushSnapshot();
    setItems((prev) =>
      prev.map((it) =>
        it.id === selectedId
          ? { ...it, correctTargetId: targetId || undefined }
          : it
      )
    );
  };

  const onSetTapMessage = (msg: string) => {
    if (previewMode || !selectedId) return;
    setItems((prev) =>
      prev.map((it) => (it.id === selectedId ? { ...it, tapMessage: msg } : it))
    );
  };

  /* ====== Simple Animation Controls (no JSON) ====== */

  // Editing “Anim Target” (for move)
  const [animTargetEditId, setAnimTargetEditId] = useState<string | null>(null);
  const isEditingAnimTarget = useMemo(
    () => !!animTargetEditId && !previewMode,
    [animTargetEditId, previewMode]
  );
  const animTargetDragActiveRef = useRef<string | null>(null);
  const animTargetDragOffsetRef = useRef<{ dx: number; dy: number } | null>(
    null
  );
  const animTargetIsDraggingRef = useRef(false);

  const onAnimTargetPointerDown = (
    e: React.PointerEvent<HTMLDivElement>,
    item: Item
  ) => {
    if (!isEditingAnimTarget) return;
    e.stopPropagation();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const pointerX = e.clientX - rect.left;
    const pointerY = e.clientY - rect.top;

    const startCx = item.animMoveCxPct ?? item.cxPct;
    const startCy = item.animMoveCyPct ?? item.cyPct;

    const cxPx = startCx * rect.width;
    const cyPx = startCy * rect.height;

    animTargetIsDraggingRef.current = true;
    animTargetDragActiveRef.current = item.id;
    (e.currentTarget as Element).setPointerCapture?.(e.pointerId);
    animTargetDragOffsetRef.current = {
      dx: pointerX - cxPx,
      dy: pointerY - cyPx,
    };

    if (item.animMoveCxPct == null || item.animMoveCyPct == null) {
      setItems((prev) =>
        prev.map((it) =>
          it.id === item.id
            ? { ...it, animMoveCxPct: it.cxPct, animMoveCyPct: it.cyPct }
            : it
        )
      );
    }
  };

  const onAnimTargetPointerMove = (
    e: React.PointerEvent<HTMLDivElement>,
    item: Item
  ) => {
    if (
      !isEditingAnimTarget ||
      !animTargetIsDraggingRef.current ||
      !animTargetDragOffsetRef.current
    )
      return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const pointerX = e.clientX - rect.left;
    const pointerY = e.clientY - rect.top;
    const off = animTargetDragOffsetRef.current;

    const cxPx = pointerX - off.dx;
    const cyPx = pointerY - off.dy;

    const newCx = Math.max(0, Math.min(1, cxPx / rect.width));
    const newCy = Math.max(0, Math.min(1, cyPx / rect.height));

    setItems((prev) =>
      prev.map((it) =>
        it.id === item.id
          ? { ...it, animMoveCxPct: newCx, animMoveCyPct: newCy }
          : it
      )
    );
  };

  const endAnimTargetGesture = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isEditingAnimTarget) return;
    animTargetIsDraggingRef.current = false;
    animTargetDragOffsetRef.current = null;
    animTargetDragActiveRef.current = null;
    (e.currentTarget as Element).releasePointerCapture?.(e.pointerId);
  };

  // Editing “Anim Scale” (for scale)
  const [animScaleEditId, setAnimScaleEditId] = useState<string | null>(null);
  const isEditingAnimScale = useMemo(
    () => !!animScaleEditId && !previewMode,
    [animScaleEditId, previewMode]
  );
  const animScaleResizeStartRef = useRef<{
    cxPx: number;
    wPct: number;
    pointerX: number;
  } | null>(null);
  const animScaleResizingRef = useRef(false);

  const onAnimScalePointerDown = (
    e: React.PointerEvent<HTMLDivElement>,
    item: Item
  ) => {
    if (!isEditingAnimScale) return;
    e.stopPropagation();
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const pointerX = e.clientX - rect.left;

    const startWidthPct = item.animScaleWPct ?? item.wPct;
    const cxPx = item.cxPct * rect.width;

    animScaleResizingRef.current = true;
    (e.currentTarget as Element).setPointerCapture?.(e.pointerId);
    animScaleResizeStartRef.current = { cxPx, wPct: startWidthPct, pointerX };

    if (item.animScaleWPct == null) {
      setItems((prev) =>
        prev.map((it) =>
          it.id === item.id ? { ...it, animScaleWPct: it.wPct } : it
        )
      );
    }
  };

  const onAnimScalePointerMove = (
    e: React.PointerEvent<HTMLDivElement>,
    item: Item
  ) => {
    if (
      !isEditingAnimScale ||
      !animScaleResizingRef.current ||
      !animScaleResizeStartRef.current
    )
      return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const pointerX = e.clientX - rect.left;

    const start = animScaleResizeStartRef.current;
    let targetWidthPx = Math.abs(pointerX - start.cxPx) * 2;
    const minPx = rect.width * 0.05;
    const maxPx = rect.width * 2.0;
    targetWidthPx = Math.max(minPx, Math.min(maxPx, targetWidthPx));
    const newWPct = targetWidthPx / rect.width;

    setItems((prev) =>
      prev.map((it) =>
        it.id === item.id ? { ...it, animScaleWPct: newWPct } : it
      )
    );
  };

  const endAnimScaleGesture = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isEditingAnimScale) return;
    animScaleResizingRef.current = false;
    animScaleResizeStartRef.current = null;
    (e.currentTarget as Element).releasePointerCapture?.(e.pointerId);
  };

  // Final pos controls (unchanged)
  const toggleFinalEdit = () => {
    if (!selectedItem || previewMode) return;
    if (selectedItem.role !== "draggable") return;
    if (selectedItem.finalCxPct == null || selectedItem.finalCyPct == null) {
      setItems((prev) =>
        prev.map((it) =>
          it.id === selectedItem.id
            ? { ...it, finalCxPct: it.cxPct, finalCyPct: it.cyPct }
            : it
        )
      );
    }
    setFinalEditId((id) => (id === selectedItem.id ? null : selectedItem.id));
  };
  const clearFinalPosition = () => {
    if (!selectedItem || previewMode || selectedItem.role !== "draggable")
      return;
    setItems((prev) =>
      prev.map((it) =>
        it.id === selectedItem.id
          ? { ...it, finalCxPct: undefined, finalCyPct: undefined }
          : it
      )
    );
  };

  // Tappable action (preview): maybe message + maybe start scene anim
  const onTappableClick = (id: string) => {
    if (!previewMode || sceneAnimRunningRef.current) return;
    const p = previewMap[id];
    if (p?.completed) return;
    const item = items.find((i) => i.id === id);
    if (!item || item.role !== "tappable") return;

    const hasMsg = !!(item.tapMessage && item.tapMessage.trim().length > 0);
    if (hasMsg) {
      setPreviewDialog({
        open: true,
        title: "Message",
        message: item.tapMessage,
      });
    }

    if (
      sceneTriggerMode !== "all-correct" &&
      (item.isSceneTrigger || sceneTriggerMode === "either")
    ) {
      maybeStartSceneAnimation("tap");
    }
  };

  /* ===== Derived ===== */
  const sel = selectedItem;
  const rotDeg = sel ? Math.round(((sel.rot * 180) / Math.PI) * 10) / 10 : 0;

  const visibleItems = useMemo(() => {
    if (!hideNonZeroZ) return items;
    return items.filter((_, idx) => idx === 0);
  }, [items, hideNonZeroZ]);

  useEffect(() => {
    if (!selectedId) return;
    const idx = items.findIndex((i) => i.id === selectedId);
    if (idx < 0) return;
    if (hideNonZeroZ && idx !== 0) setSelectedId(null);
  }, [hideNonZeroZ, items, selectedId]);

  const getRenderPos = (it: Item) => {
    if (previewMode) {
      const pm = previewMap[it.id];
      if (pm) return { cx: pm.cxPct, cy: pm.cyPct, completed: pm.completed };
    }
    return { cx: it.cxPct, cy: it.cyPct, completed: false };
  };

  /* ============================
     ALL-CORRECT TRIGGER (target-aware & final-aware)
     ============================ */

  // Draggables that gate the start: ANY with a target (final is optional)
  const gatingDraggables = useMemo(
    () =>
      items
        .filter((d) => d.role === "draggable" && d.correctTargetId)
        .map((d) => d.id),
    [items]
  );

  const allTargetsSatisfied = useMemo(() => {
    if (!previewMode) return false;
    if (gatingDraggables.length === 0) return false;
    for (const id of gatingDraggables) {
      if (!placedSetRef.current.has(id)) return false;
    }
    return true;
  }, [gatingDraggables, previewMode, placedSet]);

  /* ============================
     SCENE ANIMATION ENGINE
     ============================ */
  const [overlayMap, setOverlayMap] = useState<Record<string, AnimOverlay>>({});
  const overlayRef = useRef<Record<string, AnimOverlay>>({});
  const sceneAnimRAF = useRef<number | null>(null);
  const sceneAnimRunningRef = useRef(false);
  const [sceneAnimStarted, setSceneAnimStarted] = useState(false);

  function resetSceneAnim() {
    if (sceneAnimRAF.current) {
      cancelAnimationFrame(sceneAnimRAF.current);
      sceneAnimRAF.current = null;
    }
    sceneAnimRunningRef.current = false;
    setSceneAnimStarted(false);
    overlayRef.current = {};
    setOverlayMap({});
  }

  const maybeStartSceneAnimationFromAllCorrect = useCallback(() => {
    if (!previewMode || sceneAnimRunningRef.current || sceneAnimStarted) return;
    if (sceneTriggerMode === "tap") return;
    if (!allTargetsSatisfied) return;
    maybeStartSceneAnimation("all-correct");
  }, [previewMode, allTargetsSatisfied, sceneAnimStarted, sceneTriggerMode]);

  function maybeStartSceneAnimation(trigger: "all-correct" | "tap") {
    if (sceneAnimRunningRef.current || sceneAnimStarted) return;
    if (trigger === "all-correct" && sceneTriggerMode === "tap") return;
    if (trigger === "tap" && sceneTriggerMode === "all-correct") return;
    startSceneAnimation();
  }

  function startSceneAnimation() {
    const reduce = prefersReducedMotion();

    // seed overlay identity
    const base: Record<string, AnimOverlay> = {};
    for (const it of items)
      base[it.id] = { dxPx: 0, dyPx: 0, scale: 1, rotDelta: 0, alpha: 1 };
    overlayRef.current = base;
    setOverlayMap(base);

    sceneAnimRunningRef.current = true;
    setSceneAnimStarted(true);

    const canvas = canvasRef.current!;
    const cw = canvasSize.w || canvas.getBoundingClientRect().width;
    const ch = canvasSize.h || canvas.getBoundingClientRect().height;

    const t0 = performance.now();

    const run = () => {
      const now = performance.now();
      let anyActive = false;
      const next: Record<string, AnimOverlay> = { ...overlayRef.current };

      for (const it of items) {
        const pos = getRenderPos(it); // current (preview) base
        const type = it.animType || "none";
        if (type === "none") continue;

        const duration = Math.max(
          0,
          reduce
            ? Math.max(120, Math.round((it.animDurationMs ?? 700) * 0.5))
            : it.animDurationMs ?? 700
        );
        const delay = Math.max(0, it.animDelayMs ?? 0);
        const easing = it.animEasing ?? "easeInOut";

        const start = t0 + delay;
        const end = start + duration;

        const before = now < start;
        const after = now >= end;
        const active = !before && !after;

        if (!after) anyActive = true;

        const rawT = duration > 0 ? (now - start) / duration : 1;
        const tClamped = Math.min(1, Math.max(0, rawT));
        const ex = ease(tClamped, easing);

        // reset accumulators each frame
        let dxPx = 0;
        let dyPx = 0;
        let scale = 1;
        let rotDelta = 0;
        let alpha = 1;

        if (active || after) {
          switch (type) {
            case "move": {
              const tx = (it.animMoveCxPct ?? pos.cx) * cw;
              const ty = (it.animMoveCyPct ?? pos.cy) * ch;
              const sx = pos.cx * cw;
              const sy = pos.cy * ch;
              dxPx += (tx - sx) * ex;
              dyPx += (ty - sy) * ex;
              break;
            }
            case "scale": {
              const targetW = (it.animScaleWPct ?? it.wPct) * cw;
              const baseW = it.wPct * cw;
              const factor = baseW > 0 ? targetW / baseW : 1;
              scale *= 1 + (factor - 1) * ex;
              break;
            }
            case "rotate": {
              const by = it.animRotateBy ?? 0;
              rotDelta += by * ex;
              break;
            }
            case "opacity": {
              const to = it.animOpacityTo ?? 1;
              alpha *= 1 + (to - 1) * ex; // from 1 -> to
              break;
            }
            case "jitter": {
              const ampX =
                STANDARD_JITTER.axes === "x" || STANDARD_JITTER.axes === "both"
                  ? STANDARD_JITTER.amplitudePct * cw
                  : 0;
              const ampY =
                STANDARD_JITTER.axes === "y" || STANDARD_JITTER.axes === "both"
                  ? STANDARD_JITTER.amplitudePct * ch
                  : 0;
              const tau = 2 * Math.PI;
              const tSec = (now - start) / 1000;
              const omega = tau * STANDARD_JITTER.frequency;
              dxPx += Math.sin(omega * tSec) * ampX;
              dyPx += Math.cos(omega * tSec) * ampY;
              break;
            }
            case "pulse": {
              const { min, max, cycles } = STANDARD_PULSE;
              const tau = 2 * Math.PI;
              const phase = tau * (cycles ?? 2) * tClamped;
              const s = min + (max - min) * (0.5 + 0.5 * Math.sin(phase));
              scale *= s;
              break;
            }
          }
        }

        next[it.id] = { dxPx, dyPx, scale, rotDelta, alpha };
      }

      overlayRef.current = next;
      setOverlayMap(next);

      if (anyActive) {
        sceneAnimRAF.current = requestAnimationFrame(run);
      } else {
        sceneAnimRunningRef.current = false;
      }
    };

    sceneAnimRAF.current = requestAnimationFrame(run);
  }

  // If all targets satisfied becomes true (and allowed), start scene anim
  useEffect(() => {
    if (!previewMode) return;
    if (sceneAnimRunningRef.current || sceneAnimStarted) return;
    if (sceneTriggerMode === "tap") return;
    if (allTargetsSatisfied) maybeStartSceneAnimation("all-correct");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allTargetsSatisfied, previewMode, sceneTriggerMode]);

  /* ============================
     Render
     ============================ */
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 text-gray-800 font-mono">
      <div className="w-full px-3" style={{ maxWidth: 360 }}>
        {/* Toolbar */}
        <div className="mb-2 flex flex-wrap items-center justify-center gap-1">
          <button
            className={`p-1 rounded border border-gray-300 ${
              previewMode
                ? "bg-gray-200 text-gray-400 cursor-not-allowed"
                : "bg-white text-gray-700 hover:bg-gray-100 active:bg-gray-200"
            }`}
            onClick={pasteFromClipboard}
            disabled={previewMode}
            title={
              previewMode
                ? "Exit Preview to paste"
                : "Paste from clipboard (SVG/PNG/JPG/WebP)"
            }
          >
            {I.paste}
          </button>
          <button
            className="p-1 rounded border border-gray-300 bg-white text-gray-700 hover:bg-gray-100 active:bg-gray-200"
            onClick={undo}
            disabled={undoStackRef.current.length === 0 || previewMode}
            title={previewMode ? "Exit Preview to undo" : "Undo (Cmd/Ctrl+Z)"}
          >
            {I.undo}
          </button>
          <button
            className={`p-1 rounded border border-gray-300 ${
              previewMode
                ? "bg-gray-200 text-gray-400 cursor-not-allowed"
                : "bg-white text-gray-700 hover:bg-gray-100 active:bg-gray-200"
            } disabled:opacity-50`}
            onClick={onDuplicate}
            disabled={!selectedId || previewMode}
            title={
              previewMode
                ? "Exit Preview to duplicate"
                : "Duplicate (Cmd/Ctrl+D)"
            }
          >
            {I.duplicate}
          </button>
          <button
            className={`p-1 rounded border border-gray-300 ${
              previewMode
                ? "bg-gray-200 text-gray-400 cursor-not-allowed"
                : "bg-white text-gray-700 hover:bg-gray-100 active:bg-gray-200"
            } disabled:opacity-50`}
            onClick={bringForward}
            disabled={
              previewMode ||
              selectedIndex < 0 ||
              selectedIndex === items.length - 1
            }
            title={
              previewMode ? "Exit Preview to edit z-order" : "Bring Forward"
            }
          >
            {I.forward}
          </button>
          <button
            className={`p-1 rounded border border-gray-300 ${
              previewMode
                ? "bg-gray-200 text-gray-400 cursor-not-allowed"
                : "bg-white text-gray-700 hover:bg-gray-100 active:bg-gray-200"
            } disabled:opacity-50`}
            onClick={sendBackward}
            disabled={previewMode || selectedIndex <= 0}
            title={
              previewMode ? "Exit Preview to edit z-order" : "Send Backward"
            }
          >
            {I.backward}
          </button>
          <button
            className={`p-1 rounded border border-gray-300 ${
              previewMode
                ? "bg-gray-200 text-gray-400 cursor-not-allowed"
                : "bg-white text-gray-700 hover:bg-gray-100 active:bg-gray-200"
            } disabled:opacity-50`}
            onClick={bringToFront}
            disabled={
              previewMode ||
              selectedIndex < 0 ||
              selectedIndex === items.length - 1
            }
            title={
              previewMode ? "Exit Preview to edit z-order" : "Bring to Front"
            }
          >
            {I.front}
          </button>
          <button
            className={`p-1 rounded border border-gray-300 ${
              previewMode
                ? "bg-gray-200 text-gray-400 cursor-not-allowed"
                : "bg-white text-gray-700 hover:bg-gray-100 active:bg-gray-200"
            } disabled:opacity-50`}
            onClick={sendToBack}
            disabled={previewMode || selectedIndex <= 0}
            title={
              previewMode ? "Exit Preview to edit z-order" : "Send to Back"
            }
          >
            {I.back}
          </button>
          <button
            className={`p-1 rounded border border-gray-300 ${
              previewMode
                ? "bg-gray-200 text-gray-400 cursor-not-allowed"
                : "bg-white text-gray-700 hover:bg-gray-100 active:bg-gray-200"
            } disabled:opacity-50`}
            onClick={onDelete}
            disabled={!selectedId || previewMode}
            title={
              previewMode ? "Exit Preview to delete" : "Delete (Del/Backspace)"
            }
          >
            {I.trash}
          </button>

          {/* Canvas color */}
          <label
            className={`ml-2 inline-flex items-center gap-1 px-1.5 py-1 rounded border border-gray-300 ${
              previewMode
                ? "bg-gray-200 text-gray-400"
                : "bg-white text-gray-700"
            }`}
            title="Canvas color"
          >
            {I.palette}
            <input
              type="color"
              value={canvasBg}
              onChange={(e) => {
                if (previewMode) return;
                pushSnapshot();
                setCanvasBg(e.target.value);
              }}
              className="w-6 h-6 cursor-pointer border-0 bg-transparent p-0"
              aria-label="Canvas color"
              disabled={previewMode}
            />
          </label>

          {/* Preview toggle */}
          <button
            className={`ml-2 p-1 rounded border border-gray-300 ${
              previewMode
                ? "bg-emerald-600 text-white"
                : "bg-white text-gray-700 hover:bg-gray-100 active:bg-gray-200"
            }`}
            onClick={() => setPreviewMode((p) => !p)}
            title={previewMode ? "Exit Preview" : "Enter Preview"}
          >
            {previewMode ? I.stop : I.play}
          </button>

          {/* Scene Trigger Mode */}
          <div
            className="ml-2 flex items-center gap-1 text-[10px] border border-gray-300 rounded px-1 py-0.5 bg-white"
            title="Scene Animation Trigger Mode"
          >
            <span className="text-gray-600">Trigger:</span>
            <button
              className={`px-1 py-0.5 rounded ${
                sceneTriggerMode === "all-correct"
                  ? "bg-gray-900 text-white"
                  : "hover:bg-gray-100"
              }`}
              onClick={() => setSceneTriggerMode("all-correct")}
            >
              All-Correct
            </button>
            <button
              className={`px-1 py-0.5 rounded ${
                sceneTriggerMode === "tap"
                  ? "bg-gray-900 text-white"
                  : "hover:bg-gray-100"
              }`}
              onClick={() => setSceneTriggerMode("tap")}
            >
              Tap
            </button>
            <button
              className={`px-1 py-0.5 rounded ${
                sceneTriggerMode === "either"
                  ? "bg-gray-900 text-white"
                  : "hover:bg-gray-100"
              }`}
              onClick={() => setSceneTriggerMode("either")}
            >
              Either
            </button>
          </div>
        </div>

        {/* Role selector + controls (edit mode only) */}
        {!previewMode && selectedItem && (
          <div className="mb-2 space-y-3">
            <div className="flex items-center justify-center gap-1 text-xs">
              {(["none", "draggable", "target", "tappable"] as Role[]).map(
                (r) => (
                  <button
                    key={r}
                    onClick={() => onChangeRole(r)}
                    className={`px-2 py-1 rounded border ${
                      selectedItem.role === r
                        ? "border-gray-900 bg-gray-900 text-white"
                        : "border-gray-300 bg-white text-gray-700 hover:bg-gray-100"
                    }`}
                    title={`Set role: ${ROLE_META[r].label}`}
                  >
                    {ROLE_META[r].label}
                  </button>
                )
              )}
            </div>

            {/* Draggable settings */}
            {selectedItem.role === "draggable" && (
              <div className="space-y-2">
                <div className="flex items-center justify-center gap-2 text-xs">
                  <label className="text-gray-600">Correct Target:</label>
                  <select
                    className="border border-gray-300 rounded px-2 py-1 bg-white text-gray-800"
                    value={selectedItem.correctTargetId ?? ""}
                    onChange={(e) => onSetCorrectTarget(e.target.value)}
                  >
                    <option value="">— none —</option>
                    {targetItems.map((t) => (
                      <option key={t.id} value={t.id}>
                        {`Target #${targetIndexMap[t.id] || "?"}`}
                      </option>
                    ))}
                  </select>
                  {targetItems.length === 0 && (
                    <span className="text-[10px] text-gray-500">
                      (No targets yet. Set some items to “Target”.)
                    </span>
                  )}
                </div>

                <div className="flex items-center justify-center gap-2 text-xs">
                  <button
                    className={`px-2 py-1 rounded border ${
                      isEditingFinal
                        ? "border-blue-700 bg-blue-700 text-white"
                        : "border-gray-300 bg-white text-gray-700 hover:bg-gray-100"
                    }`}
                    onClick={toggleFinalEdit}
                    title={
                      isEditingFinal
                        ? "Finish placing final position"
                        : "Drag final position on canvas"
                    }
                  >
                    {isEditingFinal ? "Done Final Pos" : "Edit Final Pos"}
                  </button>
                  <button
                    className="px-2 py-1 rounded border border-gray-300 bg-white text-gray-700 hover:bg-gray-100"
                    onClick={clearFinalPosition}
                    title="Clear final position"
                  >
                    Clear Final
                  </button>
                  {selectedItem.finalCxPct != null &&
                    selectedItem.finalCyPct != null && (
                      <span className="text-gray-600">
                        Final: ({selectedItem.finalCxPct.toFixed(2)},{" "}
                        {selectedItem.finalCyPct.toFixed(2)})
                      </span>
                    )}
                </div>
              </div>
            )}

            {/* Tappable message */}
            {selectedItem.role === "tappable" && (
              <div className="space-y-2">
                <div className="flex items-center justify-center gap-2 text-xs">
                  <label className="text-gray-600">Message:</label>
                  <input
                    className="border border-gray-300 rounded px-2 py-1 bg-white text-gray-800 w-full"
                    placeholder="Type a message to show on tap (optional)"
                    value={selectedItem.tapMessage ?? ""}
                    onChange={(e) => onSetTapMessage(e.target.value)}
                  />
                </div>
                <div className="flex items-center justify-center gap-2 text-xs">
                  <label className="text-gray-600">
                    Tap triggers scene anim:
                  </label>
                  <input
                    type="checkbox"
                    checked={!!selectedItem.isSceneTrigger}
                    onChange={(e) =>
                      setItems((prev) =>
                        prev.map((it) =>
                          it.id === selectedItem.id
                            ? { ...it, isSceneTrigger: e.target.checked }
                            : it
                        )
                      )
                    }
                  />
                </div>
              </div>
            )}

            {/* ===== Simple Animation Controls (no JSON) ===== */}
            <div className="space-y-2">
              <div className="flex items-center justify-center gap-1 text-xs">
                {(
                  [
                    "none",
                    "move",
                    "scale",
                    "rotate",
                    "opacity",
                    "jitter",
                    "pulse",
                  ] as AnimType[]
                ).map((t) => (
                  <button
                    key={t}
                    onClick={() =>
                      setItems((prev) =>
                        prev.map((it) =>
                          it.id === selectedItem.id
                            ? {
                                ...it,
                                animType: t,
                                // sensible defaults
                                animDurationMs: it.animDurationMs ?? 700,
                                animDelayMs: it.animDelayMs ?? 0,
                                animEasing: it.animEasing ?? "easeInOut",
                                animRotateBy: it.animRotateBy ?? Math.PI / 6, // 30°
                                animOpacityTo: it.animOpacityTo ?? 0.0,
                              }
                            : it
                        )
                      )
                    }
                    className={`px-2 py-1 rounded border ${
                      selectedItem.animType === t
                        ? "border-gray-900 bg-gray-900 text-white"
                        : "border-gray-300 bg-white text-gray-700 hover:bg-gray-100"
                    }`}
                    title={`Animation: ${t}`}
                  >
                    {t}
                  </button>
                ))}
              </div>

              {/* Shared timing/easing */}
              <div className="grid grid-cols-3 gap-2 text-xs">
                <label className="flex items-center justify-between gap-2">
                  <span className="text-gray-600">Duration</span>
                  <input
                    type="number"
                    min={0}
                    className="w-20 border border-gray-300 rounded px-1 py-0.5"
                    value={selectedItem.animDurationMs ?? 700}
                    onChange={(e) =>
                      setItems((prev) =>
                        prev.map((it) =>
                          it.id === selectedItem.id
                            ? {
                                ...it,
                                animDurationMs: Number(e.target.value) || 0,
                              }
                            : it
                        )
                      )
                    }
                  />
                </label>
                <label className="flex items-center justify-between gap-2">
                  <span className="text-gray-600">Delay</span>
                  <input
                    type="number"
                    min={0}
                    className="w-20 border border-gray-300 rounded px-1 py-0.5"
                    value={selectedItem.animDelayMs ?? 0}
                    onChange={(e) =>
                      setItems((prev) =>
                        prev.map((it) =>
                          it.id === selectedItem.id
                            ? {
                                ...it,
                                animDelayMs: Number(e.target.value) || 0,
                              }
                            : it
                        )
                      )
                    }
                  />
                </label>
                <label className="flex items-center justify-between gap-2">
                  <span className="text-gray-600">Easing</span>
                  <select
                    className="border border-gray-300 rounded px-1 py-0.5"
                    value={selectedItem.animEasing ?? "easeInOut"}
                    onChange={(e) =>
                      setItems((prev) =>
                        prev.map((it) =>
                          it.id === selectedItem.id
                            ? {
                                ...it,
                                animEasing: e.target.value as EasingKind,
                              }
                            : it
                        )
                      )
                    }
                  >
                    <option value="easeInOut">easeInOut</option>
                    <option value="linear">linear</option>
                  </select>
                </label>
              </div>

              {/* Type-specific controls */}
              {selectedItem.animType === "move" && (
                <div className="flex items-center justify-center gap-2 text-xs">
                  <button
                    className={`px-2 py-1 rounded border ${
                      isEditingAnimTarget
                        ? "border-blue-700 bg-blue-700 text-white"
                        : "border-gray-300 bg-white text-gray-700 hover:bg-gray-100"
                    }`}
                    onClick={() =>
                      setAnimTargetEditId((id) =>
                        id === selectedItem.id ? null : selectedItem.id
                      )
                    }
                    title={
                      isEditingAnimTarget
                        ? "Finish choosing Anim Target"
                        : "Drag Anim Target on canvas"
                    }
                  >
                    {isEditingAnimTarget
                      ? "Done Anim Target"
                      : "Edit Anim Target"}
                  </button>
                  {selectedItem.animMoveCxPct != null &&
                    selectedItem.animMoveCyPct != null && (
                      <span className="text-gray-600">
                        Target: ({selectedItem.animMoveCxPct.toFixed(2)},{" "}
                        {selectedItem.animMoveCyPct.toFixed(2)})
                      </span>
                    )}
                </div>
              )}

              {selectedItem.animType === "scale" && (
                <div className="flex items-center justify-center gap-2 text-xs">
                  <button
                    className={`px-2 py-1 rounded border ${
                      isEditingAnimScale
                        ? "border-blue-700 bg-blue-700 text-white"
                        : "border-gray-300 bg-white text-gray-700 hover:bg-gray-100"
                    }`}
                    onClick={() =>
                      setAnimScaleEditId((id) =>
                        id === selectedItem.id ? null : selectedItem.id
                      )
                    }
                    title={
                      isEditingAnimScale
                        ? "Finish sizing Anim Scale"
                        : "Resize the ghost to set final size"
                    }
                  >
                    {isEditingAnimScale ? "Done Anim Scale" : "Edit Anim Scale"}
                  </button>
                  <span className="text-gray-600">
                    Final width:{" "}
                    {Math.round(
                      (selectedItem.animScaleWPct ?? selectedItem.wPct) * 100
                    )}
                    %
                  </span>
                </div>
              )}

              {selectedItem.animType === "rotate" && (
                <div className="flex items-center justify-between gap-2 text-xs">
                  <label className="flex-1 flex items-center justify-between gap-2">
                    <span className="text-gray-600">Rotate (°)</span>
                    <input
                      type="number"
                      className="w-24 border border-gray-300 rounded px-1 py-0.5"
                      value={Math.round(
                        ((selectedItem.animRotateBy ?? Math.PI / 6) * 180) /
                          Math.PI
                      )}
                      onChange={(e) =>
                        setItems((prev) =>
                          prev.map((it) =>
                            it.id === selectedItem.id
                              ? {
                                  ...it,
                                  animRotateBy:
                                    (Number(e.target.value) * Math.PI) / 180,
                                }
                              : it
                          )
                        )
                      }
                    />
                  </label>
                </div>
              )}

              {selectedItem.animType === "opacity" && (
                <div className="flex items-center justify-between gap-2 text-xs">
                  <label className="flex-1 flex items-center justify-between gap-2">
                    <span className="text-gray-600">Opacity To</span>
                    <input
                      type="number"
                      min={0}
                      max={1}
                      step={0.05}
                      className="w-24 border border-gray-300 rounded px-1 py-0.5"
                      value={selectedItem.animOpacityTo ?? 0.0}
                      onChange={(e) =>
                        setItems((prev) =>
                          prev.map((it) =>
                            it.id === selectedItem.id
                              ? {
                                  ...it,
                                  animOpacityTo: Math.max(
                                    0,
                                    Math.min(1, Number(e.target.value))
                                  ),
                                }
                              : it
                          )
                        )
                      }
                    />
                  </label>
                </div>
              )}

              {(selectedItem.animType === "jitter" ||
                selectedItem.animType === "pulse") && (
                <div className="text-[10px] text-gray-600 text-center">
                  Using standard {selectedItem.animType} settings for all
                  objects (only Duration/Delay/Easing apply here).
                </div>
              )}
            </div>
          </div>
        )}

        {/* 9:16 canvas */}
        <div
          ref={canvasRef}
          className="relative border border-gray-300 shadow-sm mx-auto"
          style={{
            width: "100%",
            maxWidth: 360,
            aspectRatio: "9 / 16",
            overflow: "hidden",
            userSelect: "none",
            touchAction: "none",
            background: canvasBg,
          }}
          onPointerDown={onCanvasPointerDown}
        >
          {/* Canvas dims */}
          <div className="absolute top-1 left-1 text-[10px] px-1.5 py-0.5 bg-gray-900 text-white/90 rounded pointer-events-none z-20">
            {canvasSize.w}×{canvasSize.h}
          </div>

          {/* Info button */}
          <button
            type="button"
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => {
              e.stopPropagation();
              setShowInfo(true);
            }}
            className="absolute bottom-1 right-1 p-1 rounded bg-white/90 border border-gray-300 text-gray-700 hover:bg-gray-100 active:bg-gray-200 z-20"
            title="Canvas & Selection Info"
          >
            {I.info}
          </button>

          {/* Items */}
          {visibleItems.map((it) => {
            const pos = getRenderPos(it);
            if (previewMode && pos.completed) return null;

            const isSelected = !previewMode && it.id === selectedId;
            const roleMeta = ROLE_META[it.role];
            const isTarget = it.role === "target";
            const isTappable = it.role === "tappable";
            const isDraggable = it.role === "draggable";

            const handleClick =
              previewMode && isTappable && !sceneAnimRunningRef.current
                ? () => onTappableClick(it.id)
                : undefined;
            const isAnimating = animatingIds.has(it.id);
            const ov = overlayMap[it.id] || {
              dxPx: 0,
              dyPx: 0,
              scale: 1,
              rotDelta: 0,
              alpha: 1,
            };

            return (
              <div
                key={it.id}
                className="absolute z-10"
                style={{
                  left: `${pos.cx * 100}%`,
                  top: `${pos.cy * 100}%`,
                  width: `${it.wPct * 100}%`,
                  transform: `translate(-50%, -50%) translate(${ov.dxPx}px, ${ov.dyPx}px)`,
                  transition: isAnimating
                    ? `left ${SNAP_MS}ms, top ${SNAP_MS}ms`
                    : undefined,
                  cursor: previewMode
                    ? sceneAnimRunningRef.current
                      ? "default"
                      : isDraggable
                      ? "grab"
                      : isTappable
                      ? "pointer"
                      : "default"
                    : isSelected
                    ? "grabbing"
                    : "grab",
                  outline: isSelected
                    ? roleMeta.outline
                    : previewMode && isTarget
                    ? "2px dashed rgba(16,185,129,0.6)"
                    : "none",
                  outlineOffset: 2,
                  opacity: ov.alpha,
                  pointerEvents:
                    previewMode && sceneAnimRunningRef.current
                      ? "none"
                      : "auto",
                }}
                onPointerDown={(e) => onItemPointerDown(e, it.id)}
                onPointerMove={(e) => onItemPointerMove(e, it.id)}
                onPointerUp={endGesture}
                onPointerCancel={endGesture}
                onClick={handleClick}
              >
                {/* Role badge */}
                <div
                  className={`absolute -top-2 -left-2 px-1.5 py-0.5 rounded text-[10px] ${roleMeta.badgeBg} ${roleMeta.badgeText} shadow`}
                >
                  {isTarget && targetIndexMap[it.id]
                    ? `Target #${targetIndexMap[it.id]}`
                    : roleMeta.label}
                </div>

                {/* Animation wrapper → applies scale/rotate delta on top of base */}
                <div
                  className="w-full"
                  style={{
                    transform: `rotate(${it.rot + ov.rotDelta}rad) scale(${
                      ov.scale
                    })`,
                    transformOrigin: "center center",
                    pointerEvents: "none",
                  }}
                >
                  {/* Rotated content host (measure this) */}
                  <div
                    ref={(el) => {
                      hostRefs.current[it.id] = el;
                    }}
                    className="w-full"
                  >
                    {it.kind === "svg" ? (
                      <div dangerouslySetInnerHTML={{ __html: it.svg || "" }} />
                    ) : (
                      <img
                        src={it.src}
                        alt=""
                        draggable={false}
                        className="block w-full h-auto select-none"
                      />
                    )}
                  </div>
                </div>

                {/* Rotate handle (edit only) */}
                {!previewMode && isSelected && (
                  <div
                    data-handle="rotate"
                    className="absolute left-1/2 -translate-x-1/2"
                    style={{ top: -34, width: 24, height: 28, cursor: "grab" }}
                  >
                    <div
                      className="absolute left-1/2 -translate-x-1/2 rounded-full bg-gray-700 border-2 border-white shadow"
                      style={{ top: 0, width: 16, height: 16 }}
                    />
                    <div
                      className="absolute left-1/2 -translate-x-1/2 bg-gray-400 rounded"
                      style={{ top: 14, width: 2, height: 14 }}
                    />
                  </div>
                )}

                {/* Resize handle (edit only) */}
                {!previewMode && isSelected && (
                  <div
                    data-handle="resize"
                    className="absolute bg-white border-2 border-gray-700 rounded shadow"
                    style={{
                      right: -8,
                      bottom: -8,
                      width: 14,
                      height: 14,
                      cursor: "nwse-resize",
                    }}
                  />
                )}
              </div>
            );
          })}

          {/* FINAL POSITION GHOST (edit mode, for draggables) */}
          {isEditingFinal &&
            selectedItem &&
            selectedItem.role === "draggable" && (
              <div
                className="absolute z-20 pointer-events-auto"
                style={{
                  left: `${
                    (selectedItem.finalCxPct ?? selectedItem.cxPct) * 100
                  }%`,
                  top: `${
                    (selectedItem.finalCyPct ?? selectedItem.cyPct) * 100
                  }%`,
                  width: `${selectedItem.wPct * 100}%`,
                  transform: "translate(-50%, -50%)",
                  cursor: "grab",
                  filter: "grayscale(100%)",
                  opacity: 0.6,
                  outline: "2px dashed rgba(29,78,216,0.9)",
                  outlineOffset: 2,
                }}
                onPointerDown={(e) => onFinalGhostPointerDown(e, selectedItem)}
                onPointerMove={(e) => onFinalGhostPointerMove(e, selectedItem)}
                onPointerUp={endFinalGhostGesture}
                onPointerCancel={endFinalGhostGesture}
                title="Drag to set Final Position"
              >
                <div className="absolute -top-2 -left-2 px-1.5 py-0.5 rounded text-[10px] bg-blue-700 text-white shadow flex items-center gap-1">
                  {I.flag}
                  Final
                </div>
                <div
                  className="w-full"
                  style={{
                    transform: `rotate(${selectedItem.rot}rad)`,
                    transformOrigin: "center center",
                    pointerEvents: "none",
                  }}
                >
                  {selectedItem.kind === "svg" ? (
                    <div
                      dangerouslySetInnerHTML={{
                        __html: selectedItem.svg || "",
                      }}
                    />
                  ) : (
                    <img
                      src={selectedItem.src}
                      alt=""
                      draggable={false}
                      className="block w-full h-auto select-none"
                    />
                  )}
                </div>
                <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
                  <div className="w-3 h-3 rounded-full border border-white bg-blue-600 shadow" />
                </div>
              </div>
            )}

          {/* ANIM TARGET GHOST (edit mode, for move) */}
          {isEditingAnimTarget &&
            selectedItem &&
            selectedItem.animType === "move" && (
              <div
                className="absolute z-20 pointer-events-auto"
                style={{
                  left: `${
                    (selectedItem.animMoveCxPct ?? selectedItem.cxPct) * 100
                  }%`,
                  top: `${
                    (selectedItem.animMoveCyPct ?? selectedItem.cyPct) * 100
                  }%`,
                  width: `${selectedItem.wPct * 100}%`,
                  transform: "translate(-50%, -50%)",
                  cursor: "grab",
                  filter: "grayscale(100%)",
                  opacity: 0.6,
                  outline: "2px dashed rgba(29,78,216,0.9)",
                  outlineOffset: 2,
                }}
                onPointerDown={(e) => onAnimTargetPointerDown(e, selectedItem)}
                onPointerMove={(e) => onAnimTargetPointerMove(e, selectedItem)}
                onPointerUp={endAnimTargetGesture}
                onPointerCancel={endAnimTargetGesture}
                title="Drag to set Anim Target (Move)"
              >
                <div className="absolute -top-2 -left-2 px-1.5 py-0.5 rounded text-[10px] bg-blue-700 text-white shadow flex items-center gap-1">
                  {I.flag}
                  Anim Target
                </div>
                <div
                  className="w-full"
                  style={{
                    transform: `rotate(${selectedItem.rot}rad)`,
                    transformOrigin: "center center",
                    pointerEvents: "none",
                  }}
                >
                  {selectedItem.kind === "svg" ? (
                    <div
                      dangerouslySetInnerHTML={{
                        __html: selectedItem.svg || "",
                      }}
                    />
                  ) : (
                    <img
                      src={selectedItem.src}
                      alt=""
                      draggable={false}
                      className="block w-full h-auto select-none"
                    />
                  )}
                </div>
              </div>
            )}

          {/* ANIM SCALE GHOST (edit mode, for scale) */}
          {isEditingAnimScale &&
            selectedItem &&
            selectedItem.animType === "scale" && (
              <div
                className="absolute z-20 pointer-events-auto"
                style={{
                  left: `${selectedItem.cxPct * 100}%`,
                  top: `${selectedItem.cyPct * 100}%`,
                  width: `${
                    (selectedItem.animScaleWPct ?? selectedItem.wPct) * 100
                  }%`,
                  transform: "translate(-50%, -50%)",
                  cursor: "nwse-resize",
                  filter: "grayscale(100%)",
                  opacity: 0.6,
                  outline: "2px dashed rgba(29,78,216,0.9)",
                  outlineOffset: 2,
                }}
                onPointerDown={(e) => onAnimScalePointerDown(e, selectedItem)}
                onPointerMove={(e) => onAnimScalePointerMove(e, selectedItem)}
                onPointerUp={endAnimScaleGesture}
                onPointerCancel={endAnimScaleGesture}
                title="Resize to set Anim Scale"
              >
                <div className="absolute -top-2 -left-2 px-1.5 py-0.5 rounded text-[10px] bg-blue-700 text-white shadow flex items-center gap-1">
                  {I.flag}
                  Anim Scale
                </div>
                <div
                  className="w-full"
                  style={{
                    transform: `rotate(${selectedItem.rot}rad)`,
                    transformOrigin: "center center",
                    pointerEvents: "none",
                  }}
                >
                  {selectedItem.kind === "svg" ? (
                    <div
                      dangerouslySetInnerHTML={{
                        __html: selectedItem.svg || "",
                      }}
                    />
                  ) : (
                    <img
                      src={selectedItem.src}
                      alt=""
                      draggable={false}
                      className="block w-full h-auto select-none"
                    />
                  )}
                </div>
              </div>
            )}

          {/* Empty-state hint */}
          {items.length === 0 && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-xs text-gray-500 text-center px-2 leading-relaxed">
                Paste SVG or Image (PNG/JPG/WebP): tap{" "}
                <span className="px-1 border border-gray-300 rounded">
                  Paste
                </span>{" "}
                (mobile) or use{" "}
                <span className="px-1 border border-gray-300 rounded">Cmd</span>
                /
                <span className="px-1 border border-gray-300 rounded">
                  Ctrl
                </span>
                +<span className="px-1 border border-gray-300 rounded">V</span>.
                Select → drag. Resize corner. Rotate top knob. Duplicate:
                <span className="px-1 border border-gray-300 rounded">
                  Cmd/Ctrl+D
                </span>
                . Undo:
                <span className="px-1 border border-gray-300 rounded">
                  Cmd/Ctrl+Z
                </span>
                . Preview:
                <span className="px-1 border border-gray-300 rounded ml-1">
                  ▶︎
                </span>
                . Layers:
                <span className="px-1 border border-gray-300 rounded ml-1">
                  ⧉
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Info Dialog */}
        {showInfo && (
          <div
            className="fixed inset-0 z-50 flex items-end sm:items-center justify-center"
            onClick={() => setShowInfo(false)}
          >
            <div className="absolute inset-0 bg-black/40" />
            <div
              className="relative z-10 w-full sm:max-w-md bg-white border border-gray-300 rounded-lg shadow-lg m-2 p-3 text-sm text-gray-800"
              onClick={(e) => e.stopPropagation()}
              role="dialog"
              aria-modal="true"
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2 font-semibold">
                  {I.info}
                  <span>Canvas & Selection Info</span>
                </div>
                <button
                  className="p-1 rounded border border-gray-300 text-gray-700 hover:bg-gray-100"
                  onClick={() => setShowInfo(false)}
                  title="Close"
                >
                  {I.close}
                </button>
              </div>

              <div className="space-y-3">
                <div>
                  <div className="text-xs font-semibold text-gray-600 mb-1">
                    Canvas
                  </div>
                  <div className="grid grid-cols-2 gap-y-1">
                    <div>Width</div>
                    <div className="text-right">{canvasSize.w}px</div>
                    <div>Height</div>
                    <div className="text-right">{canvasSize.h}px</div>
                    <div>Aspect</div>
                    <div className="text-right">9:16</div>
                    <div>Max</div>
                    <div className="text-right">360×640</div>
                    <div>Background</div>
                    <div className="text-right">{canvasBg}</div>
                    <div>Mode</div>
                    <div className="text-right">
                      {previewMode ? "Preview" : "Edit"}
                    </div>
                    <div>Layers</div>
                    <div className="text-right">
                      {hideNonZeroZ ? "Only Z=0 visible" : "All visible"}
                    </div>
                  </div>
                </div>

                <div>
                  <div className="text-xs font-semibold text-gray-600 mb-1">
                    Selected
                  </div>
                  {selectedId ? (
                    <div className="grid grid-cols-2 gap-y-1">
                      <div>X (top-left)</div>
                      <div className="text-right">{selInfo.x}px</div>
                      <div>Y (top-left)</div>
                      <div className="text-right">{selInfo.y}px</div>
                      <div>Width</div>
                      <div className="text-right">{selInfo.w}px</div>
                      <div>Height</div>
                      <div className="text-right">{selInfo.h}px</div>
                      <div>Index (z)</div>
                      <div className="text-right">{selectedIndex}</div>
                      <div>Rotation</div>
                      <div className="text-right">{rotDeg}°</div>
                      <div>Role</div>
                      <div className="text-right">
                        {selectedItem
                          ? ROLE_META[selectedItem.role].label
                          : "-"}
                      </div>

                      {/* Animation summary */}
                      <div>Anim</div>
                      <div className="text-right">
                        {selectedItem?.animType ?? "none"}
                      </div>
                      <div>Duration</div>
                      <div className="text-right">
                        {selectedItem?.animDurationMs ?? 700}ms
                      </div>
                      <div>Delay</div>
                      <div className="text-right">
                        {selectedItem?.animDelayMs ?? 0}ms
                      </div>
                      <div>Easing</div>
                      <div className="text-right">
                        {selectedItem?.animEasing ?? "easeInOut"}
                      </div>

                      {selectedItem?.animType === "move" && (
                        <>
                          <div>Anim Target</div>
                          <div className="text-right">
                            {selectedItem.animMoveCxPct != null &&
                            selectedItem.animMoveCyPct != null
                              ? `(${selectedItem.animMoveCxPct.toFixed(
                                  2
                                )}, ${selectedItem.animMoveCyPct.toFixed(2)})`
                              : "—"}
                          </div>
                        </>
                      )}
                      {selectedItem?.animType === "scale" && (
                        <>
                          <div>Anim Width</div>
                          <div className="text-right">
                            {Math.round(
                              (selectedItem.animScaleWPct ??
                                selectedItem.wPct) * 100
                            )}
                            %
                          </div>
                        </>
                      )}
                      {selectedItem?.animType === "rotate" && (
                        <>
                          <div>Rotate By</div>
                          <div className="text-right">
                            {Math.round(
                              ((selectedItem.animRotateBy ?? 0) * 180) / Math.PI
                            )}
                            °
                          </div>
                        </>
                      )}
                      {selectedItem?.animType === "opacity" && (
                        <>
                          <div>Opacity To</div>
                          <div className="text-right">
                            {selectedItem.animOpacityTo ?? 1}
                          </div>
                        </>
                      )}
                    </div>
                  ) : (
                    <div className="text-gray-500">None</div>
                  )}
                </div>
              </div>

              <div className="mt-3 flex justify-end">
                <button
                  className="px-2 py-1 rounded border border-gray-300 text-gray-700 hover:bg-gray-100"
                  onClick={() => setShowInfo(false)}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Preview pop dialog (message only if set) */}
        {previewDialog.open && (
          <div
            className="fixed inset-0 z-50 flex items-end sm:items-center justify-center"
            onClick={() =>
              setPreviewDialog({ open: false, title: "", message: "" })
            }
          >
            <div className="absolute inset-0 bg-black/40" />
            <div
              className="relative z-10 w-full sm:max-w-xs bg-white border border-gray-300 rounded-lg shadow-lg m-2 p-3 text-sm text-gray-800"
              onClick={(e) => e.stopPropagation()}
              role="dialog"
              aria-modal="true"
            >
              <div className="flex items-center gap-2 font-semibold mb-2">
                {I.check}
                <span>{previewDialog.title}</span>
              </div>
              {previewDialog.message && (
                <div className="text-gray-700">{previewDialog.message}</div>
              )}
              <div className="mt-3 flex justify-end">
                <button
                  className="px-2 py-1 rounded border border-gray-300 text-gray-700 hover:bg-gray-100"
                  onClick={() =>
                    setPreviewDialog({ open: false, title: "", message: "" })
                  }
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
