"use client";
import React, { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Card, CardBody, Button, Modal, ModalContent, ModalHeader, ModalBody, ModalFooter, Input, Chip } from "@heroui/react";
import { Plus, Edit2 } from "lucide-react";
import { getStatusColor } from "@/lib/helpers";

const STATUSES = ["Received", "In Process", "Part Not Available", "Repaired", "Delivered (Payment Pending)", "Delivered"];

export default function RepairsPage() {
  const [repairs, setRepairs] = useState<any[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [editData, setEditData] = useState<any>(null);

  // Form
  const [custName, setCustName] = useState("");
  const [contact, setContact] = useState("");
  const [device, setDevice] = useState("");
  const [model, setModel] = useState("");
  const [serial, setSerial] = useState("");
  const [issue, setIssue] = useState("");
  const [problemFound, setProblemFound] = useState("");
  const [technician, setTechnician] = useState("");
  const [cost, setCost] = useState("");
  const [partChange, setPartChange] = useState(false);
  const [serviceOnly, setServiceOnly] = useState(false);
  const [partName, setPartName] = useState("");
  const [status, setStatus] = useState("Received");
  const [saving, setSaving] = useState(false);

  useEffect(() => { fetchRepairs(); }, []);

  async function fetchRepairs() {
    const { data } = await supabase.from("repairs").select("*").order("updated_at", { ascending: false });
    if (data) setRepairs(data);
  }

  function openModal(data?: any) {
    setEditData(data || null);
    setCustName(data?.customer_name || "");
    setContact(data?.contact_number || "");
    setDevice(data?.device_details || "");
    setModel(data?.model_number || "");
    setSerial(data?.serial_number || "");
    setIssue(data?.issue_description || "");
    setProblemFound(data?.problem_found || "");
    setTechnician(data?.technician_name || "");
    setCost(data?.estimated_cost?.toString() || "");
    setPartChange(data?.is_part_change || false);
    setServiceOnly(data?.is_service_only || false);
    setPartName(data?.part_replaced_name || "");
    setStatus(data?.status || "Received");
    setModalOpen(true);
  }

  async function handleSave() {
    if (!custName || !device) return alert("Customer name and device are required.");
    setSaving(true);
    const payload: any = {
      customer_name: custName, contact_number: contact, device_details: device,
      model_number: model, serial_number: serial, issue_description: issue,
      problem_found: problemFound, technician_name: technician,
      is_part_change: partChange, is_service_only: serviceOnly, part_replaced_name: partName,
      status, estimated_cost: parseFloat(cost) || 0, updated_at: new Date().toISOString(),
    };
    if (status === "Delivered") payload.delivered_at = new Date().toISOString();
    try {
      if (editData?.id) { await supabase.from("repairs").update(payload).eq("id", editData.id); }
      else { await supabase.from("repairs").insert([payload]); }
      setModalOpen(false); fetchRepairs();
    } catch (err: any) { alert("Error: " + err.message); }
    finally { setSaving(false); }
  }

  function sanitizeId(s: string) { return s.replace(/[\s()]/g, "-"); }

  return (
    <div className="space-y-6 animate-fade-in h-full flex flex-col">
      <div className="flex justify-between items-center shrink-0">
        <h2 className="text-3xl font-bold text-slate-800">Repair Board</h2>
        <Button color="primary" startContent={<Plus className="w-4 h-4" />} onPress={() => openModal()} className="shadow-lg shadow-blue-500/20">New Entry</Button>
      </div>

      {/* Kanban Board */}
      <div className="flex-1 overflow-x-auto overflow-y-hidden pb-4">
        <div className="flex gap-4 h-full min-w-[1400px]">
          {STATUSES.map(st => {
            const items = repairs.filter(r => r.status === st);
            const sc = getStatusColor(st);
            return (
              <div key={st} className="flex-1 flex flex-col bg-slate-100 rounded-xl p-3 min-w-[230px]">
                <div className="flex items-center justify-between mb-3 px-1">
                  <h3 className={`font-bold text-slate-700 ${st.length > 15 ? "text-xs" : "text-sm"}`}>{st}</h3>
                  <span className="bg-white px-2 py-0.5 rounded text-xs font-bold text-slate-500 shadow-sm">{items.length}</span>
                </div>
                <div className="flex-1 overflow-y-auto space-y-2.5 pr-1" style={{ scrollbarWidth: "thin" }}>
                  {items.map(item => (
                    <div key={item.id} className="bg-white p-3.5 rounded-lg shadow-sm border border-slate-200 hover:shadow-md transition-shadow group cursor-default">
                      <div className="flex justify-between items-start mb-2">
                        <h4 className="font-bold text-slate-800 text-sm leading-tight">{item.customer_name}</h4>
                        <span className="text-[10px] text-slate-400 whitespace-nowrap ml-2">{new Date(item.created_at).toLocaleDateString()}</span>
                      </div>
                      <p className="text-sm text-slate-600 font-medium mb-0.5">{item.device_details}</p>
                      <p className="text-xs text-slate-400 font-mono mb-1.5">Model: {item.model_number || "N/A"}</p>
                      <p className="text-xs text-slate-500 line-clamp-2 mb-2.5">{item.issue_description || "No description"}</p>
                      {item.status === "Delivered" && item.delivered_at && (
                        <p className="text-xs text-green-600 font-medium border-t border-slate-100 pt-1.5 mb-1.5">
                          Delivered: {new Date(item.delivered_at).toLocaleString()}
                        </p>
                      )}
                      <div className="flex justify-between items-center pt-2 border-t border-slate-50">
                        <span className="text-xs font-bold text-slate-400">#{item.contact_number?.slice(-4) || "----"}</span>
                        <button onClick={() => openModal(item)} className="opacity-0 group-hover:opacity-100 transition-opacity text-blue-500 hover:text-blue-700">
                          <Edit2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                  {items.length === 0 && <p className="text-center text-xs text-slate-400 py-6">No items</p>}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Modal */}
      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} size="2xl" scrollBehavior="inside">
        <ModalContent>
          <ModalHeader>{editData ? "Edit Repair" : "New Repair Entry"}</ModalHeader>
          <ModalBody className="space-y-4">
            <div className="p-3 bg-slate-50 rounded-lg border">
              <h4 className="text-xs font-bold text-slate-500 uppercase mb-2">Customer Details</h4>
              <div className="grid grid-cols-2 gap-3">
                <Input label="Name" value={custName} onValueChange={setCustName} variant="bordered" isRequired />
                <Input label="Contact" value={contact} onValueChange={setContact} variant="bordered" />
              </div>
            </div>
            <div className="p-3 bg-slate-50 rounded-lg border">
              <h4 className="text-xs font-bold text-slate-500 uppercase mb-2">Device Details</h4>
              <div className="grid grid-cols-2 gap-3 mb-3">
                <Input label="Device Name" value={device} onValueChange={setDevice} variant="bordered" isRequired />
                <Input label="Model Number" value={model} onValueChange={setModel} variant="bordered" />
              </div>
              <Input label="Serial Number" value={serial} onValueChange={setSerial} variant="bordered" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <textarea value={issue} onChange={e => setIssue(e.target.value)} placeholder="Problem (Customer)" className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm h-20 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500/40" />
              <textarea value={problemFound} onChange={e => setProblemFound(e.target.value)} placeholder="Problem Found (Tech)" className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm h-20 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500/40" />
            </div>
            <div className="p-3 bg-blue-50 rounded-lg border border-blue-100">
              <h4 className="text-xs font-bold text-blue-800 uppercase mb-3">Job Details</h4>
              <div className="grid grid-cols-2 gap-3 mb-3">
                <Input label="Technician" value={technician} onValueChange={setTechnician} variant="bordered" />
                <Input label="Est. Cost" type="number" value={cost} onValueChange={setCost} variant="bordered" />
              </div>
              <div className="flex gap-6 mb-3">
                <label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={partChange} onChange={e => setPartChange(e.target.checked)} className="w-4 h-4" /><span className="text-sm">Part Change?</span></label>
                <label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={serviceOnly} onChange={e => setServiceOnly(e.target.checked)} className="w-4 h-4" /><span className="text-sm">Service Only?</span></label>
              </div>
              {partChange && <Input label="Part Name" value={partName} onValueChange={setPartName} variant="bordered" />}
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700 mb-1 block">Current Status</label>
              <select value={status} onChange={e => setStatus(e.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm bg-white">
                {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </ModalBody>
          <ModalFooter>
            <Button variant="bordered" onPress={() => setModalOpen(false)}>Cancel</Button>
            <Button color="primary" onPress={handleSave} isLoading={saving}>Save Entry</Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </div>
  );
}
