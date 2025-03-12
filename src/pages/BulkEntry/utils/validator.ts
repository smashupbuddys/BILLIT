import { ParsedEntry } from '../types';

    export const validateEntries = (entries: ParsedEntry[]): string[] => {
      const errors: string[] = [];

      entries.forEach((entry, index) => {
        if (entry.type === 'sale' && entry.data.payment_mode === 'credit' && !entry.data.party_name) {
          errors.push(`Credit sale at line ${index + 1} requires a party name`);
        }

        if (entry.type === 'payment' && !entry.data.party_name) {
          errors.push(`Payment at line ${index + 1} requires a party name`);
        }

        if (entry.type === 'bill' && !entry.data.party_name) {
          errors.push(`Bill at line ${index + 1} requires a party name`);
        }

        if (entry.type === 'expense' && (entry.data.description === 'salary' || entry.data.description === 'advance') && !entry.data.staff_name) {
          errors.push(`Expense at line ${index + 1} requires a staff name for salary or advance`);
        }
      });

      return errors;
    };
