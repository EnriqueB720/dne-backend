-- Secondary contact channels on a supplier storefront: a supplier may
-- publish up to two phone numbers and two email addresses.
ALTER TABLE "supplier" ADD COLUMN IF NOT EXISTS "business_phone_alt" TEXT;
ALTER TABLE "supplier" ADD COLUMN IF NOT EXISTS "business_email_alt" TEXT;
