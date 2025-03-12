-- Create parties table
CREATE TABLE IF NOT EXISTS parties (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  credit_limit DECIMAL(12,2) DEFAULT 0,
  current_balance DECIMAL(12,2) DEFAULT 0,
  contact_person TEXT,
  phone TEXT,
  address TEXT,
  gst_number TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Create staff table
CREATE TABLE IF NOT EXISTS staff (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  role TEXT NOT NULL,
  salary DECIMAL(10,2) NOT NULL,
  joining_date DATE NOT NULL,
  current_advance DECIMAL(10,2) DEFAULT 0,
  contact_number TEXT,
  address TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Create transactions table
CREATE TABLE IF NOT EXISTS transactions (
  id TEXT PRIMARY KEY,
  date DATE NOT NULL,
  type TEXT NOT NULL CHECK(type IN ('sale', 'expense', 'bill')),
  amount DECIMAL(12,2) NOT NULL CHECK(amount >= 0),
  payment_mode TEXT CHECK(payment_mode IN ('cash', 'digital', 'credit')),
  expense_category TEXT CHECK(
    expense_category IN (
      'goods_purchase', 'salary', 'advance', 'home', 'rent',
      'party_payment', 'petty', 'poly', 'food'
    )
  ),
  has_gst BOOLEAN DEFAULT 0,
  bill_number TEXT,
  return_amount DECIMAL(12,2) CHECK(return_amount IS NULL OR return_amount >= 0),
  description TEXT,
  party_id TEXT REFERENCES parties(id),
  staff_id TEXT REFERENCES staff(id),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Create running balances table
CREATE TABLE IF NOT EXISTS running_balances (
  id TEXT PRIMARY KEY,
  date DATE NOT NULL UNIQUE,
  cash_balance DECIMAL(12,2) NOT NULL DEFAULT 0,
  credit_balance DECIMAL(12,2) NOT NULL DEFAULT 0,
  expense_total DECIMAL(12,2) NOT NULL DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Create credit sales table
CREATE TABLE IF NOT EXISTS credit_sales (
  id TEXT PRIMARY KEY,
  customer_name TEXT NOT NULL,
  amount DECIMAL(12,2) NOT NULL CHECK(amount > 0),
  date DATE NOT NULL,
  paid_amount DECIMAL(12,2) NOT NULL DEFAULT 0 CHECK(paid_amount >= 0),
  description TEXT,
  payment_frequency TEXT CHECK (payment_frequency IN ('daily', 'weekly', 'monthly')) DEFAULT 'weekly',
  next_payment_date DATE,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Create credit payments table
CREATE TABLE IF NOT EXISTS credit_payments (
  id TEXT PRIMARY KEY,
  credit_sale_id TEXT NOT NULL REFERENCES credit_sales(id),
  amount DECIMAL(12,2) NOT NULL CHECK(amount > 0),
  date DATE NOT NULL,
  description TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Create staff holidays table
CREATE TABLE IF NOT EXISTS staff_holidays (
  id TEXT PRIMARY KEY,
  staff_id TEXT NOT NULL REFERENCES staff(id),
  date DATE NOT NULL,
  type TEXT NOT NULL CHECK(type IN ('weekly', 'festival', 'personal', 'sick')),
  description TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(staff_id, date)
);

-- Create staff advances table
CREATE TABLE IF NOT EXISTS staff_advances (
  id TEXT PRIMARY KEY,
  staff_id TEXT NOT NULL REFERENCES staff(id),
  amount DECIMAL(12,2) NOT NULL CHECK(amount > 0),
  date DATE NOT NULL,
  description TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Create staff advance payments table
CREATE TABLE IF NOT EXISTS staff_advance_payments (
  id TEXT PRIMARY KEY,
  advance_id TEXT NOT NULL REFERENCES staff_advances(id),
  amount DECIMAL(12,2) NOT NULL CHECK(amount > 0),
  date DATE NOT NULL,
  description TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(date);
CREATE INDEX IF NOT EXISTS idx_transactions_type ON transactions(type);
CREATE INDEX IF NOT EXISTS idx_transactions_party_id ON transactions(party_id);
CREATE INDEX IF NOT EXISTS idx_transactions_staff_id ON transactions(staff_id);
CREATE INDEX IF NOT EXISTS idx_running_balances_date ON running_balances(date);
CREATE INDEX IF NOT EXISTS idx_credit_sales_date ON credit_sales(date);
CREATE INDEX IF NOT EXISTS idx_credit_sales_customer ON credit_sales(customer_name);
CREATE INDEX IF NOT EXISTS idx_credit_payments_date ON credit_payments(date);
CREATE INDEX IF NOT EXISTS idx_credit_payments_sale ON credit_payments(credit_sale_id);
CREATE INDEX IF NOT EXISTS idx_staff_holidays_staff_id ON staff_holidays(staff_id);
CREATE INDEX IF NOT EXISTS idx_staff_holidays_date ON staff_holidays(date);
CREATE INDEX IF NOT EXISTS idx_staff_advances_staff_id ON staff_advances(staff_id);
CREATE INDEX IF NOT EXISTS idx_staff_advances_date ON staff_advances(date);
CREATE INDEX IF NOT EXISTS idx_staff_advance_payments_advance_id ON staff_advance_payments(advance_id);
CREATE INDEX IF NOT EXISTS idx_staff_advance_payments_date ON staff_advance_payments(date);
