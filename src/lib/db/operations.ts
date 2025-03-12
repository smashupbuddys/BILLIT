import db, { generateId } from '../db';
import { ParsedEntry } from '../../pages/BulkEntry/types';

// Interfaces
export interface BulkEntry {
  type: 'sale' | 'expense' | 'bill' | 'payment';
  data: {
    id?: string;
    date: string;
    amount: number;
    payment_mode?: 'cash' | 'digital' | 'credit';
    party_name?: string;
    staff_name?: string;
    description?: string;
    billNumber?: string;
    hasGST?: boolean;
  }
}

export interface Transaction {
  id: string;
  date: string;
  type: 'bill' | 'payment' | 'sale';
  amount: number;
  bill_number?: string;
  has_gst: boolean;
  description?: string;
  running_balance: number;
  created_at: string;
}

// Utility Functions
export const calculateGSTAmount = (amount: number) => {
  const baseAmount = Math.round((amount / 1.03) * 100) / 100;
  const gstAmount = Math.round((amount - baseAmount) * 100) / 100;
  return { baseAmount, gstAmount };
};

const convertToSQLDate = (date: string) => {
  try {
    // First try to parse as YYYY-MM-DD
    if (date.match(/^\d{4}-\d{2}-\d{2}$/)) {
      return date;
    }

    // Then try DD/MM/YY format
    const parts = date.split('/');
    if (parts.length === 3) {
      const [day, month, year] = parts.map(part => part.trim());
      return `20${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
    }

    throw new Error('Invalid date format');
  } catch (error) {
    console.error('Date conversion error:', error);
    throw new Error(`Invalid date format: ${date}. Expected DD/MM/YY or YYYY-MM-DD`);
  }
};

const convertFromSQLDate = (date: string) => {
  const [year, month, day] = date.split('-');
  return `${day}/${month}/${year.slice(2)}`;
};

// Main Functions
export const processBulkEntries = async (partyId: string | undefined, entries: ParsedEntry[]) => {
  const dbInstance = await db.init();

  try {
    dbInstance.run('BEGIN TRANSACTION');

    try {
      // Convert date format and sort chronologically
      const sortedEntries = [...entries].sort((a, b) => {
        const dateA = new Date(convertToSQLDate(a.data.date));
        const dateB = new Date(convertToSQLDate(b.data.date));
        return dateA.getTime() - dateB.getTime();
      });

      for (const entry of sortedEntries) {
        // Check for duplicates before processing
        const isDuplicate = await checkDuplicateTransaction(
          partyId || null,
          entry.data.date,
          entry.data.amount,
          entry.type,
          entry.data.billNumber
        );

        if (isDuplicate) {
          console.warn('Skipping duplicate entry:', entry);
          continue;
        }

        const sqlDate = convertToSQLDate(entry.data.date);
        
        if (entry.type === 'payment') {
          const paymentId = generateId();
          dbInstance.run(`
            INSERT INTO transactions (
              id, date, type, amount,
              expense_category, has_gst, description,
              party_id, created_at
            ) VALUES (?, ?, 'expense', ?, 'party_payment', ?, ?, ?, CURRENT_TIMESTAMP)
          `, [
            paymentId,
            sqlDate,
            entry.data.amount,
            entry.data.hasGST ? 1 : 0,
            entry.data.description || null,
            partyId || null
          ]);

          // Update party balance for payments
          if (partyId) {
            dbInstance.run(`
              UPDATE parties
              SET current_balance = current_balance - ?,
                  updated_at = CURRENT_TIMESTAMP
              WHERE id = ?
            `, [entry.data.amount, partyId]);
          }
        } else if (entry.type === 'bill') {
          const billId = generateId();
          dbInstance.run(`
            INSERT INTO transactions (
              id, date, type, amount,
              bill_number, has_gst, description,
              party_id, created_at
            ) VALUES (?, ?, 'bill', ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
          `, [
            billId,
            sqlDate,
            entry.data.amount,
            entry.data.billNumber || null,
            entry.data.hasGST ? 1 : 0,
            entry.data.description || null,
            partyId || null
          ]);

          // Update party balance for bills
          if (partyId) {
            dbInstance.run(`
              UPDATE parties
              SET current_balance = current_balance + ?,
                  updated_at = CURRENT_TIMESTAMP
              WHERE id = ?
            `, [entry.data.amount, partyId]);
          }
        }
      }

      // After processing all entries, recalculate running balances
      if (partyId) {
        await recalculatePartyBalance(partyId);
      }

      dbInstance.run('COMMIT');
      db.save();
    } catch (error) {
      dbInstance.run('ROLLBACK');
      console.error('Error in processBulkEntries transaction:', error);
      throw error;
    }
  } catch (error) {
    console.error('Error in processBulkEntries:', error);
    throw error;
  }
};

export const checkDuplicateTransaction = async (
  partyId: string | null,
  date: string,
  amount: number,
  type: 'bill' | 'payment' | 'sale',
  billNumber?: string
): Promise<boolean> => {
  if (!partyId) return false;
  
  const dbInstance = await db.init();
  const sqlDate = convertToSQLDate(date);
  
  let query = `
    SELECT id 
    FROM transactions 
    WHERE party_id = ? 
    AND date = ? 
    AND amount = ?
    AND (
      (type = ? AND expense_category = 'party_payment')
      OR
      (type = ?)
    )
  `;
  
  const params: any[] = [partyId, sqlDate, amount, 'expense', type];

  // Add bill number check only if it's a bill type and has a bill number
  if (type === 'bill' && billNumber) {
    query += ' AND (bill_number = ? OR bill_number IS NULL)';
    params.push(billNumber);
  } else if (type === 'bill') {
    query += ' AND bill_number IS NULL';
  }

  // Add time window check to prevent duplicate entries on the same day
  query += ' AND created_at >= datetime("now", "-1 day")';
  
  try {
    const result = await dbInstance.exec(query, params);
    return result.length > 0 && result[0].values.length > 0;
  } catch (error) {
    console.error('Error checking for duplicate transaction:', error);
    return false;
  }
};

export const deleteTransaction = async (partyId: string, transactionId: string) => {
  const dbInstance = await db.init();
  
  try {
    dbInstance.run('BEGIN TRANSACTION');

    try {
      // Get transaction details before deletion
      const result = dbInstance.exec(`
        SELECT type, amount, expense_category
        FROM transactions
        WHERE id = ? AND party_id = ?
      `, [transactionId, partyId]);

      if (!result.length || !result[0].values.length) {
        throw new Error('Transaction not found');
      }

      const [type, amount, expenseCategory] = result[0].values[0];

      // Delete the transaction
      dbInstance.run('DELETE FROM transactions WHERE id = ?', [transactionId]);

      // Update party balance based on transaction type
      if (type === 'bill') {
        dbInstance.run(`
          UPDATE parties
          SET current_balance = current_balance - ?,
              updated_at = CURRENT_TIMESTAMP
          WHERE id = ?
        `, [amount, partyId]);
      } else if (type === 'expense' && expenseCategory === 'party_payment') {
        dbInstance.run(`
          UPDATE parties
          SET current_balance = current_balance + ?,
              updated_at = CURRENT_TIMESTAMP
          WHERE id = ?
        `, [amount, partyId]);
      }

      // Recalculate running balances
      await recalculatePartyBalance(partyId);

      dbInstance.run('COMMIT');
      db.save();
    } catch (error) {
      dbInstance.run('ROLLBACK');
      console.error('Error in deleteTransaction transaction:', error);
      throw error;
    }
  } catch (error) {
    console.error('Error in deleteTransaction:', error);
    throw error;
  }
};

export const addTransaction = async (
  partyId: string, 
  transaction: Omit<Transaction, 'id' | 'running_balance' | 'created_at'>
) => {
  const dbInstance = await db.init();
  
  try {
    dbInstance.run('BEGIN TRANSACTION');

    try {
      // Check for duplicates
      const isDuplicate = await checkDuplicateTransaction(
        partyId,
        transaction.date,
        transaction.amount,
        transaction.type,
        transaction.bill_number
      );

      if (isDuplicate) {
        throw new Error('Duplicate transaction detected');
      }

      const transactionId = generateId();
      const sqlDate = convertToSQLDate(transaction.date);
      
      if (transaction.type === 'bill') {
        dbInstance.run(`
          INSERT INTO transactions (
            id, date, type, amount,
            bill_number, has_gst, description,
            party_id, created_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
        `, [
          transactionId,
          sqlDate,
          transaction.type,
          transaction.amount,
          transaction.bill_number || null,
          transaction.has_gst ? 1 : 0,
          transaction.description || null,
          partyId
        ]);

        // Update party balance
        dbInstance.run(`
          UPDATE parties
          SET current_balance = current_balance + ?,
              updated_at = CURRENT_TIMESTAMP
          WHERE id = ?
        `, [transaction.amount, partyId]);
      } else if (transaction.type === 'payment') {
        dbInstance.run(`
          INSERT INTO transactions (
            id, date, type, amount,
            expense_category, has_gst, description,
            party_id, created_at
          ) VALUES (?, ?, 'expense', ?, 'party_payment', ?, ?, ?, CURRENT_TIMESTAMP)
        `, [
          transactionId,
          sqlDate,
          transaction.amount,
          transaction.has_gst ? 1 : 0,
          transaction.description || null,
          partyId
        ]);

        // Update party balance
        dbInstance.run(`
          UPDATE parties
          SET current_balance = current_balance - ?,
              updated_at = CURRENT_TIMESTAMP
          WHERE id = ?
        `, [transaction.amount, partyId]);
      }

      // Recalculate running balances
      await recalculatePartyBalance(partyId);

      dbInstance.run('COMMIT');
      db.save();

      return transactionId;
    } catch (error) {
      dbInstance.run('ROLLBACK');
      throw error;
    }
  } catch (error) {
    console.error('Error in addTransaction:', error);
    throw error;
  }
};

export const recalculatePartyBalance = async (partyId: string) => {
  const dbInstance = await db.init();

  try {
    // Get all transactions sorted by date and created_at
    const transactions = dbInstance.exec(`
      SELECT id, type, amount, expense_category, date
      FROM transactions
      WHERE party_id = ? 
        AND (
          type = 'bill' 
          OR (type = 'expense' AND expense_category = 'party_payment')
        )
      ORDER BY date ASC, created_at ASC
    `, [partyId]);

    if (!transactions.length) return 0;

    let runningBalance = 0;
    
    // Process transactions chronologically
    for (const [id, type, amount, expenseCategory] of transactions[0].values) {
      if (type === 'bill') {
        runningBalance += parseFloat(amount);
      } else if (type === 'expense' && expenseCategory === 'party_payment') {
        runningBalance -= parseFloat(amount);
      }

      // Update running balance for each transaction
      dbInstance.run(`
        UPDATE transactions
        SET running_balance = ?,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `, [runningBalance, id]);
    }

    // Update party's current balance
    dbInstance.run(`
      UPDATE parties
      SET current_balance = ?,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `, [runningBalance, partyId]);

    return runningBalance;
  } catch (error) {
    console.error('Error recalculating balances:', error);
    throw error;
  }
};

export const fixAllPartiesBalances = async () => {
  const dbInstance = await db.init();
  const parties = await dbInstance.exec('SELECT id FROM parties');
  
  if (parties && parties[0]?.values) {
    for (const [partyId] of parties[0].values) {
      try {
        await recalculatePartyBalance(partyId);
      } catch (error) {
        console.error(`Error fixing balance for party ${partyId}:`, error);
      }
    }
  }
};
