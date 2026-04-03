"use client";
import React, { useEffect, useState, useRef } from "react";
import { supabase } from "@/lib/supabase";
import { formatCurrency, getStatusColor } from "@/lib/helpers";
import { Card, CardBody, Button, Chip, Dropdown, DropdownTrigger, DropdownMenu, DropdownItem } from "@heroui/react";
import { TrendingUp, Wallet, PiggyBank, Wrench, Infinity, Download, BarChart3, PieChart, ShoppingCart, CreditCard, MessageSquare, FileText, CheckCircle, Receipt } from "lucide-react";
import { Chart, registerables } from "chart.js";
import { jsPDF } from "jspdf";
import "jspdf-autotable";

Chart.register(...registerables);

interface DashboardPageProps {
  onNavigate: (view: string) => void;
}

export default function DashboardPage({ onNavigate }: DashboardPageProps) {
  const [allTimeRevenue, setAllTimeRevenue] = useState(0);
  const [totalSales, setTotalSales] = useState(0);
  const [totalCollected, setTotalCollected] = useState(0);
  const [totalPending, setTotalPending] = useState(0);
  const [totalExp, setTotalExp] = useState(0);
  const [netProfit, setNetProfit] = useState(0);
  const [activeRepairs, setActiveRepairs] = useState(0);
  const [isAllTime, setIsAllTime] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7));
  const [recentBills, setRecentBills] = useState<any[]>([]);
  const [recentExp, setRecentExp] = useState<any[]>([]);
  const [recentQueries, setRecentQueries] = useState<any[]>([]);

  const salesChartRef = useRef<HTMLCanvasElement>(null);
  const repairChartRef = useRef<HTMLCanvasElement>(null);
  const salesChartInstance = useRef<Chart | null>(null);
  const repairChartInstance = useRef<Chart | null>(null);

  useEffect(() => {
    loadDashboardData();
    loadGlobalStats();
    return () => {
      salesChartInstance.current?.destroy();
      repairChartInstance.current?.destroy();
    };
  }, []);

  useEffect(() => {
    loadDashboardData();
  }, [isAllTime, selectedMonth]);

  async function loadDashboardData() {
    let billsQuery = supabase.from("bills").select("*");
    let expQuery = supabase.from("expenditures").select("*");
    const allTimeBillsQuery = supabase.from("bills").select("total_amount");

    const { data: products } = await supabase.from("products").select("id, cost_price");
    const productMap = new Map((products || []).map((p: any) => [p.id, Number(p.cost_price) || 0]));

    if (!isAllTime) {
      const [year, month] = selectedMonth.split("-");
      const startDate = new Date(+year, +month - 1, 1).toISOString();
      const endDate = new Date(+year, +month, 0, 23, 59, 59, 999).toISOString();
      billsQuery = billsQuery.gte("created_at", startDate).lte("created_at", endDate);
      expQuery = expQuery.gte("created_at", startDate).lte("created_at", endDate);
    }

    const { data: bills } = await billsQuery;
    const { data: expenses } = await expQuery;
    const { data: allTimeBills } = await allTimeBillsQuery;

    let billItems: any[] = [];
    if (bills && bills.length > 0) {
      const billIds = bills.map((b: any) => b.id);
      const { data: items } = await supabase.from("bill_items").select("*").in("bill_id", billIds);
      if (items) billItems = items;
    }

    const sales = bills?.reduce((sum: number, b: any) => sum + (Number(b.total_amount) || 0), 0) || 0;
    const collected = bills?.reduce((sum: number, b: any) => sum + (Number(b.paid_amount) || (b.payment_status === "Paid" ? Number(b.total_amount) : 0)), 0) || 0;
    const pending = sales - collected;
    const exp = expenses?.reduce((sum: number, e: any) => sum + (Number(e.amount) || 0), 0) || 0;
    const allTimeRev = allTimeBills?.reduce((sum: number, b: any) => sum + (Number(b.total_amount) || 0), 0) || 0;

    let totalCOGS = 0;
    billItems.forEach((item: any) => {
      const currentCost = productMap.get(item.product_id) ?? Number(item.cost_at_sale) ?? 0;
      totalCOGS += currentCost * (Number(item.quantity) || 1);
    });

    setAllTimeRevenue(allTimeRev);
    setTotalSales(sales);
    setTotalCollected(collected);
    setTotalPending(pending);
    setTotalExp(exp);
    setNetProfit((sales - totalCOGS) - exp);

    // Update Sales Chart
    updateSalesChart(bills || []);
  }

  function updateSalesChart(bills: any[]) {
    if (!salesChartRef.current) return;
    salesChartInstance.current?.destroy();

    let labels: string[], data: number[];

    if (isAllTime) {
      const monthlyData: Record<string, number> = {};
      const sorted = [...bills].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
      sorted.forEach((b) => {
        const d = new Date(b.created_at);
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
        monthlyData[key] = (monthlyData[key] || 0) + Number(b.total_amount);
      });
      labels = Object.keys(monthlyData);
      data = Object.values(monthlyData);
    } else {
      const [year, month] = selectedMonth.split("-");
      const daysInMonth = new Date(+year, +month, 0).getDate();
      labels = Array.from({ length: daysInMonth }, (_, i) => String(i + 1));
      data = new Array(daysInMonth).fill(0);
      bills.forEach((b) => {
        const d = new Date(b.created_at);
        if (d.getMonth() === +month - 1) data[d.getDate() - 1] += Number(b.total_amount);
      });
    }

    salesChartInstance.current = new Chart(salesChartRef.current, {
      type: "line",
      data: {
        labels,
        datasets: [{
          label: isAllTime ? "Monthly Sales" : "Daily Sales",
          data,
          borderColor: "#3b82f6",
          backgroundColor: "rgba(59, 130, 246, 0.05)",
          borderWidth: 2,
          pointBackgroundColor: "#fff",
          pointBorderColor: "#3b82f6",
          pointBorderWidth: 2,
          tension: 0.4,
          fill: true,
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          y: { beginAtZero: true, grid: { color: "#f1f5f9" }, ticks: { font: { size: 10 } } },
          x: { grid: { display: false }, ticks: { font: { size: 10 } } },
        },
        plugins: { legend: { display: false } },
      },
    });
  }

  async function loadGlobalStats() {
    const { count } = await supabase.from("repairs").select("*", { count: "exact", head: true }).in("status", ["Received", "In Process", "Part Not Available"]);
    setActiveRepairs(count || 0);

    // Repair Status Chart  
    const { data: allRepairs } = await supabase.from("repairs").select("status");
    const statusCounts: Record<string, number> = {};
    allRepairs?.forEach((r: any) => { statusCounts[r.status] = (statusCounts[r.status] || 0) + 1; });

    if (repairChartRef.current) {
      repairChartInstance.current?.destroy();
      repairChartInstance.current = new Chart(repairChartRef.current, {
        type: "doughnut",
        data: {
          labels: Object.keys(statusCounts),
          datasets: [{ data: Object.values(statusCounts), backgroundColor: ["#f59e0b", "#3b82f6", "#10b981", "#ef4444", "#64748b", "#8b5cf6"], borderWidth: 0, hoverOffset: 4 }],
        },
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: "bottom", labels: { boxWidth: 10, font: { size: 10 } } } }, cutout: "70%" },
      });
    }

    // Recent Data
    const { data: rb } = await supabase.from("bills").select("*").order("created_at", { ascending: false }).limit(8);
    setRecentBills(rb || []);
    const { data: re } = await supabase.from("expenditures").select("*").order("created_at", { ascending: false }).limit(8);
    setRecentExp(re || []);
    const { data: rq } = await supabase.from("customer_queries").select("*").order("created_at", { ascending: false }).limit(8);
    setRecentQueries(rq || []);
  }

  async function downloadReport(type: "monthly" | "all-time") {
    let q = supabase.from("bills").select("*").order("created_at", { ascending: false });
    let eq = supabase.from("expenditures").select("*");
    let title = "All-Time Sales & Collection Report";

    if (type === "monthly") {
      if (isAllTime) return alert("Please select a specific month first!");
      const [year, month] = selectedMonth.split("-");
      const startDate = new Date(+year, +month - 1, 1).toISOString();
      const endDate = new Date(+year, +month, 0, 23, 59, 59, 999).toISOString();
      q = q.gte("created_at", startDate).lte("created_at", endDate);
      eq = eq.gte("created_at", startDate).lte("created_at", endDate);
      title = `Sales Report - ${new Date(+year, +month - 1).toLocaleString('default', { month: 'long', year: 'numeric'})}`;
    }
    
    const { data: reportBills } = await q;
    const { data: reportExpenses } = await eq;
    if (!reportBills || reportBills.length === 0) return alert("No invoices found for this report.");

    const { data: products } = await supabase.from("products").select("id, cost_price");
    const productMap = new Map((products || []).map((p: any) => [p.id, Number(p.cost_price) || 0]));
    
    let reportBillItems: any[] = [];
    const billIds = reportBills.map(b => b.id);
    const { data: items } = await supabase.from("bill_items").select("*").in("bill_id", billIds);
    if (items) reportBillItems = items;

    const doc = new jsPDF("p", "mm", "a4");
    doc.setFillColor(15, 23, 42); doc.rect(0, 0, 210, 40, "F");
    doc.setTextColor(255, 255, 255); doc.setFont(undefined as any, "bold"); doc.setFontSize(18);
    doc.text("JRPL | Jaysan Resource (P) Ltd.", 14, 15);
    doc.setFontSize(12); doc.setFont(undefined as any, "normal");
    doc.text(title, 14, 25);
    doc.setFontSize(10);
    doc.text(`Generated on: ${new Date().toLocaleString()}`, 14, 32);

    const tableData = reportBills.map((b, i) => [
      i + 1, b.invoice_number || b.id.slice(0, 8), new Date(b.created_at).toLocaleDateString(),
      b.customer_name || "Walk-in", b.payment_status || "Paid",
      `INR ${b.total_amount?.toFixed(2)}`, `INR ${(b.paid_amount ?? b.total_amount)?.toFixed(2)}`,
      `INR ${(b.total_amount - (b.paid_amount ?? b.total_amount)).toFixed(2)}`
    ]);

    const totalRevenue = reportBills.reduce((sum, b) => sum + (b.total_amount || 0), 0);
    const totalPaid = reportBills.reduce((sum, b) => sum + (Number(b.paid_amount) || (b.payment_status === "Paid" ? Number(b.total_amount) : 0)), 0);
    const totalPending = totalRevenue - totalPaid;
    const totalCash = reportBills.reduce((sum, b) => sum + (b.cash_amount ?? (b.payment_method==="Cash" && b.payment_status==="Paid" ? b.total_amount : 0)), 0);
    const totalOnline = reportBills.reduce((sum, b) => sum + (b.online_amount ?? (b.payment_method==="Online" && b.payment_status==="Paid" ? b.total_amount : 0)), 0);
    const totalExp = reportExpenses?.reduce((sum, e) => sum + (Number(e.amount) || 0), 0) || 0;
    
    let totalCOGS = 0;
    reportBillItems.forEach((item: any) => {
      const currentCost = productMap.get(item.product_id) ?? Number(item.cost_at_sale) ?? 0;
      totalCOGS += currentCost * (Number(item.quantity) || 1);
    });
    const netProfitVal = (totalRevenue - totalCOGS) - totalExp;

    (doc as any).autoTable({
      head: [["#", "Invoice No", "Date", "Customer", "Status", "Total", "Paid", "Balance"]],
      body: tableData, startY: 45, theme: "plain", styles: { fontSize: 8, cellPadding: 2 },
      headStyles: { fillColor: [248, 250, 252], textColor: [100, 116, 139], fontStyle: "bold", lineColor: [226, 232, 240], lineWidth: 0.1 },
      bodyStyles: { textColor: [51, 65, 85], lineColor: [226, 232, 240], lineWidth: 0.1 },
    });

    let finalY = (doc as any).lastAutoTable.finalY + 15;
    if (finalY > 250) { doc.addPage(); finalY = 20; }
    doc.setFontSize(12); doc.setFont(undefined as any, "bold"); doc.setTextColor(15, 23, 42); doc.text("Report Summary", 14, finalY);
    finalY += 8; doc.setFontSize(10); doc.setFont(undefined as any, "normal");
    doc.text(`Total Invoices: ${reportBills.length}`, 14, finalY);
    doc.text(`Total Expenditure: INR ${totalExp.toFixed(2)}`, 110, finalY);
    finalY += 6;
    doc.text(`Total Billing Value: INR ${totalRevenue.toFixed(2)}`, 14, finalY);
    doc.text(`Total Actual Price: INR ${totalCOGS.toFixed(2)}`, 110, finalY);
    finalY += 6;
    doc.text(`Total Collected: INR ${totalPaid.toFixed(2)}`, 14, finalY);
    doc.text(`Net Profit: INR ${netProfitVal.toFixed(2)}`, 110, finalY);
    finalY += 6;
    doc.text(`Total Pending Balance: INR ${totalPending.toFixed(2)}`, 14, finalY);
    doc.text(`Total Cash: INR ${totalCash.toFixed(2)}`, 110, finalY);
    finalY += 6;
    doc.text(`Total Online: INR ${totalOnline.toFixed(2)}`, 110, finalY);
    doc.save(`${title.replace(/ /g, "_")}.pdf`);
  }

  const periodLabel = isAllTime ? "All Time" : new Date(selectedMonth + "-01").toLocaleString("default", { month: "short", year: "numeric" });

  const statCards = [
    { label: "Total Revenue (Lifetime)", value: formatCurrency(allTimeRevenue), icon: Infinity, color: "from-slate-800 to-slate-900", textColor: "text-emerald-400", iconColor: "text-emerald-400", dark: true, badge: "All Time" },
    { label: `Sales (${periodLabel})`, value: formatCurrency(totalSales), icon: TrendingUp, color: "from-white to-white", textColor: "text-slate-800", iconColor: "text-blue-600", badge: "Revenue", badgeColor: "bg-blue-50 text-blue-600" },
    { label: `Expenditure (${periodLabel})`, value: formatCurrency(totalExp), icon: Wallet, color: "from-white to-white", textColor: "text-slate-800", iconColor: "text-rose-600", badge: "Expenses", badgeColor: "bg-rose-50 text-rose-600" },
    { label: `Net Profit (${periodLabel})`, value: formatCurrency(netProfit), icon: PiggyBank, color: "from-white to-white", textColor: netProfit < 0 ? "text-rose-500" : "text-slate-800", iconColor: "text-emerald-600", badge: "After COGS & Exp", badgeColor: "bg-emerald-50 text-emerald-600" },
    { label: "Active Repairs", value: String(activeRepairs), icon: Wrench, color: "from-white to-white", textColor: "text-slate-800", iconColor: "text-purple-600", badge: "In Progress", badgeColor: "bg-purple-50 text-purple-600" },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-3xl font-bold text-slate-800 tracking-tight">Dashboard</h2>
          <p className="text-slate-500 text-sm mt-1">Overview of your business performance</p>
        </div>
        <div className="flex items-center gap-2">
          <Dropdown>
            <DropdownTrigger><Button variant="flat" color="primary" startContent={<FileText className="w-4 h-4" />}>Download Report</Button></DropdownTrigger>
            <DropdownMenu aria-label="Report Options">
              <DropdownItem key="monthly" onPress={() => downloadReport("monthly")}>Monthly Report (PDF)</DropdownItem>
              <DropdownItem key="alltime" onPress={() => downloadReport("all-time")}>All-Time Report (PDF)</DropdownItem>
            </DropdownMenu>
          </Dropdown>
          <div className="flex items-center gap-2 bg-white p-1.5 rounded-xl border border-slate-200 shadow-sm">
            <div className={`flex items-center gap-2 px-3 ${isAllTime ? "opacity-50 pointer-events-none" : ""}`}>
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Period</span>
              <input
                type="month"
                value={selectedMonth}
                onChange={(e) => { setSelectedMonth(e.target.value); setIsAllTime(false); }}
                className="bg-slate-50 border-none text-sm font-medium text-slate-700 rounded px-2 py-1"
                disabled={isAllTime}
              />
            </div>
            <div className="w-px h-6 bg-slate-200" />
            <Button
              size="sm"
              variant={isAllTime ? "solid" : "light"}
              color={isAllTime ? "primary" : "default"}
              onPress={() => setIsAllTime(!isAllTime)}
              className="font-medium"
            >
              All Time
            </Button>
          </div>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        {statCards.map((card, i) => {
          const Icon = card.icon;
          return (
            <Card key={i} className={`border-none shadow-md hover:shadow-lg transition-shadow bg-gradient-to-br ${card.color} ${card.dark ? "text-white" : ""}`} style={{ animationDelay: `${i * 60}ms` }}>
              <CardBody className="p-5 relative overflow-hidden">
                <div className="absolute top-0 right-0 p-3 opacity-10">
                  <Icon className={`w-10 h-10 ${card.iconColor}`} />
                </div>
                <h3 className={`${card.dark ? "text-slate-400" : "text-slate-500"} text-xs font-semibold uppercase tracking-wider mb-2`}>{card.label}</h3>
                <p className={`text-2xl lg:text-3xl font-bold ${card.textColor}`}>{card.value}</p>
                <div className="mt-3">
                  <span className={`text-xs font-medium px-2 py-1 rounded-full ${card.dark ? "bg-slate-700 text-white" : card.badgeColor}`}>{card.badge}</span>
                </div>
              </CardBody>
            </Card>
          );
        })}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2 shadow-sm border border-slate-100">
          <CardBody className="p-6">
            <h3 className="font-bold text-slate-700 mb-6 flex items-center gap-2 text-sm">
              <BarChart3 className="w-4 h-4 text-slate-400" /> Sales Trend
            </h3>
            <div className="h-64"><canvas ref={salesChartRef} /></div>
          </CardBody>
        </Card>
        <Card className="shadow-sm border border-slate-100">
          <CardBody className="p-6">
            <h3 className="font-bold text-slate-700 mb-6 flex items-center gap-2 text-sm">
              <PieChart className="w-4 h-4 text-slate-400" /> Repair Status
            </h3>
            <div className="h-64 flex justify-center items-center"><canvas ref={repairChartRef} /></div>
          </CardBody>
        </Card>
      </div>

      {/* Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Sales */}
        <Card className="shadow-sm border border-slate-100">
          <CardBody className="p-5">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold text-slate-700 flex items-center gap-2 text-sm">
                <ShoppingCart className="w-4 h-4 text-emerald-500" /> Recent Sales
              </h3>
              <Button size="sm" variant="light" color="primary" onPress={() => onNavigate("invoices")} className="text-xs">View All</Button>
            </div>
            <div className="space-y-2 max-h-[280px] overflow-auto">
              {recentBills.length === 0 ? <p className="text-sm text-slate-400 text-center py-4">No recent transactions</p> : recentBills.map((b: any, i: number) => (
                <div key={i} className="flex justify-between items-center py-2 px-2 rounded-lg hover:bg-slate-50 transition-colors">
                  <div>
                    <div className="font-medium text-slate-700 text-sm">{b.customer_name || "Walk-in"}</div>
                    <div className="text-[10px] text-slate-400 font-mono">#{b.invoice_number || b.id?.slice(0, 6)} • {new Date(b.created_at).toLocaleDateString()}</div>
                  </div>
                  <span className="font-semibold text-slate-700 text-sm">₹{b.total_amount}</span>
                </div>
              ))}
            </div>
          </CardBody>
        </Card>

        {/* Recent Expenses */}
        <Card className="shadow-sm border border-slate-100">
          <CardBody className="p-5">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold text-slate-700 flex items-center gap-2 text-sm">
                <CreditCard className="w-4 h-4 text-rose-500" /> Recent Expenses
              </h3>
              <Button size="sm" variant="light" color="primary" onPress={() => onNavigate("expenditure")} className="text-xs">View All</Button>
            </div>
            <div className="space-y-2 max-h-[280px] overflow-auto">
              {recentExp.length === 0 ? <p className="text-sm text-slate-400 text-center py-4">No recent expenditures</p> : recentExp.map((e: any, i: number) => (
                <div key={i} className="flex justify-between items-center py-2 px-2 rounded-lg hover:bg-slate-50 transition-colors">
                  <div>
                    <div className="font-medium text-slate-700 text-sm">{e.item_name}</div>
                    <div className="text-[10px] text-slate-400">{e.category || "General"} • {new Date(e.created_at).toLocaleDateString()}</div>
                  </div>
                  <span className="font-semibold text-rose-600 text-sm">-₹{e.amount}</span>
                </div>
              ))}
            </div>
          </CardBody>
        </Card>

        {/* Recent Queries */}
        <Card className="shadow-sm border border-slate-100">
          <CardBody className="p-5">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold text-slate-700 flex items-center gap-2 text-sm">
                <MessageSquare className="w-4 h-4 text-purple-500" /> Recent Queries
              </h3>
              <Button size="sm" variant="light" color="primary" onPress={() => onNavigate("queries")} className="text-xs">View All</Button>
            </div>
            <div className="space-y-2 max-h-[280px] overflow-auto">
              {recentQueries.length === 0 ? <p className="text-sm text-slate-400 text-center py-4">No recent queries</p> : recentQueries.map((q: any, i: number) => {
                const sc = getStatusColor(q.status);
                return (
                  <div key={i} className="flex justify-between items-center py-2 px-2 rounded-lg hover:bg-slate-50 transition-colors">
                    <div className="min-w-0 flex-1 mr-2">
                      <div className="font-medium text-slate-700 text-sm truncate">{q.customer_name}</div>
                      <div className="text-[10px] text-slate-400 truncate">{q.requirement}</div>
                    </div>
                    <Chip size="sm" variant="flat" color={sc.color} className="text-[10px]">{q.status}</Chip>
                  </div>
                );
              })}
            </div>
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
