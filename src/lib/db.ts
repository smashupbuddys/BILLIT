import initSqlJs from 'sql.js';

// Constants
const DB_STORAGE_KEY = 'finance_db_data';

// Singleton instance
let dbInstance: any = null;
let initPromise: Promise<any> | null = null;

// Load database from localStorage
const loadFromStorage = (): Uint8Array | null => {
  const storedData = localStorage.getItem(DB_STORAGE_KEY);
  if (!storedData) return null;
  
  try {
    const arr = JSON.parse(storedData);
    return new Uint8Array(arr);
  } catch (error) {
    console.error('Error parsing stored database:', error);
    return null;
  }
};

// Save database to localStorage
const saveToStorage = (data: Uint8Array) => {
  try {
    const arr = Array.from(data);
    localStorage.setItem(DB_STORAGE_KEY, JSON.stringify(arr));
  } catch (error) {
    console.error('Error saving database:', error);
  }
};

// Save database to file
export const saveToFile = async () => {
  if (!dbInstance) {
    throw new Error('Database not initialized');
  }

  try {
    const data = dbInstance.export();
    const blob = new Blob([data], { type: 'application/x-sqlite3' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `finance-db-${new Date().toISOString().split('T')[0]}.db`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  } catch (error) {
    console.error('Error saving database to file:', error);
    throw error;
  }
};

// Load database from file
export const loadFromFile = async (file: File) => {
  try {
    const SQL = await initSqlJs({
      locateFile: file => `https://sql.js.org/dist/${file}`
    });

    const buffer = await file.arrayBuffer();
    const data = new Uint8Array(buffer);
    
    // Create new database instance from file
    const newDb = new SQL.Database(data);
    
    // Validate database structure
    try {
      // Try to query a few tables to ensure it's a valid database
      newDb.exec('SELECT * FROM parties LIMIT 1');
      newDb.exec('SELECT * FROM transactions LIMIT 1');
    } catch (error) {
      throw new Error('Invalid database file format');
    }

    // Replace existing database
    if (dbInstance) {
      dbInstance.close();
    }
    dbInstance = newDb;

    // Save to localStorage
    const exportedData = dbInstance.export();
    saveToStorage(exportedData);
  } catch (error) {
    console.error('Error loading database from file:', error);
    throw error;
  }
};

// Initialize SQL.js
const initDB = async () => {
  if (dbInstance) return dbInstance;
  
  if (initPromise) return initPromise;

  initPromise = new Promise(async (resolve, reject) => {
    try {
      const SQL = await initSqlJs({
        locateFile: file => `https://sql.js.org/dist/${file}`
      });

      // Try to load existing database
      const existingData = loadFromStorage();
      if (existingData) {
        dbInstance = new SQL.Database(existingData);
        
        // Check credit_sales table schema
        const creditSalesTableInfo = dbInstance.exec("PRAGMA table_info(credit_sales)");
        
        // Check for payment_frequency column
        const hasPaymentFrequency = creditSalesTableInfo[0].values.some((col: any[]) => col[1] === 'payment_frequency');
        
        if (!hasPaymentFrequency) {
          // Add payment_frequency column to credit_sales table
          dbInstance.run(`
            ALTER TABLE credit_sales ADD COLUMN payment_frequency TEXT 
            CHECK (payment_frequency IN ('daily', 'weekly', 'monthly')) 
            DEFAULT 'weekly'
          `);
          
          // Save the updated schema
          const data = dbInstance.export();
          saveToStorage(data);
          console.log('Added payment_frequency column to credit_sales table');
        }

        // Check for next_payment_date column
        const hasNextPaymentDate = creditSalesTableInfo[0].values.some((col: any[]) => col[1] === 'next_payment_date');
        
        if (!hasNextPaymentDate) {
          // Add next_payment_date column to credit_sales table
          dbInstance.run(`
            ALTER TABLE credit_sales ADD COLUMN next_payment_date DATE
          `);
          
          // Save the updated schema
          const data = dbInstance.export();
          saveToStorage(data);
          console.log('Added next_payment_date column to credit_sales table');
        }

        // Check if running_balance column exists in transactions table
        const transactionsTableInfo = dbInstance.exec("PRAGMA table_info(transactions)");
        const hasRunningBalance = transactionsTableInfo[0].values.some((col: any[]) => col[1] === 'running_balance');
        
        if (!hasRunningBalance) {
          // Add running_balance column to transactions table
          dbInstance.run("ALTER TABLE transactions ADD COLUMN running_balance DECIMAL(12,2)");
          
          // Save the updated schema
          const data = dbInstance.export();
          saveToStorage(data);
          console.log('Added running_balance column to transactions table');
        }

        // Check if credit_adjustments table exists
        const tables = dbInstance.exec(
          "SELECT name FROM sqlite_master WHERE type='table' AND name='credit_adjustments'"
        );
        if (tables.length === 0) {
          // Create credit_adjustments table if it doesn't exist
          dbInstance.run(`
            CREATE TABLE IF NOT EXISTS credit_adjustments (
              id TEXT PRIMARY KEY,
              credit_sale_id TEXT NOT NULL REFERENCES credit_sales(id),
              adjustment_amount DECIMAL(12,2) NOT NULL,
              adjustment_date DATE NOT NULL,
              description TEXT,
              created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
              updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
          `);
          
          // Save the updated schema
          const data = dbInstance.export();
          saveToStorage(data);
          console.log('Created credit_adjustments table');
        }
      } else {
        // Create new database
        dbInstance = new SQL.Database();
        
        // Initialize full schema
        dbInstance.run(`
          -- Create parties table
          CREATE TABLE IF NOT EXISTS parties (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
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
            amount DECIMAL(12,2) NOT NULL,
            payment_mode TEXT CHECK(payment_mode IN ('cash', 'digital', 'credit')),
            expense_category TEXT CHECK(
              expense_category IN (
                'goods_purchase', 'salary', 'advance', 'home', 'rent',
                'party_payment', 'petty', 'poly', 'food'
              )
            ),
            has_gst BOOLEAN DEFAULT 0,
            bill_number TEXT,
            return_amount DECIMAL(12,2),
            description TEXT,
            party_id TEXT REFERENCES parties(id),
            staff_id TEXT REFERENCES staff(id),
            running_balance DECIMAL(12,2),
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
          );

          -- Create credit sales table
          CREATE TABLE IF NOT EXISTS credit_sales (
            id TEXT PRIMARY KEY,
            customer_name TEXT NOT NULL,
            amount DECIMAL(12,2) NOT NULL,
            date DATE NOT NULL,
            paid_amount DECIMAL(12,2) DEFAULT 0,
            description TEXT,
            payment_frequency TEXT CHECK (payment_frequency IN ('daily', 'weekly', 'monthly')) DEFAULT 'weekly',
            next_payment_date DATE,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            credit_increase_description TEXT
          );

          -- Create credit payments table
          CREATE TABLE IF NOT EXISTS credit_payments (
            id TEXT PRIMARY KEY,
            credit_sale_id TEXT NOT NULL REFERENCES credit_sales(id),
            amount DECIMAL(12,2) NOT NULL,
            date DATE NOT NULL,
            description TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
          );

          -- Create credit adjustments table
          CREATE TABLE IF NOT EXISTS credit_adjustments (
            id TEXT PRIMARY KEY,
            credit_sale_id TEXT NOT NULL REFERENCES credit_sales(id),
            adjustment_amount DECIMAL(12,2) NOT NULL,
            adjustment_date DATE NOT NULL,
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
            amount DECIMAL(12,2) NOT NULL,
            date DATE NOT NULL,
            description TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
          );

          -- Create staff advance payments table
          CREATE TABLE IF NOT EXISTS staff_advance_payments (
            id TEXT PRIMARY KEY,
            advance_id TEXT NOT NULL REFERENCES staff_advances(id),
            amount DECIMAL(12,2) NOT NULL,
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
        `);

        // Save the new database
        const data = dbInstance.export();
        saveToStorage(data);
      }

      resolve(dbInstance);
    } catch (error) {
      console.error('Error initializing database:', error);
      reject(error);
    } finally {
      initPromise = null;
    }
  });

  return initPromise;
};

// Save database after each operation
const saveDatabase = () => {
  if (dbInstance) {
    const data = dbInstance.export();
    saveToStorage(data);
  }
};

// Generate unique ID
export const generateId = () => {
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
};

// Database wrapper with common operations
const db = {
  init: initDB,
  save: saveDatabase,
  run: async (sql: string, params: any[] = []) => {
    const instance = await initDB();
    instance.run(sql, params);
    saveDatabase();
  },
  exec: async (sql: string, params: any[] = []) => {
    const instance = await initDB();
    return instance.exec(sql, params);
  },
  get instance() {
    return dbInstance;
  }
};

export default db;
