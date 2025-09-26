"use client"
import { createAuthClient } from "better-auth/react"
import { useEffect, useState } from "react"

export const authClient = createAuthClient({
  baseURL: typeof window !== 'undefined' ? window.location.origin : process.env.NEXT_PUBLIC_SITE_URL,
});

type SessionData = ReturnType<typeof authClient.useSession>;

export function useSession(): SessionData {
  return authClient.useSession();
}