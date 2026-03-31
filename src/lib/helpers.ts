export function formatCurrency(amount: number): string {
  return `₹${amount.toLocaleString("en-IN")}`;
}

export function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function formatDateTime(dateStr: string): string {
  return new Date(dateStr).toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function getStatusColor(status: string) {
  switch (status?.toLowerCase()) {
    case "received": return { bg: "bg-amber-100", text: "text-amber-700", color: "warning" as const };
    case "in process": return { bg: "bg-blue-100", text: "text-blue-700", color: "primary" as const };
    case "part not available": return { bg: "bg-red-100", text: "text-red-700", color: "danger" as const };
    case "repaired": return { bg: "bg-cyan-100", text: "text-cyan-700", color: "primary" as const };
    case "delivered": return { bg: "bg-emerald-100", text: "text-emerald-700", color: "success" as const };
    case "delivered (payment pending)": return { bg: "bg-orange-100", text: "text-orange-700", color: "warning" as const };
    case "paid": return { bg: "bg-emerald-100", text: "text-emerald-700", color: "success" as const };
    case "pending": return { bg: "bg-amber-100", text: "text-amber-700", color: "warning" as const };
    case "resolved": return { bg: "bg-emerald-100", text: "text-emerald-700", color: "success" as const };
    default: return { bg: "bg-slate-100", text: "text-slate-600", color: "default" as const };
  }
}

export function getCategoryColor(cat: string) {
  const colors: Record<string, string> = {
    "Printer": "bg-orange-100 text-orange-800",
    "Toner / Cartridge": "bg-cyan-100 text-cyan-800",
    "Cables": "bg-gray-100 text-gray-800",
    "Accessories": "bg-purple-100 text-purple-800",
    "Spare Parts": "bg-indigo-100 text-indigo-800",
    "Mobile": "bg-pink-100 text-pink-800",
    "General": "bg-blue-100 text-blue-800",
  };
  return colors[cat] || "bg-emerald-100 text-emerald-800";
}
