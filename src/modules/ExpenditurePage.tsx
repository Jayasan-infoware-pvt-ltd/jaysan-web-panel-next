"use client";
import React, { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Card, CardBody, Button, Input, Chip, Modal, ModalContent, ModalHeader, ModalBody, ModalFooter, Dropdown, DropdownTrigger, DropdownMenu, DropdownItem } from "@heroui/react";
import { Plus, Search, Wallet, MoreVertical, Eye, Edit2, Trash2, Receipt, Download } from "lucide-react";

export default function ExpenditurePage() {
  const [expenditures, setExpenditures] = useState<any[]>([]);
  const [filtered, setFiltered] = useState<any[]>([]);
  const [historySearch, setHistorySearch] = useState("");
  const [filterCategory, setFilterCategory] = useState("All");
  const [filterMonth, setFilterMonth] = useState("");
  const [products, setProducts] = useState<any[]>([]);
  const [expType, setExpType] = useState<"Manual" | "From Stock">("Manual");
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [stockSearch, setStockSearch] = useState("");
  const [stockResults, setStockResults] = useState<any[]>([]);
  const [formDate, setFormDate] = useState(new Date().toISOString().split("T")[0]);
  const [formDesc, setFormDesc] = useState("");
  const [formAmount, setFormAmount] = useState("");
  const [formCategory, setFormCategory] = useState("Store");
  const [formLocation, setFormLocation] = useState("");
  const [formRemarks, setFormRemarks] = useState("");
  const [editId, setEditId] = useState("");
  const [saving, setSaving] = useState(false);
  const [detailModal, setDetailModal] = useState<any>(null);

  useEffect(() => { fetchExp(); }, []);

  async function fetchExp() {
    const { data } = await supabase.from("expenditures").select("*").order("created_at", { ascending: false }).limit(500);
    if (data) { setExpenditures(data); setFiltered(data); }
  }

  useEffect(() => {
    let result = expenditures;
    if (historySearch) {
      const t = historySearch.toLowerCase();
      result = result.filter(e => (e.item_name || "").toLowerCase().includes(t) || (e.remarks || "").toLowerCase().includes(t) || (e.location || "").toLowerCase().includes(t));
    }
    if (filterCategory !== "All") result = result.filter(e => (e.category || "Store") === filterCategory);
    if (filterMonth) result = result.filter(e => e.created_at.startsWith(filterMonth));
    setFiltered(result);
  }, [expenditures, historySearch, filterCategory, filterMonth]);

  async function fetchProducts() {
    const { data } = await supabase.from("products").select("id, name, quantity, price");
    if (data) setProducts(data);
  }

  function handleStockSearch(term: string) {
    setStockSearch(term);
    if (term.length < 2) { setStockResults([]); return; }
    setStockResults(products.filter(p => p.name.toLowerCase().includes(term.toLowerCase())).slice(0, 8));
  }

  function selectProduct(p: any) {
    setSelectedProduct(p);
    setStockSearch("");
    setStockResults([]);
    setFormAmount(String(p.price || 0));
  }

  function resetForm() {
    setEditId(""); setFormDesc(""); setFormAmount(""); setFormLocation(""); setFormRemarks("");
    setFormDate(new Date().toISOString().split("T")[0]); setFormCategory("Store");
    setSelectedProduct(null); setExpType("Manual");
  }

  async function handleSave() {
    const itemName = expType === "From Stock" ? (selectedProduct?.name || formDesc) : formDesc;
    const amount = parseFloat(formAmount);
    if (!itemName) return alert("Enter item description or select a product.");
    if (isNaN(amount) || amount < 0) return alert("Enter a valid amount.");
    setSaving(true);
    try {
      if (expType === "From Stock" && selectedProduct) {
        await supabase.from("products").update({ quantity: selectedProduct.quantity - 1 }).eq("id", selectedProduct.id);
      }
      const payload: any = {
        item_name: itemName, amount, type: expType, category: formCategory,
        location: formLocation, remarks: formRemarks,
        product_id: expType === "From Stock" ? selectedProduct?.id : null,
        quantity: 1, created_at: new Date(formDate).toISOString(),
      };
      if (editId) { await supabase.from("expenditures").update(payload).eq("id", editId); }
      else { await supabase.from("expenditures").insert(payload); }
      resetForm(); fetchExp();
    } catch (err: any) { alert("Error: " + err.message); }
    finally { setSaving(false); }
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this expenditure?")) return;
    await supabase.from("expenditures").delete().eq("id", id);
    fetchExp();
  }

  function handleEdit(ex: any) {
    setEditId(ex.id);
    setFormDate(new Date(ex.created_at).toISOString().split("T")[0]);
    setFormDesc(ex.item_name);
    setFormAmount(String(ex.amount));
    setFormCategory(ex.category || "Store");
    setFormLocation(ex.location || "");
    setFormRemarks(ex.remarks || "");
    setExpType(ex.type === "From Stock" || ex.type === "Stock" ? "From Stock" : "Manual");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function exportCSV() {
    if (filtered.length === 0) return;
    const escape = (s: any) => `"${String(s || "").replace(/"/g, '""')}"`;
    let csv = "Date,Item,Type,Location,Category,Amount,Remarks\n";
    csv += filtered.map(e => `${escape(new Date(e.created_at).toLocaleDateString())},${escape(e.item_name)},${escape(e.type)},${escape(e.location)},${escape(e.category)},${escape(e.amount)},${escape(e.remarks)}`).join("\n");
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a"); link.href = URL.createObjectURL(blob);
    link.download = `expenditures_${new Date().toISOString().split("T")[0]}.csv`; link.click();
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <h2 className="text-3xl font-bold text-slate-800">Expenditure Management</h2>

      {/* Add Form */}
      <Card className="shadow-sm border border-slate-100 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-purple-50 rounded-bl-full -mr-8 -mt-8 opacity-50 pointer-events-none" />
        <CardBody className="p-6">
          <h3 className="font-bold text-lg text-slate-700 mb-4 flex items-center gap-2">
            <Plus className="w-5 h-5 text-purple-600" /> {editId ? "Edit Expenditure" : "New Expenditure"}
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <Input type="date" label="Date" value={formDate} onChange={e => setFormDate(e.target.value)} variant="bordered" />
              <div>
                <label className="text-sm font-medium text-slate-700 mb-2 block">Type</label>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="radio" checked={expType === "Manual"} onChange={() => setExpType("Manual")} className="text-purple-600" />
                    <span className="text-sm">Manual Entry</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="radio" checked={expType === "From Stock"} onChange={() => { setExpType("From Stock"); if (products.length === 0) fetchProducts(); }} className="text-purple-600" />
                    <span className="text-sm">From Stock</span>
                  </label>
                </div>
              </div>
              {expType === "Manual" ? (
                <Input label="Item / Description" value={formDesc} onValueChange={setFormDesc} variant="bordered" placeholder="e.g. Office Rent, Tea..." />
              ) : (
                <div className="space-y-2">
                  <div className="relative">
                    <Input label="Search Product" value={stockSearch} onValueChange={handleStockSearch} variant="bordered" startContent={<Search className="w-4 h-4 text-slate-400" />} />
                    {stockResults.length > 0 && (
                      <div className="absolute z-20 w-full mt-1 bg-white border border-slate-200 rounded-xl shadow-xl max-h-48 overflow-auto">
                        {stockResults.map(p => (
                          <button key={p.id} onClick={() => selectProduct(p)} className="w-full text-left px-4 py-2 hover:bg-slate-50 border-b last:border-0 text-sm">
                            <div className="font-medium">{p.name}</div>
                            <div className="text-xs text-slate-500 flex justify-between"><span>Qty: {p.quantity}</span><span>₹{p.price}</span></div>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  {selectedProduct && (
                    <div className="flex justify-between items-center bg-emerald-50 p-2 rounded border border-emerald-100">
                      <span className="text-sm font-medium text-emerald-700">{selectedProduct.name}</span>
                      <button onClick={() => { setSelectedProduct(null); setFormAmount(""); }} className="text-red-500"><Trash2 className="w-4 h-4" /></button>
                    </div>
                  )}
                </div>
              )}
            </div>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <Input label="Amount (₹)" type="number" value={formAmount} onValueChange={setFormAmount} variant="bordered" />
                <div>
                  <label className="text-sm font-medium text-slate-700 mb-1 block">Category</label>
                  <select value={formCategory} onChange={e => setFormCategory(e.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm bg-white">
                    <option value="Store">Store</option><option value="Personal">Personal</option><option value="AMC">AMC</option>
                  </select>
                </div>
              </div>
              <Input label="Where Used / Location" value={formLocation} onValueChange={setFormLocation} variant="bordered" />
              <textarea value={formRemarks} onChange={e => setFormRemarks(e.target.value)} placeholder="Add remarks..." className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm h-20 resize-none focus:outline-none focus:ring-2 focus:ring-purple-500/40" />
            </div>
          </div>
          <div className="mt-6 flex justify-end gap-2">
            {editId && <Button variant="bordered" onPress={resetForm}>Cancel</Button>}
            <Button color="secondary" onPress={handleSave} isLoading={saving} startContent={<Wallet className="w-4 h-4" />} className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-lg shadow-purple-500/20">
              {editId ? "Update" : "Save"} Expenditure
            </Button>
          </div>
        </CardBody>
      </Card>

      {/* History */}
      <h3 className="text-xl font-bold text-slate-800 mt-8 mb-4">Expenditure Records</h3>
      
      <Card className="shadow-sm border border-slate-100 mb-4">
        <CardBody className="p-4 flex flex-col sm:flex-row items-center gap-4">
          <Input placeholder="Search expenses..." value={historySearch} onValueChange={setHistorySearch} startContent={<Search className="w-4 h-4 text-slate-400" />} variant="bordered" className="w-full flex-1" />
          <div className="flex gap-2 w-full sm:w-auto">
            <select value={filterCategory} onChange={e => setFilterCategory(e.target.value)} className="px-3 py-2 border border-slate-200 rounded-xl text-sm bg-white outline-none w-full sm:w-32">
              <option value="All">All Categories</option><option value="Store">Store</option><option value="Personal">Personal</option><option value="AMC">AMC</option>
            </select>
            <Input type="month" value={filterMonth} onChange={e => setFilterMonth(e.target.value)} variant="bordered" className="w-full sm:w-40" />
            <Button isIconOnly variant="bordered" onPress={exportCSV} title="Export CSV"><Download className="w-4 h-4" /></Button>
          </div>
        </CardBody>
      </Card>

      <Card className="shadow-sm border border-slate-100 overflow-hidden">
        <div className="p-4 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
          <span className="text-xs text-slate-500 font-mono">Found: {filtered.length} entries</span>
          <span className="text-xs font-bold text-slate-700">Total: ₹{filtered.reduce((acc, curr) => acc + (parseFloat(curr.amount) || 0), 0).toFixed(2)}</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead><tr className="bg-slate-50/50 text-xs uppercase text-slate-500 border-b">
              <th className="p-3">Date</th><th className="p-3">Item</th><th className="p-3">Type</th>
              <th className="p-3">Location</th><th className="p-3">Category</th><th className="p-3 text-right">Amount</th><th className="p-3 text-center">Action</th>
            </tr></thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.length === 0 ? <tr><td colSpan={7} className="p-8 text-center text-slate-400">No expenditures found</td></tr> :
                filtered.map(ex => (
                  <tr key={ex.id} className="hover:bg-slate-50 transition-colors">
                    <td className="p-3 text-slate-500">{new Date(ex.created_at).toLocaleDateString()}</td>
                    <td className="p-3"><div className="font-medium text-slate-700">{ex.item_name}</div>{ex.remarks && <div className="text-xs text-slate-400 truncate max-w-[200px]">{ex.remarks}</div>}</td>
                    <td className="p-3"><Chip size="sm" variant="flat" color={ex.type === "Stock" || ex.type === "From Stock" ? "secondary" : "default"} className="text-xs">{ex.type}</Chip></td>
                    <td className="p-3 text-slate-600">{ex.location || "-"}</td>
                    <td className="p-3 text-slate-500 text-xs uppercase">{ex.category || "-"}</td>
                    <td className="p-3 text-right font-bold text-slate-800">₹{Number(ex.amount).toFixed(2)}</td>
                    <td className="p-3 text-center">
                      <Dropdown><DropdownTrigger><Button isIconOnly variant="light" size="sm"><MoreVertical className="w-4 h-4" /></Button></DropdownTrigger>
                        <DropdownMenu aria-label="Actions">
                          <DropdownItem key="view" startContent={<Eye className="w-4 h-4" />} onPress={() => setDetailModal(ex)}>View Detail</DropdownItem>
                          <DropdownItem key="edit" startContent={<Edit2 className="w-4 h-4" />} onPress={() => handleEdit(ex)}>Edit</DropdownItem>
                          <DropdownItem key="del" startContent={<Trash2 className="w-4 h-4" />} className="text-danger" color="danger" onPress={() => handleDelete(ex.id)}>Delete</DropdownItem>
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
      <Modal isOpen={!!detailModal} onClose={() => setDetailModal(null)} size="md">
        <ModalContent>
          {detailModal && <>
            <div className="bg-gradient-to-r from-purple-600 to-indigo-600 p-5 text-white">
              <p className="text-xs opacity-80 uppercase tracking-wider font-semibold">Transaction Details</p>
              <h3 className="text-xl font-bold mt-1">{detailModal.item_name}</h3>
              <p className="text-sm opacity-90 mt-1">{new Date(detailModal.created_at).toLocaleDateString(undefined, { weekday: "short", year: "numeric", month: "long", day: "numeric" })}</p>
            </div>
            <ModalBody className="p-6 space-y-4">
              <div className="flex justify-between items-end border-b pb-4">
                <span className="text-slate-500 font-medium text-sm">Total Amount</span>
                <span className="text-2xl font-bold text-slate-800">₹{Number(detailModal.amount).toFixed(2)}</span>
              </div>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="bg-slate-50 p-3 rounded-lg border"><p className="text-slate-400 text-xs uppercase font-bold mb-1">Category</p><p className="font-semibold text-slate-700">{detailModal.category || "-"}</p></div>
                <div className="bg-slate-50 p-3 rounded-lg border"><p className="text-slate-400 text-xs uppercase font-bold mb-1">Type</p><Chip size="sm" variant="flat" color={detailModal.type === "From Stock" ? "secondary" : "default"}>{detailModal.type}</Chip></div>
                <div className="bg-slate-50 p-3 rounded-lg border col-span-2"><p className="text-slate-400 text-xs uppercase font-bold mb-1">Location</p><p className="font-semibold text-slate-700">{detailModal.location || "-"}</p></div>
              </div>
              {detailModal.remarks && <div className="bg-slate-50 p-3 rounded-lg border-l-4 border-purple-400 italic text-sm text-slate-600">{detailModal.remarks}</div>}
            </ModalBody>
            <ModalFooter><Button variant="bordered" onPress={() => setDetailModal(null)}>Close</Button></ModalFooter>
          </>}
        </ModalContent>
      </Modal>
    </div>
  );
}
