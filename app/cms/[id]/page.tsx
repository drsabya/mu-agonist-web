// app/cms/[id]/page.tsx
import { notFound } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import AdminGuard from "@/app/components/auth/AdminGuard";
import BaseEditor from "@/app/components/cms/lesson-items/BaseEditor";
import MediaOverlayEditor from "@/app/components/cms/lesson-items/types/MediaOverlayEditor";
import SliderMoverEditor from "@/app/components/cms/lesson-items/types/SliderMoverEditor";
import SliderResizerEditor from "@/app/components/cms/lesson-items/types/SliderResizerEditor";
import DragDropEditor from "@/app/components/cms/lesson-items/types/DragDropEditor";
import { revalidatePath } from "next/cache";

// CMS content helpers (your exact schema/defaults)
import {
  isContentValid,
  getDefaultContent,
  mediaOverlayContentSchema,
  sliderMoverContentSchema,
  sliderResizerContentSchema,
  dragDropContentSchema,
  type MediaOverlayContent,
  type SliderMoverContent,
  type SliderResizerContent,
  type DragDropContent,
} from "@/utils/cms";

export const dynamic = "force-dynamic"; // avoid caching while editing

type LessonItem = {
  id: string;
  title: string | null;
  type: string;
  created_at: string | null;
  updated_at: string | null;
  tagline: string | null;
  description: string | null;
  tags: string[] | null;
  subjects: string[] | null;
  status: string | null;
  access_tier: string | null;
  explanation: string | null;
  thumbnail_src: string | null;
  thumbnail_bg_color: string | null;
  thumbnail_text_color: string | null;
};

export default async function CMSItemPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  // -------- Fetch metadata --------
  const { data: item, error } = await supabase
    .from("lesson_items")
    .select(
      [
        "id",
        "title",
        "type",
        "created_at",
        "updated_at",
        "tagline",
        "description",
        "tags",
        "subjects",
        "status",
        "access_tier",
        "explanation",
        "thumbnail_src",
        "thumbnail_bg_color",
        "thumbnail_text_color",
      ].join(", ")
    )
    .eq("id", id)
    .single<LessonItem>();

  if (error || !item) notFound();

  // -------- Fetch content (per-type) --------
  let mediaOverlayContent: MediaOverlayContent | null = null;

  // RAW for coercion inside editors
  let sliderMoverInitialRaw: unknown = null;
  let sliderResizerInitialRaw: unknown = null;
  let dragDropInitialRaw: unknown = null;

  if (item.type === "media-overlay") {
    const { data: contentRow } = await supabase
      .from("lesson_item_contents")
      .select("content")
      .eq("lesson_item_id", id)
      .maybeSingle();

    mediaOverlayContent = isContentValid("media-overlay", contentRow?.content)
      ? (contentRow!.content as MediaOverlayContent)
      : getDefaultContent("media-overlay");
  } else if (item.type === "slider-mover") {
    const { data: contentRow } = await supabase
      .from("lesson_item_contents")
      .select("content")
      .eq("lesson_item_id", id)
      .maybeSingle();

    sliderMoverInitialRaw = contentRow?.content ?? null;
  } else if (item.type === "slider-resizer") {
    const { data: contentRow } = await supabase
      .from("lesson_item_contents")
      .select("content")
      .eq("lesson_item_id", id)
      .maybeSingle();

    sliderResizerInitialRaw = contentRow?.content ?? null;
  } else if (item.type === "drag-drop") {
    const { data: contentRow } = await supabase
      .from("lesson_item_contents")
      .select("content")
      .eq("lesson_item_id", id)
      .maybeSingle();

    dragDropInitialRaw = contentRow?.content ?? null;
  }

  return (
    <AdminGuard>
      <main className="mx-auto w-full max-w-screen-lg p-6 space-y-8">
        <header>
          <h1 className="text-xl font-semibold">{item.title || "Untitled"}</h1>
          <p className="mt-1 text-sm text-gray-500">
            Type: <span className="font-mono">{item.type}</span> · Status:{" "}
            {item.status || "draft"}
          </p>
        </header>

        {/* ---------- Metadata editor ---------- */}
        <BaseEditor item={item} onSaveAction={saveMetadataAction} />

        {/* ---------- Type-specific editors ---------- */}
        {item.type === "media-overlay" && mediaOverlayContent && (
          <section className="space-y-4">
            <h2 className="text-lg font-semibold">Media Overlay</h2>
            <MediaOverlayEditor
              itemId={id}
              initialContent={mediaOverlayContent}
              onSave={saveMediaOverlayContent}
            />
          </section>
        )}

        {item.type === "slider-mover" && (
          <section className="space-y-4">
            <h2 className="text-lg font-semibold">Slider Mover</h2>
            <SliderMoverEditor
              itemId={id}
              initialContent={
                sliderMoverInitialRaw as unknown as SliderMoverContent | null
              }
              onSave={saveSliderMoverContent}
            />
          </section>
        )}

        {item.type === "slider-resizer" && (
          <section className="space-y-4">
            <h2 className="text-lg font-semibold">Slider Resizer</h2>
            <SliderResizerEditor
              itemId={id}
              initialContent={
                sliderResizerInitialRaw as unknown as SliderResizerContent | null
              }
              onSave={saveSliderResizerContent}
            />
          </section>
        )}

        {item.type === "drag-drop" && (
          <section className="space-y-4">
            <h2 className="text-lg font-semibold">Drag &amp; Drop</h2>
            <DragDropEditor
              itemId={id}
              initialContent={
                dragDropInitialRaw as unknown as DragDropContent | null
              }
              onSave={saveDragDropContent}
            />
          </section>
        )}
      </main>
    </AdminGuard>
  );
}

