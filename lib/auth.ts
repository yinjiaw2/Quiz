import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";

export type Session = {
  role: "admin" | "learner";
  name: string;
  username: string;
};

function secret() {
  const value =
    process.env.SESSION_SECRET ||
    process.env.ADMIN_PASSWORD ||
    "Redbridge1982-local-session-key";
  return new TextEncoder().encode(value);
}

export async function createSession(session: Session, remember = false) {
  return new SignJWT(session)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(remember ? "30d" : "1d")
    .sign(secret());
}

export async function readSession(): Promise<Session | null> {
  try {
    const token = (await cookies()).get("redbridge_session")?.value;
    if (!token) return null;
    const { payload } = await jwtVerify(token, secret());
    return payload as unknown as Session;
  } catch {
    return null;
  }
}

export const sessionCookie = (remember = false) => ({
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/",
  ...(remember ? { maxAge: 60 * 60 * 24 * 30 } : {}),
});
