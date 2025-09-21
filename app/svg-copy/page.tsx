"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

type Item = {
  id: string;
  svg: string; // sanitized <svg>…</svg>
  cx: number; // center X in canvas px (canvas-relative)
  cy: number; // center Y in canvas px (canvas-relative)
  wPct: number; // width as % of canvas width (0..1)
  rot: number; // rotation in radians
};

type Snapshot = { items: Item[]; selectedId: string | null };

function uid() {
  return Math.random().toString(36).slice(2, 10);
}

function canonicalize(s: string) {
  return s.replace(/\s+/g, " ").trim();
}

/** Extract SVGs when payload MIME is image/svg+xml. (XML parser only) */
function extractFromSvgXml(xml: string): string[] {
  if (!xml) return [];
  const cleaned = xml
    .replace(/<\?xml[^>]*\?>/gi, "")
    .replace(/<!DOCTYPE[^>]*>/gi, "");
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
  return out;
}

/** Extract SVGs when payload MIME is text/html. (HTML parser only) */
function extractFromHtml(html: string): string[] {
  if (!html) return [];
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
  if (!text) return [];
  const cleaned = text
    .replace(/<\?xml[^>]*\?>/gi, "")
    .replace(/<!DOCTYPE[^>]*>/gi, "");
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
  return out;
}

/* --- Tiny monochrome icons (no deps) --- */
const I = {
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
        d="M3 3h12v12H3V3zm2 2v8h8V5H5zm14 2v12H7v2h12a2 2 0 002-2V7h-2z"
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
};