/* -------------------- Server Action: metadata -------------------- */
async function saveMetadataAction(formData: FormData) {
  "use server";
  const supabase = await createClient();

  const id = String(formData.get("id"));

  const csv = (v: FormDataEntryValue | null) =>
    String(v || "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);

  const payload = {
    title: String(formData.get("title") || "Untitled"),
    tagline: String(formData.get("tagline") || ""),
    description: String(formData.get("description") || ""),
    explanation: String(formData.get("explanation") || ""),
    tags: csv(formData.get("tags")),
    subjects: csv(formData.get("subjects")),
    status: String(formData.get("status") || "draft"),
    access_tier: String(formData.get("access_tier") || "free"),
    thumbnail_src: String(formData.get("thumbnail_src") || ""),
    thumbnail_bg_color: String(formData.get("thumbnail_bg_color") || ""),
    thumbnail_text_color: String(formData.get("thumbnail_text_color") || ""),
    updated_at: new Date().toISOString(),
  };

  const { error } = await supabase
    .from("lesson_items")
    .update(payload)
    .eq("id", id);
  if (error) throw new Error(error.message);

  revalidatePath(`/cms/${id}`);
}

/* -------------------- Server Action: media-overlay content -------------------- */
async function saveMediaOverlayContent(formData: FormData) {
  "use server";
  const supabase = await createClient();

  const id = String(formData.get("lesson_item_id"));
  const raw = String(formData.get("content") || "{}");

  const parsed = mediaOverlayContentSchema.parse(JSON.parse(raw));

  const { error } = await supabase
    .from("lesson_item_contents")
    .upsert({ lesson_item_id: id, content: parsed });

  if (error) throw new Error(error.message);

  revalidatePath(`/cms/${id}`);
}

/* -------------------- Server Action: slider-mover content -------------------- */
async function saveSliderMoverContent(formData: FormData) {
  "use server";
  const supabase = await createClient();

  const id = String(formData.get("lesson_item_id"));
  const raw = String(formData.get("content") || "{}");

  const parsed = sliderMoverContentSchema.parse(JSON.parse(raw));

  const { error } = await supabase
    .from("lesson_item_contents")
    .upsert({ lesson_item_id: id, content: parsed });

  if (error) throw new Error(error.message);

  revalidatePath(`/cms/${id}`);
}

/* -------------------- Server Action: slider-resizer content -------------------- */
async function saveSliderResizerContent(formData: FormData) {
  "use server";
  const supabase = await createClient();

  const id = String(formData.get("lesson_item_id"));
  const raw = String(formData.get("content") || "{}");

  const parsed = sliderResizerContentSchema.parse(JSON.parse(raw));

  const { error } = await supabase
    .from("lesson_item_contents")
    .upsert({ lesson_item_id: id, content: parsed });

  if (error) throw new Error(error.message);

  revalidatePath(`/cms/${id}`);
}

/* -------------------- Server Action: drag-drop content -------------------- */
async function saveDragDropContent(formData: FormData) {
  "use server";
  const supabase = await createClient();

  const id = String(formData.get("lesson_item_id"));
  const raw = String(formData.get("content") || "{}");

  const parsed = dragDropContentSchema.parse(JSON.parse(raw));

  const { error } = await supabase
    .from("lesson_item_contents")
    .upsert({ lesson_item_id: id, content: parsed });

  if (error) throw new Error(error.message);

  revalidatePath(`/cms/${id}`);
}
