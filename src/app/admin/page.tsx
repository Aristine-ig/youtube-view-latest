"use client";

import { useAuth } from "@/components/auth-provider";
import { useRouter } from "next/navigation";
import { useEffect, useState, useCallback } from "react";
import { toast } from "sonner";
import Link from "next/link";
import {
  Play, LogOut, LayoutDashboard, ListVideo, Users, ArrowDownToLine,
  TrendingUp, TrendingDown, AlertTriangle, DollarSign, CheckCircle, Clock,
  Plus, Pencil, Trash2, ToggleLeft, ToggleRight, X
} from "lucide-react";

interface Analytics {
  totalUsers: number;
  activeUsers: number;
  suspendedUsers: number;
  totalTasks: number;
  activeTasks: number;
  totalCompletions: number;
  inProgressCompletions: number;
  failedCompletions: number;
  fraudFlags: number;
  completionRate: number;
  dropOffRate: number;
  totalEarned: string;
  pendingWithdrawals: number;
  totalPendingAmount: string;
  totalApprovedAmount: string;
}

interface Task {
  id: string;
  channel_name: string;
  title: string;
  video_thumbnail: string;
  video_length: string;
  required_actions: string;
  reward_amount: number;
  max_users: number;
  completed_count: number;
  is_enabled: boolean;
  created_at: string;
}

const emptyForm = {
  channel_name: "",
  title: "",
  video_thumbnail: "",
  keywords: "",
  video_length: "",
  required_actions: "",
  reward_amount: "",
  max_users: "100",
  is_enabled: true,
};

