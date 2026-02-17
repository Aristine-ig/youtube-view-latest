"use client";

import { useAuth } from "@/components/auth-provider";
import { useRouter } from "next/navigation";
import { useEffect, useState, useCallback } from "react";
import { toast } from "sonner";
import {
  Play, DollarSign, CheckCircle, Clock, LogOut, ArrowDownToLine,
  XCircle, Wallet, ChevronDown, ChevronUp, Eye
} from "lucide-react";
import Link from "next/link";

interface Task {
  id: string;
  title: string;
  channel_name: string;
  video_thumbnail: string;
  video_length: string;
  required_actions: string;
  reward_amount: number;
  max_users: number;
  completed_count: number;
  user_status: {
    status: string;
    completion_pct: number;
    earned_amount: number;
  } | null;
}

interface Withdrawal {
  id: string;
  amount: number;
  status: string;
  payment_method: string;
  created_at: string;
}

export default function DashboardPage() {
  const { user, loading: authLoading, logout, refresh } = useAuth();
  const router = useRouter();
  const [available, setAvailable] = useState<Task[]>([]);
  const [completed, setCompleted] = useState<Task[]>([]);
  const [ongoing, setOngoing] = useState<Task[]>([]);
  const [balance, setBalance] = useState(0);
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([]);
  const [tab, setTab] = useState<"tasks" | "ongoing" | "completed" | "withdraw">("tasks");
  const [loading, setLoading] = useState(true);
  const [startingTask, setStartingTask] = useState<string | null>(null);
  const [activeTask, setActiveTask] = useState<Task | null>(null);
  const [showWithdrawForm, setShowWithdrawForm] = useState(false);
  const [wAmount, setWAmount] = useState("");
  const [wMethod, setWMethod] = useState("");
  const [wDetails, setWDetails] = useState("");

  const fetchTasks = useCallback(async () => {
    const res = await fetch("/api/tasks");
    if (res.ok) {
      const data = await res.json();
      setAvailable(data.available);
      setCompleted(data.completed);
      setOngoing(data.ongoing || []);
      setBalance(data.balance);
    }
  }, []);

  const fetchWithdrawals = useCallback(async () => {
    const res = await fetch("/api/withdrawals");
    if (res.ok) {
      const data = await res.json();
      setWithdrawals(data.withdrawals);
      setBalance(data.balance);
    }
  }, []);

  useEffect(() => {
    if (authLoading) return;
    if (!user) { 
      router.push("/login"); 
      return; 
    }
    if (user && user.role === "admin") { 
      router.push("/admin"); 
      return; 
    }
    Promise.all([fetchTasks(), fetchWithdrawals()]).finally(() => setLoading(false));
  }, [user, authLoading, router, fetchTasks, fetchWithdrawals]);

  const startTask = async (taskId: string) => {
    setStartingTask(taskId);
    try {
      const res = await fetch("/api/tasks/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ task_id: taskId }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error);
      }
      toast.success("Task started! Check ongoing tasks.");
      await fetchTasks();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to start task");
    } finally {
      setStartingTask(null);
    }
  };

  const completeTask = async (taskId: string, completionPct: number) => {
    try {
      const res = await fetch("/api/tasks/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ task_id: taskId, completion_pct: completionPct }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      if (data.passed) {
        toast.success(`Earned $${data.earned.toFixed(2)}!`);
      } else {
        toast.error(`Only ${data.completion_pct}% completed. Need ${data.min_required}%.`);
      }
      setActiveTask(null);
      await fetchTasks();
      await refresh();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to complete task");
    }
  };

  const submitWithdrawal = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch("/api/withdrawals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: wAmount, payment_method: wMethod, payment_details: wDetails }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success("Withdrawal request submitted");
      setShowWithdrawForm(false);
      setWAmount("");
      setWMethod("");
      setWDetails("");
      await fetchWithdrawals();
      await refresh();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed");
    }
  };

  if (authLoading || loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-emerald-500 border-t-transparent" />
      </div>
    );
  }

  // Active task overlay
    if (activeTask) {
      return (
        <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950 px-4 py-8 text-white">
          <div className="mx-auto max-w-3xl">
            <div className="mb-6 rounded-2xl border border-white/10 bg-white/5 p-8">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold">{activeTask.title || "Task"}</h2>
                  {activeTask.channel_name && (
                    <p className="text-sm text-gray-400 mt-1">{activeTask.channel_name}</p>
                  )}
                </div>
                <button onClick={() => setActiveTask(null)} className="text-gray-400 hover:text-white">
                  <XCircle className="h-6 w-6" />
                </button>
              </div>
              <div className="mb-6 grid grid-cols-2 gap-4 rounded-xl bg-white/5 p-4">
                <div>
                  <div className="text-sm text-gray-400">Reward</div>
                  <div className="text-lg font-bold text-emerald-400">${Number(activeTask.reward_amount).toFixed(2)}</div>
                </div>
                {activeTask.video_length && (
                  <div>
                    <div className="text-sm text-gray-400">Video Length</div>
                    <div className="font-medium">{activeTask.video_length}</div>
                  </div>
                )}
                {activeTask.channel_name && (
                  <div>
                    <div className="text-sm text-gray-400">Channel</div>
                    <div className="font-medium">{activeTask.channel_name}</div>
                  </div>
                )}
              </div>
              {activeTask.required_actions && (
                <div className="mb-6 rounded-xl bg-amber-500/10 border border-amber-500/20 p-4">
                  <div className="text-sm font-medium text-amber-400 mb-1">Required Actions</div>
                  <p className="text-sm text-gray-300">{activeTask.required_actions}</p>
                </div>
              )}
              <div className="space-y-3">
                <p className="text-sm text-gray-400">
                  After completing the task, select how much you completed:
                </p>
                <div className="grid grid-cols-3 gap-3">
                  {[50, 75, 100].map(pct => (
                    <button
                      key={pct}
                      onClick={() => completeTask(activeTask.id, pct)}
                      className={`rounded-xl py-3 font-semibold transition ${
                        pct >= 75
                          ? "bg-emerald-500 hover:bg-emerald-600 text-white"
                          : "bg-white/10 hover:bg-white/20 text-gray-300"
                      }`}
                    >
                      {pct}%
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      );
    }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950 text-white">
      {/* Navbar */}
      <nav className="border-b border-white/10 px-6 py-4">
        <div className="mx-auto flex max-w-6xl items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-500">
              <Play className="h-5 w-5 text-white" fill="white" />
            </div>
            <span className="text-xl font-bold">WatchEarn</span>
          </Link>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 rounded-lg bg-emerald-500/10 px-4 py-2">
              <Wallet className="h-4 w-4 text-emerald-400" />
              <span className="font-bold text-emerald-400">${Number(balance).toFixed(2)}</span>
            </div>
            <span className="text-sm text-gray-400">{user?.name}</span>
            <button onClick={async () => { await logout(); router.push("/"); }} className="text-gray-400 hover:text-white">
              <LogOut className="h-5 w-5" />
            </button>
          </div>
        </div>
      </nav>

      <div className="mx-auto max-w-6xl px-6 py-8">
        {/* Tabs */}
        <div className="mb-8 flex gap-1 rounded-xl bg-white/5 p-1">
          {[
            { key: "tasks", label: "Available Tasks", icon: Play },
            { key: "ongoing", label: "Ongoing", icon: Clock },
            { key: "completed", label: "Completed", icon: CheckCircle },
            { key: "withdraw", label: "Withdraw", icon: ArrowDownToLine },
          ].map(t => (
            <button
              key={t.key}
              onClick={() => setTab(t.key as typeof tab)}
              className={`flex flex-1 items-center justify-center gap-2 rounded-lg py-3 text-sm font-medium transition ${
                tab === t.key ? "bg-emerald-500 text-white" : "text-gray-400 hover:text-white"
              }`}
            >
              <t.icon className="h-4 w-4" />
              {t.label}
            </button>
          ))}
        </div>

        {/* Available Tasks */}
        {tab === "tasks" && (
          <div>
            {available.length === 0 ? (
              <div className="rounded-2xl border border-white/10 bg-white/5 p-12 text-center">
                <Eye className="mx-auto mb-4 h-12 w-12 text-gray-600" />
                <h3 className="text-lg font-semibold text-gray-400">No tasks available</h3>
                <p className="text-sm text-gray-500">Check back later for new video tasks.</p>
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {available.map(task => (
                  <TaskCard key={task.id} task={task} onStart={() => startTask(task.id)} starting={startingTask === task.id} />
                ))}
              </div>
            )}
          </div>
        )}

        {/* Ongoing Tasks */}
        {tab === "ongoing" && (
          <div>
            {ongoing.length === 0 ? (
              <div className="rounded-2xl border border-white/10 bg-white/5 p-12 text-center">
                <Clock className="mx-auto mb-4 h-12 w-12 text-gray-600" />
                <h3 className="text-lg font-semibold text-gray-400">No ongoing tasks</h3>
                <p className="text-sm text-gray-500">Start a task to see it here.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {ongoing.map(task => (
                  <div key={task.id} className="flex items-center justify-between rounded-xl border border-white/10 bg-white/5 p-4">
                    <div className="flex items-center gap-4">
                      <div className="flex h-14 w-20 items-center justify-center rounded-lg bg-white/10">
                        <Play className="h-5 w-5 text-gray-500" />
                      </div>
                      <div>
                        <div className="font-medium">{task.title || "Task"}</div>
                        {task.channel_name && (
                          <div className="text-sm text-gray-400">{task.channel_name}</div>
                        )}
                        <div className="text-sm text-gray-400">
                          {task.user_status?.completion_pct || 0}% completed
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => setActiveTask(task)}
                        className="flex items-center gap-2 rounded-lg bg-emerald-500 px-4 py-2 text-sm font-semibold transition hover:bg-emerald-600"
                      >
                        <Eye className="h-4 w-4" />
                        View Details
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Completed Tasks */}
        {tab === "completed" && (
          <div>
            {completed.length === 0 ? (
              <div className="rounded-2xl border border-white/10 bg-white/5 p-12 text-center">
                <CheckCircle className="mx-auto mb-4 h-12 w-12 text-gray-600" />
                <h3 className="text-lg font-semibold text-gray-400">No completed tasks yet</h3>
                <p className="text-sm text-gray-500">Start watching videos to earn!</p>
              </div>
            ) : (
              <div className="space-y-3">
                  {completed.map(task => (
                    <div key={task.id} className="flex items-center justify-between rounded-xl border border-white/10 bg-white/5 p-4">
                      <div className="flex items-center gap-4">
                        <div className="flex h-14 w-20 items-center justify-center rounded-lg bg-white/10">
                          <Play className="h-5 w-5 text-gray-500" />
                        </div>
                        <div>
                        <div className="font-medium">{task.title || "Task"}</div>
                        {task.channel_name && (
                          <div className="text-sm text-gray-400">{task.channel_name}</div>
                        )}
                        <div className="text-sm text-gray-400">
                          {task.user_status?.completion_pct}% completed
                        </div>
                      </div>
                      </div>
                    <div className="flex items-center gap-3">
                      {task.user_status?.status === "completed" ? (
                        <span className="flex items-center gap-1 text-emerald-400">
                          <CheckCircle className="h-4 w-4" />
                          +${Number(task.user_status.earned_amount).toFixed(2)}
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-red-400">
                          <XCircle className="h-4 w-4" />
                          Failed
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Withdraw */}
        {tab === "withdraw" && (
          <div>
            <div className="mb-6 flex items-center justify-between">
              <div>
                <div className="text-sm text-gray-400">Available Balance</div>
                <div className="text-3xl font-bold text-emerald-400">${Number(balance).toFixed(2)}</div>
              </div>
              <button
                onClick={() => setShowWithdrawForm(!showWithdrawForm)}
                className="flex items-center gap-2 rounded-lg bg-emerald-500 px-5 py-2.5 font-semibold transition hover:bg-emerald-600"
              >
                {showWithdrawForm ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                Request Withdrawal
              </button>
            </div>

            {showWithdrawForm && (
              <form onSubmit={submitWithdrawal} className="mb-6 rounded-xl border border-white/10 bg-white/5 p-6 space-y-4">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-300">Amount ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    max={balance}
                    required
                    value={wAmount}
                    onChange={e => setWAmount(e.target.value)}
                    className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-white outline-none focus:border-emerald-500"
                    placeholder="0.00"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-300">Payment Method</label>
                  <select
                    value={wMethod}
                    onChange={e => setWMethod(e.target.value)}
                    required
                    className="w-full rounded-lg border border-white/10 bg-gray-900 px-4 py-3 text-white outline-none focus:border-emerald-500"
                  >
                    <option value="">Select method</option>
                    <option value="paypal">PayPal</option>
                    <option value="bank">Bank Transfer</option>
                    <option value="crypto">Crypto</option>
                  </select>
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-300">Payment Details</label>
                  <input
                    type="text"
                    required
                    value={wDetails}
                    onChange={e => setWDetails(e.target.value)}
                    className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-white outline-none focus:border-emerald-500"
                    placeholder="PayPal email, wallet address, etc."
                  />
                </div>
                <button
                  type="submit"
                  className="w-full rounded-lg bg-emerald-500 py-3 font-semibold transition hover:bg-emerald-600"
                >
                  Submit Withdrawal
                </button>
              </form>
            )}

            <div className="space-y-3">
              {withdrawals.length === 0 ? (
                <div className="rounded-2xl border border-white/10 bg-white/5 p-12 text-center">
                  <DollarSign className="mx-auto mb-4 h-12 w-12 text-gray-600" />
                  <h3 className="text-lg font-semibold text-gray-400">No withdrawals yet</h3>
                </div>
              ) : (
                withdrawals.map(w => (
                  <div key={w.id} className="flex items-center justify-between rounded-xl border border-white/10 bg-white/5 p-4">
                    <div>
                      <div className="font-medium">${Number(w.amount).toFixed(2)}</div>
                      <div className="text-sm text-gray-400">
                        {w.payment_method} &middot; {new Date(w.created_at).toLocaleDateString()}
                      </div>
                    </div>
                    <span className={`rounded-full px-3 py-1 text-xs font-medium ${
                      w.status === "approved" ? "bg-emerald-500/10 text-emerald-400" :
                      w.status === "rejected" ? "bg-red-500/10 text-red-400" :
                      "bg-amber-500/10 text-amber-400"
                    }`}>
                      {w.status === "pending" && <Clock className="mr-1 inline h-3 w-3" />}
                      {w.status.charAt(0).toUpperCase() + w.status.slice(1)}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function TaskCard({ task, onStart, starting }: { task: Task; onStart: () => void; starting: boolean }) {
  const [imageError, setImageError] = useState(false);
  
  const handleImageError = () => {
    setImageError(true);
  };
  
  return (
    <div className="overflow-hidden rounded-2xl border border-white/10 bg-white/5">
      <div className="flex h-40 items-center justify-center bg-white/5">
        {task.video_thumbnail && !imageError ? (
          <img 
            src={task.video_thumbnail} 
            alt="Video thumbnail" 
            className="h-full w-full object-cover"
            onError={handleImageError}
          />
        ) : (
          <Play className="h-12 w-12 text-gray-600" />
        )}
      </div>
      <div className="p-5">
        <h3 className="mb-1 font-semibold leading-tight">{task.title || "Task"}</h3>
        {task.channel_name && (
          <p className="mb-2 text-xs text-gray-500">Channel: {task.channel_name}</p>
        )}
        {task.video_length && (
          <p className="mb-2 text-xs text-gray-500">Length: {task.video_length}</p>
        )}
        {task.required_actions && (
          <p className="mb-3 text-sm text-gray-400 line-clamp-2">{task.required_actions}</p>
        )}
        <div className="mb-4 flex items-center gap-4 text-xs text-gray-400">
          <span className="flex items-center gap-1">
            <DollarSign className="h-3.5 w-3.5 text-emerald-400" />
            <span className="font-bold text-emerald-400">${Number(task.reward_amount).toFixed(2)}</span>
          </span>
          <span>{task.completed_count}/{task.max_users} slots</span>
        </div>
        <button
          onClick={onStart}
          disabled={starting}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-500 py-2.5 text-sm font-semibold transition hover:bg-emerald-600 disabled:opacity-50"
        >
          <Play className="h-4 w-4" fill="white" />
          {starting ? "Starting..." : "Start Task"}
        </button>
      </div>
    </div>
  );
}
