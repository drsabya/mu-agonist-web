// app/components/cms/lesson-items/types/BaseEditor.tsx
import React from "react";

type LessonItemMeta = {
  id: string;
  title: string | null;
  type: string; // enum in DB; shown read-only here
  created_at?: string | null;
  updated_at?: string | null;
  tagline?: string | null;
  description?: string | null;
  tags?: string[] | null;
  subjects?: string[] | null;
  status?: "draft" | "published" | string | null;
  access_tier?: "free" | "paid" | string | null;
  explanation?: string | null;
  thumbnail_src?: string | null;
  thumbnail_bg_color?: string | null;
  thumbnail_text_color?: string | null;
};

export default function BaseEditor({
  item,
  onSaveAction,
}: {
  item: LessonItemMeta;
  onSaveAction: (formData: FormData) => Promise<void>; // server action from /cms/[id]/page.tsx
}) {
  return (
    <form action={onSaveAction} className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
      <input type="hidden" name="id" defaultValue={item.id} />

      {/* Header */}
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">Metadata</h2>
          <p className="mt-1 text-xs text-gray-500">
            Type: <span className="font-mono">{item.type}</span>
            {item.created_at ? (
              <>
                {" · "}Created: {new Date(item.created_at).toLocaleString()}
              </>
            ) : null}
            {item.updated_at ? (
              <>
                {" · "}Updated: {new Date(item.updated_at).toLocaleString()}
              </>
            ) : null}
          </p>
        </div>
        <button
          type="submit"
          className="inline-flex items-center rounded-lg bg-black px-4 py-2 text-sm font-medium text-white hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-black/50"
        >
          Save metadata
        </button>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {/* Title */}
        <label className="block">
          <span className="text-xs text-gray-600">Title</span>
          <input
            name="title"
            defaultValue={item.title ?? ""}
            className="mt-1 w-full rounded border border-gray-300 px-3 py-2 text-sm"
            placeholder="Untitled"
          />
        </label>

        {/* Tagline */}
        <label className="block">
          <span className="text-xs text-gray-600">Tagline</span>
          <input
            name="tagline"
            defaultValue={item.tagline ?? ""}
            className="mt-1 w-full rounded border border-gray-300 px-3 py-2 text-sm"
            placeholder="Short one‑liner"
          />
        </label>

        {/* Description (full width) */}
        <label className="block sm:col-span-2">
          <span className="text-xs text-gray-600">Description</span>
          <textarea
            name="description"
            defaultValue={item.description ?? ""}
            rows={3}
            className="mt-1 w-full rounded border border-gray-300 px-3 py-2 text-sm"
            placeholder="What will the learner do/learn?"
          />
        </label>

        {/* Explanation */}
        <label className="block sm:col-span-2">
          <span className="text-xs text-gray-600">Explanation</span>
          <textarea
            name="explanation"
            defaultValue={item.explanation ?? ""}
            rows={3}
            className="mt-1 w-full rounded border border-gray-300 px-3 py-2 text-sm"
            placeholder="Answer/explanation shown in app"
          />
        </label>

        {/* Tags (CSV) */}
        <label className="block">
          <span className="text-xs text-gray-600">Tags (comma‑separated)</span>
          <input
            name="tags"
            defaultValue={(item.tags ?? []).join(", ")}
            className="mt-1 w-full rounded border border-gray-300 px-3 py-2 text-sm"
            placeholder="neuro, micro, pharm"
          />
        </label>

        {/* Subjects (CSV) */}
        <label className="block">
          <span className="text-xs text-gray-600">Subjects (comma‑separated)</span>
          <input
            name="subjects"
            defaultValue={(item.subjects ?? []).join(", ")}
            className="mt-1 w-full rounded border border-gray-300 px-3 py-2 text-sm"
            placeholder="pharmacology, microbiology"
          />
        </label>

        {/* Status */}
        <label className="block">
          <span className="text-xs text-gray-600">Status</span>
          <select
            name="status"
            defaultValue={(item.status as string) ?? "draft"}
            className="mt-1 w-full rounded border border-gray-300 px-3 py-2 text-sm"
          >
            <option value="draft">draft</option>
            <option value="published">published</option>
          </select>
        </label>

        {/* Access tier */}
        <label className="block">
          <span className="text-xs text-gray-600">Access Tier</span>
          <select
            name="access_tier"
            defaultValue={(item.access_tier as string) ?? "free"}
            className="mt-1 w-full rounded border border-gray-300 px-3 py-2 text-sm"
          >
            <option value="free">free</option>
            <option value="paid">paid</option>
          </select>
        </label>

        {/* Thumbnail src */}
        <label className="block sm:col-span-2">
          <span className="text-xs text-gray-600">Thumbnail Src (URL)</span>
          <input
            name="thumbnail_src"
            defaultValue={item.thumbnail_src ?? ""}
            className="mt-1 w-full rounded border border-gray-300 px-3 py-2 text-sm"
            placeholder="https://…"
          />
        </label>

        {/* Colors */}
        <label className="block">
          <span className="text-xs text-gray-600">Thumbnail BG Color</span>
          <input
            name="thumbnail_bg_color"
            defaultValue={item.thumbnail_bg_color ?? "#ffffff"}
            className="mt-1 w-full rounded border border-gray-300 px-3 py-2 text-sm"
            placeholder="#ffffff"
          />
        </label>
        <label className="block">
          <span className="text-xs text-gray-600">Thumbnail Text Color</span>
          <input
            name="thumbnail_text_color"
            defaultValue={item.thumbnail_text_color ?? "#000000"}
            className="mt-1 w-full rounded border border-gray-300 px-3 py-2 text-sm"
            placeholder="#000000"
          />
        </label>
      </div>
    </form>
  );
}
