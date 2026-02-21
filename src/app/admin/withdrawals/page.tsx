"use client";

import { useAuth } from "@/components/auth-provider";
import { useRouter } from "next/navigation";
import { useEffect, useState, useCallback } from "react";
import { toast } from "sonner";
import Link from "next/link";
import {
  Play, LogOut, LayoutDashboard, Users, ArrowDownToLine, Check, X
} from "lucide-react";

interface Withdrawal {
  id: string;
  amount: number;
  status: string;
  payment_method: string;
  payment_details: string;
  admin_note: string;
  created_at: string;
  processed_at: string;
  users: { email: string; name: string };
}

export default function AdminWithdrawalsPage() {
  const { user, loading: authLoading, logout } = useAuth();
  const router = useRouter();
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const itemsPerPage = 10;

  const fetchWithdrawals = useCallback(async () => {
    const res = await fetch(`/api/admin/withdrawals?page=${page}&limit=${itemsPerPage}`);
    if (res.ok) {
      const data = await res.json();
      setWithdrawals(data.withdrawals);
      setTotalPages(Math.ceil(data.total / itemsPerPage));
    }
  }, [page]);

  useEffect(() => {
    if (authLoading) return;
    if (!user || user.role !== "admin") { router.push("/login"); return; }
    fetchWithdrawals().finally(() => setLoading(false));
  }, [user, authLoading, router, fetchWithdrawals, page]);

  const handleAction = async (id: string, status: "approved" | "rejected") => {
    const note = status === "rejected" ? prompt("Reason for rejection (optional):") : null;
    const res = await fetch("/api/admin/withdrawals", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, status, admin_note: note }),
    });
    if (res.ok) {
      toast.success(`Withdrawal ${status}`);
      await fetchWithdrawals();
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
            <Link href="/admin/users" className="flex items-center gap-1 rounded-lg px-2 sm:px-3 py-2 text-xs sm:text-sm text-gray-400 hover:bg-white/5 hover:text-white whitespace-nowrap">
              <Users className="h-3 w-3 sm:h-4 sm:w-4" /> <span className="hidden sm:inline">Users</span>
            </Link>
            <Link href="/admin/withdrawals" className="flex items-center gap-1 rounded-lg bg-white/10 px-2 sm:px-3 py-2 text-xs sm:text-sm text-white whitespace-nowrap">
              <ArrowDownToLine className="h-3 w-3 sm:h-4 sm:w-4" /> <span className="hidden sm:inline">Withdrawals</span>
            </Link>
            <button onClick={async () => { await logout(); router.push("/"); }} className="ml-1 text-gray-400 hover:text-white flex-shrink-0">
              <LogOut className="h-4 w-4 sm:h-5 sm:w-5" />
            </button>
          </div>
        </div>
      </nav>

      <div className="mx-auto max-w-7xl px-4 sm:px-6 py-6 sm:py-8">
        <h1 className="mb-6 text-xl sm:text-2xl font-bold">Manage Withdrawals</h1>
        
        {/* Withdrawals Table */}
        <div className="overflow-x-auto rounded-xl border border-white/10 scrollbar-thin scrollbar-thumb-emerald-500 scrollbar-track-white/5">
          <table className="w-full text-xs sm:text-sm">
            <thead className="border-b border-white/10 bg-white/5 sticky top-0">
              <tr className="text-left text-gray-400">
                <th className="px-3 sm:px-4 py-3 whitespace-nowrap">User</th>
                <th className="px-3 sm:px-4 py-3 whitespace-nowrap">Amount</th>
                <th className="px-3 sm:px-4 py-3 whitespace-nowrap">Method</th>
                <th className="px-3 sm:px-4 py-3 whitespace-nowrap">Details</th>
                <th className="px-3 sm:px-4 py-3 whitespace-nowrap">Status</th>
                <th className="px-3 sm:px-4 py-3 whitespace-nowrap">Date</th>
                <th className="px-3 sm:px-4 py-3 whitespace-nowrap text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {withdrawals.map(w => (
                <tr key={w.id} className="hover:bg-white/5">
                  <td className="px-3 sm:px-4 py-3">
                    <div className="font-medium max-w-[100px] truncate text-xs sm:text-sm">{w.users?.name}</div>
                    <div className="text-xs text-gray-500 max-w-[100px] truncate">{w.users?.email}</div>
                  </td>
                  <td className="px-3 sm:px-4 py-3 font-bold text-emerald-400 whitespace-nowrap">${Number(w.amount).toFixed(2)}</td>
                  <td className="px-3 sm:px-4 py-3 text-gray-400 whitespace-nowrap text-xs sm:text-sm">{w.payment_method || "N/A"}</td>
                  <td className="px-3 sm:px-4 py-3 text-gray-400 max-w-[100px] truncate text-xs">{w.payment_details || "N/A"}</td>
                  <td className="px-3 sm:px-4 py-3 whitespace-nowrap">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium inline-block ${
                      w.status === "approved" ? "bg-emerald-500/10 text-emerald-400" :
                      w.status === "rejected" ? "bg-red-500/10 text-red-400" :
                      "bg-amber-500/10 text-amber-400"
                    }`}>
                      {w.status}
                    </span>
                  </td>
                  <td className="px-3 sm:px-4 py-3 text-gray-400 whitespace-nowrap text-xs sm:text-sm">{new Date(w.created_at).toLocaleDateString()}</td>
                  <td className="px-3 sm:px-4 py-3 whitespace-nowrap">
                    {w.status === "pending" && (
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleAction(w.id, "approved")}
                          className="flex items-center gap-1 rounded-lg bg-emerald-500/10 px-2 sm:px-3 py-1.5 text-xs font-medium text-emerald-400 hover:bg-emerald-500/20 whitespace-nowrap"
                        >
                          <Check className="h-3 w-3" /> <span className="hidden sm:inline">Approve</span>
                        </button>
                        <button
                          onClick={() => handleAction(w.id, "rejected")}
                          className="flex items-center gap-1 rounded-lg bg-red-500/10 px-2 sm:px-3 py-1.5 text-xs font-medium text-red-400 hover:bg-red-500/20 whitespace-nowrap"
                        >
                          <X className="h-3 w-3" /> <span className="hidden sm:inline">Reject</span>
                        </button>
                      </div>
                    )}
                    {w.admin_note && (
                      <div className="mt-1 text-xs text-gray-500">Note: {w.admin_note}</div>
                    )}
                  </td>
                </tr>
              ))}
              {withdrawals.length === 0 && (
                <tr><td colSpan={7} className="px-3 sm:px-4 py-8 sm:py-12 text-center text-gray-500 text-xs sm:text-sm">No withdrawal requests yet.</td></tr>
              )}
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
  );
}
