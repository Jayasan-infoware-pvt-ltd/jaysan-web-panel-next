"use client";
import React, { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Card, CardBody, Button, Input, Chip, Modal, ModalContent, ModalHeader, ModalBody, ModalFooter, Dropdown, DropdownTrigger, DropdownMenu, DropdownItem } from "@heroui/react";
import { Search, Download, MoreVertical, Eye, Trash2, CheckCircle } from "lucide-react";
import { getStatusColor } from "@/lib/helpers";

export default function RepairHistoryPage() {
  const [repairs, setRepairs] = useState<any[]>([]);
  const [filtered, setFiltered] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("All");
  const [filterMonth, setFilterMonth] = useState("");
  const [detailModal, setDetailModal] = useState<any>(null);

  useEffect(() => { fetchRepairs(); }, []);
  useEffect(() => {
    let result = repairs;
    if (search) {
      const t = search.toLowerCase();
      result = result.filter(r => (r.customer_name || "").toLowerCase().includes(t) || (r.device_details || "").toLowerCase().includes(t) || (r.serial_number && r.serial_number.toLowerCase().includes(t)) || (r.status || "").toLowerCase().includes(t));
    }
    if (filterStatus !== "All") result = result.filter(r => r.status === filterStatus);
    if (filterMonth) result = result.filter(r => r.created_at.startsWith(filterMonth));
    setFiltered(result);
  }, [search, filterStatus, filterMonth, repairs]);

  async function fetchRepairs() {
    const { data } = await supabase.from("repairs").select("*").order("created_at", { ascending: false });
    if (data) setRepairs(data);
  }

  async function handleDelete(id: string) {
    const pass = prompt("Enter Developer Password to DELETE:");
    if (pass !== "Jayasan@9045") return alert("Incorrect Password!");
    if (!confirm("Delete this repair permanently?")) return;
    await supabase.from("repairs").delete().eq("id", id);
    fetchRepairs();
  }

  function exportCSV() {
    if (filtered.length === 0) return;
    const escape = (s: any) => `"${String(s || "").replace(/"/g, '""')}"`;
    let csv = "Date,Customer,Contact,Device,Model,Serial,Problem,Status,Cost,Technician,PartReplaced\n";
    csv += filtered.map(r => `${escape(new Date(r.created_at).toLocaleDateString())},${escape(r.customer_name)},${escape(r.contact_number)},${escape(r.device_details)},${escape(r.model_number)},${escape(r.serial_number)},${escape(r.issue_description)},${escape(r.status)},${escape(r.estimated_cost)},${escape(r.technician_name)},${escape(r.part_replaced_name)}`).join("\n");
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a"); link.href = URL.createObjectURL(blob);
    link.download = `repair_history_${new Date().toISOString().split("T")[0]}.csv`; link.click();
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex justify-between items-center">
        <h2 className="text-3xl font-bold text-slate-800">Repair History</h2>
        <Button variant="bordered" startContent={<Download className="w-4 h-4" />} onPress={exportCSV}>Export CSV</Button>
      </div>

      <Card className="shadow-sm border border-slate-100 mb-4">
        <CardBody className="p-4 flex flex-col sm:flex-row items-center gap-4">
          <Input placeholder="Search customer, device or status..." value={search} onValueChange={setSearch} startContent={<Search className="w-4 h-4 text-slate-400" />} variant="bordered" className="w-full flex-1" />
          <div className="flex gap-2 w-full sm:w-auto">
            <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="px-3 py-2 border border-slate-200 rounded-xl text-sm bg-white outline-none w-full sm:w-40">
              <option value="All">All Status</option><option value="Received">Received</option><option value="In Process">In Process</option><option value="Part Not Available">Part Not Available</option><option value="Repaired">Repaired</option><option value="Delivered (Payment Pending)">Delivered (Payment Pending)</option><option value="Delivered">Delivered</option>
            </select>
            <Input type="month" value={filterMonth} onChange={e => setFilterMonth(e.target.value)} variant="bordered" className="w-full sm:w-40" />
          </div>
        </CardBody>
      </Card>

      <Card className="shadow-sm border border-slate-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead><tr className="bg-slate-50 text-xs text-slate-500 uppercase border-b">
              <th className="p-4">Date</th><th className="p-4">Customer</th><th className="p-4">Device</th><th className="p-4">Model</th>
              <th className="p-4">Description</th><th className="p-4">Status</th><th className="p-4 text-right">Cost</th><th className="p-4 text-right">Actions</th>
            </tr></thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.length === 0 ? <tr><td colSpan={8} className="p-8 text-center text-slate-400">No repair records</td></tr> :
                filtered.map(r => {
                  const sc = getStatusColor(r.status);
                  return (
                    <tr key={r.id} className="hover:bg-slate-50 transition-colors">
                      <td className="p-4 whitespace-nowrap">
                        <div className="font-medium text-slate-700">{new Date(r.created_at).toLocaleDateString()}</div>
                        <div className="text-xs text-slate-400">{new Date(r.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</div>
                        {r.status === "Delivered" && r.delivered_at && (
                          <div className="mt-1 pt-1 border-t border-slate-100">
                            <span className="text-[10px] font-bold text-green-600 uppercase">Delivered</span>
                            <div className="text-xs text-green-700 font-medium">{new Date(r.delivered_at).toLocaleDateString()}</div>
                          </div>
                        )}
                        {r.invoice_number && (
                          <div className="mt-1">
                            <Chip size="sm" variant="flat" color="secondary" className="font-mono text-[10px] uppercase">
                              Inv: {r.invoice_number}
                            </Chip>
                          </div>
                        )}
                      </td>
                      <td className="p-4"><div className="font-medium text-slate-800">{r.customer_name}</div><div className="text-xs text-slate-400">{r.contact_number || ""}</div></td>
                      <td className="p-4">{r.device_details}</td>
                      <td className="p-4 font-mono text-xs text-slate-500">{r.model_number || "-"}</td>
                      <td className="p-4 max-w-xs truncate" title={r.issue_description || ""}>{r.issue_description || "-"}</td>
                      <td className="p-4"><Chip size="sm" variant="flat" color={sc.color}>{r.status}</Chip></td>
                      <td className="p-4 text-right font-medium">₹{r.estimated_cost || 0}</td>
                      <td className="p-4 text-right">
                        <Dropdown><DropdownTrigger><Button isIconOnly variant="light" size="sm"><MoreVertical className="w-4 h-4" /></Button></DropdownTrigger>
                          <DropdownMenu aria-label="Actions">
                            <DropdownItem key="view" startContent={<Eye className="w-4 h-4" />} onPress={() => setDetailModal(r)}>View Detail</DropdownItem>
                            <DropdownItem key="del" startContent={<Trash2 className="w-4 h-4" />} className="text-danger" color="danger" onPress={() => handleDelete(r.id)}>Delete</DropdownItem>
                          </DropdownMenu>
                        </Dropdown>
                      </td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Detail Modal */}
      <Modal isOpen={!!detailModal} onClose={() => setDetailModal(null)} size="lg">
        <ModalContent>
          <ModalHeader>Repair Details</ModalHeader>
          <ModalBody>
            {detailModal && (
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2"><label className="text-xs font-bold text-slate-400 uppercase">Customer</label><div className="text-slate-800 font-medium">{detailModal.customer_name}</div><div className="text-slate-500 text-sm">{detailModal.contact_number || "No contact"}</div></div>
                <div><label className="text-xs font-bold text-slate-400 uppercase">Device</label><div className="text-slate-800 font-medium">{detailModal.device_details}</div><div className="text-xs text-slate-500">Model: {detailModal.model_number || "-"}</div></div>
                <div><label className="text-xs font-bold text-slate-400 uppercase">Serial</label><div className="text-slate-800 font-mono">{detailModal.serial_number || "-"}</div></div>
                <div><label className="text-xs font-bold text-slate-400 uppercase">Technician</label><div className="text-slate-800">{detailModal.technician_name || "-"}</div></div>
                <div><label className="text-xs font-bold text-slate-400 uppercase">Status</label><div className="mt-1"><Chip size="sm" variant="flat" color={getStatusColor(detailModal.status).color}>{detailModal.status}</Chip></div></div>
                <div><label className="text-xs font-bold text-slate-400 uppercase">Cost</label><div className="text-slate-800 font-bold">₹{detailModal.estimated_cost || 0}</div></div>
                <div><label className="text-xs font-bold text-slate-400 uppercase">Part Replaced</label><div className="text-slate-800">{detailModal.part_replaced_name || "None"}</div></div>
                <div className="col-span-2"><label className="text-xs font-bold text-slate-400 uppercase">Issue Description</label><div className="p-3 bg-slate-50 rounded border text-sm text-slate-700 mt-1">{detailModal.issue_description || "No description"}</div></div>
                {detailModal.status === "Delivered" && detailModal.delivered_at && (
                  <div className="col-span-2 bg-green-50 p-3 rounded border border-green-100">
                    <div className="flex items-center gap-2 text-green-700 font-bold text-xs uppercase"><CheckCircle className="w-4 h-4" /> Delivered</div>
                    <div className="text-green-800 text-sm mt-1">{new Date(detailModal.delivered_at).toLocaleString()}</div>
                  </div>
                )}
                {detailModal.invoice_number && (
                  <div className="col-span-2 bg-indigo-50 p-3 rounded border border-indigo-100">
                     <label className="text-xs font-bold text-indigo-400 uppercase">Linked Invoice</label>
                     <div className="text-indigo-800 font-mono font-bold mt-1">{detailModal.invoice_number}</div>
                  </div>
                )}
                <div className="col-span-2 text-xs text-slate-400 border-t pt-2 mt-2">Created: {new Date(detailModal.created_at).toLocaleString()}<br />ID: {detailModal.id}</div>
              </div>
            )}
          </ModalBody>
          <ModalFooter><Button variant="bordered" onPress={() => setDetailModal(null)}>Close</Button></ModalFooter>
        </ModalContent>
      </Modal>
    </div>
  );
}