export default function SvgCopyPage() {
  const canvasRef = useRef<HTMLDivElement>(null);

  const [items, setItems] = useState<Item[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // map item.id -> svgHost div (for measuring)
  const hostRefs = useRef<Record<string, HTMLDivElement | null>>({});

  // canvas size for info panel
  const [canvasSize, setCanvasSize] = useState<{ w: number; h: number }>({
    w: 0,
    h: 0,
  });

  // selected element metrics (relative to canvas)
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

  /* ===== Undo stack ===== */
  const undoStackRef = useRef<Snapshot[]>([]);
  const pushSnapshot = useCallback(
    (snap?: Snapshot) => {
      const s: Snapshot = snap ?? { items: structuredClone(items), selectedId };
      undoStackRef.current.push(s);
      if (undoStackRef.current.length > 100) undoStackRef.current.shift();
    },
    [items, selectedId]
  );
  const undo = useCallback(() => {
    const prev = undoStackRef.current.pop();
    if (!prev) return;
    setItems(prev.items);
    setSelectedId(prev.selectedId);
  }, []);

  /* ===== Gesture state ===== */
  const isDraggingRef = useRef(false);
  const dragOffsetRef = useRef<{ dx: number; dy: number } | null>(null);

  const isResizingRef = useRef(false);
  const resizeStartRef = useRef<{
    cx: number;
    wPct: number;
    pointerX: number;
  } | null>(null);

  const isRotatingRef = useRef(false);
  const rotateStartRef = useRef<{
    cx: number;
    cy: number;
    startAngle: number;
    initialRot: number;
  } | null>(null);

  const gestureSnapSavedRef = useRef(false);

  const selectedIndex = useMemo(
    () => items.findIndex((it) => it.id === selectedId),
    [items, selectedId]
  );

  /* ===== Canvas size via ResizeObserver ===== */
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

  /* ===== Measure selected item's box RELATIVE TO CANVAS ===== */
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
      const x = Math.round(r.left - c.left); // relative to canvas
      const y = Math.round(r.top - c.top); // relative to canvas
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

  /* ====== Clipboard Paste (single-flavor parse to avoid duplicates) ====== */
  useEffect(() => {
    const onPaste = async (e: ClipboardEvent) => {
      if (!e.clipboardData) return;

      const readItemsByType = async (mime: string): Promise<string | null> => {
        const itemsArr = Array.from(e.clipboardData!.items || []);
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

      let svgs: string[] = [];
      if (flavor === "image/svg+xml") svgs = extractFromSvgXml(payload);
      else if (flavor === "text/html") svgs = extractFromHtml(payload);
      else svgs = extractFromPlain(payload);

      if (svgs.length === 0) return;

      e.preventDefault();

      const canvas = canvasRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const cx = rect.width / 2;
      const cy = rect.height / 2;

      pushSnapshot();

      const newItems: Item[] = svgs.map((svg, idx) => ({
        id: uid(),
        svg,
        cx: cx + idx * 16,
        cy: cy + idx * 16,
        wPct: 0.5,
        rot: 0,
      }));

      setItems((prev) => [...prev, ...newItems]);
      setSelectedId(newItems[newItems.length - 1].id);
    };

    window.addEventListener("paste", onPaste);
    return () => window.removeEventListener("paste", onPaste);
  }, [pushSnapshot]);

  /* ====== Keyboard: Undo / Delete / Duplicate ====== */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "z") {
        e.preventDefault();
        undo();
        return;
      }
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "d") {
        if (!selectedId) return;
        e.preventDefault();
        const src = items.find((it) => it.id === selectedId);
        if (!src) return;
        pushSnapshot();
        const dupe: Item = {
          ...src,
          id: uid(),
          cx: src.cx + 18,
          cy: src.cy + 18,
        };
        setItems((prev) => [...prev, dupe]);
        setSelectedId(dupe.id);
        return;
      }
      if ((e.key === "Delete" || e.key === "Backspace") && selectedId) {
        e.preventDefault();
        pushSnapshot();
        setItems((prev) => prev.filter((it) => it.id !== selectedId));
        setSelectedId(null);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selectedId, items, undo, pushSnapshot]);

  /* ====== Z-order actions ====== */
  const bringForward = useCallback(() => {
    if (selectedIndex < 0 || selectedIndex === items.length - 1) return;
    pushSnapshot();
    setItems((prev) => {
      const arr = prev.slice();
      const [it] = arr.splice(selectedIndex, 1);
      arr.splice(selectedIndex + 1, 0, it);
      return arr;
    });
  }, [selectedIndex, items.length, pushSnapshot]);

  const sendBackward = useCallback(() => {
    if (selectedIndex <= 0) return;
    pushSnapshot();
    setItems((prev) => {
      const arr = prev.slice();
      const [it] = arr.splice(selectedIndex, 1);
      arr.splice(selectedIndex - 1, 0, it);
      return arr;
    });
  }, [selectedIndex, pushSnapshot]);

  const bringToFront = useCallback(() => {
    if (selectedIndex < 0 || selectedIndex === items.length - 1) return;
    pushSnapshot();
    setItems((prev) => {
      const arr = prev.slice();
      const [it] = arr.splice(selectedIndex, 1);
      arr.push(it);
      return arr;
    });
  }, [selectedIndex, items.length, pushSnapshot]);

  const sendToBack = useCallback(() => {
    if (selectedIndex <= 0) return;
    pushSnapshot();
    setItems((prev) => {
      const arr = prev.slice();
      const [it] = arr.splice(selectedIndex, 1);
      arr.unshift(it);
      return arr;
    });
  }, [selectedIndex, pushSnapshot]);

  /* ====== Canvas / Items pointer handlers ====== */
  const onCanvasPointerDown = () => setSelectedId(null);

  const onItemPointerDown = (
    e: React.PointerEvent<HTMLDivElement>,
    id: string
  ) => {
    e.stopPropagation();
    const canvas = canvasRef.current;
    if (!canvas) return;

    const target = e.target as HTMLElement;

    // Detect handles via closest() so any child within hitbox works
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
      resizeStartRef.current = { cx: item.cx, wPct: item.wPct, pointerX };
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
      const dx = pointerX - item.cx;
      const dy = pointerY - item.cy;
      const startAngle = Math.atan2(dy, dx);

      if (!gestureSnapSavedRef.current) {
        pushSnapshot();
        gestureSnapSavedRef.current = true;
      }

      isRotatingRef.current = true;
      (e.currentTarget as Element).setPointerCapture?.(e.pointerId);
      rotateStartRef.current = {
        cx: item.cx,
        cy: item.cy,
        startAngle,
        initialRot: item.rot,
      };
      return;
    }

    // SELECT or DRAG
    if (selectedId !== id) {
      setSelectedId(id);
      return;
    }

    // Begin DRAG
    const rect = canvas.getBoundingClientRect();
    const pointerX = e.clientX - rect.left;
    const pointerY = e.clientY - rect.top;

    const item = items.find((it) => it.id === id);
    if (!item) return;

    if (!gestureSnapSavedRef.current) {
      pushSnapshot();
      gestureSnapSavedRef.current = true;
    }

    isDraggingRef.current = true;
    (e.currentTarget as Element).setPointerCapture?.(e.pointerId);
    dragOffsetRef.current = { dx: pointerX - item.cx, dy: pointerY - item.cy };
  };

  const onItemPointerMove = (
    e: React.PointerEvent<HTMLDivElement>,
    id: string
  ) => {
    if (!canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const pointerX = e.clientX - rect.left;
    const pointerY = e.clientY - rect.top;

    // RESIZE
    if (isResizingRef.current && resizeStartRef.current) {
      const start = resizeStartRef.current;
      let targetWidthPx = Math.abs(pointerX - start.cx) * 2;
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
      const dx = pointerX - st.cx;
      const dy = pointerY - st.cy;
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
      const newCx = pointerX - off.dx;
      const newCy = pointerY - off.dy;
      setItems((prev) =>
        prev.map((it) => (it.id === id ? { ...it, cx: newCx, cy: newCy } : it))
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
    (e.currentTarget as Element).releasePointerCapture?.(e.pointerId);
    gestureSnapSavedRef.current = false;
  };

  /* ===== Toolbar helpers ===== */
  const onDelete = () => {
    if (!selectedId) return;
    pushSnapshot();
    setItems((prev) => prev.filter((it) => it.id !== selectedId));
    setSelectedId(null);
  };

  const onDuplicate = () => {
    if (!selectedId) return;
    const src = items.find((it) => it.id === selectedId);
    if (!src) return;
    pushSnapshot();
    const dupe: Item = {
      ...src,
      id: uid(),
      cx: src.cx + 18,
      cy: src.cy + 18,
    };
    setItems((prev) => [...prev, dupe]);
    setSelectedId(dupe.id);
  };

  /* ===== Info panel derived values ===== */
  const sel = selectedId ? items.find((i) => i.id === selectedId) : null;
  const rotDeg = sel ? Math.round(((sel.rot * 180) / Math.PI) * 10) / 10 : 0;

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 text-gray-800 font-mono">
      <div className="w-full max-w-xl px-3">
        {/* Toolbar: icons only, wraps on narrow widths */}
        <div className="mb-2 flex flex-wrap items-center justify-center gap-1">
          <button
            className="p-1 rounded border border-gray-300 bg-white text-gray-700 hover:bg-gray-100 active:bg-gray-200"
            onClick={undo}
            disabled={undoStackRef.current.length === 0}
            title="Undo (Cmd/Ctrl+Z)"
          >
            {I.undo}
          </button>
          <button
            className="p-1 rounded border border-gray-300 bg-white text-gray-700 hover:bg-gray-100 active:bg-gray-200 disabled:opacity-50"
            onClick={onDuplicate}
            disabled={!selectedId}
            title="Duplicate (Cmd/Ctrl+D)"
          >
            {I.duplicate}
          </button>
          <button
            className="p-1 rounded border border-gray-300 bg-white text-gray-700 hover:bg-gray-100 active:bg-gray-200 disabled:opacity-50"
            onClick={bringForward}
            disabled={selectedIndex < 0 || selectedIndex === items.length - 1}
            title="Bring Forward"
          >
            {I.forward}
          </button>
          <button
            className="p-1 rounded border border-gray-300 bg-white text-gray-700 hover:bg-gray-100 active:bg-gray-200 disabled:opacity-50"
            onClick={sendBackward}
            disabled={selectedIndex <= 0}
            title="Send Backward"
          >
            {I.backward}
          </button>
          <button
            className="p-1 rounded border border-gray-300 bg-white text-gray-700 hover:bg-gray-100 active:bg-gray-200 disabled:opacity-50"
            onClick={bringToFront}
            disabled={selectedIndex < 0 || selectedIndex === items.length - 1}
            title="Bring to Front"
          >
            {I.front}
          </button>
          <button
            className="p-1 rounded border border-gray-300 bg-white text-gray-700 hover:bg-gray-100 active:bg-gray-200 disabled:opacity-50"
            onClick={sendToBack}
            disabled={selectedIndex <= 0}
            title="Send to Back"
          >
            {I.back}
          </button>
          <button
            className="p-1 rounded border border-gray-300 bg-white text-gray-700 hover:bg-gray-100 active:bg-gray-200 disabled:opacity-50"
            onClick={onDelete}
            disabled={!selectedId}
            title="Delete (Del/Backspace)"
          >
            {I.trash}
          </button>
        </div>

        {/* 9:16 canvas (monochrome, clipped overflow) */}
        <div
          ref={canvasRef}
          className="relative bg-white border border-gray-300 shadow-sm"
          style={{
            width: 360, // adjust if you want
            height: 640,
            overflow: "hidden",
            userSelect: "none",
            touchAction: "none",
          }}
          onPointerDown={onCanvasPointerDown}
        >
          {items.map((it) => {
            const isSelected = it.id === selectedId;
            return (
              <div
                key={it.id}
                className="absolute"
                style={{
                  left: it.cx,
                  top: it.cy,
                  width: `${it.wPct * 100}%`,
                  transform: "translate(-50%, -50%)",
                  cursor: isSelected ? "grabbing" : "grab",
                  outline: isSelected ? "2px solid rgba(31,41,55,0.9)" : "none", // gray-800
                  outlineOffset: 2,
                }}
                onPointerDown={(e) => onItemPointerDown(e, it.id)}
                onPointerMove={(e) => onItemPointerMove(e, it.id)}
                onPointerUp={endGesture}
                onPointerCancel={endGesture}
              >
                {/* Rotated content host (measure this) */}
                <div
                  ref={(el) => {
                    hostRefs.current[it.id] = el;
                  }}
                  className="w-full"
                  style={{
                    transform: `rotate(${it.rot}rad)`,
                    transformOrigin: "center center",
                  }}
                  dangerouslySetInnerHTML={{ __html: it.svg }}
                />

                {/* Rotate handle hitbox (stem + knob) */}
                {isSelected && (
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

                {/* Resize handle */}
                {isSelected && (
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

          {/* Empty-state hint (monochrome, compact) */}
          {items.length === 0 && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-xs text-gray-500 text-center px-2 leading-relaxed">
                Paste SVG with{" "}
                <kbd className="px-1 border border-gray-300 rounded">Cmd</kbd>/
                <kbd className="px-1 border border-gray-300 rounded">Ctrl</kbd>+
                <kbd className="px-1 border border-gray-300 rounded">V</kbd>.
                Select → drag. Resize corner. Rotate top knob. Duplicate:{" "}
                <span className="px-1 border border-gray-300 rounded">
                  Cmd/Ctrl+D
                </span>
                . Undo:{" "}
                <span className="px-1 border border-gray-300 rounded">
                  Cmd/Ctrl+Z
                </span>
                .
              </div>
            </div>
          )}
        </div>

        {/* Info panel below canvas (monochrome, compact) */}
        <div className="mt-2 grid grid-cols-2 gap-2 text-xs text-gray-700">
          <div className="border border-gray-200 bg-white rounded p-2">
            <div className="font-semibold mb-1">Canvas</div>
            <div className="space-y-0.5">
              <div>W: {canvasSize.w}px</div>
              <div>H: {canvasSize.h}px</div>
              <div>Aspect: 9:16</div>
            </div>
          </div>

          <div className="border border-gray-200 bg-white rounded p-2">
            <div className="font-semibold mb-1">Selected</div>
            {selectedId && (
              <div className="grid grid-cols-2 gap-x-3 gap-y-1">
                <div>X: {selInfo.x}px</div>
                <div>Y: {selInfo.y}px</div>
                <div>W: {selInfo.w}px</div>
                <div>H: {selInfo.h}px</div>
                <div>Index: {selectedIndex}</div>
                <div>Rot: {rotDeg}°</div>
              </div>
            )}
            {!selectedId && <div className="text-gray-400">None</div>}
          </div>
        </div>
      </div>
    </div>
  );
}
