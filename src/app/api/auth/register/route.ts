import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { supabase } from "@/lib/supabase";
import { signToken } from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    const { email, password, name } = await req.json();
    if (!email || !password || !name) {
      return NextResponse.json({ error: "All fields required" }, { status: 400 });
    }

    const { data: existing } = await supabase
      .from("users")
      .select("id")
      .eq("email", email.toLowerCase())
      .single();

    if (existing) {
      return NextResponse.json({ error: "Email already registered" }, { status: 409 });
    }

      const password_hash = await bcrypt.hash(password, 10);

      // First registered user becomes admin automatically
      const { count } = await supabase
        .from("users")
        .select("id", { count: "exact", head: true });
      const role = count === 0 ? "admin" : "user";

      const { data: user, error } = await supabase
        .from("users")
        .insert({ email: email.toLowerCase(), password_hash, name, role })
        .select("id, email, name, role, balance")
        .single();

    if (error) {
      return NextResponse.json({ error: "Failed to create account" }, { status: 500 });
    }

    const token = signToken({ id: user.id, email: user.email, role: user.role });

    const res = NextResponse.json({ user });
    res.cookies.set("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7,
      path: "/",
    });
    return res;
  } catch {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
