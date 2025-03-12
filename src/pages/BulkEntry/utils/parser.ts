import { ParsedEntry } from '../types';
import { generateId } from '../../../lib/db';

// Define all possible expense types
const STANDARD_EXPENSES = new Set([
  'Home', 'Rent', 'Petty', 'Food', 'Poly', 'GP', 'Repair', 
  'Labour', 'Transport'
]);

// Define valid expense categories that match the database schema
const EXPENSE_CATEGORIES = new Set([
  'goods_purchase', 'salary', 'advance', 'home', 'rent',
  'party_payment', 'petty', 'poly', 'food'
]);

export const parseEntries = (text: string, selectedDate: string): (ParsedEntry | { error: string, line: string })[] => {
  const lines = text.split('\n').filter(line => line.trim());
  const entries: (ParsedEntry | { error: string, line: string })[] = [];

  for (const line of lines) {
    const trimmedLine = line.trim();
    if (!trimmedLine) continue;

    try {
      // Extract date if present
      let entryDate = selectedDate;
      let lineWithoutDate = trimmedLine;
      
      // Handle date formats
      const datePatterns = [
        /\(date:\s*(\d{1,2}\/\d{1,2}\/\d{2})\)/,  // (date: DD/MM/YY)
        /\((\d{1,2}\/\d{1,2}\/\d{2})\)/           // (DD/MM/YY)
      ];

      for (const pattern of datePatterns) {
        const dateMatch = trimmedLine.match(pattern);
        if (dateMatch) {
          try {
            entryDate = formatDate(dateMatch[1]);
            lineWithoutDate = trimmedLine.replace(pattern, '').trim();
            break;
          } catch (error) {
            console.error('Date parsing error:', error);
          }
        }
      }

      let entry: ParsedEntry | null = null;
      const parts = lineWithoutDate.split(/\s+/);
      const firstWord = parts[0];

      // Handle different entry types
      if (/^\d+\.$/.test(firstWord)) {
        // Sales entries (1. 23500, 7. 21506 net, 20. 9300 (Maa))
        entry = parseSaleEntry(parts, entryDate);
      } else if (parts.length > 2 && (parts[1].toLowerCase() === 'sal' || parts[1].toLowerCase() === 'adv')) {
        // Staff expenses (Alok Sal 30493)
        entry = parseStaffExpenseEntry(parts, entryDate);
      } else if (parts.length >= 3 && parts[2].toLowerCase() === 'party') {
        // Party payments (PBK 20000 Party GST)
        entry = parsePartyPaymentEntry(parts, entryDate, lineWithoutDate);
      } else if (parts.length >= 2) {
        if (STANDARD_EXPENSES.has(firstWord)) {
          // Standard expenses (Home 23988, GP 94100 GST)
          entry = parseExpenseEntry(parts, entryDate, lineWithoutDate);
        } else {
          // Check for bill pattern
          const hasAmount = parts.some(part => !isNaN(parseFloat(part)));
          if (hasAmount) {
            // Bills (PendalKarigar SV2029 73173 GR 302 GST)
            entry = parseBillEntry(parts, entryDate, lineWithoutDate);
          } else {
            // Random expenses (Repair 5000, Labour 2500)
            entry = parseRandomExpenseEntry(parts, entryDate, lineWithoutDate);
          }
        }
      }

      if (entry) {
        entries.push(entry);
      } else {
        entries.push({ error: 'Unrecognized entry format', line: trimmedLine });
      }
    } catch (error) {
      console.error(`Error parsing line: ${trimmedLine}`, error);
      entries.push({ error: error instanceof Error ? error.message : 'Error parsing entry', line: trimmedLine });
    }
  }

  return entries;
};

