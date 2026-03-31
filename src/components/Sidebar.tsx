"use client";
import React from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Button, Tooltip } from "@heroui/react";
import {
  Zap, LayoutDashboard, Box, Receipt, FileText, Wallet,
  MessageCircle, Wrench, ClipboardList, Database, LogOut, ChevronLeft, ShieldAlert
} from "lucide-react";

const menuItems = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { id: "stock", label: "Stock Management", icon: Box },
  { id: "billing", label: "New Invoice", icon: Receipt },
  { id: "invoices", label: "Invoice History", icon: FileText },
  { id: "expenditure", label: "Expenditure", icon: Wallet },
  { id: "queries", label: "Customer Queries", icon: MessageCircle },
  { id: "repairs", label: "Repair Board", icon: Wrench },
  { id: "repair-history", label: "All Repairs List", icon: ClipboardList },
  { id: "backup", label: "Backup & Restore", icon: Database },
  { id: "logs", label: "System Logs", icon: ShieldAlert },
];

interface SidebarProps {
  currentView: string;
  onNavigate: (view: string) => void;
  collapsed: boolean;
  onToggle: () => void;
  mobileOpen?: boolean;
  onMobileClose?: () => void;
}

export default function Sidebar({ currentView, onNavigate, collapsed, onToggle, mobileOpen, onMobileClose }: SidebarProps) {
  const { logout } = useAuth();

  return (
    <>
      {/* Mobile Overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 bg-slate-900/40 z-40 md:hidden backdrop-blur-sm" onClick={onMobileClose} />
      )}
      <aside
        className={`fixed md:relative inset-y-0 left-0 h-full flex flex-col bg-white border-r border-slate-200 text-slate-800 z-50 transition-all duration-300 ease-in-out shadow-sm ${
          mobileOpen ? "translate-x-0 w-64" : "-translate-x-full md:translate-x-0"
        } ${collapsed ? "md:w-[72px]" : "md:w-64"}`}
      >
        {/* Header */}
      <div className={`flex items-center border-b border-slate-100 ${collapsed ? "justify-center p-4" : "p-5 gap-3"}`}>
        <div className="w-9 h-9 bg-slate-900 rounded-xl flex items-center justify-center shadow-md flex-shrink-0">
          <Zap className="text-white w-5 h-5" />
        </div>
        {!collapsed && <span className="font-bold text-lg tracking-wide text-slate-900">JRPL</span>}
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-4 px-2 space-y-1">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentView === item.id;
          const btn = (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              className={`w-full flex items-center gap-3 rounded-xl transition-all duration-200 group relative overflow-hidden ${
                collapsed ? "justify-center p-3" : "px-4 py-3"
              } ${
                isActive
                  ? "bg-slate-900 text-white shadow-md shadow-slate-900/10"
                  : "text-slate-500 hover:bg-slate-100 hover:text-slate-900"
              }`}
            >
              {isActive && (
                <div className="absolute inset-0 bg-white/5" />
              )}
              <Icon className={`w-5 h-5 flex-shrink-0 transition-transform ${isActive ? "" : "group-hover:scale-110"}`} />
              {!collapsed && <span className="font-medium text-sm truncate">{item.label}</span>}
            </button>
          );

          return collapsed ? (
            <Tooltip key={item.id} content={item.label} placement="right" delay={0} closeDelay={0}>
              {btn}
            </Tooltip>
          ) : (
            <React.Fragment key={item.id}>{btn}</React.Fragment>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="border-t border-slate-100 p-2 space-y-1 mt-auto shrink-0">
        {/* Collapse Toggle (Desktop Only) */}
        <button
          onClick={onToggle}
          className={`hidden md:flex w-full items-center gap-3 rounded-xl px-4 py-2.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors ${collapsed ? "justify-center" : ""}`}
        >
          <ChevronLeft className={`w-4 h-4 transition-transform duration-300 ${collapsed ? "rotate-180" : ""}`} />
          {!collapsed && <span className="text-xs font-medium">Collapse</span>}
        </button>

        {/* Logout */}
        <button
          onClick={() => { if (confirm("Are you sure you want to logout?")) logout(); }}
          className={`w-full flex items-center gap-3 rounded-xl px-4 py-2.5 text-red-500 hover:bg-red-50 hover:text-red-600 transition-colors ${collapsed ? "justify-center" : ""}`}
        >
          <LogOut className="w-5 h-5" />
          {!collapsed && <span className="font-medium text-sm">Logout</span>}
        </button>
      </div>
      </aside>
    </>
  );
}
