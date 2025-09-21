"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

/** Item model */
type Kind = "svg" | "image";
type MoveDir = "horizontal" | "vertical" | "diag1" | "diag2";
type Item = {
  id: string;
  kind: Kind;

  // For SVG
  svg?: string;
  // For Image
  src?: string;

  cxPct: number; // center X [0..1]
  cyPct: number; // center Y [0..1]
  wPct: number; // width as fraction of canvas width [0..1]
  rot: number; // radians

  moveable: boolean; // XOR with resizeable
  resizeable: boolean; // XOR with moveable
  moveDir: MoveDir; // used only if moveable
};

type Snapshot = { items: Item[]; selectedId: string | null; canvasBg: string };

function uid() {
  return Math.random().toString(36).slice(2, 10);
}

function canonicalize(s: string) {
  return s.replace(/\s+/g, " ").trim();
}

function stripXmlDoctype(s: string) {
  return s.replace(/<\?xml[^>]*\?>/gi, "").replace(/<!DOCTYPE[^>]*>/gi, "");
}

/** Namespace ids inside an SVG string to avoid Chrome duplicate-id blank bug */
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
  layers: (
    <svg className="size-4" viewBox="0 0 24 24" aria-hidden>
      <path
        d="M12 4l9 5-9 5-9-5 9-5zm-7.5 9L12 18l7.5-5L21 15l-9 5-9-5 1.5-2z"
        fill="currentColor"
      />
    </svg>
  ),
  horiz: (
    <svg className="size-3.5" viewBox="0 0 24 24" aria-hidden>
      <path
        d="M3 12h18M15 6l6 6-6 6"
        stroke="currentColor"
        strokeWidth="2"
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  ),
  vert: (
    <svg className="size-3.5" viewBox="0 0 24 24" aria-hidden>
      <path
        d="M12 3v18M6 9l6-6 6 6"
        stroke="currentColor"
        strokeWidth="2"
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  ),
  diag1: (
    <svg className="size-3.5" viewBox="0 0 24 24" aria-hidden>
      <path
        d="M4 4l16 16M10 20h10V10"
        stroke="currentColor"
        strokeWidth="2"
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  ),
  diag2: (
    <svg className="size-3.5" viewBox="0 0 24 24" aria-hidden>
      <path
        d="M20 4L4 20M14 20H4V10"
        stroke="currentColor"
        strokeWidth="2"
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  ),
};

const SELECTED_OUTLINE = "2px dashed rgba(99,102,241,0.9)"; // indigo-500

