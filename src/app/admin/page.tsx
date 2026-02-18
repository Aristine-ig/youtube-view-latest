"use client";

import { useAuth } from "@/components/auth-provider";
import { useRouter } from "next/navigation";
import { useEffect, useState, useCallback } from "react";
import { toast } from "sonner";
import Link from "next/link";
import {
  Play,
  LogOut,
  LayoutDashboard,
  ListVideo,
  Users,
  ArrowDownToLine,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  DollarSign,
  CheckCircle,
  Clock,
  Plus,
  Pencil,
  Trash2,
  ToggleLeft,
  ToggleRight,
  X,
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

  /* ================= FETCH ================= */

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

    if (!user || user.role !== "admin") {
      router.push("/login");
      return;
    }

    Promise.all([fetchAnalytics(), fetchTasks()]).finally(() =>
      setLoading(false)
    );
  }, [user, authLoading, router, fetchAnalytics, fetchTasks]);

  /* ================= IMAGE UPLOAD ================= */

  const handleImageUpload = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      setImagePreview(reader.result as string);
    };
    reader.readAsDataURL(file);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) throw new Error("Upload failed");

      const data = await res.json();

      setForm((prev) => ({
        ...prev,
        video_thumbnail: data.url,
      }));

      toast.success("Image uploaded");
    } catch {
      toast.error("Upload failed");
    }
  };

  /* ================= FORM HANDLERS ================= */

  const handleFormOpen = () => {
    setShowForm(true);
    setEditingId(null);
    setForm(emptyForm);
    setImagePreview(null);
  };

  const handleFormClose = () => {
    setShowForm(false);
    setEditingId(null);
    setForm(emptyForm);
    setImagePreview(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const payload = {
        ...form,
        reward_amount: Number(form.reward_amount),
        max_users: Number(form.max_users),
      };

      const res = await fetch("/api/admin/tasks", {
        method: editingId ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editingId ? { id: editingId, ...payload } : payload),
      });

      if (!res.ok) throw new Error("Operation failed");

      toast.success(editingId ? "Task updated" : "Task created");

      handleFormClose();
      await Promise.all([fetchTasks(), fetchAnalytics()]);
    } catch (err) {
      toast.error("Failed to save task");
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
      body: JSON.stringify({
        id: task.id,
        is_enabled: !task.is_enabled,
      }),
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
      video_length: task.video_length || "",
      required_actions: task.required_actions || "",
      reward_amount: String(task.reward_amount),
      max_users: String(task.max_users),
      is_enabled: task.is_enabled,
    });

    setImagePreview(task.video_thumbnail || null);
    setShowForm(true);
  };

  /* ================= LOADING ================= */

  if (authLoading || loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-950">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-emerald-500 border-t-transparent" />
      </div>
    );
  }

  /* ================= UI ================= */

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {/* Navbar */}
      <nav className="border-b border-white/10 px-6 py-4">
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          <Link href="/admin" className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-500">
              <Play className="h-5 w-5 text-white" fill="white" />
            </div>
            <span className="text-xl font-bold">WatchEarn</span>
          </Link>

          <button
            onClick={async () => {
              await logout();
              router.push("/");
            }}
          >
            <LogOut className="h-5 w-5 text-gray-400 hover:text-white" />
          </button>
        </div>
      </nav>

      {/* Page Content */}
      <div className="mx-auto max-w-7xl px-6 py-8">

        {/* Task Section */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold">Manage Tasks</h2>
          <button
            onClick={handleFormOpen}
            className="flex items-center gap-2 rounded-lg bg-emerald-500 px-4 py-2 font-semibold hover:bg-emerald-600"
          >
            <Plus className="h-4 w-4" />
            Add Task
          </button>
        </div>

        {/* Modal */}
        {showForm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
            <div className="w-full max-w-2xl rounded-2xl bg-gray-900 p-6">
              <div className="flex justify-between mb-4">
                <h2 className="text-xl font-bold">
                  {editingId ? "Edit Task" : "Add Task"}
                </h2>
                <button onClick={handleFormClose}>
                  <X />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">

                <input
                  required
                  placeholder="Channel Name"
                  value={form.channel_name}
                  onChange={(e) =>
                    setForm({ ...form, channel_name: e.target.value })
                  }
                  className="w-full rounded-lg bg-white/5 px-4 py-2"
                />

                <input
                  required
                  placeholder="Title"
                  value={form.title}
                  onChange={(e) =>
                    setForm({ ...form, title: e.target.value })
                  }
                  className="w-full rounded-lg bg-white/5 px-4 py-2"
                />

                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                />

                {imagePreview && (
                  <img
                    src={imagePreview}
                    className="h-32 w-full object-cover rounded-lg"
                  />
                )}

                <input
                  type="number"
                  placeholder="Reward"
                  value={form.reward_amount}
                  onChange={(e) =>
                    setForm({ ...form, reward_amount: e.target.value })
                  }
                  className="w-full rounded-lg bg-white/5 px-4 py-2"
                />

                <button className="w-full rounded-lg bg-emerald-500 py-3 font-semibold hover:bg-emerald-600">
                  {editingId ? "Update Task" : "Create Task"}
                </button>
              </form>
            </div>
          </div>
        )}

        {/* Table */}
        <div className="rounded-xl border border-white/10 overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-white/5">
              <tr>
                <th className="px-4 py-3 text-left">Channel</th>
                <th className="px-4 py-3 text-left">Reward</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>

            <tbody>
              {tasks.map((task) => (
                <tr key={task.id} className="border-t border-white/5">
                  <td className="px-4 py-3">{task.channel_name}</td>
                  <td className="px-4 py-3 text-emerald-400">
                    ₹{task.reward_amount}
                  </td>
                  <td className="px-4 py-3 text-right space-x-2">
                    <button onClick={() => editTask(task)}>
                      <Pencil className="inline h-4 w-4" />
                    </button>
                    <button onClick={() => deleteTask(task.id)}>
                      <Trash2 className="inline h-4 w-4 text-red-400" />
                    </button>
                  </td>
                </tr>
              ))}

              {tasks.length === 0 && (
                <tr>
                  <td
                    colSpan={3}
                    className="px-4 py-8 text-center text-gray-500"
                  >
                    No tasks yet
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
