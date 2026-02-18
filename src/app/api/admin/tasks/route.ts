import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { requireAdmin } from "@/lib/auth";

export async function GET() {
  try {
    await requireAdmin();
    const { data, error } = await supabase
      .from("tasks")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ tasks: data });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Error";
    return NextResponse.json({ error: msg }, { status: msg === "Forbidden" ? 403 : 401 });
  }
}

export async function POST(req: NextRequest) {
  try {
    await requireAdmin();
    const body = await req.json();
    const { title, channel_name, video_thumbnail, keywords, video_length, required_actions, reward_amount, max_users, is_enabled } = body;

    if (!title || title.trim() === '' || !channel_name || channel_name.trim() === '' || !reward_amount) {
      return NextResponse.json({ error: "Title, channel name and reward amount are required" }, { status: 400 });
    }
    
    // Validate reward amount
    const parsedRewardAmount = parseFloat(reward_amount);
    if (isNaN(parsedRewardAmount) || parsedRewardAmount <= 0) {
      return NextResponse.json({ error: "Reward amount must be a positive number" }, { status: 400 });
    }

    const { data, error } = await supabase
      .from("tasks")
      .insert({
        title: title,
        channel_name: channel_name || null,
        video_thumbnail: video_thumbnail || null,
        keywords: keywords || null,
        video_length: video_length || null,
        required_actions: required_actions || null,
        reward_amount: parsedRewardAmount,
        max_users: max_users || 500,
        is_enabled: is_enabled !== false,
      })
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ task: data }, { status: 201 });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Error";
    return NextResponse.json({ error: msg }, { status: msg === "Forbidden" ? 403 : 401 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    await requireAdmin();
    const body = await req.json();
    const { id, ...updates } = body;

    if (!id) return NextResponse.json({ error: "Task ID required" }, { status: 400 });
    if (updates.title === '' || updates.title?.trim() === '') {
      return NextResponse.json({ error: "Title cannot be empty" }, { status: 400 });
    }
    if (updates.channel_name === '' || updates.channel_name?.trim() === '') {
      return NextResponse.json({ error: "Channel name cannot be empty" }, { status: 400 });
    }
    
    // Validate reward amount if provided
    if (updates.reward_amount !== undefined) {
      if (typeof updates.reward_amount === 'string') {
        if (updates.reward_amount.trim() === '') {
          return NextResponse.json({ error: "Reward amount cannot be empty" }, { status: 400 });
        }
        const parsedAmount = parseFloat(updates.reward_amount);
        if (isNaN(parsedAmount) || parsedAmount <= 0) {
          return NextResponse.json({ error: "Reward amount must be a positive number" }, { status: 400 });
        }
        updates.reward_amount = parsedAmount;
      } else if (typeof updates.reward_amount === 'number') {
        if (updates.reward_amount <= 0) {
          return NextResponse.json({ error: "Reward amount must be a positive number" }, { status: 400 });
        }
      }
    }
    updates.updated_at = new Date().toISOString();

    const { data, error } = await supabase
      .from("tasks")
      .update(updates)
      .eq("id", id)
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ task: data });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Error";
    return NextResponse.json({ error: msg }, { status: msg === "Forbidden" ? 403 : 401 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    await requireAdmin();
    const { id } = await req.json();
    if (!id) return NextResponse.json({ error: "Task ID required" }, { status: 400 });

    const { error } = await supabase.from("tasks").delete().eq("id", id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Error";
    return NextResponse.json({ error: msg }, { status: msg === "Forbidden" ? 403 : 401 });
  }
}
