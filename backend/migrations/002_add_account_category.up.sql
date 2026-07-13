ALTER TABLE accounts
  ADD COLUMN IF NOT EXISTS category varchar(80) NOT NULL DEFAULT 'bank';
