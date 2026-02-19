import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { requireAuth } from "@/lib/auth";

export async function GET() {
  try {
    const user = await requireAuth();

    // Get available tasks (enabled + not full + user hasn't started)
    const { data: allTasks } = await supabase
      .from("tasks")
      .select("*")
      .eq("is_enabled", true)
      .order("created_at", { ascending: false });

    const { data: userCompletions } = await supabase
      .from("task_completions")
      .select("task_id, status, completion_pct, earned_amount, started_at, completed_at, screenshot_verify")
      .eq("user_id", user.id);

    const completionMap = new Map(
      (userCompletions || []).map(c => [c.task_id, c])
    );

    const available = (allTasks || [])
      .filter(t => t.completed_count < t.max_users && !completionMap.has(t.id))
      .map(t => ({ ...t, user_status: null }));

    const ongoing = (allTasks || [])
      .filter(t => completionMap.has(t.id) && completionMap.get(t.id)?.status === "pending")
      .map(t => ({ ...t, user_status: completionMap.get(t.id) }));

    const completed = (allTasks || [])
      .filter(t => completionMap.has(t.id) && completionMap.get(t.id)?.status !== "pending")
      .map(t => ({ ...t, user_status: completionMap.get(t.id) }));

    return NextResponse.json({ available, ongoing, completed, balance: user.balance });
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}
