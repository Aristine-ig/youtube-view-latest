"use client";

import { useAuth } from "@/components/auth-provider";
import { useRouter } from "next/navigation";
import { useEffect, useState, useCallback } from "react";
import { toast } from "sonner";
import Link from "next/link";
import {
  Play, LogOut, ListVideo, Users, ArrowDownToLine, ShieldBan, ShieldCheck
} from "lucide-react";

interface User {
  id: string;
  email: string;
  name: string;
  role: string;
  balance: number;
  status: string;
  created_at: string;
}

export default function AdminUsersPage() {
  const { user, loading: authLoading, logout } = useAuth();
  const router = useRouter();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchUsers = useCallback(async () => {
    const res = await fetch("/api/admin/users");
    if (res.ok) {
      const data = await res.json();
      setUsers(data.users);
    }
  }, []);

  useEffect(() => {
    if (authLoading) return;
    if (!user || user.role !== "admin") { router.push("/login"); return; }
    fetchUsers().finally(() => setLoading(false));
  }, [user, authLoading, router, fetchUsers]);

  const toggleStatus = async (u: User) => {
    const newStatus = u.status === "active" ? "suspended" : "active";
    const res = await fetch("/api/admin/users", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: u.id, status: newStatus }),
    });
    if (res.ok) {
      toast.success(`User ${newStatus === "suspended" ? "suspended" : "activated"}`);
      await fetchUsers();
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
            <Link href="/admin/tasks" className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm text-gray-400 hover:bg-white/5 hover:text-white">
              <ListVideo className="h-4 w-4" /> Tasks
            </Link>
            <Link href="/admin/users" className="flex items-center gap-1.5 rounded-lg bg-white/10 px-3 py-2 text-sm text-white">
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
        <h1 className="mb-6 text-2xl font-bold">Manage Users</h1>
        <div className="overflow-hidden rounded-xl border border-white/10">
          <table className="w-full text-sm">
            <thead className="border-b border-white/10 bg-white/5">
              <tr className="text-left text-gray-400">
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Email</th>
                <th className="px-4 py-3">Role</th>
                <th className="px-4 py-3">Balance</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Joined</th>
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {users.map(u => (
                <tr key={u.id} className="hover:bg-white/5">
                  <td className="px-4 py-3 font-medium">{u.name}</td>
                  <td className="px-4 py-3 text-gray-400">{u.email}</td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${u.role === "admin" ? "bg-amber-500/10 text-amber-400" : "bg-blue-500/10 text-blue-400"}`}>
                      {u.role}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-emerald-400 font-medium">${Number(u.balance).toFixed(2)}</td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${u.status === "active" ? "bg-emerald-500/10 text-emerald-400" : "bg-red-500/10 text-red-400"}`}>
                      {u.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-400">{new Date(u.created_at).toLocaleDateString()}</td>
                  <td className="px-4 py-3">
                    {u.role !== "admin" && (
                      <button
                        onClick={() => toggleStatus(u)}
                        className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition ${
                          u.status === "active"
                            ? "bg-red-500/10 text-red-400 hover:bg-red-500/20"
                            : "bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20"
                        }`}
                      >
                        {u.status === "active" ? <ShieldBan className="h-3.5 w-3.5" /> : <ShieldCheck className="h-3.5 w-3.5" />}
                        {u.status === "active" ? "Suspend" : "Activate"}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
