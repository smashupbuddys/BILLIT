/*
  # Staff Management Enhancements

  1. New Tables
    - `staff_holidays`
      - `id` (uuid, primary key)
      - `staff_id` (uuid, references staff)
      - `date` (date)
      - `type` (holiday_type enum)
      - `description` (text)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

    - `staff_advances`
      - `id` (uuid, primary key)
      - `staff_id` (uuid, references staff)
      - `amount` (numeric)
      - `date` (date)
      - `description` (text)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

    - `staff_advance_payments`
      - `id` (uuid, primary key)
      - `staff_id` (uuid, references staff)
      - `advance_id` (uuid, references staff_advances)
      - `amount` (numeric)
      - `date` (date)
      - `description` (text)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

    - `staff_salary_settings`
      - `id` (uuid, primary key)
      - `sunday_bonus` (numeric)
      - `effective_from` (date)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Security
    - Enable RLS on all new tables
    - Add policies for authenticated users

  3. Changes
    - Add holiday tracking
    - Add advance management
    - Add salary settings with history
*/

-- Create holiday type enum
CREATE TYPE holiday_type AS ENUM ('weekly', 'festival', 'personal', 'sick');

-- Create staff holidays table
CREATE TABLE IF NOT EXISTS staff_holidays (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_id uuid NOT NULL REFERENCES staff(id) ON DELETE CASCADE,
  date date NOT NULL,
  type holiday_type NOT NULL,
  description text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT unique_staff_holiday UNIQUE (staff_id, date)
);

-- Create staff advances table
CREATE TABLE IF NOT EXISTS staff_advances (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_id uuid NOT NULL REFERENCES staff(id) ON DELETE CASCADE,
  amount numeric(12,2) NOT NULL CHECK (amount > 0),
  date date NOT NULL,
  description text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create staff advance payments table
CREATE TABLE IF NOT EXISTS staff_advance_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_id uuid NOT NULL REFERENCES staff(id) ON DELETE CASCADE,
  advance_id uuid NOT NULL REFERENCES staff_advances(id) ON DELETE CASCADE,
  amount numeric(12,2) NOT NULL CHECK (amount > 0),
  date date NOT NULL,
  description text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create staff salary settings table
CREATE TABLE IF NOT EXISTS staff_salary_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sunday_bonus numeric(12,2) NOT NULL CHECK (sunday_bonus >= 0),
  effective_from date NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE staff_holidays ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff_advances ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff_advance_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff_salary_settings ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Allow all operations for authenticated users" ON staff_holidays
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow all operations for authenticated users" ON staff_advances
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow all operations for authenticated users" ON staff_advance_payments
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow all operations for authenticated users" ON staff_salary_settings
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Create indexes
CREATE INDEX idx_staff_holidays_staff_id ON staff_holidays(staff_id);
CREATE INDEX idx_staff_holidays_date ON staff_holidays(date);
CREATE INDEX idx_staff_advances_staff_id ON staff_advances(staff_id);
CREATE INDEX idx_staff_advances_date ON staff_advances(date);
CREATE INDEX idx_staff_advance_payments_staff_id ON staff_advance_payments(staff_id);
CREATE INDEX idx_staff_advance_payments_advance_id ON staff_advance_payments(advance_id);
CREATE INDEX idx_staff_advance_payments_date ON staff_advance_payments(date);
CREATE INDEX idx_staff_salary_settings_effective_from ON staff_salary_settings(effective_from);

-- Create function to update current_advance in staff table
CREATE OR REPLACE FUNCTION update_staff_current_advance()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE staff
  SET 
    current_advance = (
      SELECT 
        COALESCE(SUM(a.amount), 0) - COALESCE(SUM(p.amount), 0)
      FROM staff_advances a
      LEFT JOIN staff_advance_payments p ON a.id = p.advance_id
      WHERE a.staff_id = NEW.staff_id
    ),
    updated_at = now()
  WHERE id = NEW.staff_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for advance updates
CREATE TRIGGER update_staff_current_advance_on_advance
AFTER INSERT OR UPDATE OR DELETE ON staff_advances
FOR EACH ROW
EXECUTE FUNCTION update_staff_current_advance();

CREATE TRIGGER update_staff_current_advance_on_payment
AFTER INSERT OR UPDATE OR DELETE ON staff_advance_payments
FOR EACH ROW
EXECUTE FUNCTION update_staff_current_advance();
