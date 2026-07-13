ALTER TABLE password_reset_otps
  ADD COLUMN IF NOT EXISTS purpose varchar(32) NOT NULL DEFAULT 'password_reset';

CREATE INDEX IF NOT EXISTS idx_password_reset_otps_purpose ON password_reset_otps(purpose);
