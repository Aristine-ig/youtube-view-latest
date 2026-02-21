"use client";

import { useAuth } from "@/components/auth-provider";
import { useRouter } from "next/navigation";
import { useEffect, useState, useCallback, useMemo, useRef } from "react";
import { toast } from "sonner";
import {
  Play, DollarSign, CheckCircle, Clock, LogOut, ArrowDownToLine,
  XCircle, Wallet, ChevronDown, ChevronUp, Eye, X, Send, Info, AlertTriangle
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
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

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
  keywords?: string;
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
  const [timeRemaining, setTimeRemaining] = useState<number>(0);
  const [taskStartTime, setTaskStartTime] = useState<number | null>(null);
  const [taskTotalDuration, setTaskTotalDuration] = useState<number>(0);
  const [earlySubmitAttempts, setEarlySubmitAttempts] = useState<number>(0);
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const fetchTasks = useCallback(async () => {
    try {
      const res = await fetch("/api/tasks");
      if (res.ok) {
        const data = await res.json();
        setAvailable(data.available || []);
        setCompleted(data.completed || []);
        setOngoing(data.ongoing || []);
        setBalance(data.balance || 0);
      }
    } catch (error) {
      console.error("[v0] Error fetching tasks:", error);
      toast.error("Failed to load tasks");
    }
  }, []);

  const fetchWithdrawals = useCallback(async () => {
    try {
      const res = await fetch("/api/withdrawals");
      if (res.ok) {
        const data = await res.json();
        setWithdrawals(data.withdrawals || []);
        setBalance(data.balance || 0);
      }
    } catch (error) {
      console.error("[v0] Error fetching withdrawals:", error);
      toast.error("Failed to load withdrawals");
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

    Promise.all([fetchTasks(), fetchWithdrawals()])
      .finally(() => setLoading(false));
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
      console.error("[v0] Screenshot upload error:", err);
      toast.error("Failed to upload screenshots");
    } finally {
      setUploadingScreenshots(false);
    }
  };

  const removeScreenshot = useCallback((index: number) => {
    setScreenshots(prev => prev.filter((_, i) => i !== index));
  }, []);

  const handleSubmitClick = useCallback((pct: number) => {
    if (screenshots.length === 0) {
      toast.error("Please upload at least 1 screenshot before submitting");
      return;
    }

    // Check if user is submitting before 90% of timer is complete
    const elapsedTime = taskTotalDuration - timeRemaining;
    const requiredTime = taskTotalDuration * 0.9; // 90% of total duration

    if (elapsedTime < requiredTime) {
      const newAttempts = earlySubmitAttempts + 1;
      setEarlySubmitAttempts(newAttempts);

      if (newAttempts <= 2) {
        // First and second attempt: show warning
        const timeNeeded = Math.ceil((requiredTime - elapsedTime) / 60);
        toast.error(`Please watch the video completely. You need to wait ${timeNeeded} more minute(s).`);
        return;
      }
      // Third attempt will continue and be marked as suspicious
    }

    setSelectedCompletionPct(pct);
    setShowSubmitConfirm(true);
  }, [screenshots.length, timeRemaining, taskTotalDuration, earlySubmitAttempts]);

  const completeTask = async (taskId: string, completionPct: number) => {
    setShowSubmitConfirm(false);
    try {
      // Calculate submission timing
      const elapsedTime = taskTotalDuration - timeRemaining;
      const requiredTime = taskTotalDuration * 0.9;
      const isSuspicious = earlySubmitAttempts >= 2 && elapsedTime < requiredTime;

      const res = await fetch("/api/tasks/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          task_id: taskId,
          completion_pct: completionPct,
          screenshots,
          task_duration_seconds: taskTotalDuration,
          submission_time_seconds: Math.floor(elapsedTime),
          early_submit_count: earlySubmitAttempts,
          suspicious_completion: isSuspicious
        }),
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
      setEarlySubmitAttempts(0);
      setTaskTotalDuration(0);
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

  const handleLogout = useCallback(async () => {
    await logout();
    router.push("/");
  }, [logout, router]);

  // Parse video length and convert to seconds
  const parseVideoLength = (lengthStr: string | number): number => {
    if (!lengthStr) return 90; // Default 1:30 buffer

    // Convert to string if it's a number
    const str = typeof lengthStr === 'number' ? String(lengthStr) : lengthStr;
    const lower = str.toLowerCase().trim();
    let totalSeconds = 0;

    // Handle HH:MM:SS or MM:SS format
    if (lower.includes(':')) {
      const parts = lower.split(':').map(p => parseInt(p.trim()) || 0);
      if (parts.length === 3) {
        totalSeconds = parts[0] * 3600 + parts[1] * 60 + parts[2];
      } else if (parts.length === 2) {
        totalSeconds = parts[0] * 60 + parts[1];
      }
    }
    // Handle "X minutes" or "X min"
    else if (lower.includes('minute') || lower.includes('min')) {
      const match = lower.match(/(\d+)/);
      if (match) totalSeconds = parseInt(match[1]) * 60;
    }
    // Handle "X hours" or "X hr"
    else if (lower.includes('hour') || lower.includes('hr')) {
      const match = lower.match(/(\d+)/);
      if (match) totalSeconds = parseInt(match[1]) * 3600;
    }
    // Handle "X seconds" or "X sec"
    else if (lower.includes('second') || lower.includes('sec')) {
      const match = lower.match(/(\d+)/);
      if (match) totalSeconds = parseInt(match[1]);
    }
    // Just a number, assume minutes
    else {
      const match = lower.match(/(\d+)/);
      if (match) totalSeconds = parseInt(match[1]) * 60;
    }

    // Add 1 minute 30 seconds buffer
    return totalSeconds + 90;
  };

  // Timer effect for active task
  useEffect(() => {
    if (activeTask && activeTask.video_length) {
      console.log("[v0] Starting timer for task:", activeTask.id, "video_length:", activeTask.video_length);
      const totalSeconds = parseVideoLength(activeTask.video_length);
      console.log("[v0] Parsed total seconds:", totalSeconds);
      const startTime = Date.now();

      setTaskStartTime(startTime);
      setTimeRemaining(totalSeconds);
      setTaskTotalDuration(totalSeconds);
      setEarlySubmitAttempts(0);

      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
      }

      timerIntervalRef.current = setInterval(() => {
        const elapsed = Math.floor((Date.now() - startTime) / 1000);
        const remaining = Math.max(0, totalSeconds - elapsed);
        setTimeRemaining(remaining);

        if (remaining === 0) {
          if (timerIntervalRef.current) {
            clearInterval(timerIntervalRef.current);
          }
          toast.error("Task time expired! Please start the task again.");
          setActiveTask(null);
          setScreenshots([]);
          fetchTasks();
        }
      }, 1000);
    }

    return () => {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
        timerIntervalRef.current = null;
      }
    };
  }, [activeTask, fetchTasks]);

  // Memoize tab configuration
  const tabs = useMemo(() => [
    { key: "tasks" as const, label: "Available Tasks", icon: Play },
    { key: "ongoing" as const, label: "Ongoing", icon: Clock },
    { key: "completed" as const, label: "Completed", icon: CheckCircle },
    { key: "withdraw" as const, label: "Withdraw", icon: ArrowDownToLine },
  ], []);

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
                <button onClick={() => setActiveTask(null)} className="text-gray-400 hover:text-white transition">
                  <XCircle className="h-6 w-6" />
                </button>
              </div>
              {activeTask.video_thumbnail && (
                <div className="mb-6 rounded-xl overflow-hidden border border-white/10">
                  <img src={activeTask.video_thumbnail} alt={activeTask.title} className="w-full h-64 object-cover" loading="lazy" />
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
              </div>

              {/* Timer Display */}
              <div className={`mb-6 rounded-xl border p-4 ${timeRemaining < 60
                  ? 'bg-red-500/10 border-red-500/30'
                  : timeRemaining < 180
                    ? 'bg-amber-500/10 border-amber-500/30'
                    : 'bg-emerald-500/10 border-emerald-500/30'
                }`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`flex items-center justify-center rounded-lg p-2 ${timeRemaining < 60
                        ? 'bg-red-500/20'
                        : timeRemaining < 180
                          ? 'bg-amber-500/20'
                          : 'bg-emerald-500/20'
                      }`}>
                      <Clock className={`h-5 w-5 ${timeRemaining < 60
                          ? 'text-red-400'
                          : timeRemaining < 180
                            ? 'text-amber-400'
                            : 'text-emerald-400'
                        }`} />
                    </div>
                    <div>
                      <div className="text-sm text-gray-400 mb-1">Time Remaining</div>
                      <div className={`text-2xl font-bold font-mono ${timeRemaining < 60
                          ? 'text-red-400'
                          : timeRemaining < 180
                            ? 'text-amber-400'
                            : 'text-emerald-400'
                        }`}>
                        {Math.floor(timeRemaining / 60)}:{String(timeRemaining % 60).padStart(2, '0')}
                      </div>
                    </div>
                  </div>
                  <div className={`text-xs font-semibold px-3 py-1.5 rounded-full ${timeRemaining < 60
                      ? 'bg-red-500/20 text-red-300'
                      : timeRemaining < 180
                        ? 'bg-amber-500/20 text-amber-300'
                        : 'bg-emerald-500/20 text-emerald-300'
                    }`}>
                    {timeRemaining < 60 ? 'HURRY!' : timeRemaining < 180 ? 'Running Low' : 'In Progress'}
                  </div>
                </div>
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
                  <p className="text-sm text-gray-400 mb-3">Upload Screenshots (up to 3, max 1MB each):</p>
                  <input
                    type="file"
                    multiple
                    accept="image/*"
                    onChange={handleScreenshotUpload}
                    disabled={uploadingScreenshots || screenshots.length >= 3}
                    className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 text-white outline-none focus:border-emerald-500 file:mr-4 file:rounded file:border-0 file:bg-emerald-500 file:px-3 file:py-1 file:text-sm file:text-white file:cursor-pointer hover:file:bg-emerald-600 disabled:opacity-50 disabled:cursor-not-allowed"
                  />
                  {uploadingScreenshots && <p className="mt-2 text-sm text-gray-400">Uploading...</p>}

                  {screenshots.length > 0 && (
                    <div className="mt-3 grid grid-cols-3 gap-2">
                      {screenshots.map((url, idx) => (
                        <div key={idx} className="relative rounded-lg overflow-hidden border border-white/10">
                          <img src={url} alt={`Screenshot ${idx + 1}`} className="w-full h-24 object-cover" loading="lazy" />
                          <button
                            onClick={() => removeScreenshot(idx)}
                            className="absolute top-1 right-1 bg-red-500/80 hover:bg-red-600 rounded-full p-1 transition"
                            aria-label={`Remove screenshot ${idx + 1}`}
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
                  className="w-full rounded-xl py-3.5 font-semibold transition flex items-center justify-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled={uploadingScreenshots}
                >
                  <Send className="h-5 w-5" />
                  Submit Task
                </button>
              </div>
            </div>
          </div>
        </div>
      </>
    );
  }

  return (
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
            <Popover>
              <PopoverTrigger asChild>
                <button
                  className="group relative flex items-center gap-1.5 rounded-full bg-gradient-to-br from-amber-500/20 to-amber-600/20 hover:from-amber-500/30 hover:to-amber-600/30 border border-amber-500/30 hover:border-amber-400/50 px-3 py-1.5 transition-all duration-200 hover:shadow-lg hover:shadow-amber-500/20 hover:scale-105"
                  aria-label="Important warning"
                >
                  <AlertTriangle className="h-4 w-4 text-amber-400 group-hover:text-amber-300 transition-colors" />
                  <span className="text-xs font-medium text-amber-300 group-hover:text-amber-200 transition-colors hidden sm:inline">Warning</span>
                </button>
              </PopoverTrigger>
              <PopoverContent
                className="w-80 sm:w-96 bg-gradient-to-br from-gray-900 via-gray-900 to-gray-950 border-amber-500/30 shadow-xl shadow-amber-500/10 text-white p-0 overflow-hidden"
                sideOffset={8}
              >
                <div className="bg-gradient-to-r from-amber-500/20 via-amber-600/20 to-orange-500/20 border-b border-amber-500/30 px-4 py-3.5 flex items-center gap-3">
                  <div className="flex items-center justify-center rounded-lg bg-amber-500/20 p-2 border border-amber-400/30">
                    <AlertTriangle className="h-5 w-5 text-amber-300" />
                  </div>
                  <h3 className="font-bold text-base text-amber-200">Important User Warning</h3>
                </div>
                <div className="p-5 space-y-4">
                  <div className="flex items-start gap-3 group/item">
                    <div className="flex items-center justify-center h-6 w-6 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex-shrink-0 mt-0.5">
                      <CheckCircle className="h-3.5 w-3.5 text-emerald-400" />
                    </div>
                    <p className="text-sm text-gray-300 leading-relaxed">
                      Rewards will only be credited for genuine, complete, and verified video views.
                    </p>
                  </div>
                  <div className="flex items-start gap-3 group/item">
                    <div className="flex items-center justify-center h-6 w-6 rounded-full bg-red-500/10 border border-red-500/30 flex-shrink-0 mt-0.5">
                      <XCircle className="h-3.5 w-3.5 text-red-400" />
                    </div>
                    <p className="text-sm text-gray-300 leading-relaxed">
                      Use of bots, scripts, automation tools, or artificial engagement is strictly prohibited.
                    </p>
                  </div>
                  <div className="flex items-start gap-3 group/item">
                    <div className="flex items-center justify-center h-6 w-6 rounded-full bg-red-500/10 border border-red-500/30 flex-shrink-0 mt-0.5">
                      <XCircle className="h-3.5 w-3.5 text-red-400" />
                    </div>
                    <p className="text-sm text-gray-300 leading-relaxed">
                      Accounts involved in suspicious or unfair activity will be permanently banned
                    </p>
                  </div>
                </div>
                <div className="bg-amber-500/5 border-t border-amber-400/20 px-5 py-3 text-center">
                  <p className="text-xs text-amber-400/80 font-medium">Stay compliant to keep earning rewards</p>
                </div>
              </PopoverContent>
            </Popover>
            <div className="flex items-center gap-1 sm:gap-2 rounded-lg bg-emerald-500/10 px-2 sm:px-4 py-2">
              <Wallet className="h-3 w-3 sm:h-4 sm:w-4 text-emerald-400" />
              <span className="text-xs sm:text-sm font-bold text-emerald-400">${Number(balance).toFixed(2)}</span>
            </div>
            <span className="text-xs sm:text-sm text-gray-400 hidden sm:inline">{user?.name}</span>
            <button
              onClick={handleLogout}
              className="text-gray-400 hover:text-white flex-shrink-0 transition"
              aria-label="Logout"
            >
              <LogOut className="h-4 w-4 sm:h-5 sm:w-5" />
            </button>
          </div>
        </div>
      </nav>

      <div className="mx-auto max-w-6xl px-4 sm:px-6 py-6 sm:py-8">
        {/* Tabs */}
        <div className="mb-6 sm:mb-8 flex gap-1 rounded-xl bg-white/5 p-1 overflow-x-auto">
          {tabs.map(t => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`flex flex-1 items-center justify-center gap-1 sm:gap-2 rounded-lg py-2 sm:py-3 px-2 sm:px-3 text-xs sm:text-sm font-medium transition whitespace-nowrap ${tab === t.key ? "bg-emerald-500 text-white" : "text-gray-400 hover:text-white"
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
              <EmptyState
                icon={Eye}
                title="No tasks available"
                description="Check back later for new video tasks."
              />
            ) : (
              <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
                {available.map(task => (
                  <TaskCard
                    key={task.id}
                    task={task}
                    onStart={() => startTask(task.id)}
                    starting={startingTask === task.id}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* Ongoing Tasks */}
        {tab === "ongoing" && (
          <div>
            {ongoing.length === 0 ? (
              <EmptyState
                icon={Clock}
                title="No ongoing tasks"
                description="Start a task to see it here."
              />
            ) : (
              <div className="space-y-3">
                {ongoing.map(task => (
                  <OngoingTaskCard
                    key={task.id}
                    task={task}
                    onView={() => setActiveTask(task)}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* Completed Tasks */}
        {tab === "completed" && (
          <div>
            {completed.length === 0 ? (
              <EmptyState
                icon={CheckCircle}
                title="No completed tasks yet"
                description="Start watching videos to earn!"
              />
            ) : (
              <div className="space-y-3">
                {completed.map(task => (
                  <CompletedTaskCard key={task.id} task={task} />
                ))}
              </div>
            )}
          </div>
        )}

        {/* Withdraw */}
        {tab === "withdraw" && (
          <WithdrawSection
            balance={balance}
            showWithdrawForm={showWithdrawForm}
            setShowWithdrawForm={setShowWithdrawForm}
            wAmount={wAmount}
            setWAmount={setWAmount}
            wMethod={wMethod}
            setWMethod={setWMethod}
            wDetails={wDetails}
            setWDetails={setWDetails}
            submitWithdrawal={submitWithdrawal}
            withdrawals={withdrawals}
          />
        )}
      </div>
    </div>
  );
}

// Optimized Empty State Component
function EmptyState({ icon: Icon, title, description }: { icon: any; title: string; description: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-8 sm:p-12 text-center">
      <Icon className="mx-auto mb-4 h-10 w-10 sm:h-12 sm:w-12 text-gray-600" />
      <h3 className="text-base sm:text-lg font-semibold text-gray-400">{title}</h3>
      <p className="text-xs sm:text-sm text-gray-500">{description}</p>
    </div>
  );
}

// Optimized Task Card Component
function TaskCard({ task, onStart, starting }: { task: Task; onStart: () => void; starting: boolean }) {
  const [imageError, setImageError] = useState(false);

  return (
    <div className="overflow-hidden rounded-2xl border border-white/10 bg-white/5 hover:border-white/20 transition">
      <div className="flex h-40 items-center justify-center bg-white/5">
        {task.video_thumbnail && !imageError ? (
          <img
            src={task.video_thumbnail}
            alt="Video thumbnail"
            className="h-full w-full object-cover"
            onError={() => setImageError(true)}
            loading="lazy"
          />
        ) : (
          <Play className="h-12 w-12 text-gray-600" />
        )}
      </div>
      <div className="p-5">
        <h3 className="mb-1 font-semibold leading-tight line-clamp-2">{task.title || "Task"}</h3>
        {task.channel_name && (
          <p className="mb-2 text-xs text-gray-500 truncate">Channel: {task.channel_name}</p>
        )}
        {task.video_length && (
          <p className="mb-2 text-xs text-gray-500">Length: {task.video_length}</p>
        )}
        {task.required_actions && (
          <p className="mb-3 text-sm text-gray-400 line-clamp-2">{task.required_actions}</p>
        )}
        {task.keywords && (
          <div className="mb-3 flex flex-wrap gap-1.5">
            {task.keywords.split(',').slice(0, 3).map((keyword, idx) => (
              <span key={idx} className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-xs text-emerald-400 truncate">
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
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-500 py-2.5 text-sm font-semibold transition hover:bg-emerald-600 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Play className="h-4 w-4" fill="white" />
          {starting ? "Starting..." : "Start Task"}
        </button>
      </div>
    </div>
  );
}

// Ongoing Task Card Component
function OngoingTaskCard({ task, onView }: { task: Task; onView: () => void }) {
  return (
    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between rounded-xl border border-white/10 bg-white/5 p-4 gap-3 sm:gap-4 hover:border-white/20 transition">
      <div className="flex items-center gap-3 w-full sm:w-auto">
        <div className="h-14 w-20 rounded-lg bg-white/10 flex-shrink-0 overflow-hidden">
          {task.video_thumbnail ? (
            <img src={task.video_thumbnail} alt={task.title || "Task"} className="h-full w-full object-cover" loading="lazy" />
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
          onClick={onView}
          className="flex flex-1 sm:flex-initial items-center justify-center gap-2 rounded-lg bg-emerald-500 px-3 sm:px-4 py-2 text-xs sm:text-sm font-semibold transition hover:bg-emerald-600 whitespace-nowrap"
        >
          <Eye className="h-3 w-3 sm:h-4 sm:w-4" />
          <span className="hidden sm:inline">View Details</span>
          <span className="sm:hidden">View</span>
        </button>
      </div>
    </div>
  );
}

// Completed Task Card Component
function CompletedTaskCard({ task }: { task: Task }) {
  return (
    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between rounded-xl border border-white/10 bg-white/5 p-4 gap-3 sm:gap-4">
      <div className="flex items-center gap-3 w-full sm:w-auto min-w-0">
        <div className="h-14 w-20 rounded-lg bg-white/10 flex-shrink-0 overflow-hidden">
          {task.video_thumbnail ? (
            <img src={task.video_thumbnail} alt={task.title || "Task"} className="h-full w-full object-cover" loading="lazy" />
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
  );
}

// Withdraw Section Component
function WithdrawSection({
  balance,
  showWithdrawForm,
  setShowWithdrawForm,
  wAmount,
  setWAmount,
  wMethod,
  setWMethod,
  wDetails,
  setWDetails,
  submitWithdrawal,
  withdrawals,
}: {
  balance: number;
  showWithdrawForm: boolean;
  setShowWithdrawForm: (show: boolean) => void;
  wAmount: string;
  setWAmount: (amount: string) => void;
  wMethod: string;
  setWMethod: (method: string) => void;
  wDetails: string;
  setWDetails: (details: string) => void;
  submitWithdrawal: (e: React.FormEvent) => void;
  withdrawals: Withdrawal[];
}) {
  return (
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
          <EmptyState
            icon={DollarSign}
            title="No withdrawals yet"
            description=""
          />
        ) : (
          withdrawals.map(w => (
            <div key={w.id} className="flex flex-col sm:flex-row items-start sm:items-center justify-between rounded-xl border border-white/10 bg-white/5 p-4 gap-3 sm:gap-4">
              <div>
                <div className="font-medium">${Number(w.amount).toFixed(2)}</div>
                <div className="text-xs sm:text-sm text-gray-400">
                  {w.payment_method} &middot; {new Date(w.created_at).toLocaleDateString()}
                </div>
              </div>
              <span className={`rounded-full px-3 py-1 text-xs font-medium flex-shrink-0 ${w.status === "approved" ? "bg-emerald-500/10 text-emerald-400" :
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
  );
}