export default function AdminPage() {
  const { user, loading: authLoading, logout } = useAuth();
  const router = useRouter();
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  const fetchAnalytics = useCallback(async () => {
    const res = await fetch("/api/admin/analytics");
    if (res.ok) {
      const data = await res.json();
      setAnalytics(data.analytics);
    }
  }, []);

  const fetchTasks = useCallback(async () => {
    const res = await fetch("/api/admin/tasks");
    if (res.ok) {
      const data = await res.json();
      setTasks(data.tasks);
    }
  }, []);

  useEffect(() => {
    if (authLoading) return;
    if (!user || user.role !== "admin") { router.push("/login"); return; }
    Promise.all([fetchAnalytics(), fetchTasks()]).finally(() => setLoading(false));
  }, [user, authLoading, router, fetchAnalytics, fetchTasks]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate required fields
    if (!form.channel_name || !form.channel_name.trim()) {
      toast.error("Channel name is required");
      return;
    }
    if (!form.title || !form.title.trim()) {
      toast.error("Title is required");
      return;
    }
    if (!form.video_thumbnail || !form.video_thumbnail.trim()) {
      toast.error("Video thumbnail is required");
      return;
    }
    if (!form.reward_amount || parseFloat(form.reward_amount) <= 0) {
      toast.error("Valid reward amount is required");
      return;
    }
    
    try {
      if (editingId) {
        const res = await fetch("/api/admin/tasks", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: editingId, ...form }),
        });
        if (!res.ok) throw new Error((await res.json()).error);
        toast.success("Task updated");
      } else {
        const res = await fetch("/api/admin/tasks", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(form),
        });
        if (!res.ok) throw new Error((await res.json()).error);
        toast.success("Task created");
      }
      setShowForm(false);
      setEditingId(null);
      setForm(emptyForm);
      setImagePreview(null);
      await Promise.all([fetchTasks(), fetchAnalytics()]);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed");
    }
  };

  const deleteTask = async (id: string) => {
    if (!confirm("Delete this task?")) return;
    const res = await fetch("/api/admin/tasks", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    if (res.ok) {
      toast.success("Task deleted");
      await Promise.all([fetchTasks(), fetchAnalytics()]);
    }
  };

  const toggleTask = async (task: Task) => {
    const res = await fetch("/api/admin/tasks", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: task.id, is_enabled: !task.is_enabled }),
    });
    if (res.ok) {
      toast.success(task.is_enabled ? "Task disabled" : "Task enabled");
      await Promise.all([fetchTasks(), fetchAnalytics()]);
    }
  };

  const editTask = (task: Task) => {
    setEditingId(task.id);
    setForm({
      channel_name: task.channel_name || "",
      title: task.title || "",
      video_thumbnail: task.video_thumbnail || "",
      keywords: task.keywords || "",
      video_length: task.video_length || "",
      required_actions: task.required_actions || "",
      reward_amount: String(task.reward_amount),
      max_users: String(task.max_users),
      is_enabled: task.is_enabled,
    });
    setImagePreview(task.video_thumbnail || null);
    setShowForm(true);
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file");
      return;
    }

    // Validate file size (max 1MB)
    const maxSize = 1 * 1024 * 1024; // 1MB in bytes
    if (file.size > maxSize) {
      toast.error("Image size must be less than 1MB");
      return;
    }

    // Create preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setImagePreview(reader.result as string);
    };
    reader.readAsDataURL(file);

    // Upload to Supabase (compression handled by API)
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/upload", { method: "POST", body: formData });
      if (res.ok) {
        const data = await res.json();
        setForm({ ...form, video_thumbnail: data.url });
        toast.success("Image uploaded and compressed");
      } else {
        const error = await res.json();
        throw new Error(error.error || "Upload failed");
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to upload image");
      setImagePreview(null);
    } finally {
      setUploading(false);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-950">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-emerald-500 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <nav className="border-b border-white/10 px-4 sm:px-6 py-3 sm:py-4">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-2 flex-wrap">
          <Link href="/admin" className="flex items-center gap-2 flex-shrink-0">
            <div className="flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center rounded-lg bg-emerald-500">
              <Play className="h-4 w-4 sm:h-5 sm:w-5 text-white" fill="white" />
            </div>
            <span className="text-lg sm:text-xl font-bold hidden sm:inline">WatchEarn</span>
            <span className="rounded-md bg-amber-500/10 px-2 py-0.5 text-xs font-medium text-amber-400">Admin</span>
          </Link>
          <div className="flex items-center gap-1 sm:gap-1.5 ml-auto">
            <Link href="/admin" className="flex items-center gap-1 rounded-lg bg-white/10 px-2 sm:px-3 py-2 text-xs sm:text-sm text-white whitespace-nowrap">
              <LayoutDashboard className="h-3 w-3 sm:h-4 sm:w-4" /> <span className="hidden sm:inline">Dashboard</span>
            </Link>
            <Link href="/admin/users" className="flex items-center gap-1 rounded-lg px-2 sm:px-3 py-2 text-xs sm:text-sm text-gray-400 hover:bg-white/5 hover:text-white whitespace-nowrap">
              <Users className="h-3 w-3 sm:h-4 sm:w-4" /> <span className="hidden sm:inline">Users</span>
            </Link>
            <Link href="/admin/withdrawals" className="flex items-center gap-1 rounded-lg px-2 sm:px-3 py-2 text-xs sm:text-sm text-gray-400 hover:bg-white/5 hover:text-white whitespace-nowrap">
              <ArrowDownToLine className="h-3 w-3 sm:h-4 sm:w-4" /> <span className="hidden sm:inline">Withdrawals</span>
            </Link>
            <button onClick={async () => { await logout(); router.push("/"); }} className="ml-1 text-gray-400 hover:text-white flex-shrink-0">
              <LogOut className="h-4 w-4 sm:h-5 sm:w-5" />
            </button>
          </div>
        </div>
      </nav>

      <div className="mx-auto max-w-7xl px-4 sm:px-6 py-6 sm:py-8">
        {/* Analytics Section */}
        <div className="mb-10">
          <div className="mb-6 flex items-center gap-3">
            <LayoutDashboard className="h-5 w-5 sm:h-6 sm:w-6 text-emerald-400" />
            <h1 className="text-xl sm:text-2xl font-bold">Analytics Dashboard</h1>
          </div>

          {analytics && (
            <div className="grid gap-3 sm:gap-4 grid-cols-2 sm:grid-cols-2 lg:grid-cols-4">
              <StatCard icon={Users} label="Total Users" value={analytics.totalUsers} sub={`${analytics.activeUsers} active, ${analytics.suspendedUsers} suspended`} />
              <StatCard icon={ListVideo} label="Total Tasks" value={analytics.totalTasks} sub={`${analytics.activeTasks} active`} />
              <StatCard icon={CheckCircle} label="Completions" value={analytics.totalCompletions} sub={`${analytics.inProgressCompletions} in progress`} color="emerald" />
              <StatCard icon={DollarSign} label="Total Earned" value={`$${analytics.totalEarned}`} sub={`$${analytics.totalApprovedAmount} withdrawn`} color="emerald" />
              <StatCard icon={TrendingUp} label="Completion Rate" value={`${analytics.completionRate}%`} sub="of started tasks" color="emerald" />
              <StatCard icon={TrendingDown} label="Drop-off Rate" value={`${analytics.dropOffRate}%`} sub="failed or abandoned" color="amber" />
              <StatCard icon={AlertTriangle} label="Fraud Flags" value={analytics.fraudFlags} sub="suspicious completions" color="red" />
              <StatCard icon={Clock} label="Pending Withdrawals" value={analytics.pendingWithdrawals} sub={`$${analytics.totalPendingAmount} pending`} color="amber" />
            </div>
          )}
        </div>

        {/* Divider */}
        <div className="mb-8 border-t border-white/10" />

        {/* Task Management Section */}
        <div>
          <div className="mb-6 flex items-center justify-between gap-3 sm:gap-4">
            <div className="flex items-center gap-3">
              <ListVideo className="h-5 w-5 sm:h-6 sm:w-6 text-emerald-400 flex-shrink-0" />
              <h2 className="text-xl sm:text-2xl font-bold">Manage Tasks</h2>
            </div>
            <button
              onClick={() => { setShowForm(true); setEditingId(null); setForm(emptyForm); setImagePreview(null); }}
              className="flex items-center gap-2 rounded-lg bg-emerald-500 px-4 py-2.5 text-xs sm:text-sm font-semibold transition hover:bg-emerald-600 whitespace-nowrap flex-shrink-0"
            >
              <Plus className="h-4 w-4" /> <span className="hidden sm:inline">Add Task</span><span className="sm:hidden">Add</span>
            </button>
          </div>

          {/* Form Modal */}
          {showForm && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
              <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl border border-white/10 bg-gray-900 p-6">
                <div className="mb-4 flex items-center justify-between">
                  <h2 className="text-xl font-bold">{editingId ? "Edit Task" : "Add New Task"}</h2>
                  <button onClick={() => { setShowForm(false); setEditingId(null); setForm(emptyForm); setImagePreview(null); }}>
                    <X className="h-5 w-5 text-gray-400 hover:text-white" />
                  </button>
                </div>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label className="mb-1 block text-sm font-medium text-gray-300">Channel Name *</label>
                    <input required value={form.channel_name} onChange={e => setForm({ ...form, channel_name: e.target.value })} className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 text-white outline-none focus:border-emerald-500" placeholder="Channel name" />
                  </div>
                   <div>
                    <label className="mb-1 block text-sm font-medium text-gray-300">Title</label>
                    <input required value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 text-white outline-none focus:border-emerald-500" placeholder="Title" />
                  </div>
                  
                  <div>
                    <label className="mb-1 block text-sm font-medium text-gray-300">Video Thumbnail</label>
                    <input 
                      type="file" 
                      accept="image/*" 
                      onChange={handleImageUpload} 
                      disabled={uploading}
                      className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 text-white outline-none focus:border-emerald-500 file:mr-4 file:rounded file:border-0 file:bg-emerald-500 file:px-3 file:py-1 file:text-sm file:text-white file:cursor-pointer hover:file:bg-emerald-600"
                    />
                    {uploading && <p className="mt-2 text-sm text-gray-400">Uploading...</p>}
                    {imagePreview && (
                      <div className="mt-3 rounded-lg border border-white/10 overflow-hidden">
                        <img src={imagePreview} alt="Thumbnail preview" className="w-full h-48 object-cover" />
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="mb-1 block text-sm font-medium text-gray-300">Keywords / Hashtags</label>
                    <input 
                      value={form.keywords} 
                      onChange={e => setForm({ ...form, keywords: e.target.value })} 
                      className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 text-white outline-none focus:border-emerald-500" 
                      placeholder="e.g. gaming, tutorial, music"
                    />
                    <p className="mt-1 text-xs text-gray-500">Separate multiple keywords with commas</p>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="mb-1 block text-sm font-medium text-gray-300">Video Length</label>
                      <input value={form.video_length} onChange={e => setForm({ ...form, video_length: e.target.value })} className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 text-white outline-none focus:border-emerald-500" placeholder="e.g. 10:30" />
                    </div>
                    <div>
                      <label className="mb-1 block text-sm font-medium text-gray-300">Reward (Rs) *</label>
                      <input required type="number" step="0.01" min="0.01" value={form.reward_amount} onChange={e => setForm({ ...form, reward_amount: e.target.value })} className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 text-white outline-none focus:border-emerald-500" />
                    </div>
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium text-gray-300">Required Actions</label>
                    <textarea value={form.required_actions} onChange={e => setForm({ ...form, required_actions: e.target.value })} rows={3} className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 text-white outline-none focus:border-emerald-500" placeholder="e.g. Like, Subscribe, Comment" />
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium text-gray-300">Max Users (Limit)</label>
                    <input type="number" min="1" value={form.max_users} onChange={e => setForm({ ...form, max_users: e.target.value })} className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 text-white outline-none focus:border-emerald-500" />
                  </div>
                  <div className="flex items-center gap-3">
                    <label className="text-sm font-medium text-gray-300">Enabled</label>
                    <button type="button" onClick={() => setForm({ ...form, is_enabled: !form.is_enabled })}>
                      {form.is_enabled ? <ToggleRight className="h-6 w-6 text-emerald-400" /> : <ToggleLeft className="h-6 w-6 text-gray-500" />}
                    </button>
                  </div>
                  <button type="submit" className="w-full rounded-lg bg-emerald-500 py-3 font-semibold transition hover:bg-emerald-600">
                    {editingId ? "Update Task" : "Create Task"}
                  </button>
                </form>
              </div>
            </div>
          )}

          {/* Tasks Table */}
          <div className="overflow-x-auto rounded-xl border border-white/10 scrollbar-thin scrollbar-thumb-emerald-500 scrollbar-track-white/5">
            <table className="w-full text-xs sm:text-sm">
              <thead className="border-b border-white/10 bg-white/5 sticky top-0">
                <tr className="text-left text-gray-400">
                  <th className="px-3 sm:px-4 py-3 whitespace-nowrap">Channel</th>
                  <th className="px-3 sm:px-4 py-3 whitespace-nowrap">Length</th>
                  <th className="px-3 sm:px-4 py-3 whitespace-nowrap">Actions</th>
                  <th className="px-3 sm:px-4 py-3 whitespace-nowrap">Reward</th>
                  <th className="px-3 sm:px-4 py-3 whitespace-nowrap">Users</th>
                  <th className="px-3 sm:px-4 py-3 whitespace-nowrap">Status</th>
                  <th className="px-3 sm:px-4 py-3 whitespace-nowrap text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {tasks.map(task => (
                  <tr key={task.id} className="hover:bg-white/5 text-xs sm:text-sm">
                    <td className="px-3 sm:px-4 py-3 font-medium max-w-[100px] truncate">{task.channel_name || "-"}</td>
                    <td className="px-3 sm:px-4 py-3 whitespace-nowrap">{task.video_length || "-"}</td>
                    <td className="px-3 sm:px-4 py-3 max-w-[80px] truncate text-xs">{task.required_actions || "-"}</td>
                    <td className="px-3 sm:px-4 py-3 text-emerald-400 font-medium whitespace-nowrap">${Number(task.reward_amount).toFixed(2)}</td>
                    <td className="px-3 sm:px-4 py-3 whitespace-nowrap">{(task.completed_count || 0)}/{task.max_users}</td>
                    <td className="px-3 sm:px-4 py-3 whitespace-nowrap">
                      <button onClick={() => toggleTask(task)}>
                        {task.is_enabled
                          ? <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-xs text-emerald-400 whitespace-nowrap"><ToggleRight className="h-3 w-3" /> <span className="hidden sm:inline">Active</span></span>
                          : <span className="inline-flex items-center gap-1 rounded-full bg-red-500/10 px-2 py-0.5 text-xs text-red-400 whitespace-nowrap"><ToggleLeft className="h-3 w-3" /> <span className="hidden sm:inline">Disabled</span></span>
                        }
                      </button>
                    </td>
                    <td className="px-3 sm:px-4 py-3 whitespace-nowrap">
                      <div className="flex items-center gap-1 justify-end">
                        <button onClick={() => editTask(task)} className="rounded-lg p-1.5 text-gray-400 hover:bg-white/10 hover:text-white">
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button onClick={() => deleteTask(task.id)} className="rounded-lg p-1.5 text-gray-400 hover:bg-red-500/10 hover:text-red-400">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {tasks.length === 0 && (
                  <tr><td colSpan={7} className="px-3 sm:px-4 py-8 sm:py-12 text-center text-gray-500 text-xs sm:text-sm">No tasks yet. Click &quot;Add Task&quot; to create one.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ icon: Icon, label, value, sub, color = "white" }: {
  icon: React.ElementType;
  label: string;
  value: string | number;
  sub: string;
  color?: string;
}) {
  const colorMap: Record<string, string> = {
    white: "text-white",
    emerald: "text-emerald-400",
    amber: "text-amber-400",
    red: "text-red-400",
  };
  return (
    <div className="rounded-xl border border-white/10 bg-white/5 p-5">
      <div className="mb-3 flex items-center gap-2 text-gray-400">
        <Icon className="h-4 w-4" />
        <span className="text-sm">{label}</span>
      </div>
      <div className={`text-2xl font-bold ${colorMap[color]}`}>{value}</div>
      <div className="mt-1 text-xs text-gray-500">{sub}</div>
    </div>
  );
}
