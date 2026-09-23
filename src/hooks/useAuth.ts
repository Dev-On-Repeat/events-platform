"use client";

import { useState, useEffect } from "react";

const SESSION_KEY = "hackb4_guest_session";

export function useAuth() {
  const [session, setSession] = useState<string | null>(null);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    const storedSession = localStorage.getItem(SESSION_KEY);
    if (storedSession) {
      setSession(storedSession);
    }
  }, []);

  const createSession = () => {
    const newSession = crypto.randomUUID();
    localStorage.setItem(SESSION_KEY, newSession);
    setSession(newSession);
    return newSession;
  };

  const clearSession = () => {
    localStorage.removeItem(SESSION_KEY);
    setSession(null);
  };

  return {
    session: isMounted ? session : null,
    createSession,
    clearSession,
  };
}
