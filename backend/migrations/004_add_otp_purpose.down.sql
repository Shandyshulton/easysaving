DROP INDEX IF EXISTS idx_password_reset_otps_purpose;

ALTER TABLE password_reset_otps
  DROP COLUMN IF EXISTS purpose;
