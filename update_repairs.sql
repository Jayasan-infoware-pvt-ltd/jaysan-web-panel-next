-- Run this script in your Supabase SQL Editor to link Repairs to Invoices
ALTER TABLE repairs ADD COLUMN IF NOT EXISTS invoice_number text;
