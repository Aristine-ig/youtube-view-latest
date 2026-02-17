import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { requireAdmin } from "@/lib/auth";

export async function GET() {
  try {
    await requireAdmin();
    const { data, error } = await supabase
      .from("users")
      .select("id, email, name, role, balance, status, created_at")
      .order("created_at", { ascending: false });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ users: data });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Error";
    return NextResponse.json({ error: msg }, { status: msg === "Forbidden" ? 403 : 401 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    await requireAdmin();
    const { id, status } = await req.json();
    if (!id || !status) return NextResponse.json({ error: "ID and status required" }, { status: 400 });

    const { data, error } = await supabase
      .from("users")
      .update({ status, updated_at: new Date().toISOString() })
      .eq("id", id)
      .select("id, email, name, role, balance, status")
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ user: data });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Error";
    return NextResponse.json({ error: msg }, { status: msg === "Forbidden" ? 403 : 401 });
  }
}
