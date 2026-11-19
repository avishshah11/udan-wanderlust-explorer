import { type NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Signed, short-lived download link. RLS on documents and the storage
// policies decide whether this user may see the file.
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: doc } = await supabase.from("documents").select("storage_path, file_name").eq("id", id).maybeSingle();
  if (!doc) return NextResponse.redirect(new URL("/account?notice=document-missing", request.nextUrl.origin));
  const { data } = await supabase.storage.from("documents").createSignedUrl(doc.storage_path, 300, { download: doc.file_name });
  if (!data?.signedUrl) return new NextResponse("This document is not available right now. Please try again.", { status: 503 });
  return NextResponse.redirect(data.signedUrl);
}
