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

    // Fetch paginated users
    const { data: users, error, count } = await supabase
      .from("users")
      .select("id, email, name, role, balance, status, created_at", { count: "exact" })
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    // Get suspicious attempts count for each user from suspicious_activity_log
    const userIds = users?.map(u => u.id) || [];
    const { data: logCounts } = await supabase
      .from("suspicious_activity_log")
      .select("user_id")
      .in("user_id", userIds);

    // Count occurrences per user
    const suspiciousCountMap = (logCounts || []).reduce((acc, log) => {
      acc[log.user_id] = (acc[log.user_id] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Add suspicious_attempts to each user
    const usersWithCounts = users?.map(user => ({
      ...user,
      suspicious_attempts: suspiciousCountMap[user.id] || 0
    }));

    return NextResponse.json({ users: usersWithCounts, total: count || 0 });
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
