"use client";
import React, { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardBody, Input, Button } from "@heroui/react";
import { Zap, AlertCircle } from "lucide-react";

export default function LoginPage() {
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    
    const result = await login(email, password);
    if (!result.success) {
      setError(result.message || "Invalid credentials");
    }
    setLoading(false);
  };

  return (
    <div className="w-full h-screen flex items-center justify-center bg-slate-50 relative overflow-hidden">
      {/* Animated Background Blobs */}
      <div className="absolute inset-0 z-0 overflow-hidden">
        <div className="absolute -right-32 -top-32 w-[600px] h-[600px] rounded-full bg-slate-200/50 blur-[100px] animate-pulse" />
        <div className="absolute -left-32 -bottom-32 w-[600px] h-[600px] rounded-full bg-slate-200/50 blur-[100px] animate-pulse" style={{ animationDelay: "1s" }} />
      </div>

      {/* Grid Pattern Overlay */}
      <div className="absolute inset-0 z-0 opacity-20" style={{
        backgroundImage: "linear-gradient(var(--color-slate-200) 1px, transparent 1px), linear-gradient(90deg, var(--color-slate-200) 1px, transparent 1px)",
        backgroundSize: "40px 40px"
      }} />

      <Card className="w-full max-w-md relative z-10 bg-white shadow-xl border border-slate-100" radius="lg">
        <CardBody className="p-8 gap-6">
          {/* Logo */}
          <div className="text-center space-y-3">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-slate-900 text-white shadow-lg mx-auto">
              <Zap className="w-7 h-7" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-800 tracking-tight">Welcome Back</h1>
              <p className="text-slate-500 text-sm mt-1">Sign in to JRPL Dashboard</p>
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            <Input
              label="Email Address"
              type="email"
              placeholder="admin@jaysan.com"
              value={email}
              onValueChange={setEmail}
              variant="bordered"
              isRequired
              autoFocus
            />
            <Input
              label="Password"
              placeholder="Enter password"
              type="password"
              value={password}
              onValueChange={setPassword}
              variant="bordered"
              isRequired
            />

            {error && (
              <div className="flex items-center gap-2 text-red-400 text-sm bg-red-500/10 p-3 rounded-xl border border-red-500/20 animate-scale-in">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <Button
              type="submit"
              color="primary"
              className="w-full font-semibold text-base h-12 shadow-md shadow-slate-900/10"
              isLoading={loading}
              size="lg"
            >
              Sign In
            </Button>
          </form>

          <div className="pt-4 border-t border-slate-100 text-center">
            <p className="text-xs text-slate-400">Restricted Access System</p>
          </div>
        </CardBody>
      </Card>
    </div>
  );
}
