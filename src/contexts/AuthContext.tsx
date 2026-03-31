"use client";
import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { supabase } from "@/lib/supabase";

interface User {
  email: string;
  role: string;
}

interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => Promise<{ success: boolean; message?: string }>;
  logout: () => Promise<void>;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setUser({ email: session.user.email!, role: "admin" });
      }
      setIsLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        setUser({ email: session.user.email!, role: "admin" });
      } else {
        setUser(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  async function logAction(email: string, action: string) {
    try {
      let location = "Unknown";
      try {
        const res = await fetch("https://ipapi.co/json/");
        if (res.ok) {
          const data = await res.json();
          location = `${data.city}, ${data.region}, ${data.country_name} (${data.ip})`;
        }
      } catch (e) { console.error("Could not fetch location API", e); }
      
      const device = navigator.userAgent;
      await supabase.from("system_logs").insert({
        user_email: email,
        action_type: action,
        device_info: device,
        location: location
      });
    } catch (e) {
      console.error("Failed to write log", e);
    }
  }

  const login = async (email: string, password: string) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) return { success: false, message: error.message };
      if (data.user) {
        await logAction(data.user.email!, "LOGIN_SUCCESS");
        return { success: true };
      }
      return { success: false, message: "Unknown error" };
    } catch (err: any) {
      return { success: false, message: err.message };
    }
  };

  const logout = async () => {
    if (user) await logAction(user.email, "LOGOUT");
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
