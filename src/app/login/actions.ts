"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export type LoginState = { error?: string };

export async function login(_prevState: LoginState, formData: FormData): Promise<LoginState> {
  const password = String(formData.get("password") ?? "");
  const next = String(formData.get("next") ?? "/dashboard");
  const expected = process.env.DASHBOARD_PASSWORD;

  if (!expected || password !== expected) {
    return { error: "Incorrect password." };
  }

  const cookieStore = await cookies();
  cookieStore.set("dash_auth", expected, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/dashboard",
    maxAge: 60 * 60 * 24 * 30,
  });

  redirect(next.startsWith("/dashboard") ? next : "/dashboard");
}
