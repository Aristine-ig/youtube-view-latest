import jwt from "jsonwebtoken";
import { cookies } from "next/headers";
import { supabase } from "./supabase";

const JWT_SECRET = process.env.JWT_SECRET || "watchearn-secret";

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: "user" | "admin";
  balance: number;
  status: string;
}

export function signToken(user: { id: string; email: string; role: string }) {
  return jwt.sign({ id: user.id, email: user.email, role: user.role }, JWT_SECRET, {
    expiresIn: "7d",
  });
}

export function verifyToken(token: string): { id: string; email: string; role: string } | null {
  try {
    return jwt.verify(token, JWT_SECRET) as { id: string; email: string; role: string };
  } catch {
    return null;
  }
}

export async function getCurrentUser(): Promise<AuthUser | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get("token")?.value;
  if (!token) return null;

  const payload = verifyToken(token);
  if (!payload) return null;

  const { data } = await supabase
    .from("users")
    .select("id, email, name, role, balance, status")
    .eq("id", payload.id)
    .single();

  if (!data || data.status === "suspended") return null;
  return data as AuthUser;
}

export async function requireAuth(): Promise<AuthUser> {
  const user = await getCurrentUser();
  if (!user) throw new Error("Unauthorized");
  return user;
}

export async function requireAdmin(): Promise<AuthUser> {
  const user = await requireAuth();
  if (user.role !== "admin") throw new Error("Forbidden");
  return user;
}
