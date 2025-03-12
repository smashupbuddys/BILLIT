{`/*
      # Add credit sales tracking

      1. New Tables
        - `credit_sales`
          - `id` (uuid, primary key)
          - `customer_name` (text, required)
          - `amount` (numeric, required)
          - `date` (date, required)
          - `paid_amount` (numeric, default 0)
          - `description` (text, optional)
          - `created_at` (timestamptz)
          - `updated_at` (timestamptz)
        - `credit_payments`
          - `id` (uuid, primary key)
          - `credit_sale_id` (uuid, references credit_sales)
          - `amount` (numeric, required)
          - `date` (date, required)
          - `description` (text, optional)
          - `created_at` (timestamptz)
          - `updated_at` (timestamptz)

      2. Security
        - Enable RLS on both tables
        - Add policies for authenticated users

      3. Changes
        - Add indexes for better performance
        - Add trigger to update paid_amount on credit_sales
    */

    -- Create credit_sales table
    CREATE TABLE IF NOT EXISTS credit_sales (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      customer_name text NOT NULL,
      amount numeric(12,2) NOT NULL CHECK (amount > 0),
      date date NOT NULL,
      paid_amount numeric(12,2) NOT NULL DEFAULT 0 CHECK (paid_amount >= 0),
      description text,
      created_at timestamptz DEFAULT now(),
      updated_at timestamptz DEFAULT now(),
      payment_frequency TEXT CHECK (payment_frequency IN ('daily', 'weekly', 'monthly')) DEFAULT 'weekly',
      next_payment_date DATE
    );

    -- Create credit_payments table
    CREATE TABLE IF NOT EXISTS credit_payments (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      credit_sale_id uuid NOT NULL REFERENCES credit_sales(id) ON DELETE CASCADE,
      amount numeric(12,2) NOT NULL CHECK (amount > 0),
      date date NOT NULL,
      description text,
      created_at timestamptz DEFAULT now(),
      updated_at timestamptz DEFAULT now()
    );

    -- Enable RLS
    ALTER TABLE credit_sales ENABLE ROW LEVEL SECURITY;
    ALTER TABLE credit_payments ENABLE ROW LEVEL SECURITY;

    -- Create RLS policies
    CREATE POLICY "Allow all operations for authenticated users" ON credit_sales
      FOR ALL
      TO authenticated
      USING (true)
      WITH CHECK (true);

    CREATE POLICY "Allow all operations for authenticated users" ON credit_payments
      FOR ALL
      TO authenticated
      USING (true)
      WITH CHECK (true);

    -- Create indexes
    CREATE INDEX idx_credit_sales_date ON credit_sales(date);
    CREATE INDEX idx_credit_sales_customer ON credit_sales(customer_name);
    CREATE INDEX idx_credit_payments_date ON credit_payments(date);
    CREATE INDEX idx_credit_payments_sale ON credit_payments(credit_sale_id);

    -- Create function to update paid_amount
    CREATE OR REPLACE FUNCTION update_credit_sale_paid_amount()
    RETURNS TRIGGER AS $$
    BEGIN
      UPDATE credit_sales
      SET 
        paid_amount = COALESCE((
          SELECT SUM(amount)
          FROM credit_payments
          WHERE credit_sale_id = NEW.credit_sale_id
        ), 0),
        updated_at = now()
      WHERE id = NEW.credit_sale_id;
      
      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;

    -- Create trigger for paid_amount updates
    CREATE TRIGGER update_credit_sale_paid_amount_trigger
    AFTER INSERT OR UPDATE OR DELETE ON credit_payments
    FOR EACH ROW
    EXECUTE FUNCTION update_credit_sale_paid_amount();
`}
