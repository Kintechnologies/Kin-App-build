-- Household income
CREATE TABLE IF NOT EXISTS household_income (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE UNIQUE,
  monthly_income INTEGER NOT NULL DEFAULT 0,
  pay_frequency TEXT CHECK (pay_frequency IN ('weekly', 'biweekly', 'monthly')),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE household_income ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own income" ON household_income
  FOR ALL USING (profile_id = auth.uid());

-- Transactions
CREATE TABLE IF NOT EXISTS transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  amount NUMERIC(10,2) NOT NULL,
  category TEXT NOT NULL,
  bucket TEXT NOT NULL CHECK (bucket IN ('needs', 'wants', 'savings')),
  description TEXT,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own transactions" ON transactions
  FOR ALL USING (profile_id = auth.uid());

CREATE INDEX idx_transactions_profile_date ON transactions(profile_id, date);
