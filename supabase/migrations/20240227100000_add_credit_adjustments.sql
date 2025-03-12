-- Create credit_adjustments table
CREATE TABLE IF NOT EXISTS credit_adjustments (
  id TEXT PRIMARY KEY,
  credit_sale_id TEXT NOT NULL REFERENCES credit_sales(id) ON DELETE CASCADE,
  adjustment_amount DECIMAL(12,2) NOT NULL,
  adjustment_date DATE NOT NULL,
  description TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Create index
CREATE INDEX idx_credit_adjustments_credit_sale_id ON credit_adjustments(credit_sale_id);
