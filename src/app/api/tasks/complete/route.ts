import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { requireAuth } from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    const user = await requireAuth();
    const { task_id, completion_pct } = await req.json();

    if (!task_id || completion_pct === undefined) {
      return NextResponse.json({ error: "Task ID and completion percentage required" }, { status: 400 });
    }

    // Get task completion record
    const { data: completion } = await supabase
      .from("task_completions")
      .select("*")
      .eq("task_id", task_id)
      .eq("user_id", user.id)
      .eq("status", "pending")
      .single();

    if (!completion) return NextResponse.json({ error: "Task not started" }, { status: 404 });
    if (completion.status === "completed") {
      return NextResponse.json({ error: "Already completed" }, { status: 400 });
    }

    // Get task details
    const { data: task } = await supabase
      .from("tasks")
      .select("*")
      .eq("id", task_id)
      .single();

    if (!task) return NextResponse.json({ error: "Task not found" }, { status: 404 });

    const pct = Math.min(100, Math.max(0, parseInt(completion_pct)));
    const minRequired = 75; // default min completion threshold
    const passed = pct >= minRequired;
    const earned = passed ? parseFloat(task.reward_amount) : 0;

    // Update completion record
    const { error: updateError } = await supabase
      .from("task_completions")
      .update({
        completion_pct: pct,
        earned_amount: earned,
        status: passed ? "completed" : "failed",
        completed_at: new Date().toISOString(),
      })
      .eq("id", completion.id);

    if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 });

    if (passed) {
      // Credit user balance
      await supabase
        .from("users")
        .update({ balance: parseFloat(String(user.balance)) + earned })
        .eq("id", user.id);

      // Increment task completed_count
      await supabase
        .from("tasks")
        .update({ completed_count: task.completed_count + 1 })
        .eq("id", task_id);
    }

    return NextResponse.json({
      passed,
      earned,
      completion_pct: pct,
      min_required: minRequired,
    });
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}
