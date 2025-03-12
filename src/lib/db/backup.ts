import db from '../db';

export interface BackupData {
  version: string;
  timestamp: string;
  tables: {
    [key: string]: any[];
  };
}

// Export database to JSON
export const exportDatabase = async (): Promise<BackupData> => {
  const dbInstance = await db.init();
  
  // Dynamically get list of existing tables
  const tablesResult = dbInstance.exec(`
    SELECT name FROM sqlite_master 
    WHERE type='table' 
    AND name NOT LIKE 'sqlite_%'
  `);
  
  const existingTables = tablesResult[0]?.values.map(row => row[0]) || [];
  
  const backup: BackupData = {
    version: '1.0',
    timestamp: new Date().toISOString(),
    tables: {}
  };

  try {
    for (const table of existingTables) {
      const result = dbInstance.exec(`SELECT * FROM ${table}`);
      backup.tables[table] = result.length > 0 ? result[0].values : [];
    }

    return backup;
  } catch (error) {
    console.error('Error exporting database:', error);
    throw new Error('Failed to export database');
  }
};

// Import database from JSON
export const importDatabase = async (data: BackupData): Promise<void> => {
  const dbInstance = await db.init();
  
  try {
    // Start transaction
    dbInstance.exec('BEGIN TRANSACTION;');

    // Get existing tables
    const existingTablesResult = dbInstance.exec(`
      SELECT name FROM sqlite_master 
      WHERE type='table' 
      AND name NOT LIKE 'sqlite_%'
    `);
    const existingTables = existingTablesResult[0]?.values.map(row => row[0]) || [];

    // Clear existing data for tables present in the backup
    for (const table of Object.keys(data.tables)) {
      // Only clear tables that exist in the current schema
      if (existingTables.includes(table)) {
        dbInstance.run(`DELETE FROM ${table};`);
      } else {
        console.warn(`Skipping non-existent table: ${table}`);
      }
    }

    // Insert new data
    for (const [table, rows] of Object.entries(data.tables)) {
      // Skip if table doesn't exist or has no rows
      if (!existingTables.includes(table) || rows.length === 0) {
        console.warn(`Skipping non-existent or empty table: ${table}`);
        continue;
      }

      // Fetch table info to get column names and constraints
      const tableInfoResult = dbInstance.exec(`PRAGMA table_info(${table});`);
      const columnNames = tableInfoResult[0].values.map((col: any[]) => col[1]);

      // Special handling for transactions table
      if (table === 'transactions') {
        const validTypes = ['sale', 'expense', 'bill'];
        rows.forEach((row: any[]) => {
          const typeIndex = columnNames.indexOf('type');
          if (typeIndex !== -1 && !validTypes.includes(row[typeIndex])) {
            console.warn(`Invalid transaction type: ${row[typeIndex]}. Skipping row.`);
            return;
          }
        });
      }

      const columns = columnNames.join(', ');
      const placeholders = columnNames.map(() => '?').join(',');

      const stmt = dbInstance.prepare(`
        INSERT INTO ${table} (${columns}) VALUES (${placeholders});
      `);

      for (const row of rows) {
        // Trim row to match number of columns
        const trimmedRow = row.slice(0, columnNames.length);

        // Log the row if there’s a mismatch between row length and columns
        if (trimmedRow.length !== columnNames.length) {
          console.warn(`Row length does not match columns for table ${table}:`, row);
        }

        try {
          stmt.run(trimmedRow);
        } catch (rowError) {
          console.error(`Error inserting row in ${table}:`, rowError);
          // Optionally log the problematic row
          console.error('Problematic row:', trimmedRow);
        }
      }
      stmt.free();
    }

    // Commit transaction
    dbInstance.exec('COMMIT;');
    
    // Save changes to storage
    db.save();
  } catch (error) {
    // Rollback on error
    dbInstance.exec('ROLLBACK;');
    console.error('Error importing database:', error);
    throw new Error(`Failed to import database: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};
