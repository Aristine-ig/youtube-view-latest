import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { requireAuth } from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    const user = await requireAuth();
    const { task_id } = await req.json();

    if (!task_id) return NextResponse.json({ error: "Task ID required" }, { status: 400 });

    // Check task exists and is available
    const { data: task } = await supabase
      .from("tasks")
      .select("*")
      .eq("id", task_id)
      .eq("is_enabled", true)
      .single();

    if (!task) return NextResponse.json({ error: "Task not found or disabled" }, { status: 404 });
    if (task.completed_count >= task.max_users) {
      return NextResponse.json({ error: "Task limit reached" }, { status: 400 });
    }

    // Check if already started
    const { data: existing } = await supabase
      .from("task_completions")
      .select("id")
      .eq("task_id", task_id)
      .eq("user_id", user.id)
      .single();

    if (existing) {
      return NextResponse.json({ error: "Already started this task" }, { status: 409 });
    }

    const { data, error } = await supabase
      .from("task_completions")
      .insert({ 
        task_id, 
        user_id: user.id, 
        status: "pending",
        earned_amount: 0
      })
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ completion: data }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}
