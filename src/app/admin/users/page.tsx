"use client";

import { useAuth } from "@/components/auth-provider";
import { useRouter } from "next/navigation";
import { useEffect, useState, useCallback } from "react";
import { toast } from "sonner";
import Link from "next/link";
import {
  Play, LogOut, LayoutDashboard, ListVideo, Users, ArrowDownToLine, ShieldBan, ShieldCheck,
  TrendingUp, TrendingDown, AlertTriangle, Clock, DollarSign, CheckCircle
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

interface Analytics {
  totalUsers: number;
  activeUsers: number;
  suspendedUsers: number;
  totalEarned: number;
  totalApprovedAmount: number;
  completionRate: number;
  dropOffRate: number;
  fraudFlags: number;
}

export default function AdminUsersPage() {
  const { user, loading: authLoading, logout } = useAuth();
  const router = useRouter();
  const [users, setUsers] = useState<User[]>([]);
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const itemsPerPage = 10;

  const fetchUsers = useCallback(async () => {
    const res = await fetch(`/api/admin/users?page=${page}&limit=${itemsPerPage}`);
    if (res.ok) {
      const data = await res.json();
      setUsers(data.users);
      setTotalPages(Math.ceil(data.total / itemsPerPage));
    }
  }, [page]);

  const fetchAnalytics = useCallback(async () => {
    const res = await fetch("/api/admin/analytics");
    if (res.ok) {
      const data = await res.json();
      setAnalytics(data);
    }
  }, []);

  useEffect(() => {
    if (authLoading) return;
    if (!user || user.role !== "admin") { router.push("/login"); return; }
    Promise.all([fetchUsers(), fetchAnalytics()]).finally(() => setLoading(false));
  }, [user, authLoading, router, fetchUsers, fetchAnalytics, page]);

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
      {/* Navbar */}
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
            <Link href="/admin" className="flex items-center gap-1 rounded-lg px-2 sm:px-3 py-2 text-xs sm:text-sm text-gray-400 hover:bg-white/5 hover:text-white whitespace-nowrap">
              <LayoutDashboard className="h-3 w-3 sm:h-4 sm:w-4" /> <span className="hidden sm:inline">Dashboard</span>
            </Link>
            <Link href="/admin/tasks" className="flex items-center gap-1 rounded-lg px-2 sm:px-3 py-2 text-xs sm:text-sm text-gray-400 hover:bg-white/5 hover:text-white whitespace-nowrap">
              <ListVideo className="h-3 w-3 sm:h-4 sm:w-4" /> <span className="hidden sm:inline">Tasks</span>
            </Link>
            <Link href="/admin/users" className="flex items-center gap-1 rounded-lg bg-white/10 px-2 sm:px-3 py-2 text-xs sm:text-sm text-white whitespace-nowrap">
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
              <StatCard icon={CheckCircle} label="Total Earned" value={`$${analytics.totalEarned}`} sub={`$${analytics.totalApprovedAmount} withdrawn`} color="emerald" />
              <StatCard icon={TrendingUp} label="Completion Rate" value={`${analytics.completionRate}%`} sub="of started tasks" color="emerald" />
              <StatCard icon={AlertTriangle} label="Fraud Flags" value={analytics.fraudFlags} sub="suspicious activities" color="red" />
            </div>
          )}
        </div>

        {/* Users Table Section */}
        <div>
          <h2 className="mb-6 text-xl sm:text-2xl font-bold">Manage Users</h2>
          <div className="overflow-x-auto rounded-xl border border-white/10 scrollbar-thin scrollbar-thumb-emerald-500 scrollbar-track-white/5">
            <table className="w-full text-xs sm:text-sm">
              <thead className="border-b border-white/10 bg-white/5 sticky top-0">
                <tr className="text-left text-gray-400">
                  <th className="px-3 sm:px-4 py-3 whitespace-nowrap">Name</th>
                  <th className="px-3 sm:px-4 py-3 whitespace-nowrap">Email</th>
                  <th className="px-3 sm:px-4 py-3 whitespace-nowrap">Role</th>
                  <th className="px-3 sm:px-4 py-3 whitespace-nowrap">Balance</th>
                  <th className="px-3 sm:px-4 py-3 whitespace-nowrap">Status</th>
                  <th className="px-3 sm:px-4 py-3 whitespace-nowrap">Joined</th>
                  <th className="px-3 sm:px-4 py-3 whitespace-nowrap text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {users.map(u => (
                  <tr key={u.id} className="hover:bg-white/5">
                    <td className="px-3 sm:px-4 py-3 font-medium max-w-[100px] truncate">{u.name}</td>
                    <td className="px-3 sm:px-4 py-3 text-gray-400 max-w-[120px] truncate text-xs sm:text-sm">{u.email}</td>
                    <td className="px-3 sm:px-4 py-3 whitespace-nowrap">
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium inline-block ${u.role === "admin" ? "bg-amber-500/10 text-amber-400" : "bg-blue-500/10 text-blue-400"}`}>
                        {u.role}
                      </span>
                    </td>
                    <td className="px-3 sm:px-4 py-3 text-emerald-400 font-medium whitespace-nowrap">${Number(u.balance).toFixed(2)}</td>
                    <td className="px-3 sm:px-4 py-3 whitespace-nowrap">
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium inline-block ${u.status === "active" ? "bg-emerald-500/10 text-emerald-400" : "bg-red-500/10 text-red-400"}`}>
                        {u.status}
                      </span>
                    </td>
                    <td className="px-3 sm:px-4 py-3 text-gray-400 whitespace-nowrap text-xs sm:text-sm">{new Date(u.created_at).toLocaleDateString()}</td>
                    <td className="px-3 sm:px-4 py-3 whitespace-nowrap">
                      {u.role !== "admin" && (
                        <button
                          onClick={() => toggleStatus(u)}
                          className={`flex items-center gap-1 rounded-lg px-2 py-1.5 text-xs font-medium transition whitespace-nowrap ${
                            u.status === "active"
                              ? "bg-red-500/10 text-red-400 hover:bg-red-500/20"
                              : "bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20"
                          }`}
                        >
                          {u.status === "active" ? <ShieldBan className="h-3 w-3" /> : <ShieldCheck className="h-3 w-3" />}
                          <span className="hidden sm:inline">{u.status === "active" ? "Suspend" : "Activate"}</span>
                          <span className="sm:hidden">{u.status === "active" ? "Ban" : "OK"}</span>
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="mt-6 flex items-center justify-between gap-3">
            <button
              onClick={() => setPage(Math.max(1, page - 1))}
              disabled={page === 1}
              className="rounded-lg border border-white/10 px-3 sm:px-4 py-2 text-xs sm:text-sm font-medium text-gray-400 disabled:opacity-50 disabled:cursor-not-allowed hover:text-white hover:border-white/20"
            >
              Previous
            </button>
            <span className="text-xs sm:text-sm text-gray-400">Page {page} of {totalPages}</span>
            <button
              onClick={() => setPage(Math.min(totalPages, page + 1))}
              disabled={page === totalPages}
              className="rounded-lg border border-white/10 px-3 sm:px-4 py-2 text-xs sm:text-sm font-medium text-gray-400 disabled:opacity-50 disabled:cursor-not-allowed hover:text-white hover:border-white/20"
            >
              Next
            </button>
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
    <div className="rounded-xl border border-white/10 bg-white/5 p-4 sm:p-5">
      <div className="mb-2 sm:mb-3 flex items-center gap-2 text-gray-400">
        <Icon className="h-3 w-3 sm:h-4 sm:w-4 flex-shrink-0" />
        <span className="text-xs sm:text-sm">{label}</span>
      </div>
      <div className={`text-lg sm:text-2xl font-bold ${colorMap[color]}`}>{value}</div>
      <div className="mt-1 text-xs text-gray-500">{sub}</div>
    </div>
  );
}
