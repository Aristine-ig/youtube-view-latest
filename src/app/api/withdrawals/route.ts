import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { requireAuth } from "@/lib/auth";

export async function GET() {
  try {
    const user = await requireAuth();
    const { data, error } = await supabase
      .from("withdrawals")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ withdrawals: data, balance: user.balance });
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireAuth();
    const { amount, payment_method, payment_details } = await req.json();

    const withdrawAmount = parseFloat(amount);
    if (!withdrawAmount || withdrawAmount <= 0) {
      return NextResponse.json({ error: "Invalid amount" }, { status: 400 });
    }

    if (withdrawAmount > parseFloat(String(user.balance))) {
      return NextResponse.json({ error: "Insufficient balance" }, { status: 400 });
    }

    // Deduct balance
    await supabase
      .from("users")
      .update({ balance: parseFloat(String(user.balance)) - withdrawAmount })
      .eq("id", user.id);

    const { data, error } = await supabase
      .from("withdrawals")
      .insert({
        user_id: user.id,
        amount: withdrawAmount,
        payment_method: payment_method || null,
        payment_details: payment_details || null,
      })
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ withdrawal: data }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}
