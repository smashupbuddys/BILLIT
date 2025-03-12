import jsPDF from 'jspdf';
import 'jspdf-autotable';
import db from '../lib/db';

export const generatePDF = async () => {
  try {
    // Load data
    const dbInstance = await db.init();
    
    // Get summary data
    const summaryResult = await db.exec(`
      WITH summary AS (
        SELECT
          COALESCE(SUM(CASE WHEN type = 'sale' THEN amount ELSE 0 END), 0) as total_sales,
          COALESCE(SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END), 0) as total_expenses,
          COALESCE(SUM(CASE 
            WHEN type = 'sale' AND payment_mode = 'credit' THEN amount 
            ELSE 0 
          END), 0) as total_credit,
          COUNT(DISTINCT CASE WHEN type = 'sale' AND payment_mode = 'credit' THEN party_id END) as credit_customers
        FROM transactions
      ),
      party_summary AS (
        SELECT
          COALESCE(SUM(CASE WHEN current_balance > 0 THEN current_balance ELSE 0 END), 0) as total_receivable,
          COALESCE(SUM(CASE WHEN current_balance < 0 THEN ABS(current_balance) ELSE 0 END), 0) as total_payable
        FROM parties
      ),
      credit_summary AS (
        SELECT
          COALESCE(SUM(amount - paid_amount), 0) as total_credit_pending,
          COUNT(*) as total_credit_sales,
          COUNT(CASE WHEN paid_amount < amount THEN 1 END) as pending_credit_sales
        FROM credit_sales
      )
      SELECT 
        s.*,
        p.total_receivable,
        p.total_payable,
        c.total_credit_pending,
        c.total_credit_sales,
        c.pending_credit_sales
      FROM summary s, party_summary p, credit_summary c
    `);

    // Get party details
    const partyResult = await db.exec(`
      SELECT 
        name,
        current_balance,
        credit_limit
      FROM parties
      WHERE current_balance != 0
      ORDER BY current_balance DESC
    `);

    // Get credit sales details
    const creditResult = await db.exec(`
      SELECT 
        customer_name,
        amount,
        paid_amount,
        date
      FROM credit_sales
      WHERE paid_amount < amount
      ORDER BY date DESC
    `);

    // Create PDF
    const doc = new jsPDF();

    // Title
    doc.setFontSize(20);
    doc.setTextColor(37, 99, 235); // Blue color
    doc.text('Financial Report', doc.internal.pageSize.width / 2, 20, { align: 'center' });

    // Date
    doc.setFontSize(10);
    doc.setTextColor(0);
    doc.text(`Generated on: ${new Date().toLocaleDateString()}`, doc.internal.pageSize.width - 15, 30, { align: 'right' });

    // Summary
    doc.setFontSize(16);
    doc.setTextColor(31, 41, 55); // Dark gray
    doc.text('Summary', 15, 40);

    const summary = summaryResult[0].values[0];
    doc.setFontSize(10);
    doc.setTextColor(0);
    doc.text([
      `Total Sales: ₹${summary[0].toLocaleString()}`,
      `Total Expenses: ₹${summary[1].toLocaleString()}`,
      `Total Credit: ₹${summary[2].toLocaleString()}`,
      `Total Receivable: ₹${summary[4].toLocaleString()}`,
      `Total Payable: ₹${summary[5].toLocaleString()}`,
      `Credit Pending: ₹${summary[6].toLocaleString()}`
    ], 15, 50);

    // Party Balances
    doc.setFontSize(16);
    doc.setTextColor(31, 41, 55);
    doc.text('Party Balances', 15, 90);

    (doc as any).autoTable({
      startY: 100,
      head: [['Party Name', 'Current Balance', 'Credit Limit']],
      body: partyResult[0].values.map((row: any[]) => [
        row[0],
        `₹${Math.abs(row[1]).toLocaleString()} ${row[1] >= 0 ? 'DR' : 'CR'}`,
        `₹${row[2].toLocaleString()}`
      ]),
      theme: 'striped',
      headStyles: { fillColor: [243, 244, 246], textColor: [0, 0, 0] }
    });

    // Pending Credit Sales
    doc.addPage();
    doc.setFontSize(16);
    doc.setTextColor(31, 41, 55);
    doc.text('Pending Credit Sales', 15, 20);

    (doc as any).autoTable({
      startY: 30,
      head: [['Customer Name', 'Total Amount', 'Paid Amount', 'Date']],
      body: creditResult[0].values.map((row: any[]) => [
        row[0],
        `₹${row[1].toLocaleString()}`,
        `₹${row[2].toLocaleString()}`,
        new Date(row[3]).toLocaleDateString()
      ]),
      theme: 'striped',
      headStyles: { fillColor: [243, 244, 246], textColor: [0, 0, 0] }
    });

    // Save the PDF
    doc.save(`financial-report-${new Date().toISOString().split('T')[0]}.pdf`);

  } catch (error) {
    console.error('Error generating PDF:', error);
    throw error;
  }
};
