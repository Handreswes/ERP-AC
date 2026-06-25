-- SQL script to add missing columns to the sales table
-- Execute this script in your Supabase SQL Editor (https://supabase.com)

ALTER TABLE public.sales ADD COLUMN IF NOT EXISTS "notes" TEXT;
ALTER TABLE public.sales ADD COLUMN IF NOT EXISTS "paymentDetails" JSONB;
