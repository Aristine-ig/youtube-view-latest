"use client";

import { useAuth } from "@/components/auth-provider";
import { useRouter } from "next/navigation";
import { useEffect, useState, useCallback } from "react";
import { toast } from "sonner";
import Link from "next/link";
import {
  Play, LogOut, ListVideo, Users, ArrowDownToLine, Check, X
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

  const fetchWithdrawals = useCallback(async () => {
    const res = await fetch("/api/admin/withdrawals");
    if (res.ok) {
      const data = await res.json();
      setWithdrawals(data.withdrawals);
    }
  }, []);

  useEffect(() => {
    if (authLoading) return;
    if (!user || user.role !== "admin") { router.push("/login"); return; }
    fetchWithdrawals().finally(() => setLoading(false));
  }, [user, authLoading, router, fetchWithdrawals]);

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
            <Link href="/admin/users" className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm text-gray-400 hover:bg-white/5 hover:text-white">
              <Users className="h-4 w-4" /> Users
            </Link>
            <Link href="/admin/withdrawals" className="flex items-center gap-1.5 rounded-lg bg-white/10 px-3 py-2 text-sm text-white">
              <ArrowDownToLine className="h-4 w-4" /> Withdrawals
            </Link>
            <button onClick={async () => { await logout(); router.push("/"); }} className="ml-2 text-gray-400 hover:text-white">
              <LogOut className="h-5 w-5" />
            </button>
          </div>
        </div>
      </nav>

      <div className="mx-auto max-w-7xl px-6 py-8">
        <h1 className="mb-6 text-2xl font-bold">Manage Withdrawals</h1>
        <div className="overflow-hidden rounded-xl border border-white/10">
          <table className="w-full text-sm">
            <thead className="border-b border-white/10 bg-white/5">
              <tr className="text-left text-gray-400">
                <th className="px-4 py-3">User</th>
                <th className="px-4 py-3">Amount</th>
                <th className="px-4 py-3">Method</th>
                <th className="px-4 py-3">Details</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {withdrawals.map(w => (
                <tr key={w.id} className="hover:bg-white/5">
                  <td className="px-4 py-3">
                    <div className="font-medium">{w.users?.name}</div>
                    <div className="text-xs text-gray-500">{w.users?.email}</div>
                  </td>
                  <td className="px-4 py-3 font-bold text-emerald-400">${Number(w.amount).toFixed(2)}</td>
                  <td className="px-4 py-3 text-gray-400">{w.payment_method || "N/A"}</td>
                  <td className="px-4 py-3 text-gray-400 max-w-[200px] truncate">{w.payment_details || "N/A"}</td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                      w.status === "approved" ? "bg-emerald-500/10 text-emerald-400" :
                      w.status === "rejected" ? "bg-red-500/10 text-red-400" :
                      "bg-amber-500/10 text-amber-400"
                    }`}>
                      {w.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-400">{new Date(w.created_at).toLocaleDateString()}</td>
                  <td className="px-4 py-3">
                    {w.status === "pending" && (
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleAction(w.id, "approved")}
                          className="flex items-center gap-1 rounded-lg bg-emerald-500/10 px-3 py-1.5 text-xs font-medium text-emerald-400 hover:bg-emerald-500/20"
                        >
                          <Check className="h-3.5 w-3.5" /> Approve
                        </button>
                        <button
                          onClick={() => handleAction(w.id, "rejected")}
                          className="flex items-center gap-1 rounded-lg bg-red-500/10 px-3 py-1.5 text-xs font-medium text-red-400 hover:bg-red-500/20"
                        >
                          <X className="h-3.5 w-3.5" /> Reject
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
                <tr><td colSpan={7} className="px-4 py-12 text-center text-gray-500">No withdrawal requests yet.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
