"use client";
import React, { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { Card, CardBody, Button, Input, Chip, Modal, ModalContent, ModalHeader, ModalBody, ModalFooter } from "@heroui/react";
import { Search, Plus, Trash2, ShoppingCart, FileText, Printer, Download, Receipt, CheckCircle, X, Wrench } from "lucide-react";
import { jsPDF } from "jspdf";
import "jspdf-autotable";

export default function BillingPage() {
  const [products, setProducts] = useState<any[]>([]);
  const [repairs, setRepairs] = useState<any[]>([]);
  const [cart, setCart] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [repairSearch, setRepairSearch] = useState("");
  const [results, setResults] = useState<any[]>([]);
  const [repairResults, setRepairResults] = useState<any[]>([]);
  const [gstEnabled, setGstEnabled] = useState(false);
  const [gstType, setGstType] = useState<"CGST" | "IGST">("CGST");
  const [custName, setCustName] = useState("");
  const [custPhone, setCustPhone] = useState("");
  const [payMethod, setPayMethod] = useState<"Cash" | "Online">("Cash");
  const [cashReceiver, setCashReceiver] = useState("");
  const [onlinePlatform, setOnlinePlatform] = useState("");
  const [txnId, setTxnId] = useState("");
  const [payStatus, setPayStatus] = useState<"Paid" | "Pending">("Paid");
  const [saving, setSaving] = useState(false);
  const [completedBill, setCompletedBill] = useState<any>(null);
  const [serialModalProduct, setSerialModalProduct] = useState<any>(null);
  const [priceModalProduct, setPriceModalProduct] = useState<any>(null);
  const [tempPrice, setTempPrice] = useState("");

  // Manual entry
  const [manualName, setManualName] = useState("");
  const [manualPrice, setManualPrice] = useState("");
  const [manualQty, setManualQty] = useState("1");
  const [manualSerial, setManualSerial] = useState("");
  const [manualProblem, setManualProblem] = useState("");
  const [manualPart, setManualPart] = useState("");

  useEffect(() => { fetchAll(); }, []);

  async function fetchAll() {
    const { data: p } = await supabase.from("products").select("*");
    if (p) setProducts(p);
    const { data: r } = await supabase.from("repairs").select("*").in("status", ["Repaired", "Delivered (Payment Pending)"]);
    if (r) setRepairs(r);
  }

  function handleSearch(term: string) {
    setSearch(term);
    if (term.length < 2) { setResults([]); return; }
    setResults(products.filter(p => p.name.toLowerCase().includes(term.toLowerCase())).slice(0, 8));
  }

  function handleRepairSearch(term: string) {
    setRepairSearch(term);
    if (term.length < 2) { setRepairResults([]); return; }
    setRepairResults(repairs.filter(r => r.customer_name.toLowerCase().includes(term.toLowerCase()) || r.device_details.toLowerCase().includes(term.toLowerCase())).slice(0, 8));
  }

  function addToCart(product: any) {
    if (product.price <= 0 || !product.price) {
      setPriceModalProduct(product);
      setTempPrice("");
      return;
    }
    continueAddToCart(product);
  }

  function continueAddToCart(product: any) {
    if (product.serial_number && product.quantity > 0) {
      const serials = product.serial_number.split(",").filter((s: string) => s.trim());
      if (serials.length > 0) {
        setSerialModalProduct({ ...product, serials });
        setSearch(""); setResults([]);
        return;
      }
    }
    finishAddToCart(product, "");
  }

  function finishAddToCart(product: any, selectedSerial: string) {
    const existing = cart.find(c => c.product_id === product.id && !c.isRepair && (!selectedSerial || c.serial_number === selectedSerial));
    if (existing) {
      setCart(cart.map(c => c.product_id === product.id && !c.isRepair && (!selectedSerial || c.serial_number === selectedSerial) ? { ...c, quantity: c.quantity + 1 } : c));
    } else {
      setCart([...cart, { product_id: product.id, product_name: product.name, price_at_sale: product.price, cost_at_sale: product.cost_price || 0, quantity: 1, serial_number: selectedSerial, isRepair: false }]);
    }
    setSearch(""); setResults([]);
    setSerialModalProduct(null);
  }

  function addRepairToCart(repair: any) {
    if (cart.find(c => c.repairId === repair.id)) return;
    setCart([...cart, { product_id: null, repairId: repair.id, product_name: repair.device_details, price_at_sale: repair.estimated_cost || 0, cost_at_sale: 0, quantity: 1, serial_number: repair.serial_number || "", problem: repair.issue_description, part_name: repair.part_replaced_name, isRepair: true }]);
    setRepairSearch(""); setRepairResults([]);
    if (!custName) setCustName(repair.customer_name || "");
    if (!custPhone) setCustPhone(repair.contact_number || "");
  }

  function addManualItem() {
    if (!manualName) return;
    setCart([...cart, { product_id: null, product_name: manualName, price_at_sale: parseFloat(manualPrice) || 0, cost_at_sale: 0, quantity: parseInt(manualQty) || 1, serial_number: manualSerial, problem: manualProblem, part_name: manualPart, isRepair: false }]);
    setManualName(""); setManualPrice(""); setManualQty("1"); setManualSerial(""); setManualProblem(""); setManualPart("");
  }

  function removeFromCart(i: number) { setCart(cart.filter((_, idx) => idx !== i)); }

  const subtotal = cart.reduce((sum, c) => sum + c.price_at_sale * c.quantity, 0);
  const cgst = gstEnabled && gstType === "CGST" ? subtotal * 0.09 : 0;
  const sgst = cgst;
  const igst = gstEnabled && gstType === "IGST" ? subtotal * 0.18 : 0;
  const total = subtotal + (gstEnabled ? (gstType === "CGST" ? cgst + sgst : igst) : 0);

  async function generateBill() {
    if (cart.length === 0) return alert("Cart is empty!");
    setSaving(true);
    try {
      const invoiceNumber = `JRPL-${Date.now().toString(36).toUpperCase()}`;
      const { data: bill, error: billErr } = await supabase.from("bills").insert({
        invoice_number: invoiceNumber, customer_name: custName || "", customer_phone: custPhone,
        total_amount: total, gst_applied: gstEnabled, gst_type: gstType,
        payment_status: payStatus,
        payment_method: payStatus === "Paid" ? payMethod : null,
        cash_receiver: payStatus === "Paid" && payMethod === "Cash" ? cashReceiver : null,
        online_platform: payStatus === "Paid" && payMethod === "Online" ? onlinePlatform : null,
        transaction_id: payStatus === "Paid" && payMethod === "Online" ? txnId : null,
      }).select().single();
      if (billErr) throw billErr;

      const items = cart.map(c => ({
        bill_id: bill.id, product_id: c.product_id, product_name: c.product_name,
        quantity: c.quantity, price_at_sale: c.price_at_sale, cost_at_sale: c.cost_at_sale,
        serial_number: c.serial_number || null, problem: c.problem || null, part_name: c.part_name || null,
      }));
      await supabase.from("bill_items").insert(items);

      // Deduct stock
      for (const c of cart) {
        if (c.product_id && !c.isRepair) {
          const prod = products.find(p => p.id === c.product_id);
          if (prod) {
            await supabase.from("products").update({ quantity: Math.max(0, prod.quantity - c.quantity) }).eq("id", c.product_id);
          }
        }
        if (c.isRepair && c.repairId) {
          const { error: updErr } = await supabase.from("repairs").update({ status: "Delivered", delivered_at: new Date().toISOString(), updated_at: new Date().toISOString(), invoice_number: invoiceNumber }).eq("id", c.repairId);
          if (updErr) {
            await supabase.from("repairs").update({ status: "Delivered", delivered_at: new Date().toISOString(), updated_at: new Date().toISOString() }).eq("id", c.repairId);
          }
        }
      }

      setCompletedBill({ ...bill, items, invoiceNumber });
      setCart([]); setCustName(""); setCustPhone(""); fetchAll();
    } catch (err: any) { alert("Error: " + err.message); }
    finally { setSaving(false); }
  }

  async function downloadPDF(bill?: any) {
    const b = bill || completedBill;
    if (!b) return;
    const doc = new jsPDF("p", "mm", "a4");
    doc.setFillColor(15, 23, 42);
    doc.rect(0, 0, 210, 55, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFont(undefined as any, "bold"); doc.setFontSize(22);
    doc.text("JRPL | Jaysan Resource (P) Ltd.", 14, 20);
    doc.setFont(undefined as any, "normal"); doc.setFontSize(10);
    doc.text("Computer Hardware and Peripherals Sales & Services", 14, 28);
    doc.text("Shop No. 3, Sameera Plaza, Naza Market, Lucknow (UP) - 226021", 14, 34);
    doc.text("Ph: +91 96346 23233 | Email: jaysanresource555@gmail.com", 14, 40);
    doc.text("GSTIN: 09ABCDE1234F1Z5", 14, 46);
    doc.setFontSize(26); doc.setFont(undefined as any, "bold");
    doc.text("INVOICE", 195, 25, { align: "right" });
    doc.setFontSize(10); doc.setFont(undefined as any, "normal");
    doc.text(b.invoice_number || b.invoiceNumber || "", 195, 33, { align: "right" });

    const y = 65;
    doc.setTextColor(100, 116, 139); doc.setFontSize(9);
    doc.text("BILL TO", 14, y);
    doc.setTextColor(15, 23, 42); doc.setFontSize(12); doc.setFont(undefined as any, "bold");
    doc.text(b.customer_name || "", 14, y + 6);
    doc.setFontSize(10); doc.setFont(undefined as any, "normal");
    if (b.customer_phone) doc.text(b.customer_phone, 14, y + 11);
    doc.setTextColor(100, 116, 139); doc.setFontSize(9);
    doc.text("DATE", 150, y);
    doc.setTextColor(15, 23, 42); doc.setFontSize(11);
    doc.text(new Date(b.created_at).toLocaleDateString(), 150, y + 6);

    const tableData = (b.items || cart).map((item: any, i: number) => {
      let desc = item.product_name;
      if (item.serial_number) desc += `\nSN: ${item.serial_number}`;
      if (item.problem) desc += `\nService: ${item.problem}`;
      if (item.part_name) desc += `\nPart: ${item.part_name}`;
      return [i + 1, desc, item.quantity, `INR ${item.price_at_sale.toFixed(2)}`, `INR ${(item.price_at_sale * item.quantity).toFixed(2)}`];
    });

    (doc as any).autoTable({
      head: [["#", "Item Description", "Qty", "Price", "Total"]],
      body: tableData, startY: y + 25, theme: "plain",
      styles: { fontSize: 10, cellPadding: 3 },
      headStyles: { fillColor: [248, 250, 252], textColor: [100, 116, 139], fontStyle: "bold", lineColor: [226, 232, 240], lineWidth: 0.1 },
      bodyStyles: { textColor: [51, 65, 85] },
      columnStyles: { 0: { cellWidth: 15 }, 2: { cellWidth: 20, halign: "center" }, 3: { cellWidth: 30, halign: "right" }, 4: { cellWidth: 35, halign: "right" } },
    });

    let finY = (doc as any).lastAutoTable.finalY + 10;
    if (finY > 250) { doc.addPage(); finY = 20; }
    const xL = 140; const xR = 195;
    doc.setFontSize(10); doc.setTextColor(100, 116, 139);
    doc.text("Subtotal", xL, finY);
    doc.setTextColor(15, 23, 42);
    doc.text(`INR ${subtotal.toFixed(2)}`, xR, finY, { align: "right" });
    if (gstEnabled) {
      if (gstType === "IGST") {
        finY += 6; doc.setTextColor(100, 116, 139); doc.text("IGST (18%)", xL, finY);
        doc.setTextColor(15, 23, 42); doc.text(`INR ${igst.toFixed(2)}`, xR, finY, { align: "right" });
      } else {
        finY += 6; doc.setTextColor(100, 116, 139); doc.text("CGST (9%)", xL, finY);
        doc.setTextColor(15, 23, 42); doc.text(`INR ${cgst.toFixed(2)}`, xR, finY, { align: "right" });
        finY += 6; doc.setTextColor(100, 116, 139); doc.text("SGST (9%)", xL, finY);
        doc.setTextColor(15, 23, 42); doc.text(`INR ${sgst.toFixed(2)}`, xR, finY, { align: "right" });
      }
    }
    doc.setDrawColor(226, 232, 240); doc.line(130, finY + 6, 195, finY + 6);
    doc.setFontSize(14); doc.setFont(undefined as any, "bold");
    doc.text("Total", xL, finY + 16); doc.text(`INR ${total.toFixed(2)}`, xR, finY + 16, { align: "right" });

    const pH = doc.internal.pageSize.height;
    doc.setFontSize(8); doc.setTextColor(148, 163, 184);
    doc.text("Thank you for your business!", 14, pH - 20);
    doc.text("www.jaysanresource.com | jaysanresource555@gmail.com | +91 96346 23233", 14, pH - 15);
    doc.setFillColor(59, 130, 246); doc.rect(0, pH - 2, 210, 2, "F");
    doc.save(`Invoice_${b.invoice_number || b.invoiceNumber || "draft"}.pdf`);
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <h2 className="text-3xl font-bold text-slate-800">Create Invoice</h2>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Left - Product Selection */}
        <div className="lg:col-span-3 space-y-4">
          {/* Product Search */}
          <Card className="shadow-sm border border-slate-100"><CardBody className="p-5">
            <h3 className="font-bold text-slate-700 text-sm mb-3 flex items-center gap-2"><ShoppingCart className="w-4 h-4 text-blue-500" /> Add from Stock</h3>
            <div className="relative">
              <Input placeholder="Search products..." value={search} onValueChange={handleSearch} startContent={<Search className="w-4 h-4 text-slate-400" />} variant="bordered" />
              {results.length > 0 && (
                <div className="absolute z-20 w-full mt-1 bg-white border border-slate-200 rounded-xl shadow-xl max-h-48 overflow-auto">
                  {results.map(p => (
                    <button key={p.id} onClick={() => addToCart(p)} className="w-full text-left px-4 py-2.5 hover:bg-blue-50 border-b border-slate-50 last:border-0">
                      <div className="font-medium text-sm text-slate-700">{p.name}</div>
                      <div className="text-xs text-slate-500 flex justify-between"><span>Qty: {p.quantity}</span><span>₹{p.price}</span></div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </CardBody></Card>

          {/* Repair Search */}
          <Card className="shadow-sm border border-slate-100"><CardBody className="p-5">
            <h3 className="font-bold text-slate-700 text-sm mb-3 flex items-center gap-2"><Wrench className="w-4 h-4 text-purple-500" /> Add Repair Ticket</h3>
            <div className="relative">
              <Input placeholder="Search by customer or device..." value={repairSearch} onValueChange={handleRepairSearch} startContent={<Search className="w-4 h-4 text-slate-400" />} variant="bordered" />
              {repairResults.length > 0 && (
                <div className="absolute z-20 w-full mt-1 bg-white border border-slate-200 rounded-xl shadow-xl max-h-48 overflow-auto">
                  {repairResults.map(r => (
                    <button key={r.id} onClick={() => addRepairToCart(r)} className="w-full text-left px-4 py-2.5 hover:bg-purple-50 border-b border-slate-50 last:border-0">
                      <div className="font-medium text-sm text-slate-700">{r.customer_name} — {r.device_details}</div>
                      <div className="text-xs text-slate-500">Est. Cost: ₹{r.estimated_cost || 0} • {r.status}</div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </CardBody></Card>

          {/* Manual Item */}
          <Card className="shadow-sm border border-slate-100"><CardBody className="p-5">
            <h3 className="font-bold text-slate-700 text-sm mb-3 flex items-center gap-2"><Plus className="w-4 h-4 text-green-500" /> Manual Entry</h3>
            <div className="grid grid-cols-2 gap-3">
              <Input label="Item Name" value={manualName} onValueChange={setManualName} variant="bordered" size="sm" />
              <Input label="Price" type="number" value={manualPrice} onValueChange={setManualPrice} variant="bordered" size="sm" />
              <Input label="Qty" type="number" value={manualQty} onValueChange={setManualQty} variant="bordered" size="sm" />
              <Input label="Serial No." value={manualSerial} onValueChange={setManualSerial} variant="bordered" size="sm" />
              <Input label="Service/Problem" value={manualProblem} onValueChange={setManualProblem} variant="bordered" size="sm" />
              <Input label="Part Changed" value={manualPart} onValueChange={setManualPart} variant="bordered" size="sm" />
            </div>
            <Button size="sm" color="success" variant="flat" className="mt-3" onPress={addManualItem} startContent={<Plus className="w-4 h-4" />}>Add Item</Button>
          </CardBody></Card>
        </div>

        {/* Right - Invoice Preview */}
        <div className="lg:col-span-2 space-y-4">
          <Card className="shadow-sm border border-slate-100"><CardBody className="p-5 space-y-4">
            <h3 className="font-bold text-slate-700 text-sm flex items-center gap-2"><Receipt className="w-4 h-4 text-indigo-500" /> Invoice Preview</h3>

            <div className="grid grid-cols-2 gap-3">
              <Input label="Customer Name" value={custName} onValueChange={setCustName} variant="bordered" size="sm" placeholder="" />
              <Input label="Phone" value={custPhone} onValueChange={setCustPhone} variant="bordered" size="sm" />
            </div>

            {/* Cart Items */}
            <div className="border border-slate-200 rounded-xl overflow-hidden">
              <div className="bg-slate-50 px-4 py-2 border-b border-slate-100">
                <div className="flex justify-between text-xs font-bold text-slate-500 uppercase tracking-wider">
                  <span>Item</span><span>Amount</span>
                </div>
              </div>
              <div className="max-h-48 overflow-auto divide-y divide-slate-50">
                {cart.length === 0 ? (
                  <div className="px-4 py-6 text-sm text-slate-400 italic text-center">Cart is empty</div>
                ) : cart.map((c, i) => (
                  <div key={i} className="px-4 py-2.5 flex items-center justify-between hover:bg-slate-50/50 group">
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm text-slate-700 truncate">{c.product_name}</div>
                      <div className="text-xs text-slate-400 mt-1 flex items-center gap-1.5">
                        <span>Qty: {c.quantity} @ </span>
                        <div className="relative inline-flex items-center">
                          <span className="absolute left-1.5 text-slate-400">₹</span>
                          <input
                            type="number"
                            className="w-20 pl-4 pr-1.5 py-0.5 border border-slate-200 rounded text-xs bg-white text-slate-800 outline-none focus:border-blue-500 transition-colors"
                            value={c.price_at_sale}
                            onChange={(e) => {
                              const p = parseFloat(e.target.value) || 0;
                              setCart(cart.map((item, idx) => idx === i ? { ...item, price_at_sale: p } : item));
                            }}
                          />
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-sm text-slate-700">₹{(c.price_at_sale * c.quantity).toFixed(2)}</span>
                      <button onClick={() => removeFromCart(i)} className="text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"><X className="w-4 h-4" /></button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* GST */}
            <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={gstEnabled} onChange={e => setGstEnabled(e.target.checked)} className="w-4 h-4 text-blue-500 rounded" />
                <span className="text-sm font-medium text-slate-700">Apply GST (18%)</span>
              </label>
              {gstEnabled && (
                <div className="flex gap-3 mt-2 ml-6">
                  <label className="flex items-center gap-1.5"><input type="radio" name="gst" value="CGST" checked={gstType === "CGST"} onChange={() => setGstType("CGST")} /><span className="text-xs">CGST + SGST</span></label>
                  <label className="flex items-center gap-1.5"><input type="radio" name="gst" value="IGST" checked={gstType === "IGST"} onChange={() => setGstType("IGST")} /><span className="text-xs">IGST</span></label>
                </div>
              )}
            </div>

            {/* Totals */}
            <div className="space-y-2 font-mono text-sm">
              <div className="flex justify-between"><span className="text-slate-500">Subtotal</span><span>₹{subtotal.toFixed(2)}</span></div>
              {gstEnabled && gstType === "CGST" && <>
                <div className="flex justify-between text-slate-500 text-xs"><span>CGST 9%</span><span>₹{cgst.toFixed(2)}</span></div>
                <div className="flex justify-between text-slate-500 text-xs"><span>SGST 9%</span><span>₹{sgst.toFixed(2)}</span></div>
              </>}
              {gstEnabled && gstType === "IGST" && <div className="flex justify-between text-slate-500 text-xs"><span>IGST 18%</span><span>₹{igst.toFixed(2)}</span></div>}
              <div className="border-t border-slate-200 pt-2 flex justify-between font-bold text-lg"><span>Total</span><span className="text-slate-800">₹{total.toFixed(2)}</span></div>
            </div>

            {/* Payment */}
            <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 space-y-3">
              <div className="flex gap-3">
                <label className="flex items-center gap-2"><input type="radio" checked={payStatus === "Paid"} onChange={() => setPayStatus("Paid")} /><span className="text-sm font-medium">Paid</span></label>
                <label className="flex items-center gap-2"><input type="radio" checked={payStatus === "Pending"} onChange={() => setPayStatus("Pending")} /><span className="text-sm font-medium">Pending</span></label>
              </div>
              {payStatus === "Paid" && <>
                <div className="flex gap-3">
                  <label className="flex items-center gap-2"><input type="radio" checked={payMethod === "Cash"} onChange={() => setPayMethod("Cash")} /><span className="text-xs">Cash</span></label>
                  <label className="flex items-center gap-2"><input type="radio" checked={payMethod === "Online"} onChange={() => setPayMethod("Online")} /><span className="text-xs">Online</span></label>
                </div>
                {payMethod === "Cash" && <Input label="Received By" value={cashReceiver} onValueChange={setCashReceiver} variant="bordered" size="sm" />}
                {payMethod === "Online" && (
                  <div className="space-y-2">
                    <select value={onlinePlatform} onChange={e => setOnlinePlatform(e.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm">
                      <option value="">Select Platform</option>
                      <option value="GPay">GPay</option><option value="PhonePe">PhonePe</option>
                      <option value="Paytm">Paytm</option><option value="Bank Transfer">Bank Transfer</option>
                    </select>
                    <Input label="UPI ID / Txn Ref" value={txnId} onValueChange={setTxnId} variant="bordered" size="sm" />
                  </div>
                )}
              </>}
            </div>

            <Button color="primary" className="w-full font-semibold h-12 shadow-lg shadow-blue-500/20" onPress={generateBill} isLoading={saving} isDisabled={cart.length === 0} startContent={<FileText className="w-4 h-4" />}>
              Generate Invoice
            </Button>
          </CardBody></Card>
        </div>
      </div>

      {/* Post-Bill Modal */}
      <Modal isOpen={!!completedBill} onClose={() => setCompletedBill(null)} size="sm">
        <ModalContent>
          <ModalBody className="p-8 text-center space-y-4">
            <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto animate-scale-in"><CheckCircle className="w-8 h-8 text-emerald-600" /></div>
            <h3 className="text-xl font-bold text-slate-800">Invoice Created!</h3>
            <p className="text-slate-500 text-sm">Invoice #{completedBill?.invoiceNumber} has been saved successfully.</p>
            <div className="flex gap-2">
              <Button variant="bordered" className="flex-1" onPress={() => downloadPDF()} startContent={<Download className="w-4 h-4" />}>Download PDF</Button>
              <Button color="primary" className="flex-1" onPress={() => setCompletedBill(null)}>New Invoice</Button>
            </div>
          </ModalBody>
        </ModalContent>
      </Modal>

      {/* Serial Selection Modal */}
      <Modal isOpen={!!serialModalProduct} onClose={() => setSerialModalProduct(null)} size="sm">
        <ModalContent>
          <ModalHeader>Select Serial Number</ModalHeader>
          <ModalBody className="p-4 space-y-2">
            <p className="text-sm text-slate-500">Please choose a serial number for <b>{serialModalProduct?.name}</b></p>
            <div className="max-h-60 overflow-y-auto space-y-1">
              <button onClick={() => finishAddToCart(serialModalProduct, "")} className="w-full text-left px-3 py-2 text-sm bg-slate-100 hover:bg-slate-200 rounded-lg">No Serial (Skip)</button>
              {serialModalProduct?.serials?.map((sn: string, i: number) => (
                <button key={i} onClick={() => finishAddToCart(serialModalProduct, sn)} className="w-full text-left px-3 py-2 text-sm bg-blue-50 hover:bg-blue-100 text-blue-800 rounded-lg font-mono">
                  {sn}
                </button>
              ))}
            </div>
            <ModalFooter className="p-0 pt-2"><Button className="w-full" onPress={() => setSerialModalProduct(null)}>Cancel</Button></ModalFooter>
          </ModalBody>
        </ModalContent>
      </Modal>

      {/* Price Input Modal */}
      <Modal isOpen={!!priceModalProduct} onClose={() => setPriceModalProduct(null)} size="sm">
        <ModalContent>
          <ModalHeader>Set Selling Price</ModalHeader>
          <ModalBody className="p-4 space-y-4">
            <p className="text-sm text-slate-500">The selling price for <b>{priceModalProduct?.name}</b> is not set. Please specify the retail price for this transaction.</p>
            <Input type="number" label="Selling Price (₹)" value={tempPrice} onValueChange={setTempPrice} variant="bordered" autoFocus />
            <div className="flex gap-2">
              <Button variant="bordered" className="flex-1" onPress={() => setPriceModalProduct(null)}>Cancel</Button>
              <Button color="primary" className="flex-1" onPress={() => {
                if (!tempPrice || parseFloat(tempPrice) < 0) return alert("Enter a valid price");
                const p = { ...priceModalProduct, price: parseFloat(tempPrice) };
                setPriceModalProduct(null);
                continueAddToCart(p);
              }}>Confirm Price</Button>
            </div>
          </ModalBody>
        </ModalContent>
      </Modal>
    </div>
  );
}
