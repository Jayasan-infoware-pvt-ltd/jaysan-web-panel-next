"use client";
import React, { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Card, CardBody, Button, Chip, Modal, ModalContent, ModalHeader, ModalBody, ModalFooter, Dropdown, DropdownTrigger, DropdownMenu, DropdownItem, Input } from "@heroui/react";
import { Download, MoreVertical, Eye, Trash2, X, Search } from "lucide-react";
import { jsPDF } from "jspdf";
import "jspdf-autotable";

export default function InvoiceHistoryPage() {
  const [bills, setBills] = useState<any[]>([]);
  const [filtered, setFiltered] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("All");
  const [filterMonth, setFilterMonth] = useState("");
  const [modalBill, setModalBill] = useState<any>(null);
  const [modalItems, setModalItems] = useState<any[]>([]);
  const [payMethod, setPayMethod] = useState("Cash");
  const [cashReceiver, setCashReceiver] = useState("");
  const [onlinePlatform, setOnlinePlatform] = useState("");
  const [txnId, setTxnId] = useState("");
  const [payStatus, setPayStatus] = useState("Paid");
  const [savingPay, setSavingPay] = useState(false);

  useEffect(() => { fetchBills(); }, []);

  async function fetchBills() {
    const { data } = await supabase.from("bills").select("*").order("created_at", { ascending: false });
    if (data) { setBills(data); setFiltered(data); }
  }

  useEffect(() => {
    let result = bills;
    if (search) {
      const t = search.toLowerCase();
      result = result.filter(b => (b.customer_name || "").toLowerCase().includes(t) || (b.invoice_number || "").toLowerCase().includes(t) || b.id.toLowerCase().includes(t));
    }
    if (filterStatus !== "All") result = result.filter(b => (b.payment_status || "Paid") === filterStatus);
    if (filterMonth) result = result.filter(b => b.created_at.startsWith(filterMonth));
    setFiltered(result);
  }, [bills, search, filterStatus, filterMonth]);

  async function openDetail(bill: any) {
    const { data: items } = await supabase.from("bill_items").select("*").eq("bill_id", bill.id);
    setModalItems(items || []);
    setModalBill(bill);
    setPayStatus(bill.payment_status || "Paid");
    setPayMethod(bill.payment_method || "Cash");
    setCashReceiver(bill.cash_receiver || "");
    setOnlinePlatform(bill.online_platform || "");
    setTxnId(bill.transaction_id || "");
  }

  async function updatePayment() {
    if (!modalBill) return;
    setSavingPay(true);
    const updateData: any = { payment_status: payStatus };
    if (payStatus === "Paid") {
      updateData.payment_method = payMethod;
      if (payMethod === "Cash") { updateData.cash_receiver = cashReceiver; updateData.online_platform = null; updateData.transaction_id = null; }
      else { updateData.online_platform = onlinePlatform; updateData.transaction_id = txnId; updateData.cash_receiver = null; }
    } else { updateData.payment_method = null; updateData.cash_receiver = null; updateData.online_platform = null; updateData.transaction_id = null; }
    await supabase.from("bills").update(updateData).eq("id", modalBill.id);
    Object.assign(modalBill, updateData);
    setSavingPay(false);
    fetchBills();
  }

  async function deleteBill(id: string) {
    const pass = prompt("Enter Developer Password to DELETE:");
    if (pass !== "admin123") return alert("Incorrect Password!");
    if (!confirm("Delete this invoice permanently?")) return;
    await supabase.from("bills").delete().eq("id", id);
    fetchBills();
  }

  async function downloadPDF(bill: any) {
    const { data: items } = await supabase.from("bill_items").select("*").eq("bill_id", bill.id);
    const doc = new jsPDF("p", "mm", "a4");
    doc.setFillColor(15, 23, 42); doc.rect(0, 0, 210, 55, "F");
    doc.setTextColor(255, 255, 255); doc.setFont(undefined as any, "bold"); doc.setFontSize(22);
    doc.text("JRPL | Jaysan Resource (P) Ltd.", 14, 20);
    doc.setFont(undefined as any, "normal"); doc.setFontSize(10);
    doc.text("Computer Hardware and Peripherals Sales & Services", 14, 28);
    doc.text("Shop No. 3, Sameera Plaza, Naza Market, Lucknow", 14, 34);
    doc.text("Ph: +91 96346 23233 | Email: jaysanresource555@gmail.com", 14, 40);
    doc.text("GSTIN: 09ABCDE1234F1Z5", 14, 46);
    doc.setFontSize(26); doc.setFont(undefined as any, "bold"); doc.text("INVOICE", 195, 25, { align: "right" });
    doc.setFontSize(10); doc.setFont(undefined as any, "normal"); doc.text(bill.invoice_number || `#${bill.id.slice(0, 8)}`, 195, 33, { align: "right" });

    const y = 65;
    doc.setTextColor(100, 116, 139); doc.setFontSize(9); doc.text("BILL TO", 14, y);
    doc.setTextColor(15, 23, 42); doc.setFontSize(12); doc.setFont(undefined as any, "bold"); doc.text(bill.customer_name || "Walk-in", 14, y + 6);
    doc.setFontSize(10); doc.setFont(undefined as any, "normal"); if (bill.customer_phone) doc.text(bill.customer_phone, 14, y + 11);
    doc.setTextColor(100, 116, 139); doc.text("DATE", 150, y); doc.setTextColor(15, 23, 42); doc.setFontSize(11);
    doc.text(new Date(bill.created_at).toLocaleDateString(), 150, y + 6);

    const tableData = (items || []).map((item: any, i: number) => {
      let desc = item.product_name;
      if (item.serial_number) desc += `\nSN: ${item.serial_number}`;
      if (item.problem) desc += `\nService: ${item.problem}`;
      if (item.part_name) desc += `\nPart: ${item.part_name}`;
      return [i + 1, desc, item.quantity, `INR ${item.price_at_sale.toFixed(2)}`, `INR ${(item.price_at_sale * item.quantity).toFixed(2)}`];
    });

    (doc as any).autoTable({ head: [["#", "Item Description", "Qty", "Price", "Total"]], body: tableData, startY: y + 25, theme: "plain", styles: { fontSize: 10, cellPadding: 3 }, headStyles: { fillColor: [248, 250, 252], textColor: [100, 116, 139], fontStyle: "bold" }, columnStyles: { 0: { cellWidth: 15 }, 2: { cellWidth: 20, halign: "center" }, 3: { cellWidth: 30, halign: "right" }, 4: { cellWidth: 35, halign: "right" } } });

    let finY = (doc as any).lastAutoTable.finalY + 10;
    const total = bill.total_amount; const isGst = bill.gst_applied;
    let subtotal = total; if (isGst) subtotal = total / 1.18;
    doc.setFontSize(10); doc.setTextColor(100, 116, 139); doc.text("Subtotal", 140, finY);
    doc.setTextColor(15, 23, 42); doc.text(`INR ${subtotal.toFixed(2)}`, 195, finY, { align: "right" });
    if (isGst) { finY += 6; doc.setTextColor(100, 116, 139); doc.text("GST (18%)", 140, finY); doc.setTextColor(15, 23, 42); doc.text(`INR ${(subtotal * 0.18).toFixed(2)}`, 195, finY, { align: "right" }); }
    doc.setDrawColor(226, 232, 240); doc.line(130, finY + 6, 195, finY + 6);
    doc.setFontSize(14); doc.setFont(undefined as any, "bold"); doc.text("Total", 140, finY + 16); doc.text(`INR ${total.toFixed(2)}`, 195, finY + 16, { align: "right" });
    const pH = doc.internal.pageSize.height;
    doc.setFontSize(8); doc.setTextColor(148, 163, 184); doc.text("Thank you for your business!", 14, pH - 20);
    doc.setFillColor(59, 130, 246); doc.rect(0, pH - 2, 210, 2, "F");
    doc.save(`Invoice_${(bill.invoice_number || bill.id.slice(0, 8)).replace(/\//g, "-")}.pdf`);
  }

  function exportCSV() {
    if (filtered.length === 0) return;
    const escape = (s: any) => `"${String(s || "").replace(/"/g, '""')}"`;
    let csv = "Invoice No,Date,Customer,Phone,Status,Method,GST,Total\n";
    csv += filtered.map(b => `${escape(b.invoice_number || b.id.slice(0, 8))},${escape(new Date(b.created_at).toLocaleDateString())},${escape(b.customer_name || "Walk-in")},${escape(b.customer_phone)},${escape(b.payment_status || "Paid")},${escape(b.payment_method || "-")},${escape(b.gst_applied)},${escape(b.total_amount)}`).join("\n");
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a"); link.href = URL.createObjectURL(blob);
    link.download = `invoices_${new Date().toISOString().split("T")[0]}.csv`; link.click();
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex justify-between items-center">
        <h2 className="text-3xl font-bold text-slate-800">Invoice History</h2>
        <Button variant="bordered" startContent={<Download className="w-4 h-4" />} onPress={exportCSV}>Export CSV</Button>
      </div>

      <Card className="shadow-sm border border-slate-100 mb-4">
        <CardBody className="p-4 flex flex-col sm:flex-row gap-4 items-center">
          <Input placeholder="Search invoices..." value={search} onValueChange={setSearch} startContent={<Search className="w-4 h-4 text-slate-400" />} variant="bordered" className="w-full flex-1" />
          <div className="flex gap-2 w-full sm:w-auto">
            <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="px-3 py-2 border border-slate-200 rounded-xl text-sm bg-white outline-none w-full sm:w-32">
              <option value="All">All Status</option><option value="Paid">Paid</option><option value="Pending">Pending</option>
            </select>
            <Input type="month" value={filterMonth} onChange={e => setFilterMonth(e.target.value)} variant="bordered" className="w-full sm:w-40" />
          </div>
        </CardBody>
      </Card>

      <Card className="shadow-sm border border-slate-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead><tr className="bg-slate-50 border-b border-slate-100 text-xs text-slate-500 uppercase tracking-wider">
              <th className="p-4 font-semibold">Invoice No</th><th className="p-4">Date</th><th className="p-4">Customer</th>
              <th className="p-4 text-center">Status</th><th className="p-4 text-center">Payment</th><th className="p-4 text-right">Amount</th><th className="p-4 text-right">Actions</th>
            </tr></thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {filtered.length === 0 ? <tr><td colSpan={7} className="p-8 text-center text-slate-400">No invoices found</td></tr> :
                filtered.map(b => (
                  <tr key={b.id} className="hover:bg-slate-50 transition-colors">
                    <td className="p-4 font-mono text-xs font-bold text-slate-500">{b.invoice_number || `#${b.id.slice(0, 8)}`}</td>
                    <td className="p-4 text-slate-600">{new Date(b.created_at).toLocaleDateString()}</td>
                    <td className="p-4"><div className="font-medium text-slate-800">{b.customer_name || "Walk-in"}</div><div className="text-xs text-slate-400">{b.customer_phone || ""}</div></td>
                    <td className="p-4 text-center"><Chip size="sm" variant="flat" color={b.payment_status === "Paid" ? "success" : "danger"}>{b.payment_status || "Paid"}</Chip></td>
                    <td className="p-4 text-center text-xs">
                      {b.payment_method === "Cash" && <span className="text-emerald-600 font-medium">Cash{b.cash_receiver ? ` (${b.cash_receiver})` : ""}</span>}
                      {b.payment_method === "Online" && <span className="text-blue-600 font-medium">{b.online_platform || "Online"}{b.transaction_id ? ` - ${b.transaction_id}` : ""}</span>}
                      {!b.payment_method && "-"}
                    </td>
                    <td className="p-4 text-right font-bold text-slate-800">₹{b.total_amount?.toFixed(2)}</td>
                    <td className="p-4 text-right">
                      <Dropdown><DropdownTrigger><Button isIconOnly variant="light" size="sm"><MoreVertical className="w-4 h-4" /></Button></DropdownTrigger>
                        <DropdownMenu aria-label="Actions">
                          <DropdownItem key="view" startContent={<Eye className="w-4 h-4" />} onPress={() => openDetail(b)}>View Detail</DropdownItem>
                          <DropdownItem key="dl" startContent={<Download className="w-4 h-4" />} onPress={() => downloadPDF(b)}>Download PDF</DropdownItem>
                          <DropdownItem key="del" startContent={<Trash2 className="w-4 h-4" />} className="text-danger" color="danger" onPress={() => deleteBill(b.id)}>Delete</DropdownItem>
                        </DropdownMenu>
                      </Dropdown>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Detail Modal */}
      <Modal isOpen={!!modalBill} onClose={() => setModalBill(null)} size="2xl" scrollBehavior="inside">
        <ModalContent>
          <ModalHeader>Invoice Details</ModalHeader>
          <ModalBody className="space-y-4">
            {modalBill && <>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="text-xs font-bold text-slate-400 uppercase">Invoice No</label><div className="text-lg font-bold text-slate-800 font-mono">{modalBill.invoice_number || `#${modalBill.id.slice(0, 8)}`}</div></div>
                <div className="text-right"><label className="text-xs font-bold text-slate-400 uppercase">Date</label><div className="text-slate-800">{new Date(modalBill.created_at).toLocaleDateString()}</div></div>
                <div className="col-span-2 border-b pb-3"><label className="text-xs font-bold text-slate-400 uppercase">Bill To</label><div className="text-lg font-medium">{modalBill.customer_name || "Walk-in"}</div><div className="text-slate-500 text-sm">{modalBill.customer_phone || ""}</div></div>
              </div>
              <div className="flex justify-between items-center">
                <div>
                  <label className="text-xs font-bold text-slate-400 uppercase">Status</label>
                  <select value={payStatus} onChange={e => setPayStatus(e.target.value)} className="block mt-1 text-xs font-bold rounded-lg border-slate-200 bg-slate-50 py-1 pl-2 pr-8">
                    <option value="Paid">Paid</option><option value="Pending">Pending</option>
                  </select>
                </div>
                <div className="text-right"><label className="text-xs font-bold text-slate-400 uppercase">Total</label><div className="text-2xl font-bold">₹{modalBill.total_amount?.toFixed(2)}</div></div>
              </div>
              {payStatus === "Paid" && (
                <div className="bg-emerald-50 p-4 rounded-xl border border-emerald-200 space-y-3">
                  <label className="text-sm font-medium text-emerald-700">Payment Method</label>
                  <div className="flex gap-4">
                    <label className="flex items-center gap-2"><input type="radio" checked={payMethod === "Cash"} onChange={() => setPayMethod("Cash")} /><span className="text-sm">Cash</span></label>
                    <label className="flex items-center gap-2"><input type="radio" checked={payMethod === "Online"} onChange={() => setPayMethod("Online")} /><span className="text-sm">Online</span></label>
                  </div>
                  {payMethod === "Cash" && <input value={cashReceiver} onChange={e => setCashReceiver(e.target.value)} placeholder="Received By" className="w-full px-3 py-2 border rounded-lg text-sm" />}
                  {payMethod === "Online" && <>
                    <select value={onlinePlatform} onChange={e => setOnlinePlatform(e.target.value)} className="w-full px-3 py-2 border rounded-lg text-sm"><option value="">Platform</option><option value="GPay">GPay</option><option value="PhonePe">PhonePe</option><option value="Paytm">Paytm</option><option value="Bank Transfer">Bank Transfer</option></select>
                    <input value={txnId} onChange={e => setTxnId(e.target.value)} placeholder="UPI / Txn Ref" className="w-full px-3 py-2 border rounded-lg text-sm" />
                  </>}
                  <Button size="sm" color="primary" onPress={updatePayment} isLoading={savingPay}>Save Payment Details</Button>
                </div>
              )}
              <div>
                <label className="text-xs font-bold text-slate-400 uppercase mb-2 block">Invoice Items</label>
                <div className="border rounded-xl bg-slate-50 p-4 divide-y divide-slate-100">
                  {modalItems.map((item: any, i: number) => (
                    <div key={i} className="flex justify-between items-center py-2">
                      <div><div className="font-medium text-sm text-slate-700">{item.product_name}</div><div className="text-xs text-slate-400">SN: {item.serial_number || "-"}</div></div>
                      <div className="text-sm"><span className="text-slate-500 mr-4">x{item.quantity}</span><span className="font-medium">₹{(item.price_at_sale * item.quantity).toFixed(2)}</span></div>
                    </div>
                  ))}
                </div>
              </div>
            </>}
          </ModalBody>
          <ModalFooter>
            <Button variant="bordered" onPress={() => downloadPDF(modalBill)} startContent={<Download className="w-4 h-4" />}>Download PDF</Button>
            <Button onPress={() => setModalBill(null)}>Close</Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </div>
  );
}
