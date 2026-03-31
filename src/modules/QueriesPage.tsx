"use client";
import React, { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Card, CardBody, Button, Input, Chip, Modal, ModalContent, ModalHeader, ModalBody, ModalFooter } from "@heroui/react";
import { Plus, Search, CheckCircle, Clock, MessageCircle, Pencil, Trash2 } from "lucide-react";

export default function QueriesPage() {
  const [queries, setQueries] = useState<any[]>([]);
  const [filtered, setFiltered] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editId, setEditId] = useState("");
  const [formName, setFormName] = useState("");
  const [formPhone, setFormPhone] = useState("");
  const [formReq, setFormReq] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => { fetchQueries(); }, []);
  useEffect(() => {
    if (!search) { setFiltered(queries); return; }
    const t = search.toLowerCase();
    setFiltered(queries.filter(q => q.customer_name.toLowerCase().includes(t) || q.requirement.toLowerCase().includes(t) || (q.phone_number && q.phone_number.includes(t))));
  }, [search, queries]);

  async function fetchQueries() {
    const { data } = await supabase.from("customer_queries").select("*").order("created_at", { ascending: false });
    if (data) setQueries(data);
  }

  function openAdd() { setEditId(""); setFormName(""); setFormPhone(""); setFormReq(""); setModalOpen(true); }
  function openEdit(q: any) { setEditId(q.id); setFormName(q.customer_name); setFormPhone(q.phone_number || ""); setFormReq(q.requirement); setModalOpen(true); }

  async function handleSave() {
    setSaving(true);
    const payload: any = { customer_name: formName, phone_number: formPhone, requirement: formReq };
    if (editId) { await supabase.from("customer_queries").update(payload).eq("id", editId); }
    else { payload.status = "Pending"; await supabase.from("customer_queries").insert(payload); }
    setSaving(false); setModalOpen(false); fetchQueries();
  }

  async function resolve(id: string) {
    await supabase.from("customer_queries").update({ status: "Resolved" }).eq("id", id);
    fetchQueries();
  }

  async function deleteQuery(id: string) {
    if (!confirm("Delete this query?")) return;
    await supabase.from("customer_queries").delete().eq("id", id);
    fetchQueries();
  }

  const total = queries.length;
  const resolved = queries.filter(q => q.status === "Resolved").length;
  const pending = total - resolved;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex justify-between items-center">
        <h2 className="text-3xl font-bold text-slate-800">Customer Queries</h2>
        <Button color="primary" startContent={<Plus className="w-4 h-4" />} onPress={openAdd} className="shadow-lg shadow-blue-500/20">Add Query</Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="shadow-sm border border-orange-100 bg-orange-50"><CardBody className="p-4 flex items-center gap-4">
          <div className="p-3 bg-orange-100 rounded-full text-orange-600"><Clock className="w-6 h-6" /></div>
          <div><div className="text-sm text-slate-500">Pending</div><div className="text-xl font-bold text-slate-800">{pending}</div></div>
        </CardBody></Card>
        <Card className="shadow-sm border border-emerald-100 bg-emerald-50"><CardBody className="p-4 flex items-center gap-4">
          <div className="p-3 bg-emerald-100 rounded-full text-emerald-600"><CheckCircle className="w-6 h-6" /></div>
          <div><div className="text-sm text-slate-500">Resolved</div><div className="text-xl font-bold text-slate-800">{resolved}</div></div>
        </CardBody></Card>
        <Card className="shadow-sm border border-sky-100 bg-sky-50"><CardBody className="p-4 flex items-center gap-4">
          <div className="p-3 bg-sky-100 rounded-full text-sky-600"><MessageCircle className="w-6 h-6" /></div>
          <div><div className="text-sm text-slate-500">Total</div><div className="text-xl font-bold text-slate-800">{total}</div></div>
        </CardBody></Card>
      </div>

      {/* Table */}
      <Card className="shadow-sm border border-slate-100 overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
          <h3 className="font-bold text-slate-700">Recent Queries</h3>
          <Input placeholder="Search..." value={search} onValueChange={setSearch} startContent={<Search className="w-4 h-4 text-slate-400" />} variant="bordered" className="w-64" size="sm" />
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead><tr className="bg-slate-50 text-xs text-slate-500 uppercase border-b">
              <th className="p-4">Date</th><th className="p-4">Customer</th><th className="p-4">Requirement</th><th className="p-4">Status</th><th className="p-4 text-right">Actions</th>
            </tr></thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {filtered.length === 0 ? <tr><td colSpan={5} className="p-8 text-center text-slate-400">No queries found</td></tr> :
                filtered.map(q => (
                  <tr key={q.id} className="hover:bg-slate-50 transition-colors">
                    <td className="p-4 text-slate-500 whitespace-nowrap">{new Date(q.created_at).toLocaleDateString()}</td>
                    <td className="p-4"><div className="font-medium text-slate-800">{q.customer_name}</div><div className="text-xs text-slate-400 font-mono">{q.phone_number || "-"}</div></td>
                    <td className="p-4 max-w-xs truncate text-slate-700" title={q.requirement}>{q.requirement}</td>
                    <td className="p-4"><Chip size="sm" variant="flat" color={q.status === "Resolved" ? "success" : "warning"}>{q.status || "Pending"}</Chip></td>
                    <td className="p-4 text-right space-x-1">
                      <Button isIconOnly variant="light" size="sm" onPress={() => openEdit(q)} title="Edit"><Pencil className="w-4 h-4" /></Button>
                      {q.status !== "Resolved" && <Button isIconOnly variant="light" size="sm" color="success" onPress={() => resolve(q.id)} title="Resolve"><CheckCircle className="w-4 h-4" /></Button>}
                      <Button isIconOnly variant="light" size="sm" color="danger" onPress={() => deleteQuery(q.id)} title="Delete"><Trash2 className="w-4 h-4" /></Button>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Modal */}
      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} size="md">
        <ModalContent>
          <ModalHeader>{editId ? "Edit Query" : "New Customer Query"}</ModalHeader>
          <ModalBody className="space-y-4">
            <Input label="Customer Name" value={formName} onValueChange={setFormName} variant="bordered" isRequired />
            <Input label="Phone Number" value={formPhone} onValueChange={setFormPhone} variant="bordered" />
            <textarea value={formReq} onChange={e => setFormReq(e.target.value)} placeholder="What is the customer looking for?" className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm h-24 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500/40" required />
          </ModalBody>
          <ModalFooter>
            <Button variant="bordered" onPress={() => setModalOpen(false)}>Cancel</Button>
            <Button color="primary" onPress={handleSave} isLoading={saving}>Save Query</Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </div>
  );
}
