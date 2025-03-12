/*
  # Finance System Schema

  1. New Tables
    - `transactions`
      - Core table for all financial transactions
      - Handles sales, expenses, and bills
      - Uses RLS for security
      - Includes metadata for different transaction types
    
    - `parties`
      - Stores party/vendor information
      - Tracks credit limits and balances
      - Uses RLS for security

    - `staff`
      - Stores staff information
      - Tracks salary and advances
      - Uses RLS for security

  2. Security
    - Enable RLS on all tables
    - Add policies for authenticated users
    - Secure access to financial data

  3. Enums and Types
    - Transaction types
    - Payment modes
    - Expense categories
*/

-- Create custom types
CREATE TYPE transaction_type AS ENUM ('sale', 'expense', 'bill');
CREATE TYPE payment_mode AS ENUM ('cash', 'digital', 'credit');
CREATE TYPE expense_category AS ENUM (
  'goods_purchase',
  'salary',
  'advance',
  'home',
  'rent',
  'party_payment',
  'petty',
  'poly',
  'food'
);

-- Create parties table
CREATE TABLE IF NOT EXISTS parties (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  credit_limit numeric(12,2) DEFAULT 0,
  current_balance numeric(12,2) DEFAULT 0,
  contact_person text,
  phone text,
  address text,
  gst_number text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create staff table
CREATE TABLE IF NOT EXISTS staff (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  role text NOT NULL,
  salary numeric(10,2) NOT NULL,
  joining_date date NOT NULL,
  current_advance numeric(10,2) DEFAULT 0,
  contact_number text,
  address text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create transactions table
CREATE TABLE IF NOT EXISTS transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  date date NOT NULL,
  type transaction_type NOT NULL,
  amount numeric(12,2) NOT NULL,
  
  -- Sale specific fields
  payment_mode payment_mode,
  
  -- Expense specific fields
  expense_category expense_category,
  has_gst boolean DEFAULT false,
  
  -- Bill specific fields
  bill_number text,
  return_amount numeric(12,2),
  
  -- Common fields
  description text,
  party_id uuid REFERENCES parties(id),
  staff_id uuid REFERENCES staff(id),
  
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES auth.users(id),
  
  -- Add constraints
  CONSTRAINT valid_amount CHECK (amount >= 0),
  CONSTRAINT valid_return_amount CHECK (return_amount IS NULL OR return_amount >= 0),
  CONSTRAINT valid_payment_mode CHECK (
    (type = 'sale' AND payment_mode IS NOT NULL) OR
    (type != 'sale' AND payment_mode IS NULL)
  ),
  CONSTRAINT valid_expense_category CHECK (
    (type = 'expense' AND expense_category IS NOT NULL) OR
    (type != 'expense' AND expense_category IS NULL)
  )
);

-- Create running balances table for performance
CREATE TABLE IF NOT EXISTS running_balances (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  date date NOT NULL,
  cash_balance numeric(12,2) NOT NULL DEFAULT 0,
  credit_balance numeric(12,2) NOT NULL DEFAULT 0,
  expense_total numeric(12,2) NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT valid_balances CHECK (
    cash_balance >= 0 AND
    credit_balance >= 0 AND
    expense_total >= 0
  )
);

-- Enable RLS
ALTER TABLE parties ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE running_balances ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Allow all operations for authenticated users" ON parties
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow all operations for authenticated users" ON staff
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow all operations for authenticated users" ON transactions
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow all operations for authenticated users" ON running_balances
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Create indexes for better performance
CREATE INDEX idx_transactions_date ON transactions(date);
CREATE INDEX idx_transactions_type ON transactions(type);
CREATE INDEX idx_transactions_party_id ON transactions(party_id);
CREATE INDEX idx_transactions_staff_id ON transactions(staff_id);
CREATE INDEX idx_running_balances_date ON running_balances(date);

-- Create function to update running balances
CREATE OR REPLACE FUNCTION update_running_balance()
RETURNS TRIGGER AS $$
BEGIN
  -- Update or insert running balance for the day
  INSERT INTO running_balances (date, cash_balance, credit_balance, expense_total)
  SELECT 
    NEW.date,
    COALESCE(SUM(CASE 
      WHEN type = 'sale' AND payment_mode = 'cash' THEN amount
      ELSE 0
    END), 0) as cash_balance,
    COALESCE(SUM(CASE 
      WHEN type = 'sale' AND payment_mode = 'credit' THEN amount
      ELSE 0
    END), 0) as credit_balance,
    COALESCE(SUM(CASE 
      WHEN type = 'expense' THEN amount
      ELSE 0
    END), 0) as expense_total
  FROM transactions
  WHERE date = NEW.date
  ON CONFLICT (date) DO UPDATE
  SET 
    cash_balance = EXCLUDED.cash_balance,
    credit_balance = EXCLUDED.credit_balance,
    expense_total = EXCLUDED.expense_total,
    updated_at = now();
    
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for running balance updates
CREATE TRIGGER update_running_balance_trigger
AFTER INSERT OR UPDATE OR DELETE ON transactions
FOR EACH ROW
EXECUTE FUNCTION update_running_balance();

-- Create function to update party balances
CREATE OR REPLACE FUNCTION update_party_balance()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
    -- Update party balance
    UPDATE parties
    SET current_balance = (
      SELECT COALESCE(SUM(
        CASE 
          WHEN type = 'sale' AND payment_mode = 'credit' THEN amount
          WHEN type = 'bill' THEN -amount
          ELSE 0
        END
      ), 0)
      FROM transactions
      WHERE party_id = NEW.party_id
    )
    WHERE id = NEW.party_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for party balance updates
CREATE TRIGGER update_party_balance_trigger
AFTER INSERT OR UPDATE OR DELETE ON transactions
FOR EACH ROW
EXECUTE FUNCTION update_party_balance();
