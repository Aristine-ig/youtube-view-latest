"use client";

import { useAuth } from "@/components/auth-provider";
import Link from "next/link";
import { Play, DollarSign, Users, ArrowRight, CheckCircle } from "lucide-react";

export default function Home() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-emerald-500 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950 text-white">
      {/* Navbar */}
      <nav className="border-b border-white/10 px-6 py-4">
        <div className="mx-auto flex max-w-6xl items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-500">
              <Play className="h-5 w-5 text-white" fill="white" />
            </div>
            <span className="text-xl font-bold">WatchEarn</span>
          </div>
          <div className="flex items-center gap-3">
            {user ? (
              <Link
                href={user.role === "admin" ? "/admin" : "/dashboard"}
                className="flex items-center gap-2 rounded-lg bg-emerald-500 px-5 py-2.5 text-sm font-semibold transition hover:bg-emerald-600"
              >
                {user.role === "admin" ? "Admin Panel" : "Dashboard"}
                <ArrowRight className="h-4 w-4" />
              </Link>
            ) : (
              <>
                <Link
                  href="/login"
                  className="rounded-lg px-5 py-2.5 text-sm font-medium text-gray-300 transition hover:text-white"
                >
                  Log In
                </Link>
                <Link
                  href="/register"
                  className="rounded-lg bg-emerald-500 px-5 py-2.5 text-sm font-semibold transition hover:bg-emerald-600"
                >
                  Get Started
                </Link>
              </>
            )}
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="px-6 py-24 text-center">
        <div className="mx-auto max-w-3xl">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-4 py-1.5 text-sm text-emerald-400">
            <DollarSign className="h-4 w-4" />
            Start earning today
          </div>
          <h1 className="mb-6 text-5xl font-bold leading-tight tracking-tight md:text-6xl">
            Watch Videos.{" "}
            <span className="bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent">
              Earn Money.
            </span>
          </h1>
          <p className="mb-10 text-lg text-gray-400 md:text-xl">
            Complete simple video watching tasks and get rewarded instantly.
            No special skills required - just watch and earn.
          </p>
          <Link
            href={user ? (user.role === "admin" ? "/admin" : "/dashboard") : "/register"}
            className="inline-flex items-center gap-2 rounded-xl bg-emerald-500 px-8 py-4 text-lg font-semibold transition hover:bg-emerald-600"
          >
            {user ? "Go to Dashboard" : "Start Earning Now"}
            <ArrowRight className="h-5 w-5" />
          </Link>
        </div>
      </section>

      {/* Features */}
      <section className="px-6 pb-24">
        <div className="mx-auto grid max-w-5xl gap-6 md:grid-cols-3">
          {[
            {
              icon: Play,
              title: "Watch Videos",
              desc: "Browse available tasks and watch assigned YouTube videos at your own pace.",
            },
            {
              icon: CheckCircle,
              title: "Complete Tasks",
              desc: "Watch at least 85% of the video to mark the task as complete and earn your reward.",
            },
            {
              icon: DollarSign,
              title: "Earn Money",
              desc: "Rewards are credited to your balance instantly. Withdraw anytime you want.",
            },
          ].map((f, i) => (
            <div
              key={i}
              className="rounded-2xl border border-white/10 bg-white/5 p-8 backdrop-blur-sm"
            >
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-500/10">
                <f.icon className="h-6 w-6 text-emerald-400" />
              </div>
              <h3 className="mb-2 text-lg font-semibold">{f.title}</h3>
              <p className="text-sm text-gray-400">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Stats */}
      <section className="border-t border-white/10 px-6 py-16">
        <div className="mx-auto flex max-w-4xl flex-wrap items-center justify-center gap-12 text-center">
          {[
            { icon: Users, value: "1,000+", label: "Active Users" },
            { icon: Play, value: "5,000+", label: "Tasks Completed" },
            { icon: DollarSign, value: "$50,000+", label: "Total Paid Out" },
          ].map((s, i) => (
            <div key={i} className="flex flex-col items-center gap-2">
              <s.icon className="h-6 w-6 text-emerald-400" />
              <div className="text-3xl font-bold">{s.value}</div>
              <div className="text-sm text-gray-500">{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/10 px-6 py-8 text-center text-sm text-gray-500">
        &copy; 2026 WatchEarn. All rights reserved.
      </footer>
    </div>
  );
}