export default function SlidersPage() {
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

  // info dialog
  const [showInfo, setShowInfo] = useState(false);

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

  // Preview slider value (0..100)
  const [previewRange, setPreviewRange] = useState<number>(50);

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

  /* ===== Gesture state (Edit mode only) ===== */
  const isDraggingRef = useRef(false);
  const dragOffsetRef = useRef<{ dx: number; dy: number } | null>(null);
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
  const dragActiveIdRef = useRef<string | null>(null);
  const gestureSnapSavedRef = useRef(false);

  const selectedIndex = useMemo(
    () => items.findIndex((it) => it.id === selectedId),
    [items, selectedId]
  );
  const selectedItem = useMemo(
    () => (selectedId ? items.find((i) => i.id === selectedId) ?? null : null),
    [items, selectedId]
  );

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

  /* ===== Add items ===== */
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
        moveable: false,
        resizeable: true, // sensible default
        moveDir: "horizontal",
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
        moveable: false,
        resizeable: true,
        moveDir: "horizontal",
      }));
      setItems((prev) => [...prev, ...newItems]);
      setSelectedId(newItems[newItems.length - 1].id);
    },
    [pushSnapshot, canvasSize.w, canvasSize.h]
  );

  /* ===== Paste pipeline ===== */
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

  useEffect(() => {
    const onPaste = async (e: ClipboardEvent) => {
      if (!e.clipboardData) return;
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

      // Image blobs
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

      // Text flavors
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

  /* ===== Keyboard: Undo / Delete / Duplicate ===== */
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

  /* ===== Canvas / Items pointer handlers (Edit mode only) ===== */
  const onCanvasPointerDown = () => {
    if (previewMode) return;
    setSelectedId(null);
  };

  const onItemPointerDown = (
    e: React.PointerEvent<HTMLDivElement>,
    id: string
  ) => {
    e.stopPropagation();
    if (previewMode) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const target = e.target as HTMLElement;
    const item = items.find((it) => it.id === id);
    if (!item) return;

    const isRotateHit = !!target.closest('[data-handle="rotate"]');
    const isResizeHit = !!target.closest('[data-handle="resize"]');

    // RESIZE (always allowed in Edit)
    if (isResizeHit) {
      if (selectedId !== id) {
        setSelectedId(id);
        return;
      }
      const rect = canvas.getBoundingClientRect();
      const pointerX = e.clientX - rect.left;

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

    // ROTATE (always allowed in Edit)
    if (isRotateHit) {
      if (selectedId !== id) {
        setSelectedId(id);
        return;
      }
      const rect = canvas.getBoundingClientRect();

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

    // SELECT or DRAG (Edit)
    if (selectedId !== id) {
      setSelectedId(id);
      return;
    }

    const rect = canvas.getBoundingClientRect();
    const pointerX = e.clientX - rect.left;
    const pointerY = e.clientY - rect.top;

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
    if (!canvasRef.current || previewMode) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const pointerX = e.clientX - rect.left;
    const pointerY = e.clientY - rect.top;

    const item = items.find((it) => it.id === id);
    if (!item) return;

    // RESIZE
    if (isResizingRef.current && resizeStartRef.current) {
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

    // ROTATE
    if (isRotatingRef.current && rotateStartRef.current) {
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

    // DRAG
    if (isDraggingRef.current && dragOffsetRef.current) {
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

  const endGesture = (e: React.PointerEvent<HTMLDivElement>) => {
    isDraggingRef.current = false;
    dragOffsetRef.current = null;
    isResizingRef.current = false;
    resizeStartRef.current = null;
    isRotatingRef.current = false;
    rotateStartRef.current = null;
    dragActiveIdRef.current = null;
    (e.currentTarget as Element).releasePointerCapture?.(e.pointerId);
    gestureSnapSavedRef.current = false;
  };

  /* ===== Tag helpers (mutually exclusive) ===== */
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

  const setMoveable = (v: boolean) => {
    if (!selectedId) return;
    pushSnapshot();
    setItems((prev) =>
      prev.map((it) =>
        it.id === selectedId
          ? { ...it, moveable: v, resizeable: v ? false : it.resizeable }
          : it
      )
    );
  };
  const setResizeable = (v: boolean) => {
    if (!selectedId) return;
    pushSnapshot();
    setItems((prev) =>
      prev.map((it) =>
        it.id === selectedId
          ? { ...it, resizeable: v, moveable: v ? false : it.moveable }
          : it
      )
    );
  };
  const setMoveDir = (dir: MoveDir) => {
    if (!selectedId) return;
    setItems((prev) =>
      prev.map((it) => (it.id === selectedId ? { ...it, moveDir: dir } : it))
    );
  };

  /* ===== Derived values ===== */
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

  const totalMoveable = items.filter((i) => i.moveable).length;
  const totalResizeable = items.filter((i) => i.resizeable).length;

  /* ===== Preview application (non-destructive; affects ALL tagged items) ===== */
  const t = previewRange / 100; // 0..1
  function getPreviewFrame(it: Item) {
    // base values
    let cx = it.cxPct;
    let cy = it.cyPct;
    let w = it.wPct;

    if (previewMode) {
      if (it.resizeable) {
        // scale around center (0.2x .. 2.0x)
        const scale = 0.2 + 1.8 * t; // 0.2→2.0
        w = Math.max(0.02, Math.min(2.0, it.wPct * scale));
      } else if (it.moveable) {
        // move along direction; stay inside canvas using per-item margin
        const margin = Math.min(0.5, Math.max(0.02, it.wPct * 0.5));
        const min = margin;
        const max = 1 - margin;

        switch (it.moveDir) {
          case "horizontal":
            cx = min + (max - min) * t;
            break;
          case "vertical":
            cy = min + (max - min) * t;
            break;
          case "diag1": // left-top -> bottom-right
            cx = min + (max - min) * t;
            cy = min + (max - min) * t;
            break;
          case "diag2": // right-top -> left-bottom
            cx = max - (max - min) * t;
            cy = min + (max - min) * t;
            break;
        }
      }
    }
    return { cx, cy, w };
  }

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
            onClick={() =>
              setPreviewMode((p) => (p ? (setPreviewRange(50), false) : true))
            }
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

        {/* Item tagging (Edit mode only) */}
        {!previewMode && selectedItem && (
          <div className="mb-2 flex items-center justify-center gap-3 text-xs">
            <label className="inline-flex items-center gap-1">
              <input
                type="checkbox"
                className="accent-gray-800"
                checked={!!selectedItem.moveable}
                onChange={(e) => setMoveable(e.target.checked)}
              />
              <span className="inline-flex items-center gap-1.5 px-1.5 py-0.5 rounded border border-gray-300 bg-white text-gray-800">
                Moveable
              </span>
            </label>
            <label className="inline-flex items-center gap-1">
              <input
                type="checkbox"
                className="accent-gray-800"
                checked={!!selectedItem.resizeable}
                onChange={(e) => setResizeable(e.target.checked)}
              />
              <span className="inline-flex items-center gap-1.5 px-1.5 py-0.5 rounded border border-gray-300 bg-white text-gray-800">
                Resizeable
              </span>
            </label>

            {/* Direction (only if moveable) */}
            {selectedItem.moveable && (
              <div className="inline-flex items-center gap-1">
                <span className="text-gray-600 mr-1">Direction:</span>
                <button
                  className={`px-1.5 py-0.5 rounded border text-xs ${
                    selectedItem.moveDir === "horizontal"
                      ? "border-gray-900 bg-gray-900 text-white"
                      : "border-gray-300 bg-white text-gray-700"
                  }`}
                  onClick={() => setMoveDir("horizontal")}
                  title="Horizontal"
                >
                  {I.horiz}
                </button>
                <button
                  className={`px-1.5 py-0.5 rounded border text-xs ${
                    selectedItem.moveDir === "vertical"
                      ? "border-gray-900 bg-gray-900 text-white"
                      : "border-gray-300 bg-white text-gray-700"
                  }`}
                  onClick={() => setMoveDir("vertical")}
                  title="Vertical"
                >
                  {I.vert}
                </button>
                <button
                  className={`px-1.5 py-0.5 rounded border text-xs ${
                    selectedItem.moveDir === "diag1"
                      ? "border-gray-900 bg-gray-900 text-white"
                      : "border-gray-300 bg-white text-gray-700"
                  }`}
                  onClick={() => setMoveDir("diag1")}
                  title="Diagonal ↘︎"
                >
                  {I.diag1}
                </button>
                <button
                  className={`px-1.5 py-0.5 rounded border text-xs ${
                    selectedItem.moveDir === "diag2"
                      ? "border-gray-900 bg-gray-900 text-white"
                      : "border-gray-300 bg-white text-gray-700"
                  }`}
                  onClick={() => setMoveDir("diag2")}
                  title="Diagonal ↙︎"
                >
                  {I.diag2}
                </button>
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

          {visibleItems.map((it) => {
            const isSelected = !previewMode && it.id === selectedId;

            // Apply preview transforms non-destructively (affects ALL tagged items)
            const frame = getPreviewFrame(it);

            return (
              <div
                key={it.id}
                className="absolute z-10"
                style={{
                  left: `${frame.cx * 100}%`,
                  top: `${frame.cy * 100}%`,
                  width: `${frame.w * 100}%`,
                  transform: "translate(-50%, -50%)",
                  cursor: previewMode
                    ? "default"
                    : isSelected
                    ? "grabbing"
                    : "grab",
                  outline: isSelected ? SELECTED_OUTLINE : "none",
                  outlineOffset: 2,
                }}
                onPointerDown={(e) => onItemPointerDown(e, it.id)}
                onPointerMove={(e) => onItemPointerMove(e, it.id)}
                onPointerUp={endGesture}
                onPointerCancel={endGesture}
              >
                {/* Tag markers */}
                <div className="absolute -top-2 -left-2 flex gap-1">
                  <span
                    className={`px-1.5 py-0.5 rounded text-[10px] shadow ${
                      it.moveable
                        ? "bg-gray-900 text-white"
                        : "bg-gray-300 text-gray-700"
                    }`}
                    title={
                      it.moveable
                        ? "Moveable (Preview slider moves it)"
                        : "Not moveable"
                    }
                  >
                    M
                  </span>
                  <span
                    className={`px-1.5 py-0.5 rounded text-[10px] shadow ${
                      it.resizeable
                        ? "bg-gray-900 text-white"
                        : "bg-gray-300 text-gray-700"
                    }`}
                    title={
                      it.resizeable
                        ? "Resizeable (Preview slider scales it)"
                        : "Not resizeable"
                    }
                  >
                    R
                  </span>
                </div>

                {/* Rotated content host */}
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

                {/* Rotate handle (Edit only) */}
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

                {/* Resize handle (Edit only) */}
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
                Edit mode: drag / corner-resize / rotate. Tag items as <b>M</b>{" "}
                or <b>R</b>. In Preview, the slider moves all <b>M</b> items and
                resizes all <b>R</b> items at once.
              </div>
            </div>
          )}
        </div>

        {/* Preview slider (enabled whenever Preview is on and there’s at least one item) */}
        <div className="mt-2 flex items-center gap-2">
          <input
            type="range"
            min={0}
            max={100}
            step={1}
            value={previewRange}
            onChange={(e) => setPreviewRange(Number(e.target.value))}
            className="w-full accent-gray-800"
            disabled={!previewMode || items.length === 0}
            title="In Preview, this moves all Moveable items and resizes all Resizeable items"
          />
          <span className="w-20 text-right text-[11px] text-gray-600">
            {previewRange}
            <span className="ml-2 inline-block px-1 py-0.5 rounded bg-gray-200 text-gray-700">
              M:{totalMoveable} · R:{totalResizeable}
            </span>
          </span>
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
                    <div>Tagged (M / R)</div>
                    <div className="text-right">
                      {totalMoveable} / {totalResizeable}
                    </div>
                    <div>Slider</div>
                    <div className="text-right">{previewRange}</div>
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
                      <div>Moveable</div>
                      <div className="text-right">
                        {selectedItem?.moveable ? "Yes" : "No"}
                      </div>
                      <div>Resizeable</div>
                      <div className="text-right">
                        {selectedItem?.resizeable ? "Yes" : "No"}
                      </div>
                      {selectedItem?.moveable && (
                        <>
                          <div>Direction</div>
                          <div className="text-right">
                            {selectedItem.moveDir === "horizontal"
                              ? "Horizontal"
                              : selectedItem.moveDir === "vertical"
                              ? "Vertical"
                              : selectedItem.moveDir === "diag1"
                              ? "Diagonal ↘︎"
                              : "Diagonal ↙︎"}
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
      </div>
    </div>
  );
}
