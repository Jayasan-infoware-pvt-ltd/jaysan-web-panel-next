-- Run this script in your Supabase SQL Editor
CREATE TABLE IF NOT EXISTS system_logs (
  id uuid default gen_random_uuid() primary key,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  user_email text not null,
  action_type text not null,
  location text,
  device_info text
);

-- Enable RLS (Row Level Security) and add basic policies if needed
ALTER TABLE system_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable insert for authenticated users only" ON "public"."system_logs"
  AS PERMISSIVE FOR INSERT TO authenticated
  WITH CHECK (true);

CREATE POLICY "Enable read access for all users" ON "public"."system_logs"
  AS PERMISSIVE FOR SELECT TO authenticated
  USING (true);
