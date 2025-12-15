-- Migration 011: Insert sample data
-- This migration inserts sample data for testing purposes

-- Insert sample properties data
INSERT INTO public.properties (corporation_name, legal_name, corporation_location, number_of_rooms, pms_name, country, currency, currency_symbol) VALUES
('Sample Hotel Corp', 'Sample Hotel Corporation LLC', 'New York, NY', 150, 'opera', 'US', 'USD', '$'),
('Beach Resort Inc', 'Beach Resort Incorporated', 'Miami, FL', 200, 'fosse', 'US', 'USD', '$'),
('Mountain Lodge', 'Mountain Lodge Properties', 'Denver, CO', 75, 'opera', 'US', 'USD', '$')
ON CONFLICT DO NOTHING;
