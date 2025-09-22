"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

/** Roles and item model */
type Role = "none" | "draggable" | "target" | "tappable";
type Kind = "svg" | "image";

type Item = {
  id: string;
  kind: Kind;
  // For SVG
  svg?: string; // sanitized & namespaced <svg>…</svg>
  // For Image
  src?: string; // data URL for pasted images (png/jpg/webp)

  cxPct: number; // center X as fraction of canvas width [0..1]
  cyPct: number; // center Y as fraction of canvas height [0..1]
  wPct: number; // width as fraction of canvas width [0..1]
  rot: number; // rotation in radians
  role: Role;

  // role-specific metadata
  correctTargetId?: string; // for role === 'draggable'
  tapMessage?: string; // for role === 'tappable'

  // Optional "final position" for draggables (preview success → move here)
  finalCxPct?: number;
  finalCyPct?: number;
};

type Snapshot = { items: Item[]; selectedId: string | null; canvasBg: string };

/** PREVIEW-ONLY state for positions & completion (does NOT mutate items) */
type PreviewPerItem = {
  cxPct: number;
  cyPct: number;
  completed: boolean; // true => hide in preview
};

function uid() {
  return Math.random().toString(36).slice(2, 10);
}

function canonicalize(s: string) {
  return s.replace(/\s+/g, " ").trim();
}

/** Remove XML/DOCTYPE noise commonly present in clipboard SVGs */
function stripXmlDoctype(s: string) {
  return s.replace(/<\?xml[^>]*\?>/gi, "").replace(/<!DOCTYPE[^>]*>/gi, "");
}

/**
 * Namespace all ids inside an SVG string to avoid collisions between multiple pasted SVGs.
 */
function namespaceSvgIds(svg: string, ns: string) {
  let out = stripXmlDoctype(svg);

  // id="foo" -> id="foo_ns"
  out = out.replace(/\bid="([\w:-]+)"/g, (_m, id) => `id="${id}_${ns}"`);

  // url(#foo) -> url(#foo_ns)
  out = out.replace(/\burl\(#([\w:-]+)\)/g, (_m, id) => `url(#${id}_${ns})`);

  // href="#foo" / xlink:href="#foo" -> "#foo_ns"
  out = out.replace(
    /\b(xlink:href|href)="#([\w:-]+)"/g,
    (_m, attr, id) => `${attr}="#${id}_${ns}"`
  );

  // aria-labelledby="a b c" -> suffixed
  out = out.replace(/\baria-labelledby="([^"]+)"/g, (_m, ids) => {
    const replaced = ids
      .split(/\s+/)
      .map((id: string) => `${id}_${ns}`)
      .join(" ");
    return `aria-labelledby="${replaced}"`;
  });

  return out;
}

/** Extract SVGs when payload MIME is image/svg+xml. (XML parser only) */
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

/** Extract SVGs when payload MIME is text/html. (HTML parser only) */
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

/** Extract SVGs when payload MIME is text/plain. (Regex only) */
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

/** Convert Blob -> data URL (for images) */
function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const fr = new FileReader();
    fr.onload = () => resolve(String(fr.result));
    fr.onerror = reject;
    fr.readAsDataURL(blob);
  });
}

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

/* Role visuals */
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
    outline: "2px dashed rgba(29,78,216,0.9)", // blue
  },
  target: {
    label: "Target",
    badgeBg: "bg-emerald-700",
    badgeText: "text-white",
    outline: "2px dashed rgba(5,150,105,0.9)", // green
  },
  tappable: {
    label: "Tappable",
    badgeBg: "bg-fuchsia-700",
    badgeText: "text-white",
    outline: "2px dashed rgba(162,28,175,0.9)", // fuchsia
  },
};

