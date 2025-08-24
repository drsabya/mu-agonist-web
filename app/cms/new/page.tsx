// app/cms/new/page.tsx
import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { ALLOWED_TYPES, type ContentType, getDefaultContent } from "@/utils/cms";

export default async function NewLessonItemPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams; // ✅ await it
  const rawType = (Array.isArray(params?.type) ? params.type[0] : params?.type || "").toLowerCase();

  if (!ALLOWED_TYPES.includes(rawType as ContentType)) redirect("/cms");
  const type = rawType as ContentType;

  const supabase = await createClient();

  const { data: item, error: itemError } = await supabase
    .from("lesson_items")
    .insert({ title: "Untitled", type, status: "draft" })
    .select()
    .single();

  if (itemError || !item) throw new Error(itemError?.message ?? "Failed to create lesson item");

  const defaultContent = getDefaultContent(type);
  const { error: contentError } = await supabase
    .from("lesson_item_contents")
    .insert({ lesson_item_id: item.id, content: defaultContent });

  if (contentError) {
    await supabase.from("lesson_items").delete().eq("id", item.id); // cleanup
    throw new Error(contentError.message);
  }

  redirect(`/cms/${item.id}`);
}
