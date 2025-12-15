-- Migration 001: Create properties table
-- This table has no dependencies and is referenced by all other tables

CREATE TABLE IF NOT EXISTS public.properties (
    id SERIAL PRIMARY KEY,
    uuid uuid UNIQUE DEFAULT gen_random_uuid() NOT NULL,
    corporation_name VARCHAR(255) NOT NULL,
    legal_name VARCHAR(255) NOT NULL,
    corporation_location VARCHAR(500),
    number_of_rooms INTEGER,
    pms_name VARCHAR(100),
    country VARCHAR(2), -- ISO 3166-1 alpha-2 country code
    currency VARCHAR(3), -- ISO 4217 currency code
    currency_symbol VARCHAR(10), -- Currency symbol for display
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

-- Create indexes for properties table
CREATE INDEX IF NOT EXISTS idx_properties_uuid ON public.properties(uuid);
CREATE INDEX IF NOT EXISTS idx_properties_corporation_name ON public.properties(corporation_name);
CREATE INDEX IF NOT EXISTS idx_properties_country ON public.properties(country);
CREATE INDEX IF NOT EXISTS idx_properties_currency ON public.properties(currency);

-- Enable RLS
ALTER TABLE public.properties ENABLE ROW LEVEL SECURITY;

-- Create trigger for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_properties_updated_at ON public.properties;
CREATE TRIGGER update_properties_updated_at 
    BEFORE UPDATE ON public.properties 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();
