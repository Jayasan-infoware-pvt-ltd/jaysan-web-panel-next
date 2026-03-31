"use client";
import React, { useState, lazy, Suspense } from "react";
import Sidebar from "./Sidebar";
import { Spinner, Button } from "@heroui/react";

// Lazy load all pages for code splitting
const DashboardPage = lazy(() => import("@/modules/DashboardPage"));
const StockPage = lazy(() => import("@/modules/StockPage"));
const BillingPage = lazy(() => import("@/modules/BillingPage"));
const InvoiceHistoryPage = lazy(() => import("@/modules/InvoiceHistoryPage"));
const ExpenditurePage = lazy(() => import("@/modules/ExpenditurePage"));
const QueriesPage = lazy(() => import("@/modules/QueriesPage"));
const RepairsPage = lazy(() => import("@/modules/RepairsPage"));
const RepairHistoryPage = lazy(() => import("@/modules/RepairHistoryPage"));
const BackupPage = lazy(() => import("@/modules/BackupPage"));
const LogsPage = lazy(() => import("@/modules/LogsPage"));

function PageLoader() {
  return (
    <div className="flex-1 flex items-center justify-center">
      <Spinner size="lg" color="primary" />
    </div>
  );
}

export default function DashboardShell() {
  const [currentView, setCurrentView] = useState("dashboard");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const renderPage = () => {
    switch (currentView) {
      case "dashboard": return <DashboardPage onNavigate={setCurrentView} />;
      case "stock": return <StockPage />;
      case "billing": return <BillingPage />;
      case "invoices": return <InvoiceHistoryPage />;
      case "expenditure": return <ExpenditurePage />;
      case "queries": return <QueriesPage />;
      case "repairs": return <RepairsPage />;
      case "repair-history": return <RepairHistoryPage />;
      case "backup": return <BackupPage />;
      case "logs": return <LogsPage />;
      default: return <div className="p-8 text-2xl text-slate-400">Page Not Found</div>;
    }
  };

  return (
    <div className="h-screen w-screen flex flex-col md:flex-row overflow-hidden bg-slate-50">
      {/* Mobile Header */}
      <div className="md:hidden flex items-center justify-between p-4 bg-white border-b border-slate-200 shrink-0 shadow-sm z-30">
        <div className="font-bold text-lg tracking-wide text-slate-900 flex items-center gap-2">
          <div className="w-8 h-8 bg-slate-900 rounded-lg flex items-center justify-center"><span className="text-white font-bold text-sm">⚡</span></div>
          JRPL
        </div>
        <Button isIconOnly variant="light" onPress={() => setMobileOpen(true)} className="text-slate-600">
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="4" x2="20" y1="12" y2="12"/><line x1="4" x2="20" y1="6" y2="6"/><line x1="4" x2="20" y1="18" y2="18"/></svg>
        </Button>
      </div>

      <Sidebar
        currentView={currentView}
        onNavigate={(view) => { setCurrentView(view); setMobileOpen(false); }}
        collapsed={sidebarCollapsed}
        onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
        mobileOpen={mobileOpen}
        onMobileClose={() => setMobileOpen(false)}
      />
      <main className="flex-1 h-full overflow-y-auto p-4 md:p-6 lg:p-8">
        <Suspense fallback={<PageLoader />}>
          {renderPage()}
        </Suspense>
      </main>
    </div>
  );
}
