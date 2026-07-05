"use server";

import { timingSafeEqual } from "node:crypto";
import { redirect } from "next/navigation";
import { createSession } from "@/lib/auth/session";

export type LoginState = { error?: string } | undefined;

function safeEquals(a: string, b: string) {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}

export async function login(_prevState: LoginState, formData: FormData): Promise<LoginState> {
  const password = String(formData.get("password") ?? "");
  const expected = process.env.APP_PASSWORD;

  if (!expected) {
    return { error: "APP_PASSWORD não está configurado no servidor." };
  }
  if (!password || !safeEquals(password, expected)) {
    // Atraso artificial para dificultar tentativas automatizadas de força bruta.
    await new Promise((resolve) => setTimeout(resolve, 1000));
    return { error: "Senha incorreta." };
  }

  await createSession();
  redirect("/");
}
