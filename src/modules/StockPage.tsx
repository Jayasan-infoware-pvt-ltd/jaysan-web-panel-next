"use client";
import React, { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Card, CardBody, Button, Input, Chip, Modal, ModalContent, ModalHeader, ModalBody, ModalFooter, Select, SelectItem, Dropdown, DropdownTrigger, DropdownMenu, DropdownItem } from "@heroui/react";
import { Plus, Search, Download, MoreVertical, Eye, Edit2, Trash2, X, Link, ChevronLeft, ChevronRight, Image as ImageIcon } from "lucide-react";
import { getCategoryColor } from "@/lib/helpers";

export default function StockPage() {
  const [products, setProducts] = useState<any[]>([]);
  const [filtered, setFiltered] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [catFilter, setCatFilter] = useState("");
  const [categories, setCategories] = useState<string[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [viewMode, setViewMode] = useState(false);
  const [editData, setEditData] = useState<any>(null);
  const [lightbox, setLightbox] = useState<{ images: string[]; index: number } | null>(null);

  // Form state
  const [formName, setFormName] = useState("");
  const [formCategory, setFormCategory] = useState("");
  const [formPrice, setFormPrice] = useState("");
  const [formQty, setFormQty] = useState("");
  const [formCost, setFormCost] = useState("");
  const [formVendor, setFormVendor] = useState("");
  const [formLocation, setFormLocation] = useState("");
  const [formCourier, setFormCourier] = useState("0");
  const [formSerials, setFormSerials] = useState<string[]>([]);
  const [costUnlocked, setCostUnlocked] = useState(false);
  const [existingImages, setExistingImages] = useState<string[]>([]);
  const [newFiles, setNewFiles] = useState<File[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => { fetchProducts(); }, []);

  useEffect(() => {
    let f = products;
    if (search) f = f.filter(p => p.name.toLowerCase().includes(search.toLowerCase()));
    if (catFilter) f = f.filter(p => (p.category || "General") === catFilter);
    setFiltered(f);
  }, [search, catFilter, products]);

  async function fetchProducts() {
    const { data } = await supabase.from("products").select("*").order("created_at", { ascending: false });
    if (data) {
      setProducts(data);
      const cats = [...new Set(data.map((p: any) => p.category || "General"))].sort();
      setCategories(cats as string[]);
    }
  }

  function getImages(str: string) { return str ? str.split(",").filter(s => s.trim()) : []; }

  function openModal(isEdit: boolean, data?: any, isView = false) {
    setEditData(isEdit || isView ? data : null);
    setViewMode(isView);
    setFormName(data?.name || "");
    setFormCategory(data?.category || "");
    setFormPrice(data?.price?.toString() || "");
    setFormQty(data?.quantity?.toString() || "");
    setFormCost(data?.cost_price?.toString() || "0");
    setFormVendor(data?.vendor_name || "");
    setFormLocation(data?.location_from || "");
    setFormCourier(data?.courier_charges?.toString() || "0");
    setExistingImages(data ? getImages(data.image_url) : []);
    setNewFiles([]);
    setCostUnlocked(false);
    const serials = data?.serial_number ? data.serial_number.split(",") : [];
    setFormSerials(serials);
    setModalOpen(true);
  }

  function closeModal() {
    setModalOpen(false);
    setEditData(null);
    setViewMode(false);
  }

  async function handleSave() {
    if (!formName) return alert("Name is required");
    setSaving(true);
    try {
      // Upload new files
      const uploadedUrls: string[] = [];
      for (const file of newFiles) {
        const fileName = `prod_${Date.now()}_${Math.random().toString(36).substr(2, 9)}_${file.name.replace(/[^a-z0-9.]/gi, "_")}`;
        const { error: uploadError } = await supabase.storage.from("product-images").upload(fileName, file);
        if (uploadError) throw uploadError;
        const { data: publicUrlData } = supabase.storage.from("product-images").getPublicUrl(fileName);
        uploadedUrls.push(publicUrlData.publicUrl);
      }

      const finalImageString = [...existingImages, ...uploadedUrls].join(",");
      const serial_number = formSerials.slice(0, parseInt(formQty) || 0).filter(v => v && v.trim()).join(",");
      const payload: any = {
        name: formName,
        category: formCategory.trim() || "General",
        serial_number,
        price: parseFloat(formPrice) || 0,
        cost_price: parseFloat(formCost) || 0,
        quantity: parseInt(formQty) || 0,
        vendor_name: formVendor,
        location_from: formLocation,
        courier_charges: parseFloat(formCourier) || 0,
        image_url: finalImageString,
      };

      if (editData?.id) {
        payload.updated_at = new Date().toISOString();
        await supabase.from("products").update(payload).eq("id", editData.id);
      } else {
        await supabase.from("products").insert([payload]);
      }
      closeModal();
      fetchProducts();
    } catch (err: any) {
      alert("Error: " + err.message);
    } finally { setSaving(false); }
  }

  async function handleDelete(id: string) {
    const pass = prompt("Enter Developer Password to DELETE:");
    if (pass !== "Jayasan@9045") return alert("Incorrect Password!");
    if (!confirm("Delete this product?")) return;
    await supabase.from("products").delete().eq("id", id);
    fetchProducts();
  }

  function exportCSV() {
    if (products.length === 0) return;
    const isDev = prompt("Enter Developer Password to include Actual Cost Prices:") === "Jayasan@9045";
    let csv = `Name,Category,Price,Quantity${isDev ? ",Cost Price" : ""},Vendor\n`;
    csv += products.map(p => `"${p.name}","${p.category || ""}",${p.price},${p.quantity}${isDev ? `,${p.cost_price || 0}` : ""},"${p.vendor_name || ""}"`).join("\n");
    const link = document.createElement("a");
    link.href = encodeURI("data:text/csv;charset=utf-8," + csv);
    link.download = `stock_export_${new Date().toISOString().split("T")[0]}.csv`;
    link.click();
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex justify-between items-center">
        <h2 className="text-3xl font-bold text-slate-800">Stock Inventory</h2>
        <div className="flex gap-2">
          <Button variant="bordered" startContent={<Download className="w-4 h-4" />} onPress={exportCSV}>Export CSV</Button>
          <Button color="primary" startContent={<Plus className="w-4 h-4" />} onPress={() => openModal(false)} className="shadow-lg shadow-blue-500/20">Add Product</Button>
        </div>
      </div>

      {/* Search & Filter */}
      <Card className="shadow-sm border border-slate-100">
        <CardBody className="p-4 flex flex-col sm:flex-row gap-4">
          <Input placeholder="Search products..." value={search} onValueChange={setSearch} startContent={<Search className="w-4 h-4 text-slate-400" />} className="flex-1" variant="bordered" />
          <select value={catFilter} onChange={e => setCatFilter(e.target.value)} className="px-4 py-2 border border-slate-200 rounded-xl bg-white text-sm w-48 focus:outline-none focus:ring-2 focus:ring-blue-500/50">
            <option value="">All Categories</option>
            {categories.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </CardBody>
      </Card>

      {/* Table */}
      <Card className="shadow-sm border border-slate-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100 text-xs text-slate-500 uppercase tracking-wider">
                <th className="p-4 font-semibold w-20">Img</th>
                <th className="p-4 font-semibold">Product Name</th>
                <th className="p-4 font-semibold">Category</th>
                <th className="p-4 font-semibold">Price (₹)</th>
                <th className="p-4 font-semibold">Quantity</th>
                <th className="p-4 font-semibold">Last Updated</th>
                <th className="p-4 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="text-slate-700 divide-y divide-slate-100">
              {filtered.length === 0 ? (
                <tr><td colSpan={7} className="p-8 text-center text-slate-400">No products found</td></tr>
              ) : filtered.map(p => {
                const images = getImages(p.image_url);
                const thumb = images[0];
                return (
                  <tr key={p.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="p-4">
                      {thumb ? (
                        <div className="relative w-12 h-12 cursor-zoom-in group" onClick={() => setLightbox({ images, index: 0 })}>
                          <img src={thumb} className="w-12 h-12 rounded-lg object-cover border border-slate-200" alt={p.name} />
                          {images.length > 1 && <span className="absolute bottom-0 right-0 bg-black/60 text-white text-[10px] px-1 rounded-bl rounded-tr">+{images.length - 1}</span>}
                        </div>
                      ) : (
                        <div className="w-12 h-12 rounded-lg bg-slate-100 flex items-center justify-center text-slate-400"><ImageIcon className="w-5 h-5" /></div>
                      )}
                    </td>
                    <td className="p-4 font-medium text-slate-900">{p.name}</td>
                    <td className="p-4"><Chip size="sm" className={getCategoryColor(p.category)} variant="flat">{p.category || "General"}</Chip></td>
                    <td className="p-4">₹{p.price}</td>
                    <td className="p-4"><span className={p.quantity < 5 ? "text-red-600 font-bold" : "text-green-600 font-semibold"}>{p.quantity}</span></td>
                    <td className="p-4 text-sm text-slate-500">{p.updated_at ? new Date(p.updated_at).toLocaleString() : p.created_at ? new Date(p.created_at).toLocaleString() : "-"}</td>
                    <td className="p-4 text-right">
                      <Dropdown>
                        <DropdownTrigger><Button isIconOnly variant="light" size="sm"><MoreVertical className="w-4 h-4" /></Button></DropdownTrigger>
                        <DropdownMenu aria-label="Actions">
                          <DropdownItem key="view" startContent={<Eye className="w-4 h-4" />} onPress={() => openModal(false, p, true)}>View Detail</DropdownItem>
                          <DropdownItem key="edit" startContent={<Edit2 className="w-4 h-4" />} onPress={() => openModal(true, p)}>Edit Product</DropdownItem>
                          <DropdownItem key="delete" startContent={<Trash2 className="w-4 h-4" />} className="text-danger" color="danger" onPress={() => handleDelete(p.id)}>Delete</DropdownItem>
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

      {/* Add/Edit Modal */}
      <Modal isOpen={modalOpen} onClose={closeModal} size="2xl" scrollBehavior="inside">
        <ModalContent>
          <ModalHeader>{viewMode ? "Product Details" : editData ? "Edit Product" : "Add Product"}</ModalHeader>
          <ModalBody className="space-y-4">
            {/* Images */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Product Images</label>
              <div className="grid grid-cols-4 gap-2">
                {existingImages.map((url, i) => (
                  <div key={i} className="relative h-20 rounded-lg overflow-hidden border border-slate-200">
                    <img src={url} className="w-full h-full object-cover" alt="" />
                    {!viewMode && <button onClick={() => setExistingImages(prev => prev.filter((_, idx) => idx !== i))} className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-0.5"><X className="w-3 h-3" /></button>}
                  </div>
                ))}
              </div>
              {!viewMode && (
                <div className="flex gap-2 mt-2">
                  <label className="flex-1 flex items-center justify-center h-10 border-2 border-dashed border-slate-300 rounded-lg hover:bg-slate-50 cursor-pointer">
                    <Plus className="w-4 h-4 text-slate-400 mr-1" /><span className="text-sm text-slate-500">Add Images</span>
                    <input type="file" accept="image/*" multiple className="hidden" onChange={e => { if (e.target.files) setNewFiles(prev => [...prev, ...Array.from(e.target.files!)]); }} />
                  </label>
                  <button onClick={() => { const url = prompt("Paste Image URL:"); if (url?.startsWith("http")) setExistingImages(prev => [...prev, url]); }} className="flex items-center justify-center h-10 px-3 border-2 border-dashed border-slate-300 rounded-lg hover:bg-slate-50 text-slate-500 text-sm"><Link className="w-4 h-4 mr-1" />URL</button>
                </div>
              )}
            </div>

            <Input label="Product Name" value={formName} onValueChange={setFormName} isRequired isReadOnly={viewMode} variant="bordered" />
            <Input label="Category / Tag" value={formCategory} onValueChange={setFormCategory} isReadOnly={viewMode} variant="bordered" placeholder="e.g. Printer, Cables..." />
            <div className="grid grid-cols-2 gap-4">
              <Input label="Selling Price" type="number" value={formPrice} onValueChange={setFormPrice} isReadOnly={viewMode} variant="bordered" />
              <Input label="Quantity" type="number" value={formQty} onValueChange={setFormQty} isReadOnly={viewMode} variant="bordered" />
            </div>

            {/* Cost Price */}
            <div className="bg-indigo-50 p-3 rounded-xl border border-indigo-100">
              <div className="flex justify-between items-center mb-1">
                <label className="text-sm font-bold text-indigo-900">Actual Price (Cost)</label>
                {!costUnlocked && <button onClick={() => { if (prompt("Enter Developer Password:") === "Jayasan@9045") setCostUnlocked(true); else alert("Incorrect Password."); }} className="text-xs text-indigo-600 underline font-bold px-2 py-1 hover:bg-indigo-100 rounded">Unlock View</button>}
              </div>
              <Input type={costUnlocked ? "number" : "password"} value={formCost} onValueChange={setFormCost} isReadOnly={!costUnlocked || viewMode} placeholder={costUnlocked ? "Cost Price" : "********"} variant="bordered" size="sm" />
            </div>

            {/* Serials */}
            {parseInt(formQty) > 0 && (
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                <label className="text-xs font-bold text-slate-500 uppercase mb-2 block">Serial Numbers</label>
                <div className="space-y-1 max-h-32 overflow-y-auto">
                  {Array.from({ length: parseInt(formQty) || 0 }).map((_, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <span className="text-xs text-slate-400 w-6">#{i + 1}</span>
                      <input value={formSerials[i] || ""} onChange={e => { const arr = [...formSerials]; arr[i] = e.target.value; setFormSerials(arr); }} className="flex-1 px-3 py-1 border border-slate-200 rounded-lg text-sm" placeholder="Serial No." readOnly={viewMode} />
                    </div>
                  ))}
                </div>
              </div>
            )}

            <Input label="Vendor/Supplier" value={formVendor} onValueChange={setFormVendor} isReadOnly={viewMode} variant="bordered" />
            <div className="grid grid-cols-2 gap-4">
              <Input label="Sourced From" value={formLocation} onValueChange={setFormLocation} isReadOnly={viewMode} variant="bordered" />
              <Input label="Courier Charges" type="number" value={formCourier} onValueChange={setFormCourier} isReadOnly={viewMode} variant="bordered" />
            </div>
          </ModalBody>
          <ModalFooter>
            <Button variant="bordered" onPress={closeModal}>{viewMode ? "Close" : "Cancel"}</Button>
            {!viewMode && <Button color="primary" onPress={handleSave} isLoading={saving}>Save Product</Button>}
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* Lightbox */}
      {lightbox && (
        <div className="fixed inset-0 z-[110] bg-black/95 flex flex-col items-center justify-center backdrop-blur-md" onClick={() => setLightbox(null)}>
          <button className="absolute top-6 right-6 text-white p-2 bg-white/10 rounded-full hover:bg-white/20 z-[120]" onClick={() => setLightbox(null)}><X className="w-8 h-8" /></button>
          <div className="relative flex items-center justify-center px-12" onClick={e => e.stopPropagation()}>
            <button className="absolute left-4 p-2 bg-white/10 hover:bg-white/20 rounded-full text-white" onClick={() => setLightbox(prev => prev ? { ...prev, index: (prev.index - 1 + prev.images.length) % prev.images.length } : null)}><ChevronLeft className="w-8 h-8" /></button>
            <img src={lightbox.images[lightbox.index]} className="max-h-[90vh] max-w-[90vw] object-contain rounded-lg" alt="Preview" />
            <button className="absolute right-4 p-2 bg-white/10 hover:bg-white/20 rounded-full text-white" onClick={() => setLightbox(prev => prev ? { ...prev, index: (prev.index + 1) % prev.images.length } : null)}><ChevronRight className="w-8 h-8" /></button>
          </div>
          <div className="mt-4 text-white/50 text-sm">{lightbox.index + 1} / {lightbox.images.length}</div>
        </div>
      )}
    </div>
  );
}
