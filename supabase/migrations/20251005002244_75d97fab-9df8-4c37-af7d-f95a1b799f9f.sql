-- Fix company_settings public exposure
-- Remove the public access policy and restrict to authenticated users only
DROP POLICY IF EXISTS "Everyone can view company settings" ON public.company_settings;

CREATE POLICY "Authenticated users can view company settings"
ON public.company_settings
FOR SELECT
TO authenticated
USING (true);