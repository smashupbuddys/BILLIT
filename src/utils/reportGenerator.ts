import db from '../lib/db';
import { format, subMonths, startOfMonth, endOfMonth } from 'date-fns';

export const generateEnhancedReport = async () => {
  try {
    const dbInstance = await db.init();
    const now = new Date();
    const previousMonthStart = startOfMonth(subMonths(now, 1));
    const previousMonthEnd = endOfMonth(subMonths(now, 1));
    const previousMonthStartStr = format(previousMonthStart, 'yyyy-MM-dd');
    const previousMonthEndStr = format(previousMonthEnd, 'yyyy-MM-dd');

    // Fetch sales and expenses
    const salesQuery = `
      SELECT 
        strftime('%Y-%m', date) as month,
        COALESCE(SUM(CASE WHEN type = 'sale' THEN amount ELSE 0 END), 0) as total_sales,
        COALESCE(SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END), 0) as total_expenses
      FROM transactions
      WHERE date BETWEEN ? AND ?
      GROUP BY month
      ORDER BY month
    `;
    const salesResult = await dbInstance.exec(salesQuery, [previousMonthStartStr, previousMonthEndStr]);

    // Fetch bills paid and received per party
    const partyBillsQuery = `
      SELECT 
        strftime('%Y-%m', t.date) as month,
        p.name as party_name,
        COALESCE(SUM(CASE WHEN t.type = 'bill' THEN t.amount ELSE 0 END), 0) as total_bill_amount,
        COALESCE(SUM(CASE WHEN t.type = 'payment' THEN t.amount ELSE 0 END), 0) as total_payment_amount
      FROM transactions t
      LEFT JOIN parties p ON t.party_id = p.id
      WHERE t.date BETWEEN ? AND ?
      AND (t.type = 'bill' OR (t.type = 'expense' AND t.expense_category = 'party_payment'))
      GROUP BY month, party_name
      ORDER BY month, party_name
    `;
    const partyBillsResult = await dbInstance.exec(partyBillsQuery, [previousMonthStartStr, previousMonthEndStr]);

    // Fetch total purchase per party per month
    const partyPurchaseQuery = `
      SELECT 
        strftime('%Y-%m', t.date) as month,
        p.name as party_name,
        COALESCE(SUM(t.amount), 0) as total_purchase_amount
      FROM transactions t
      LEFT JOIN parties p ON t.party_id = p.id
      WHERE t.type = 'bill' AND t.date BETWEEN ? AND ?
      GROUP BY month, party_name
      ORDER BY month, party_name
    `;
    const partyPurchaseResult = await dbInstance.exec(partyPurchaseQuery, [previousMonthStartStr, previousMonthEndStr]);

    // Fetch credit pending for forecasting
    const creditPendingQuery = `
      SELECT 
        strftime('%Y-%m', date) as month,
        COALESCE(SUM(amount - paid_amount), 0) as total_pending
      FROM credit_sales
      WHERE date BETWEEN ? AND ?
      GROUP BY month
      ORDER BY month
    `;
    const creditPendingResult = await dbInstance.exec(creditPendingQuery, [previousMonthStartStr, previousMonthEndStr]);

    const sales = salesResult[0]?.values || [];
    const partyBills = partyBillsResult[0]?.values || [];
    const partyPurchases = partyPurchaseResult[0]?.values || [];
    const creditPending = creditPendingResult[0]?.values || [];

    return {
      sales,
      partyBills,
      partyPurchases,
      creditPending
    };
  } catch (error) {
    console.error('Error generating enhanced report:', error);
    throw error;
  }
};
