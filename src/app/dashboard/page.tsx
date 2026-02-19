"use client";

import { useAuth } from "@/components/auth-provider";
import { useRouter } from "next/navigation";
import { useEffect, useState, useCallback } from "react";
import { toast } from "sonner";
import {
  Play, DollarSign, CheckCircle, Clock, LogOut, ArrowDownToLine,
  XCircle, Wallet, ChevronDown, ChevronUp, Eye, X, Send
} from "lucide-react";
import Link from "next/link";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

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
  const [screenshots, setScreenshots] = useState<string[]>([]);
  const [uploadingScreenshots, setUploadingScreenshots] = useState(false);
  const [showSubmitConfirm, setShowSubmitConfirm] = useState(false);
  const [selectedCompletionPct, setSelectedCompletionPct] = useState<number | null>(null);

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

  const handleScreenshotUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    if (screenshots.length >= 3) {
      toast.error("Maximum 3 screenshots allowed");
      return;
    }

    if (screenshots.length + files.length > 3) {
      toast.error(`You can upload maximum ${3 - screenshots.length} more screenshot(s)`);
      return;
    }

    setUploadingScreenshots(true);
    const newScreenshots = [...screenshots];

    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        if (!file.type.startsWith("image/")) {
          toast.error("Please select image files only");
          continue;
        }

        // Check file size (1MB = 1048576 bytes)
        if (file.size > 1048576) {
          toast.error(`File "${file.name}" is too large. Maximum size is 1MB`);
          continue;
        }

        const formData = new FormData();
        formData.append("file", file);
        formData.append("bucket", "screenshots");
        
        const res = await fetch("/api/upload-screenshot", { method: "POST", body: formData });
        if (res.ok) {
          const data = await res.json();
          newScreenshots.push(data.url);
        } else {
          toast.error("Failed to upload screenshot");
        }
      }
      const uploadedCount = newScreenshots.length - screenshots.length;
      setScreenshots(newScreenshots);
      if (uploadedCount > 0) {
        toast.success(`${uploadedCount} screenshot(s) uploaded`);
      }
    } catch (err) {
      toast.error("Failed to upload screenshots");
    } finally {
      setUploadingScreenshots(false);
    }
  };

  const removeScreenshot = (index: number) => {
    setScreenshots(screenshots.filter((_, i) => i !== index));
  };

  const handleSubmitClick = (pct: number) => {
    if (screenshots.length === 0) {
      toast.error("Please upload at least 1 screenshot before submitting");
      return;
    }
    setSelectedCompletionPct(pct);
    setShowSubmitConfirm(true);
  };

  const completeTask = async (taskId: string, completionPct: number) => {
    setShowSubmitConfirm(false);
    try {
      const res = await fetch("/api/tasks/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ task_id: taskId, completion_pct: completionPct, screenshots }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      if (data.passed) {
        toast.success(`Earned $${data.earned.toFixed(2)}!`);
      } else {
        toast.error(`Only ${data.completion_pct}% completed. Need ${data.min_required}%.`);
      }
      setActiveTask(null);
      setScreenshots([]);
      setSelectedCompletionPct(null);
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
              {activeTask.video_thumbnail && (
                <div className="mb-6 rounded-xl overflow-hidden border border-white/10">
                  <img src={activeTask.video_thumbnail} alt={activeTask.title} className="w-full h-64 object-cover" />
                </div>
              )}
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
              {activeTask.keywords && (
                <div className="mb-6 rounded-xl bg-white/5 p-4">
                  <div className="text-sm text-gray-400 mb-2">Keywords</div>
                  <div className="flex flex-wrap gap-2">
                    {activeTask.keywords.split(',').map((keyword, idx) => (
                      <span key={idx} className="rounded-full bg-emerald-500/10 px-3 py-1 text-sm text-emerald-400">
                        {keyword.trim()}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              {activeTask.required_actions && (
                <div className="mb-6 rounded-xl bg-amber-500/10 border border-amber-500/20 p-4">
                  <div className="text-sm font-medium text-amber-400 mb-1">Required Actions</div>
                  <p className="text-sm text-gray-300">{activeTask.required_actions}</p>
                </div>
              )}
              <div className="space-y-4">
                <div>
                  <p className="text-sm text-gray-400 mb-3">Upload Screenshots (up to 3):</p>
                  <input
                    type="file"
                    multiple
                    accept="image/*"
                    onChange={handleScreenshotUpload}
                    disabled={uploadingScreenshots || screenshots.length >= 3}
                    className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 text-white outline-none focus:border-emerald-500 file:mr-4 file:rounded file:border-0 file:bg-emerald-500 file:px-3 file:py-1 file:text-sm file:text-white file:cursor-pointer hover:file:bg-emerald-600"
                  />
                  {uploadingScreenshots && <p className="mt-2 text-sm text-gray-400">Uploading...</p>}
                  
                  {screenshots.length > 0 && (
                    <div className="mt-3 grid grid-cols-3 gap-2">
                      {screenshots.map((url, idx) => (
                        <div key={idx} className="relative rounded-lg overflow-hidden border border-white/10">
                          <img src={url} alt={`Screenshot ${idx + 1}`} className="w-full h-24 object-cover" />
                          <button
                            onClick={() => removeScreenshot(idx)}
                            className="absolute top-1 right-1 bg-red-500/80 hover:bg-red-600 rounded-full p-1"
                          >
                            <X className="h-4 w-4 text-white" />
                          </button>
                          <span className="absolute bottom-1 right-1 bg-black/60 text-white text-xs px-2 py-0.5 rounded">
                            {idx + 1}/3
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <button
                  onClick={() => handleSubmitClick(100)}
                  className="w-full rounded-xl py-3.5 font-semibold transition flex items-center justify-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white"
                >
                  <Send className="h-5 w-5" />
                  Submit Task
                </button>
              </div>
            </div>
          </div>
        </div>
      );
    }

  return (
    <>
      <AlertDialog open={showSubmitConfirm} onOpenChange={setShowSubmitConfirm}>
        <AlertDialogContent className="bg-gray-900 border-white/10 text-white">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white">Confirm Submission</AlertDialogTitle>
            <AlertDialogDescription className="text-gray-400">
              Are you sure you want to submit this task? You have uploaded {screenshots.length} screenshot(s).
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-white/10 hover:bg-white/20 text-white border-white/20">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => activeTask && selectedCompletionPct && completeTask(activeTask.id, selectedCompletionPct)}
              className="bg-emerald-500 hover:bg-emerald-600 text-white"
            >
              Submit
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950 text-white">
      {/* Navbar */}
      <nav className="border-b border-white/10 px-4 sm:px-6 py-3 sm:py-4">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-2 sm:gap-4">
          <Link href="/" className="flex items-center gap-2 flex-shrink-0">
            <div className="flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center rounded-lg bg-emerald-500">
              <Play className="h-4 w-4 sm:h-5 sm:w-5 text-white" fill="white" />
            </div>
            <span className="text-lg sm:text-xl font-bold hidden sm:inline">WatchEarn</span>
          </Link>
          <div className="flex items-center gap-2 sm:gap-4 ml-auto">
            <div className="flex items-center gap-1 sm:gap-2 rounded-lg bg-emerald-500/10 px-2 sm:px-4 py-2">
              <Wallet className="h-3 w-3 sm:h-4 sm:w-4 text-emerald-400" />
              <span className="text-xs sm:text-sm font-bold text-emerald-400">${Number(balance).toFixed(2)}</span>
            </div>
            <span className="text-xs sm:text-sm text-gray-400 hidden sm:inline">{user?.name}</span>
            <button onClick={async () => { await logout(); router.push("/"); }} className="text-gray-400 hover:text-white flex-shrink-0">
              <LogOut className="h-4 w-4 sm:h-5 sm:w-5" />
            </button>
          </div>
        </div>
      </nav>

      <div className="mx-auto max-w-6xl px-4 sm:px-6 py-6 sm:py-8">
        {/* Tabs */}
        <div className="mb-6 sm:mb-8 flex gap-1 rounded-xl bg-white/5 p-1 overflow-x-auto">
          {[
            { key: "tasks", label: "Available Tasks", icon: Play },
            { key: "ongoing", label: "Ongoing", icon: Clock },
            { key: "completed", label: "Completed", icon: CheckCircle },
            { key: "withdraw", label: "Withdraw", icon: ArrowDownToLine },
          ].map(t => (
            <button
              key={t.key}
              onClick={() => setTab(t.key as typeof tab)}
              className={`flex flex-1 items-center justify-center gap-1 sm:gap-2 rounded-lg py-2 sm:py-3 px-2 sm:px-3 text-xs sm:text-sm font-medium transition whitespace-nowrap ${
                tab === t.key ? "bg-emerald-500 text-white" : "text-gray-400 hover:text-white"
              }`}
            >
              <t.icon className="h-3 w-3 sm:h-4 sm:w-4 flex-shrink-0" />
              <span className="hidden sm:inline">{t.label}</span>
              <span className="sm:hidden">{t.label.split(' ')[0]}</span>
            </button>
          ))}
        </div>

        {/* Available Tasks */}
        {tab === "tasks" && (
          <div>
            {available.length === 0 ? (
              <div className="rounded-2xl border border-white/10 bg-white/5 p-8 sm:p-12 text-center">
                <Eye className="mx-auto mb-4 h-10 w-10 sm:h-12 sm:w-12 text-gray-600" />
                <h3 className="text-base sm:text-lg font-semibold text-gray-400">No tasks available</h3>
                <p className="text-xs sm:text-sm text-gray-500">Check back later for new video tasks.</p>
              </div>
            ) : (
              <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
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
              <div className="rounded-2xl border border-white/10 bg-white/5 p-8 sm:p-12 text-center">
                <Clock className="mx-auto mb-4 h-10 w-10 sm:h-12 sm:w-12 text-gray-600" />
                <h3 className="text-base sm:text-lg font-semibold text-gray-400">No ongoing tasks</h3>
                <p className="text-xs sm:text-sm text-gray-500">Start a task to see it here.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {ongoing.map(task => (
                  <div key={task.id} className="flex flex-col sm:flex-row items-start sm:items-center justify-between rounded-xl border border-white/10 bg-white/5 p-4 gap-3 sm:gap-4">
                    <div className="flex items-center gap-3 w-full sm:w-auto">
                      <div className="h-14 w-20 rounded-lg bg-white/10 flex-shrink-0 overflow-hidden">
                        {task.video_thumbnail ? (
                          <img src={task.video_thumbnail} alt={task.title || "Task"} className="h-full w-full object-cover" />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center">
                            <Play className="h-5 w-5 text-gray-500" />
                          </div>
                        )}
                      </div>
                      <div className="min-w-0">
                        <div className="font-medium truncate">{task.title || "Task"}</div>
                        {task.channel_name && (
                          <div className="text-xs sm:text-sm text-gray-400 truncate">{task.channel_name}</div>
                        )}
                        {task.keywords && (
                          <div className="flex flex-wrap gap-1 mt-1">
                            {task.keywords.split(',').slice(0, 3).map((keyword, idx) => (
                              <span key={idx} className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-xs text-emerald-400">
                                {keyword.trim()}
                              </span>
                            ))}
                          </div>
                        )}
                        <div className="text-xs sm:text-sm text-gray-400 mt-1">
                          {task.user_status?.completion_pct || 0}% completed
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 w-full sm:w-auto">
                      <button
                        onClick={() => setActiveTask(task)}
                        className="flex flex-1 sm:flex-initial items-center justify-center gap-2 rounded-lg bg-emerald-500 px-3 sm:px-4 py-2 text-xs sm:text-sm font-semibold transition hover:bg-emerald-600 whitespace-nowrap"
                      >
                        <Eye className="h-3 w-3 sm:h-4 sm:w-4" />
                        <span className="hidden sm:inline">View Details</span>
                        <span className="sm:hidden">View</span>
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
              <div className="rounded-2xl border border-white/10 bg-white/5 p-8 sm:p-12 text-center">
                <CheckCircle className="mx-auto mb-4 h-10 w-10 sm:h-12 sm:w-12 text-gray-600" />
                <h3 className="text-base sm:text-lg font-semibold text-gray-400">No completed tasks yet</h3>
                <p className="text-xs sm:text-sm text-gray-500">Start watching videos to earn!</p>
              </div>
            ) : (
              <div className="space-y-3">
                  {completed.map(task => (
                    <div key={task.id} className="flex flex-col sm:flex-row items-start sm:items-center justify-between rounded-xl border border-white/10 bg-white/5 p-4 gap-3 sm:gap-4">
                      <div className="flex items-center gap-3 w-full sm:w-auto min-w-0">
                        <div className="h-14 w-20 rounded-lg bg-white/10 flex-shrink-0 overflow-hidden">
                          {task.video_thumbnail ? (
                            <img src={task.video_thumbnail} alt={task.title || "Task"} className="h-full w-full object-cover" />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center">
                              <Play className="h-5 w-5 text-gray-500" />
                            </div>
                          )}
                        </div>
                        <div className="min-w-0">
                        <div className="font-medium truncate">{task.title || "Task"}</div>
                        {task.channel_name && (
                          <div className="text-xs sm:text-sm text-gray-400 truncate">{task.channel_name}</div>
                        )}
                        <div className="text-xs sm:text-sm text-gray-400">
                          {task.user_status?.completion_pct}% completed
                        </div>
                      </div>
                      </div>
                    <div className="flex items-center gap-3 ml-auto">
                      {task.user_status?.status === "completed" ? (
                        <span className="flex items-center gap-1 text-emerald-400 text-sm">
                          <CheckCircle className="h-4 w-4 flex-shrink-0" />
                          <span className="hidden sm:inline">+${Number(task.user_status.earned_amount).toFixed(2)}</span>
                          <span className="sm:hidden">${Number(task.user_status.earned_amount).toFixed(2)}</span>
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-red-400 text-sm">
                          <XCircle className="h-4 w-4 flex-shrink-0" />
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
            <div className="mb-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <div className="text-xs sm:text-sm text-gray-400">Available Balance</div>
                <div className="text-2xl sm:text-3xl font-bold text-emerald-400">${Number(balance).toFixed(2)}</div>
              </div>
              <button
                onClick={() => setShowWithdrawForm(!showWithdrawForm)}
                className="flex items-center gap-2 rounded-lg bg-emerald-500 px-4 sm:px-5 py-2 sm:py-2.5 font-semibold transition hover:bg-emerald-600 text-sm whitespace-nowrap"
              >
                {showWithdrawForm ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                Request Withdrawal
              </button>
            </div>

            {showWithdrawForm && (
              <form onSubmit={submitWithdrawal} className="mb-6 rounded-xl border border-white/10 bg-white/5 p-4 sm:p-6 space-y-4">
                <div>
                  <label className="mb-1.5 block text-xs sm:text-sm font-medium text-gray-300">Amount ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    max={balance}
                    required
                    value={wAmount}
                    onChange={e => setWAmount(e.target.value)}
                    className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 text-white outline-none focus:border-emerald-500 text-sm"
                    placeholder="0.00"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs sm:text-sm font-medium text-gray-300">Payment Method</label>
                  <select
                    value={wMethod}
                    onChange={e => setWMethod(e.target.value)}
                    required
                    className="w-full rounded-lg border border-white/10 bg-gray-900 px-4 py-2.5 text-white outline-none focus:border-emerald-500 text-sm"
                  >
                    <option value="">Select method</option>
                    <option value="paypal">PayPal</option>
                    <option value="bank">Bank Transfer</option>
                    <option value="crypto">Crypto</option>
                  </select>
                </div>
                <div>
                  <label className="mb-1.5 block text-xs sm:text-sm font-medium text-gray-300">Payment Details</label>
                  <input
                    type="text"
                    required
                    value={wDetails}
                    onChange={e => setWDetails(e.target.value)}
                    className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 text-white outline-none focus:border-emerald-500 text-sm"
                    placeholder="PayPal email, wallet address, etc."
                  />
                </div>
                <button
                  type="submit"
                  className="w-full rounded-lg bg-emerald-500 py-2.5 sm:py-3 font-semibold transition hover:bg-emerald-600 text-sm"
                >
                  Submit Withdrawal
                </button>
              </form>
            )}

            <div className="space-y-3">
              {withdrawals.length === 0 ? (
                <div className="rounded-2xl border border-white/10 bg-white/5 p-8 sm:p-12 text-center">
                  <DollarSign className="mx-auto mb-4 h-10 w-10 sm:h-12 sm:w-12 text-gray-600" />
                  <h3 className="text-base sm:text-lg font-semibold text-gray-400">No withdrawals yet</h3>
                </div>
              ) : (
                withdrawals.map(w => (
                  <div key={w.id} className="flex flex-col sm:flex-row items-start sm:items-center justify-between rounded-xl border border-white/10 bg-white/5 p-4 gap-3 sm:gap-4">
                    <div>
                      <div className="font-medium">${Number(w.amount).toFixed(2)}</div>
                      <div className="text-xs sm:text-sm text-gray-400">
                        {w.payment_method} &middot; {new Date(w.created_at).toLocaleDateString()}
                      </div>
                    </div>
                    <span className={`rounded-full px-3 py-1 text-xs font-medium flex-shrink-0 ${
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
    </>
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
        {task.keywords && (
          <div className="mb-3 flex flex-wrap gap-1.5">
            {task.keywords.split(',').map((keyword, idx) => (
              <span key={idx} className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-xs text-emerald-400">
                {keyword.trim()}
              </span>
            ))}
          </div>
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
