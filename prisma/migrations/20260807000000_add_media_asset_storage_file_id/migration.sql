-- Provider-side file identifier, so we can stream bytes back through our
-- own API and delete the underlying file when an asset is removed.
ALTER TABLE "media_asset" ADD COLUMN IF NOT EXISTS "storage_file_id" TEXT;

-- Backfill from the Google Drive URLs already stored. Both historical
-- shapes carry the id as an `id=` query param:
--   https://drive.google.com/uc?export=view&id=<ID>
--   https://drive.google.com/thumbnail?id=<ID>&sz=w400
UPDATE "media_asset"
SET "storage_file_id" = split_part(split_part("url", 'id=', 2), '&', 1)
WHERE "storage_file_id" IS NULL
  AND "url" LIKE '%drive.google.com%id=%';
