-- Add payment frequency and next payment date to credit_sales table
    ALTER TABLE credit_sales
    ADD COLUMN payment_frequency TEXT CHECK (payment_frequency IN ('daily', 'weekly', 'monthly')) DEFAULT 'weekly',
    ADD COLUMN next_payment_date DATE;
