import "server-only";
import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";

const COOKIE_NAME = "taskflow_session";
const SESSION_DURATION_MS = 30 * 24 * 60 * 60 * 1000; // 30 dias

function getSecretKey() {
  const secret = process.env.SESSION_SECRET;
  if (!secret) {
    throw new Error("SESSION_SECRET não está definido.");
  }
  return new TextEncoder().encode(secret);
}

export async function encryptSession(expiresAt: Date) {
  return new SignJWT({ authenticated: true })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(Math.floor(expiresAt.getTime() / 1000))
    .sign(getSecretKey());
}

export async function decryptSession(token: string | undefined) {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, getSecretKey(), { algorithms: ["HS256"] });
    return payload.authenticated === true ? payload : null;
  } catch {
    return null;
  }
}

export async function createSession() {
  const expiresAt = new Date(Date.now() + SESSION_DURATION_MS);
  const token = await encryptSession(expiresAt);
  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    expires: expiresAt,
    sameSite: "lax",
    path: "/",
  });
}

export async function deleteSession() {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
}

export async function isAuthenticated() {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  const session = await decryptSession(token);
  return session !== null;
}

export const SESSION_COOKIE_NAME = COOKIE_NAME;
