-- Create notifications table
    CREATE TABLE IF NOT EXISTS notifications (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID REFERENCES auth.users(id),
      type TEXT NOT NULL,
      message TEXT NOT NULL,
      related_id UUID,
      is_read BOOLEAN DEFAULT FALSE,
      created_at TIMESTAMPTZ DEFAULT now(),
      updated_at TIMESTAMPTZ DEFAULT now()
    );

    -- Enable RLS
    ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

    -- Create RLS policies
    CREATE POLICY "Allow all operations for authenticated users" ON notifications
      FOR ALL
      TO authenticated
      USING (true)
      WITH CHECK (true);

    -- Create index
    CREATE INDEX idx_notifications_user_id ON notifications(user_id);
    CREATE INDEX idx_notifications_is_read ON notifications(is_read);
