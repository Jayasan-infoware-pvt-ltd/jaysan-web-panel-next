"use client";
import React, { useState } from "react";
import { supabase } from "@/lib/supabase";
import { Card, CardBody, Button } from "@heroui/react";
import { Download, Upload, AlertTriangle, Lock, CheckCircle } from "lucide-react";

export default function BackupPage() {
  const [backupStatus, setBackupStatus] = useState("");
  const [backupColor, setBackupColor] = useState("");
  const [restoreStatus, setRestoreStatus] = useState("");
  const [restoreColor, setRestoreColor] = useState("");
  const [backing, setBacking] = useState(false);
  const [restoring, setRestoring] = useState(false);

  async function handleBackup() {
    setBacking(true); setBackupStatus("Fetching tables...");  setBackupColor("text-slate-500");
    try {
      const tables = ["products", "expenditures", "customer_queries", "bills", "bill_items", "repairs"];
      const exportData: any = {};
      for (const table of tables) {
        const { data, error } = await supabase.from(table).select("*");
        if (error) throw new Error(`Failed to fetch ${table}: ${error.message}`);
        exportData[table] = data;
      }
      exportData.meta = { timestamp: new Date().toISOString(), version: "1.0", app: "JRPL Panel" };
      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a"); a.href = url;
      a.download = `backup_jrpl_${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url);
      setBackupStatus("Backup Downloaded Successfully!"); setBackupColor("text-emerald-600");
    } catch (err: any) {
      alert("Export Failed: " + err.message); setBackupStatus(""); 
    } finally { setBacking(false); }
  }

  async function handleRestore() {
    const fileInput = document.getElementById("restore-file") as HTMLInputElement;
    const file = fileInput?.files?.[0];
    if (!file) return alert("Select a .json backup file first.");
    const pass = prompt("Enter Admin Password to RESTORE:");
    if (pass !== "admin123") return alert("Incorrect Password. Cancelled.");
    if (!confirm("Restore? This will update/add records.")) return;

    setRestoring(true); setRestoreStatus("Reading file..."); setRestoreColor("text-blue-600");
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        let json = JSON.parse(e.target?.result as string);
        if (Array.isArray(json)) {
          const sample = json[0];
          if (!sample) throw new Error("Empty file.");
          let detectedTable: string | null = null;
          if ("bill_id" in sample && "product_id" in sample) detectedTable = "bill_items";
          else if ("customer_name" in sample && "total_amount" in sample && "payment_status" in sample) detectedTable = "bills";
          else if ("device_details" in sample && "status" in sample) detectedTable = "repairs";
          else if ("item_name" in sample && "amount" in sample && "type" in sample) detectedTable = "expenditures";
          else if ("requirement" in sample && "customer_name" in sample) detectedTable = "customer_queries";
          else if ("name" in sample && "price" in sample && "quantity" in sample) detectedTable = "products";
          if (detectedTable) {
            if (!confirm(`Detected '${detectedTable}' (${json.length} rows). Proceed?`)) { setRestoring(false); return; }
            json = { [detectedTable]: json };
          } else throw new Error("Could not detect table type.");
        }

        const sequence = ["products", "expenditures", "customer_queries", "repairs", "bills", "bill_items"];
        let totalRestored = 0;
        for (const table of sequence) {
          const rows = json[table];
          if (rows?.length > 0) {
            setRestoreStatus(`Restoring ${table} (${rows.length} records)...`);
            const BATCH = 50;
            for (let i = 0; i < rows.length; i += BATCH) {
              const chunk = rows.slice(i, i + BATCH);
              const { error } = await supabase.from(table).upsert(chunk);
              if (error) throw new Error(`${table} chunk ${i}: ${error.message}`);
            }
            totalRestored += rows.length;
          }
        }
        setRestoreStatus(`Success! Restored ${totalRestored} records.`); setRestoreColor("text-emerald-600 font-bold");
        alert("Restore Complete!");
        if (fileInput) fileInput.value = "";
      } catch (err: any) {
        alert("Restore Failed: " + err.message); setRestoreStatus("Failed."); setRestoreColor("text-red-600");
      } finally { setRestoring(false); }
    };
    reader.readAsText(file);
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center gap-3">
        <h2 className="text-3xl font-bold text-slate-800">Backup & Restore</h2>
        <span className="px-3 py-1 bg-amber-100 text-amber-800 rounded-full text-xs font-bold border border-amber-200">Admin Only</span>
      </div>
      <p className="text-slate-500 max-w-2xl">
        Export your database to JSON or restore from a backup. <strong>Restore requires the Admin Password.</strong>
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Export */}
        <Card className="shadow-sm border-l-4 border-l-emerald-500">
          <CardBody className="p-8">
            <div className="flex items-center gap-4 mb-6">
              <div className="p-4 bg-emerald-100 text-emerald-600 rounded-full"><Download className="w-8 h-8" /></div>
              <div><h3 className="text-xl font-bold text-slate-800">Export / Backup</h3><p className="text-sm text-slate-500">Download all data as .json</p></div>
            </div>
            <div className="p-4 bg-slate-50 rounded-lg text-sm text-slate-600 border mb-4">
              <strong>Includes:</strong> Products, Repairs, Bills, Expenditures, Queries.
            </div>
            <Button color="success" className="w-full h-14 text-lg font-semibold shadow-lg shadow-emerald-200" onPress={handleBackup} isLoading={backing}>
              Download Backup File
            </Button>
            {backupStatus && <div className={`text-center text-sm font-medium mt-3 ${backupColor}`}>{backupStatus}</div>}
          </CardBody>
        </Card>

        {/* Import */}
        <Card className="shadow-sm border-l-4 border-l-blue-500">
          <CardBody className="p-8">
            <div className="flex items-center gap-4 mb-6">
              <div className="p-4 bg-blue-100 text-blue-600 rounded-full"><Upload className="w-8 h-8" /></div>
              <div><h3 className="text-xl font-bold text-slate-800">Restore Data</h3><p className="text-sm text-slate-500">Import from backup file</p></div>
            </div>
            <div className="p-4 bg-amber-50 rounded-lg text-sm text-amber-800 border border-amber-100 flex gap-2 mb-4">
              <AlertTriangle className="w-5 h-5 flex-shrink-0" />
              <p><strong>Warning:</strong> This updates existing records (by ID) and adds new ones. It does not delete.</p>
            </div>
            <input type="file" id="restore-file" accept=".json" className="block w-full text-sm text-slate-500 file:mr-4 file:py-3 file:px-4 file:rounded-full file:border-0 file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 cursor-pointer mb-4" />
            <Button variant="bordered" className="w-full h-14 text-lg border-2 border-dashed border-blue-200 hover:border-blue-400 hover:bg-blue-50 text-blue-600" onPress={handleRestore} isLoading={restoring} startContent={<Lock className="w-5 h-5" />}>
              Restore from Backup
            </Button>
            {restoreStatus && <div className={`text-center text-sm font-medium mt-3 ${restoreColor}`}>{restoreStatus}</div>}
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
