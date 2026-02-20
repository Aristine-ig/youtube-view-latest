import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { requireAdmin } from "@/lib/auth";

export async function GET() {
  try {
    await requireAdmin();

    const [usersRes, tasksRes, completionsRes, withdrawalsRes] = await Promise.all([
      supabase.from("users").select("id, role, status, created_at").eq("role", "user"),
      supabase.from("tasks").select("id, completed_count, max_users, is_enabled"),
      supabase.from("task_completions").select("id, status, completion_pct, earned_amount"),
      supabase.from("withdrawals").select("id, amount, status"),
    ]);

    const users = usersRes.data || [];
    const tasks = tasksRes.data || [];
    const completions = completionsRes.data || [];
    const withdrawals = withdrawalsRes.data || [];

    const totalUsers = users.length;
    const activeUsers = users.filter(u => u.status === "active").length;
    const suspendedUsers = users.filter(u => u.status === "suspended").length;

    const totalTasks = tasks.length;
    const activeTasks = tasks.filter(t => t.is_enabled).length;

    const totalCompletions = completions.filter(c => c.status === "completed").length;
    const pendingCompletions = completions.filter(c => c.status === "pending").length;
    const failedCompletions = completions.filter(c => c.status === "failed").length;
    const fraudFlags = completions.filter(c => c.status === "fraud").length;

    const completionRate = completions.length > 0
      ? Math.round((totalCompletions / completions.length) * 100)
      : 0;

    const dropOffRate = completions.length > 0
      ? Math.round(((failedCompletions + pendingCompletions) / completions.length) * 100)
      : 0;

    const totalEarned = completions.reduce((sum, c) => sum + parseFloat(String(c.earned_amount || 0)), 0);

    const pendingWithdrawals = withdrawals.filter(w => w.status === "pending");
    const approvedWithdrawals = withdrawals.filter(w => w.status === "approved");
    const totalPendingAmount = pendingWithdrawals.reduce((sum, w) => sum + parseFloat(String(w.amount)), 0);
    const totalApprovedAmount = approvedWithdrawals.reduce((sum, w) => sum + parseFloat(String(w.amount)), 0);

    return NextResponse.json({
      analytics: {
        totalUsers,
        activeUsers,
        suspendedUsers,
        totalTasks,
        activeTasks,
        totalCompletions,
        pendingCompletions,
        failedCompletions,
        fraudFlags,
        completionRate,
        dropOffRate,
        totalEarned: totalEarned.toFixed(2),
        pendingWithdrawals: pendingWithdrawals.length,
        totalPendingAmount: totalPendingAmount.toFixed(2),
        totalApprovedAmount: totalApprovedAmount.toFixed(2),
      },
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Error";
    return NextResponse.json({ error: msg }, { status: msg === "Forbidden" ? 403 : 401 });
  }
}
