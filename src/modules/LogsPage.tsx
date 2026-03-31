"use client";
import React, { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { Card, CardBody, Input, Button, Chip } from "@heroui/react";
import { Lock, ShieldAlert, Laptop, MapPin, Clock } from "lucide-react";

export default function LogsPage() {
  const [unlocked, setUnlocked] = useState(false);
  const [pin, setPin] = useState("");
  const [logs, setLogs] = useState<any[]>([]);

  function handleUnlock(e: React.FormEvent) {
    e.preventDefault();
    if (pin === "Jayasan@9045") {
      setUnlocked(true);
      fetchLogs();
    } else {
      alert("Invalid Security Password");
    }
  }

  async function fetchLogs() {
    const { data } = await supabase.from("system_logs").select("*").order("created_at", { ascending: false }).limit(200);
    if (data) setLogs(data);
  }

  if (!unlocked) {
    return (
      <div className="flex-1 h-[80vh] flex flex-col items-center justify-center">
        <div className="w-20 h-20 bg-red-100 text-red-600 rounded-full flex items-center justify-center mb-6 shadow-sm"><ShieldAlert className="w-10 h-10" /></div>
        <h2 className="text-2xl font-bold text-slate-800 mb-2">Restricted Area</h2>
        <p className="text-slate-500 mb-8">This module requires developer clearance.</p>
        <Card className="w-full max-w-sm"><CardBody className="p-6">
          <form onSubmit={handleUnlock} className="space-y-4">
            <Input label="Security Password" type="password" value={pin} onValueChange={setPin} variant="bordered" startContent={<Lock className="w-4 h-4 text-slate-400" />} autoFocus />
            <Button color="danger" type="submit" className="w-full font-bold shadow-lg shadow-red-500/20">Verify Identity</Button>
          </form>
        </CardBody></Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <h2 className="text-3xl font-bold text-slate-800">System Activity Logs</h2>
      <Card className="shadow-sm border border-slate-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="bg-slate-50 text-xs text-slate-500 uppercase border-b">
                <th className="p-4">Timestamp</th>
                <th className="p-4">User Email</th>
                <th className="p-4">Action</th>
                <th className="p-4 w-64">Location / IP</th>
                <th className="p-4">Device Profile</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {logs.map((L: any) => (
                <tr key={L.id} className="hover:bg-slate-50 transition-colors">
                  <td className="p-4 whitespace-nowrap"><div className="font-medium text-slate-800">{new Date(L.created_at).toLocaleDateString()}</div><div className="text-xs text-slate-400 flex items-center gap-1 mt-0.5"><Clock className="w-3 h-3" /> {new Date(L.created_at).toLocaleTimeString()}</div></td>
                  <td className="p-4 font-medium text-blue-600 truncate max-w-[150px]" title={L.user_email}>{L.user_email}</td>
                  <td className="p-4"><Chip size="sm" color={L.action_type==="LOGIN_SUCCESS"?"success":"default"} variant="flat" className="font-mono text-[10px] uppercase tracking-wider">{L.action_type}</Chip></td>
                  <td className="p-4 text-slate-600"><div className="flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" /> <span className="truncate" title={L.location || "Unknown"}>{L.location || "Unknown"}</span></div></td>
                  <td className="p-4"><div className="flex items-start gap-2 max-w-xs"><Laptop className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" /> <span className="text-[11px] leading-tight text-slate-500 line-clamp-2" title={L.device_info}>{L.device_info}</span></div></td>
                </tr>
              ))}
              {logs.length === 0 && <tr><td colSpan={5} className="p-8 text-center text-slate-400">No system events recorded.</td></tr>}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
