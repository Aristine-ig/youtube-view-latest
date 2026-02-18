import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { requireAdmin } from "@/lib/auth";
import sharp from "sharp";

export async function POST(req: NextRequest) {
  try {
    const admin = await requireAdmin();
    console.log("[v0] Upload requested by admin:", admin.email, "role:", admin.role);
    
    const formData = await req.formData();
    const file = formData.get("file") as File;
    
    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    // Validate file type
    if (!file.type.startsWith("image/")) {
      return NextResponse.json({ error: "File must be an image" }, { status: 400 });
    }

    // Generate unique filename (always use .jpg for compressed output)
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.jpg`;
    const bucket = "task-thumbnails";

    // Convert file to buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Compress and resize image using sharp
    const compressedBuffer = await sharp(buffer)
      .resize(1200, 800, { 
        fit: "inside", 
        withoutEnlargement: true 
      })
      .jpeg({ 
        quality: 80, 
        progressive: true,
        mozjpeg: true 
      })
      .toBuffer();

    // Upload compressed image to Supabase storage
    const { data, error } = await supabase.storage
      .from(bucket)
      .upload(`tasks/${fileName}`, compressedBuffer, {
        contentType: "image/jpeg",
        upsert: false,
      });

    if (error) {
      console.error("Supabase upload error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from(bucket)
      .getPublicUrl(`tasks/${fileName}`);

    return NextResponse.json({ url: urlData.publicUrl });
  } catch (e: unknown) {
    console.error("Upload error:", e);
    const msg = e instanceof Error ? e.message : "Error";
    return NextResponse.json({ error: msg }, { status: msg === "Forbidden" ? 403 : 500 });
  }
}
