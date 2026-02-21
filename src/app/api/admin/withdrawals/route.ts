import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { requireAdmin } from "@/lib/auth";

export async function GET(req: NextRequest) {
  try {
    await requireAdmin();
    
    // Get pagination params
    const page = parseInt(req.nextUrl.searchParams.get("page") || "1");
    const limit = parseInt(req.nextUrl.searchParams.get("limit") || "10");
    const offset = (page - 1) * limit;

    // Fetch paginated withdrawals
    const { data, error, count } = await supabase
      .from("withdrawals")
      .select("*, users!inner(email, name)", { count: "exact" })
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ withdrawals: data, total: count || 0 });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Error";
    return NextResponse.json({ error: msg }, { status: msg === "Forbidden" ? 403 : 401 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    await requireAdmin();
    const { id, status, admin_note } = await req.json();
    if (!id || !status) return NextResponse.json({ error: "ID and status required" }, { status: 400 });

    // Get the withdrawal
    const { data: withdrawal } = await supabase
      .from("withdrawals")
      .select("*")
      .eq("id", id)
      .single();

    if (!withdrawal) return NextResponse.json({ error: "Not found" }, { status: 404 });

    if (status === "rejected" && withdrawal.status === "pending") {
      // Refund the balance
      const { data: user } = await supabase
        .from("users")
        .select("balance")
        .eq("id", withdrawal.user_id)
        .single();

      if (user) {
        await supabase
          .from("users")
          .update({ balance: parseFloat(user.balance) + parseFloat(withdrawal.amount) })
          .eq("id", withdrawal.user_id);
      }
    }

    const { data, error } = await supabase
      .from("withdrawals")
      .update({
        status,
        admin_note: admin_note || null,
        processed_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select("*, users!inner(email, name)")
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ withdrawal: data });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Error";
    return NextResponse.json({ error: msg }, { status: msg === "Forbidden" ? 403 : 401 });
  }
}