/** Animation timings (preview snap / return) */
const SNAP_MS = 280;

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
  }>({ open: false, title: "", message: "" });

  // preview mode
  const [previewMode, setPreviewMode] = useState(false);

  // layer visibility toggle (hide items where z != 0)
  const [hideNonZeroZ, setHideNonZeroZ] = useState(false);

  // selected element metrics (relative to canvas, in px)
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

  /* ===== Preview-only positions & completion (fix for your issue) ===== */
  const [previewMap, setPreviewMap] = useState<Record<string, PreviewPerItem>>(
    {}
  );
  const [animatingIds, setAnimatingIds] = useState<Set<string>>(new Set());
  const previewDragStartRef = useRef<{
    id: string;
    cxPct: number;
    cyPct: number;
  } | null>(null);

  // Initialize preview state when entering preview, and clear when leaving
  useEffect(() => {
    if (previewMode) {
      const m: Record<string, PreviewPerItem> = {};
      for (const it of items) {
        m[it.id] = { cxPct: it.cxPct, cyPct: it.cyPct, completed: false };
      }
      setPreviewMap(m);
      setAnimatingIds(new Set());
      previewDragStartRef.current = null;
    } else {
      setPreviewMap({});
      setAnimatingIds(new Set());
      previewDragStartRef.current = null;
    }
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

  /* ===== Measure selected item's box ===== */
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

  /* ===== Helpers: add new items ===== */
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

      // Namespace ids to avoid Chrome duplicate-id blank bug
      const nssvgs = svgs.map((s) => namespaceSvgIds(s, uid()));
      if (nssvgs.length) addSvgItems(nssvgs);
    },
    [addSvgItems]
  );

  /* ===== Paste (keyboard) - also supports image blobs ===== */
  useEffect(() => {
    const onPaste = async (e: ClipboardEvent) => {
      if (!e.clipboardData) return;

      // If focus is in an input/textarea/contenteditable, let the browser handle paste.
      const ae = document.activeElement as HTMLElement | null;
      if (
        ae &&
        (ae.tagName === "INPUT" ||
          ae.tagName === "TEXTAREA" ||
          ae.isContentEditable)
      ) {
        return;
      }

      const itemsArr = Array.from(e.clipboardData.items || []);

      // 1) Image blobs first (png/jpeg/webp)
      const imageMimes = ["image/png", "image/jpeg", "image/webp"];
      const imageSrcs: string[] = [];
      for (const it of itemsArr) {
        if (imageMimes.includes(it.type)) {
          const f = it.getAsFile();
          if (f) {
            const dataUrl = await blobToDataUrl(f);
            imageSrcs.push(dataUrl);
          }
        }
      }
      if (imageSrcs.length) {
        addImageItems(imageSrcs);
        e.preventDefault();
        return;
      }

      // 2) SVG / HTML / Plain
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

  /* ===== Mobile-friendly paste button (supports images) ===== */
  const pasteFromClipboard = useCallback(async () => {
    try {
      const nav = navigator as Navigator & {
        clipboard?: {
          read?: () => Promise<ClipboardItem[]>;
          readText?: () => Promise<string>;
        };
      };

      if (nav.clipboard?.read) {
        const items = await nav.clipboard.read();

        // Prioritize image types
        const imageSrcs: string[] = [];
        for (const ci of items) {
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

        // Then SVG
        for (const ci of items) {
          if (ci.types?.includes("image/svg+xml")) {
            const blob = await ci.getType("image/svg+xml");
            const payload = await blob.text();
            await applyPastedPayload(payload, "image/svg+xml");
            return;
          }
        }
        for (const ci of items) {
          if (ci.types?.includes("text/html")) {
            const blob = await ci.getType("text/html");
            const payload = await blob.text();
            await applyPastedPayload(payload, "text/html");
            return;
          }
        }
        for (const ci of items) {
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

  /* ===== Keyboard: Undo / Delete / Duplicate (safe in inputs) ===== */
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
    if (!canvas) return;

    const target = e.target as HTMLElement;

    // Preview: only drag draggable; tappable handled onClick
    if (previewMode) {
      const item = items.find((it) => it.id === id);
      if (!item || item.role !== "draggable") return;

      // Don't interact if marked completed in preview
      if (previewMap[id]?.completed) return;

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
      rotateStartRef.current = {
        cxPx,
        cyPx,
        startAngle,
        initialRot: item.rot,
      };
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
    if (!canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const pointerX = e.clientX - rect.left;
    const pointerY = e.clientY - rect.top;

    // Preview drag: update previewMap (not items)
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

  // Drop correctness (draggable -> its correctTargetId)
  const checkCorrectDrop = useCallback(
    (dragId: string) => {
      const dragItem = items.find((i) => i.id === dragId);
      if (
        !dragItem ||
        dragItem.role !== "draggable" ||
        !dragItem.correctTargetId
      )
        return false;

      const canvas = canvasRef.current;
      const dragHost = hostRefs.current[dragItem.id];
      const targetHost = hostRefs.current[dragItem.correctTargetId];
      if (!canvas || !dragHost || !targetHost) return false;

      const dragRect = dragHost.getBoundingClientRect();
      const targetRect = targetHost.getBoundingClientRect();

      // Use draggable center
      const cx = dragRect.left + dragRect.width / 2;
      const cy = dragRect.top + dragRect.height / 2;

      const inside =
        cx >= targetRect.left &&
        cx <= targetRect.right &&
        cy >= targetRect.top &&
        cy <= targetRect.bottom;

      return inside;
    },
    [items]
  );

  const endGesture = (e: React.PointerEvent<HTMLDivElement>) => {
    const activeId = dragActiveIdRef.current;

    // reset gestural refs
    isDraggingRef.current = false;
    dragOffsetRef.current = null;
    isResizingRef.current = false;
    resizeStartRef.current = null;
    isRotatingRef.current = false;
    rotateStartRef.current = null;
    dragActiveIdRef.current = null;
    (e.currentTarget as Element).releasePointerCapture?.(e.pointerId);
    gestureSnapSavedRef.current = false;

    // PREVIEW success/failure logic — ONLY affects previewMap (not items)
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
                completed: false, // keep visible in preview
              },
            };
          });
          animateId(activeId);
        } else {
          // No final position → mark completed (hide) in preview
          setPreviewMap((prev) => {
            const cur = prev[activeId] ?? {
              cxPct: item.cxPct,
              cyPct: item.cyPct,
              completed: false,
            };
            return {
              ...prev,
              [activeId]: { ...cur, completed: true },
            };
          });
        }

        setPreviewDialog({
          open: true,
          title: "Correct!",
          message: hasFinal
            ? "Moved to the final position."
            : "Item removed (no final position set).",
        });
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
              [activeId]: {
                ...cur,
                cxPct: start.cxPct,
                cyPct: start.cyPct,
              },
            };
          });
          animateId(activeId);
        }
      }
    }
  };

  /* ===== Final-position editing (drag ghost) ===== */
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

    // If final pos missing, seed it now
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

  // Final pos controls
  const toggleFinalEdit = () => {
    if (!selectedItem || previewMode) return;
    if (selectedItem.role !== "draggable") return;
    // Initialize final to current if undefined
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
    if (!selectedItem || previewMode) return;
    if (selectedItem.role !== "draggable") return;
    setItems((prev) =>
      prev.map((it) =>
        it.id === selectedItem.id
          ? { ...it, finalCxPct: undefined, finalCyPct: undefined }
          : it
      )
    );
  };

  // Tappable action (preview): show message dialog
  const onTappableClick = (id: string) => {
    if (!previewMode) return;
    const p = previewMap[id];
    if (p?.completed) return;
    const item = items.find((i) => i.id === id);
    if (!item || item.role !== "tappable") return;
    setPreviewDialog({
      open: true,
      title: "Message",
      message: item.tapMessage || "No message set.",
    });
  };

  /* ===== Derived values ===== */
  const sel = selectedItem;
  const rotDeg = sel ? Math.round(((sel.rot * 180) / Math.PI) * 10) / 10 : 0;

  // Filter by layer toggle: hide all z != 0 when enabled
  const visibleItems = useMemo(() => {
    if (!hideNonZeroZ) return items;
    return items.filter((_, idx) => idx === 0);
  }, [items, hideNonZeroZ]);

  // If selection becomes hidden by layer toggle, clear selection
  useEffect(() => {
    if (!selectedId) return;
    const idx = items.findIndex((i) => i.id === selectedId);
    if (idx < 0) return;
    if (hideNonZeroZ && idx !== 0) setSelectedId(null);
  }, [hideNonZeroZ, items, selectedId]);

  // Helper to get current render position, accounting for preview map
  const getRenderPos = (it: Item) => {
    if (previewMode) {
      const pm = previewMap[it.id];
      if (pm) return { cx: pm.cxPct, cy: pm.cyPct, completed: pm.completed };
    }
    return { cx: it.cxPct, cy: it.cyPct, completed: false };
  };

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

          {/* Layers toggle (hide/show z != 0) */}
          <button
            className={`ml-1 p-1 rounded border border-gray-300 ${
              hideNonZeroZ
                ? "bg-gray-900 text-white"
                : "bg-white text-gray-700 hover:bg-gray-100 active:bg-gray-200"
            }`}
            onClick={() => setHideNonZeroZ((v) => !v)}
            title={hideNonZeroZ ? "Show all layers" : "Show only Z=0 layer"}
          >
            {I.layers}
          </button>
        </div>

        {/* Role selector + controls (edit mode only) */}
        {!previewMode && selectedItem && (
          <div className="mb-2 space-y-2">
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

            {/* Draggable -> choose correct target + FINAL POSITION controls */}
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

                {/* Final Position — drag on canvas */}
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
                {isEditingFinal && (
                  <div className="text-center text-[10px] text-blue-700">
                    Drag the translucent ghost to place the final position.
                  </div>
                )}
              </div>
            )}

            {/* Tappable -> set message */}
            {selectedItem.role === "tappable" && (
              <div className="flex items-center justify-center gap-2 text-xs">
                <label className="text-gray-600">Message:</label>
                <input
                  className="border border-gray-300 rounded px-2 py-1 bg-white text-gray-800 w-full"
                  placeholder="Type a message to show on tap"
                  value={selectedItem.tapMessage ?? ""}
                  onChange={(e) => onSetTapMessage(e.target.value)}
                />
              </div>
            )}
          </div>
        )}

        {/* 9:16 canvas (max 360x640) */}
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
            const isDraggable = it.role === "draggable";
            const isTappable = it.role === "tappable";

            const handleClick =
              previewMode && isTappable
                ? () => onTappableClick(it.id)
                : undefined;

            const isAnimating = animatingIds.has(it.id);

            return (
              <div
                key={it.id}
                className="absolute z-10"
                style={{
                  left: `${pos.cx * 100}%`,
                  top: `${pos.cy * 100}%`,
                  width: `${it.wPct * 100}%`,
                  transform: "translate(-50%, -50%)",
                  transition: isAnimating
                    ? `left ${SNAP_MS}ms, top ${SNAP_MS}ms`
                    : undefined,
                  cursor: previewMode
                    ? isDraggable
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

                {/* Rotated content host (measure this) */}
                <div
                  ref={(el) => {
                    hostRefs.current[it.id] = el;
                  }}
                  className="w-full"
                  style={{
                    transform: `rotate(${it.rot}rad)`,
                    transformOrigin: "center center",
                    pointerEvents: "none",
                  }}
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

          {/* FINAL POSITION GHOST (edit mode) */}
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
                {/* Badge */}
                <div className="absolute -top-2 -left-2 px-1.5 py-0.5 rounded text-[10px] bg-blue-700 text-white shadow flex items-center gap-1">
                  {I.flag}
                  Final
                </div>

                {/* Rotated content (ghost) */}
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

                {/* Crosshair marker */}
                <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
                  <div className="w-3 h-3 rounded-full border border-white bg-blue-600 shadow" />
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
                      {selectedItem?.role === "target" && (
                        <>
                          <div>Target No.</div>
                          <div className="text-right">
                            {selectedItem.id in targetIndexMap
                              ? targetIndexMap[selectedItem.id]
                              : "—"}
                          </div>
                        </>
                      )}
                      {selectedItem?.role === "draggable" && (
                        <>
                          <div>Correct Target</div>
                          <div className="text-right">
                            {selectedItem.correctTargetId
                              ? `#${
                                  targetIndexMap[
                                    selectedItem.correctTargetId
                                  ] ?? "?"
                                }`
                              : "—"}
                          </div>
                          <div>Final Cx</div>
                          <div className="text-right">
                            {selectedItem.finalCxPct ?? "—"}
                          </div>
                          <div>Final Cy</div>
                          <div className="text-right">
                            {selectedItem.finalCyPct ?? "—"}
                          </div>
                        </>
                      )}
                      {selectedItem?.role === "tappable" && (
                        <>
                          <div>Message</div>
                          <div className="text-right">
                            {selectedItem.tapMessage
                              ? selectedItem.tapMessage
                              : "—"}
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

        {/* Preview pop dialog (success / message) */}
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
