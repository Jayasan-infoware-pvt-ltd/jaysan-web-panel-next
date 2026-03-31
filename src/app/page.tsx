"use client";
import { useAuth } from "@/contexts/AuthContext";
import LoginPage from "@/components/LoginPage";
import DashboardShell from "@/components/DashboardShell";
import { Spinner } from "@heroui/react";

export default function Home() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-slate-50">
        <Spinner size="lg" color="primary" />
      </div>
    );
  }

  if (!user) return <LoginPage />;
  return <DashboardShell />;
}
