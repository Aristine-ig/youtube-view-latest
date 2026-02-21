"use client";

import { useAuth } from "@/components/auth-provider";
import { useRouter } from "next/navigation";
import { useEffect, useState, useCallback } from "react";
import { toast } from "sonner";
import Link from "next/link";
import {
  Play, LogOut, ListVideo, Users, ArrowDownToLine, Plus, Pencil, Trash2,
  ToggleLeft, ToggleRight, X
} from "lucide-react";

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
  is_enabled: boolean;
  created_at: string;
}

const emptyForm = {
  title: "",
  channel_name: "",
  video_thumbnail: "",
  video_length: "",
  required_actions: "",
  reward_amount: "",
  max_users: "500",
  is_enabled: true,
};

export default function AdminTasksPage() {
  const { user, loading: authLoading, logout } = useAuth();
  const router = useRouter();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null);
  const [thumbnailPreview, setThumbnailPreview] = useState<string>("");

  const fetchTasks = useCallback(async () => {
    const res = await fetch("/api/admin/tasks");
    if (res.ok) {
      const data = await res.json();
      setTasks(data.tasks);
    }
  }, []);

  const handleThumbnailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith("image/")) {
        toast.error("Please select an image file");
        e.target.value = ""; // Clear the input
        return;
      }
      
      // Validate file size (1MB = 1024 * 1024 bytes)
      if (file.size > 1 * 1024 * 1024) {
        toast.error("File size must be less than 1MB");
        e.target.value = ""; // Clear the input
        return;
      }
      
      setThumbnailFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setThumbnailPreview(reader.result as string);
      };
      reader.onerror = () => {
        toast.error("Failed to read file");
        setThumbnailFile(null);
        setThumbnailPreview("");
      };
      reader.readAsDataURL(file);
    }
  };

  const clearThumbnail = () => {
    setThumbnailFile(null);
    setThumbnailPreview("");
    setForm({ ...form, video_thumbnail: "" });
  };

  useEffect(() => {
    if (authLoading) return;
    if (!user || user.role !== "admin") { router.push("/login"); return; }
    fetchTasks().finally(() => setLoading(false));
  }, [user, authLoading, router, fetchTasks]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Client-side validation
    if (!form.title || form.title.trim() === '') {
      toast.error("Title is required");
      return;
    }
    if (!form.channel_name || form.channel_name.trim() === '') {
      toast.error("Channel name is required");
      return;
    }
    if (!form.reward_amount || parseFloat(form.reward_amount) <= 0) {
      toast.error("Reward amount is required and must be greater than 0");
      return;
    }
    
    try {
      let thumbnailUrl = form.video_thumbnail;
      
      // Upload thumbnail if file is selected
      if (thumbnailFile) {
        try {
          const formData = new FormData();
          formData.append("file", thumbnailFile);
          
          const uploadRes = await fetch("/api/admin/upload", {
            method: "POST",
            body: formData,
          });
          
          if (!uploadRes.ok) {
            const uploadError = await uploadRes.json();
            throw new Error(uploadError.error || "Failed to upload thumbnail");
          }
          
          const uploadData = await uploadRes.json();
          thumbnailUrl = uploadData.url;
        } catch (uploadError) {
          console.error("Upload error:", uploadError);
          throw new Error(uploadError instanceof Error ? uploadError.message : "Failed to upload thumbnail");
        }
      }
      
      const taskData = { ...form, video_thumbnail: thumbnailUrl };
      
      if (editingId) {
        const res = await fetch("/api/admin/tasks", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: editingId, ...taskData }),
        });
        if (!res.ok) throw new Error((await res.json()).error);
        toast.success("Task updated");
      } else {
        const res = await fetch("/api/admin/tasks", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(taskData),
        });
        if (!res.ok) throw new Error((await res.json()).error);
        toast.success("Task created");
      }
      
      // Reset form and file states
      setShowForm(false);
      setEditingId(null);
      setForm(emptyForm);
      setThumbnailFile(null);
      setThumbnailPreview("");
      await fetchTasks();
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
      await fetchTasks();
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
      await fetchTasks();
    }
  };

  const editTask = (task: Task) => {
    setEditingId(task.id);
    setForm({
      title: task.title || "",
      channel_name: task.channel_name || "",
      video_thumbnail: task.video_thumbnail || "",
      video_length: task.video_length || "",
      required_actions: task.required_actions || "",
      reward_amount: String(task.reward_amount),
      max_users: String(task.max_users),
      is_enabled: task.is_enabled,
    });
    setThumbnailPreview(task.video_thumbnail || "");
    setShowForm(true);
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
      <nav className="border-b border-white/10 px-6 py-4">
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          <Link href="/admin" className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-500">
              <Play className="h-5 w-5 text-white" fill="white" />
            </div>
            <span className="text-xl font-bold">WatchEarn</span>
            <span className="rounded-md bg-amber-500/10 px-2 py-0.5 text-xs font-medium text-amber-400">Admin</span>
          </Link>
          <div className="flex items-center gap-3">
            <Link href="/admin/tasks" className="flex items-center gap-1.5 rounded-lg bg-white/10 px-3 py-2 text-sm text-white">
              <ListVideo className="h-4 w-4" /> Tasks
            </Link>
            <Link href="/admin/users" className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm text-gray-400 hover:bg-white/5 hover:text-white">
              <Users className="h-4 w-4" /> Users
            </Link>
            <Link href="/admin/withdrawals" className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm text-gray-400 hover:bg-white/5 hover:text-white">
              <ArrowDownToLine className="h-4 w-4" /> Withdrawals
            </Link>
            <button onClick={async () => { await logout(); router.push("/"); }} className="ml-2 text-gray-400 hover:text-white">
              <LogOut className="h-5 w-5" />
            </button>
          </div>
        </div>
      </nav>

      <div className="mx-auto max-w-7xl px-6 py-8">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-2xl font-bold">Manage Tasks</h1>
          <button
            onClick={() => { setShowForm(true); setEditingId(null); setForm(emptyForm); }}
            className="flex items-center gap-2 rounded-lg bg-emerald-500 px-4 py-2.5 text-sm font-semibold transition hover:bg-emerald-600"
          >
            <Plus className="h-4 w-4" /> Add Task
          </button>
        </div>

        {/* Form Modal */}
        {showForm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
            <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl border border-white/10 bg-gray-900 p-6">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-xl font-bold">{editingId ? "Edit Task" : "Add New Task"}</h2>
                <button onClick={() => { setShowForm(false); setEditingId(null); setForm(emptyForm); setThumbnailFile(null); setThumbnailPreview(""); }}>
                  <X className="h-5 w-5 text-gray-400 hover:text-white" />
                </button>
              </div>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-300">Title *</label>
                  <input 
                    required 
                    value={form.title} 
                    onChange={e => setForm({ ...form, title: e.target.value })} 
                    className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 text-white outline-none focus:border-emerald-500" 
                    placeholder="Enter task title" 
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-300">Video Thumbnail</label>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleThumbnailChange}
                        className="hidden"
                        id="thumbnail-upload"
                      />
                      <label
                        htmlFor="thumbnail-upload"
                        className="flex-1 cursor-pointer rounded-lg border border-white/20 bg-white/5 px-4 py-2.5 text-center text-white transition hover:border-emerald-500 hover:bg-white/10"
                      >
                        {thumbnailFile ? thumbnailFile.name : "Choose Image File"}
                      </label>
                      {thumbnailPreview && (
                        <button
                          type="button"
                          onClick={clearThumbnail}
                          className="rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2.5 text-red-400 transition hover:bg-red-500/20"
                        >
                          Clear
                        </button>
                      )}
                    </div>
                    {thumbnailPreview && (
                      <div className="relative h-32 w-full overflow-hidden rounded-lg border border-white/10">
                        <img
                          src={thumbnailPreview}
                          alt="Thumbnail preview"
                          className="h-full w-full object-cover"
                        />
                      </div>
                    )}
                  </div>
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-300">Channel Name *</label>
                  <input 
                    required 
                    value={form.channel_name} 
                    onChange={e => setForm({ ...form, channel_name: e.target.value })} 
                    className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 text-white outline-none focus:border-emerald-500" 
                    placeholder="Channel name" 
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="mb-1 block text-sm font-medium text-gray-300">Video Length</label>
                    <input value={form.video_length} onChange={e => setForm({ ...form, video_length: e.target.value })} className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 text-white outline-none focus:border-emerald-500" placeholder="e.g. 10:30" />
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium text-gray-300">Reward ($) *</label>
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
        <div className="overflow-hidden rounded-xl border border-white/10">
          <table className="w-full text-sm">
            <thead className="border-b border-white/10 bg-white/5">
              <tr className="text-left text-gray-400">
                <th className="px-4 py-3">Title</th>
                <th className="px-4 py-3">Channel Name</th>
                <th className="px-4 py-3">Video Length</th>
                <th className="px-4 py-3">Required Actions</th>
                <th className="px-4 py-3">Reward</th>
                <th className="px-4 py-3">Completed/Max Users</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {tasks.map(task => (
                <tr key={task.id} className="hover:bg-white/5">
                  <td className="px-4 py-3 font-medium">{task.title || "-"}</td>
                  <td className="px-4 py-3 font-medium">{task.channel_name || "-"}</td>
                  <td className="px-4 py-3">{task.video_length || "-"}</td>
                  <td className="px-4 py-3 max-w-[200px] truncate">{task.required_actions || "-"}</td>
                  <td className="px-4 py-3 text-emerald-400 font-medium">${Number(task.reward_amount).toFixed(2)}</td>
                  <td className="px-4 py-3">{(task.completed_count || 0)}/{task.max_users}</td>
                  <td className="px-4 py-3">
                    <button onClick={() => toggleTask(task)}>
                      {task.is_enabled
                        ? <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-xs text-emerald-400"><ToggleRight className="h-3 w-3" /> Active</span>
                        : <span className="inline-flex items-center gap-1 rounded-full bg-red-500/10 px-2.5 py-0.5 text-xs text-red-400"><ToggleLeft className="h-3 w-3" /> Disabled</span>
                      }
                    </button>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
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
                <tr><td colSpan={8} className="px-4 py-12 text-center text-gray-500">No tasks yet. Click &quot;Add Task&quot; to create one.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
