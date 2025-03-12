import db, { generateId } from '../db';
import initSqlJs from 'sql.js';

interface DuplicateEntry {
  type: 'sale' | 'bill' | 'expense';
  sourceData: any;
  existingData: any;
}

export const mergeDatabases = async (sourceDbData: Uint8Array): Promise<{
  added: number;
  duplicates: DuplicateEntry[];
  errors: string[];
}> => {
  const result = {
    added: 0,
    duplicates: [] as DuplicateEntry[],
    errors: [] as string[]
  };

  try {
    // Initialize SQL.js with the source database
    const SQL = await initSqlJs({
      locateFile: file => `https://sql.js.org/dist/${file}`
    });
    
    const sourceDb = new SQL.Database(sourceDbData);
    const targetDb = await db.init();

    try {
      // Start with sales
      const sales = sourceDb.exec(`
        SELECT * FROM transactions 
        WHERE type = 'sale'
        ORDER BY date
      `);

      if (sales.length > 0) {
        for (const row of sales[0].values) {
          const [id, date, type, amount, payment_mode, , has_gst, , , description, party_id] = row;
          
          // Check for duplicates based on date and amount
          const duplicateCheck = targetDb.exec(`
            SELECT * FROM transactions 
            WHERE type = 'sale' 
            AND date = ? 
            AND amount = ?
            AND (payment_mode = ? OR payment_mode IS NULL)
          `, [date, amount, payment_mode]);

          if (duplicateCheck.length > 0 && duplicateCheck[0].values.length > 0) {
            result.duplicates.push({
              type: 'sale',
              sourceData: { date, amount, payment_mode, description },
              existingData: {
                date: duplicateCheck[0].values[0][1],
                amount: duplicateCheck[0].values[0][3],
                payment_mode: duplicateCheck[0].values[0][4],
                description: duplicateCheck[0].values[0][9]
              }
            });
          } else {
            // Add new sale
            const newId = generateId();
            targetDb.run(`
              INSERT INTO transactions (
                id, date, type, amount, payment_mode,
                has_gst, description, party_id, created_at
              ) VALUES (?, ?, 'sale', ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
            `, [
              newId, date, amount, payment_mode,
              has_gst, description, party_id
            ]);
            result.added++;
          }
        }
      }

      // Handle bills
      const bills = sourceDb.exec(`
        SELECT * FROM transactions 
        WHERE type = 'bill'
        ORDER BY date
      `);

      if (bills.length > 0) {
        for (const row of bills[0].values) {
          const [id, date, type, amount, , , has_gst, bill_number, , description, party_id] = row;
          
          // Check for duplicates based on date, amount, and bill number
          const duplicateCheck = targetDb.exec(`
            SELECT * FROM transactions 
            WHERE type = 'bill' 
            AND date = ? 
            AND amount = ?
            AND (bill_number = ? OR (bill_number IS NULL AND ? IS NULL))
            ${party_id ? 'AND party_id = ?' : ''}
          `, [date, amount, bill_number, bill_number, ...(party_id ? [party_id] : [])]);

          if (duplicateCheck.length > 0 && duplicateCheck[0].values.length > 0) {
            result.duplicates.push({
              type: 'bill',
              sourceData: { date, amount, bill_number, description, party_id },
              existingData: {
                date: duplicateCheck[0].values[0][1],
                amount: duplicateCheck[0].values[0][3],
                bill_number: duplicateCheck[0].values[0][7],
                description: duplicateCheck[0].values[0][9],
                party_id: duplicateCheck[0].values[0][10]
              }
            });
          } else {
            // Add new bill
            const newId = generateId();
            targetDb.run(`
              INSERT INTO transactions (
                id, date, type, amount, has_gst,
                bill_number, description, party_id, created_at
              ) VALUES (?, ?, 'bill', ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
            `, [
              newId, date, amount, has_gst,
              bill_number, description, party_id
            ]);
            result.added++;
          }
        }
      }

      // Handle expenses
      const expenses = sourceDb.exec(`
        SELECT * FROM transactions 
        WHERE type = 'expense'
        ORDER BY date
      `);

      if (expenses.length > 0) {
        for (const row of expenses[0].values) {
          const [id, date, type, amount, , expense_category, has_gst, , , description, party_id, staff_id] = row;
          
          // Check for duplicates based on date, amount, and category
          const duplicateCheck = targetDb.exec(`
            SELECT * FROM transactions 
            WHERE type = 'expense' 
            AND date = ? 
            AND amount = ?
            AND (expense_category = ? OR (expense_category IS NULL AND ? IS NULL))
          `, [date, amount, expense_category, expense_category]);

          if (duplicateCheck.length > 0 && duplicateCheck[0].values.length > 0) {
            result.duplicates.push({
              type: 'expense',
              sourceData: { date, amount, expense_category, description },
              existingData: {
                date: duplicateCheck[0].values[0][1],
                amount: duplicateCheck[0].values[0][3],
                expense_category: duplicateCheck[0].values[0][5],
                description: duplicateCheck[0].values[0][9]
              }
            });
          } else {
            // Add new expense
            const newId = generateId();
            targetDb.run(`
              INSERT INTO transactions (
                id, date, type, amount, expense_category,
                has_gst, description, party_id, staff_id, created_at
              ) VALUES (?, ?, 'expense', ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
            `, [
              newId, date, amount, expense_category,
              has_gst, description, party_id, staff_id
            ]);
            result.added++;
          }
        }
      }

      // Save changes
      db.save();

    } catch (error) {
      console.error('Error during merge:', error);
      result.errors.push(error.message);
    }

  } catch (error) {
    console.error('Error initializing source database:', error);
    result.errors.push(error.message);
  }

  return result;
};

export const handleDuplicate = async (entry: DuplicateEntry, action: 'skip' | 'add'): Promise<boolean> => {
  if (action === 'skip') return true;

  try {
    const targetDb = await db.init();
    const newId = generateId();

    switch (entry.type) {
      case 'sale':
        targetDb.run(`
          INSERT INTO transactions (
            id, date, type, amount, payment_mode,
            description, created_at
          ) VALUES (?, ?, 'sale', ?, ?, ?, CURRENT_TIMESTAMP)
        `, [
          newId,
          entry.sourceData.date,
          entry.sourceData.amount,
          entry.sourceData.payment_mode,
          entry.sourceData.description
        ]);
        break;

      case 'bill':
        targetDb.run(`
          INSERT INTO transactions (
            id, date, type, amount, bill_number,
            description, party_id, created_at
          ) VALUES (?, ?, 'bill', ?, ?, ?, ?, CURRENT_TIMESTAMP)
        `, [
          newId,
          entry.sourceData.date,
          entry.sourceData.amount,
          entry.sourceData.bill_number,
          entry.sourceData.description,
          entry.sourceData.party_id
        ]);
        break;

      case 'expense':
        targetDb.run(`
          INSERT INTO transactions (
            id, date, type, amount, expense_category,
            description, created_at
          ) VALUES (?, ?, 'expense', ?, ?, ?, CURRENT_TIMESTAMP)
        `, [
          newId,
          entry.sourceData.date,
          entry.sourceData.amount,
          entry.sourceData.expense_category,
          entry.sourceData.description
        ]);
        break;
    }

    db.save();
    return true;
  } catch (error) {
    console.error('Error handling duplicate:', error);
    return false;
  }
};