const formatDate = (date: string): string => {
  try {
    const cleanDate = date.trim();
    const [day, month, year] = cleanDate.split('/').map(part => {
      const num = parseInt(part.trim(), 10);
      if (isNaN(num)) throw new Error(`Invalid date part: ${part}`);
      return num;
    });

    // Validate date parts
    if (!day || !month || !year) throw new Error('Missing date parts');
    if (day < 1 || day > 31) throw new Error('Invalid day');
    if (month < 1 || month > 12) throw new Error('Invalid month');
    if (year < 0 || year > 99) throw new Error('Invalid year');

    // Format with padding
    return `20${year.toString().padStart(2, '0')}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
  } catch (error) {
    throw new Error(`Invalid date format - use DD/MM/YY: ${error.message}`);
  }
};

const parseSaleEntry = (parts: string[], entryDate: string): ParsedEntry => {
  if (parts.length < 2) throw new Error('Invalid sale entry format');
  
  const amount = parseFloat(parts[1]);
  if (isNaN(amount)) throw new Error('Invalid amount in sale entry');

  let payment_mode: 'cash' | 'digital' | 'credit' = 'cash';
  let party_name = null;

  if (parts.length > 2) {
    const typeIndicator = parts[2].toLowerCase();
    if (typeIndicator === 'net') {
      payment_mode = 'digital';
      party_name = parts.slice(3).join(' ').trim() || null;
    } else {
      payment_mode = 'credit';
      party_name = parts.slice(2).join(' ').replace(/^\(|\)$/g, '').trim() || null;
    }
  }

  return {
    type: 'sale',
    data: {
      id: generateId(),
      date: entryDate,
      amount,
      payment_mode,
      party_name,
      staff_name: null,
      description: null,
      billNumber: null,
      hasGST: 0,  // Convert boolean to 0/1 for SQLite
      expense_category: null
    }
  };
};

const parseBillEntry = (parts: string[], entryDate: string, line: string): ParsedEntry => {
  if (parts.length < 2) throw new Error('Invalid bill entry format');

  const entry: ParsedEntry = {
    type: 'bill',
    data: {
      id: generateId(),
      date: entryDate,
      party_name: parts[0].trim(),
      amount: 0,
      billNumber: null,
      description: null,
      hasGST: 0,
      staff_name: null,
      payment_mode: null,
      expense_category: null
    }
  };

  // Find amount (first numeric part without /)
  let amountIndex = -1;
  for (let i = 1; i < parts.length; i++) {
    if (!parts[i].includes('/') && !isNaN(parseFloat(parts[i]))) {
      amountIndex = i;
      entry.data.amount = parseFloat(parts[i]);
      break;
    }
  }

  if (amountIndex === -1) throw new Error('Invalid amount in bill entry');

  // Extract bill number (between party name and amount)
  if (amountIndex > 1) {
    entry.data.billNumber = parts.slice(1, amountIndex).join(' ')
      .replace(/[()]/g, '')  // Remove any parentheses
      .trim();
  }

  // Process remaining parts after amount
  if (amountIndex < parts.length - 1) {
    const remainingParts = parts.slice(amountIndex + 1);

    // Check for GR number
    const grIndex = remainingParts.findIndex(p => p.toUpperCase() === 'GR');
    if (grIndex !== -1 && grIndex + 1 < remainingParts.length) {
      entry.data.description = `GR ${remainingParts[grIndex + 1]}`;
    }

    // Check for GST
    entry.data.hasGST = remainingParts.some(p => p.toUpperCase() === 'GST') ? 1 : 0;
  }

  return entry;
};

const parseExpenseEntry = (parts: string[], entryDate: string, line: string): ParsedEntry => {
  if (parts.length < 2) throw new Error('Invalid expense entry format');
    
  const amount = parseFloat(parts[1]);
  if (isNaN(amount)) throw new Error('Invalid amount in expense entry');
    
  const description = parts[0].toLowerCase();
  const hasGST = line.toUpperCase().includes('GST') ? 1 : 0;

  // Map expense type to valid expense category
  let expense_category: string;
  switch (description) {
    case 'gp': expense_category = 'goods_purchase'; break;
    case 'home': expense_category = 'home'; break;
    case 'rent': expense_category = 'rent'; break;
    case 'petty': expense_category = 'petty'; break;
    case 'poly': expense_category = 'poly'; break;
    case 'food': expense_category = 'food'; break;
    default: expense_category = 'petty';
  }
  
  return {
    type: 'expense',
    data: {
      id: generateId(),
      date: entryDate,
      amount,
      description,
      hasGST,
      staff_name: null,
      billNumber: null,
      party_name: null,
      payment_mode: null,
      expense_category
    }
  };
};

const parseStaffExpenseEntry = (parts: string[], entryDate: string): ParsedEntry => {
  if (parts.length < 3) throw new Error('Invalid staff expense format');

  const staff_name = parts[0];
  const type = parts[1].toLowerCase();
  const amount = parseFloat(parts[2]);
  
  if (isNaN(amount)) throw new Error('Invalid amount in staff expense');

  return {
    type: 'expense',
    data: {
      id: generateId(),
      date: entryDate,
      amount,
      description: type === 'sal' ? 'salary' : 'advance',
      hasGST: 0,
      staff_name,
      billNumber: null,
      party_name: null,
      payment_mode: null,
      expense_category: type === 'sal' ? 'salary' : 'advance'
    }
  };
};

const parsePartyPaymentEntry = (parts: string[], entryDate: string, line: string): ParsedEntry => {
  if (parts.length < 3) throw new Error('Invalid party payment format');
    
  const party_name = parts[0];
  const amount = parseFloat(parts[1]);
  
  if (isNaN(amount)) throw new Error('Invalid amount in party payment');

  let description = null;
  const hasGST = line.toUpperCase().includes('GST') ? 1 : 0;

  // Look for description after "Party" keyword
  const partyIndex = parts.findIndex(p => p.toLowerCase() === 'party');
  if (partyIndex !== -1 && parts.length > partyIndex + 1) {
    const remainingParts = parts.slice(partyIndex + 1);
    const nonGstParts = remainingParts.filter(p => p.toUpperCase() !== 'GST');
    if (nonGstParts.length > 0) {
      description = nonGstParts.join(' ').trim();
    }
  }

  return {
    type: 'payment',
    data: {
      id: generateId(),
      date: entryDate,
      amount,
      party_name,
      hasGST,
      description,
      staff_name: null,
      billNumber: null,
      payment_mode: null,
      expense_category: 'party_payment'
    }
  };
};

const parseRandomExpenseEntry = (parts: string[], entryDate: string, line: string): ParsedEntry => {
  if (parts.length < 2) throw new Error('Invalid expense format');

  const description = parts[0].toLowerCase();
  const amount = parseFloat(parts[1]);
  
  if (isNaN(amount)) throw new Error('Invalid amount');

  return {
    type: 'expense',
    data: {
      id: generateId(),
      date: entryDate,
      amount,
      description,
      hasGST: line.toUpperCase().includes('GST') ? 1 : 0,
      staff_name: null,
      billNumber: null,
      party_name: null,
      payment_mode: null,
      expense_category: 'petty'  // Default for random expenses
    }
  };
};
