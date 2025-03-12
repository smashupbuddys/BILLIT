import React, { useState, useRef, useImperativeHandle, forwardRef } from 'react';
import { AlertTriangle } from 'lucide-react';
import { ParsedEntry } from './types';
import { parseEntries } from './utils/parser';
import { validateEntries } from './utils/validator';
import db, { generateId } from '../../lib/db';
import { checkDuplicateTransaction } from '../../lib/db/operations';
import EntryForm from './components/EntryForm';
import PreviewSection from './components/PreviewSection';
import FormatGuide from './components/FormatGuide';
import ErrorDisplay from './components/ErrorDisplay';
import ConfirmationDialog from './components/ConfirmationDialog';

interface DuplicateInfo {
  entry: ParsedEntry;
  error: string;
}

const BulkEntry: React.FC = forwardRef((props, ref) => {
  const [entries, setEntries] = useState('');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [parsedEntries, setParsedEntries] = useState<(ParsedEntry | { error: string, line: string })[]>([]);
  const [errors, setErrors] = useState<string[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [duplicateEntry, setDuplicateEntry] = useState<ParsedEntry | null>(null);
  const [duplicates, setDuplicates] = useState<DuplicateInfo[]>([]);

  const handleEntriesChange = (value: string) => {
    setEntries(value);
    try {
      const parsed = parseEntries(value, selectedDate);
      setParsedEntries(parsed);
      setErrors(parsed.filter(entry => 'error' in entry).map(entry => (entry as { error: string, line: string }).line));
      setDuplicates([]); // Clear any previous duplicate warnings
    } catch (error) {
      console.error('Error parsing entries:', error);
      setErrors(['Failed to parse entries. Please check the format.']);
      setParsedEntries([]);
    }
  };

  const handleDateChange = (date: string) => {
    setSelectedDate(date);
    try {
      const parsed = parseEntries(entries, date);
      setParsedEntries(parsed);
      setErrors(parsed.filter(entry => 'error' in entry).map(entry => (entry as { error: string, line: string }).line));
      setDuplicates([]); // Clear any previous duplicate warnings
    } catch (error) {
      console.error('Error parsing entries with new date:', error);
      setErrors(['Failed to update entries with new date.']);
    }
  };

  const checkForDuplicates = async (validEntries: ParsedEntry[]): Promise<DuplicateInfo[]> => {
    const foundDuplicates: DuplicateInfo[] = [];
    
    for (const entry of validEntries) {
      let partyId = null;
      
      // Get party ID if party_name exists
      if (entry.data.party_name) {
        const dbInstance = await db.init();
        const partyResult = dbInstance.exec(
          'SELECT id FROM parties WHERE name = ?',
          [entry.data.party_name]
        );
        
        if (partyResult.length > 0 && partyResult[0].values.length > 0) {
          partyId = partyResult[0].values[0][0];
        }
      }

      // Check for duplicate
      if (partyId) {
        const isDuplicate = await checkDuplicateTransaction(
          partyId,
          entry.data.date,
          entry.data.amount,
          entry.type,
          entry.data.billNumber
        );

        if (isDuplicate) {
          foundDuplicates.push({
            entry,
            error: `Duplicate ${entry.type} found for ${entry.data.party_name} on ${entry.data.date} with amount ${entry.data.amount}`
          });
        }
      }
    }

    return foundDuplicates;
  };

  const handleSubmit = async () => {
    const validEntries = parsedEntries.filter(entry => !('error' in entry)) as ParsedEntry[];
    if (validEntries.length === 0) {
      setErrors(['No valid entries to process.']);
      return;
    }

    const validationErrors = validateEntries(validEntries);
    if (validationErrors.length > 0) {
      setErrors(validationErrors);
      return;
    }

    setIsProcessing(true);

    try {
      // Check for duplicates first
      const duplicateEntries = await checkForDuplicates(validEntries);
      
      if (duplicateEntries.length > 0) {
        setDuplicates(duplicateEntries);
        setIsProcessing(false);
        return;
      }

      const dbInstance = await db.init();
      dbInstance.run('BEGIN TRANSACTION');

      try {
        for (const entry of validEntries) {
          let partyId = null;
          let staffId = null;

          // Handle party lookup/creation
          if (entry.data.party_name) {
            const partyResult = dbInstance.exec(
              'SELECT id FROM parties WHERE name = ?',
              [entry.data.party_name]
            );

            if (partyResult.length > 0 && partyResult[0].values.length > 0) {
              partyId = partyResult[0].values[0][0];
            } else {
              partyId = generateId();
              dbInstance.run(
                'INSERT INTO parties (id, name) VALUES (?, ?)',
                [partyId, entry.data.party_name]
              );
            }
          }

          // Handle staff lookup
          if (entry.data.staff_name) {
            const staffResult = dbInstance.exec(
              'SELECT id FROM staff WHERE name = ?',
              [entry.data.staff_name]
            );

            if (staffResult.length > 0 && staffResult[0].values.length > 0) {
              staffId = staffResult[0].values[0][0];
            }
          }

          // Process the entry based on its type
          switch (entry.type) {
            case 'sale':
              await processSaleEntry(dbInstance, entry, partyId);
              break;
            case 'expense':
              await processExpenseEntry(dbInstance, entry, staffId, partyId);
              break;
            case 'bill':
              await processBillEntry(dbInstance, entry, partyId);
              break;
            case 'payment':
              await processPaymentEntry(dbInstance, entry, partyId);
              break;
          }
        }

        // Commit transaction
        dbInstance.run('COMMIT');
        db.save();

        // Clear form
        setEntries('');
        setParsedEntries([]);
        setDuplicates([]);
        alert('Entries processed successfully!');
      } catch (error) {
        dbInstance.run('ROLLBACK');
        throw error;
      }
    } catch (error) {
      console.error('Error processing entries:', error);
      setErrors(prev => [...prev, 'Failed to process entries. Please try again.']);
    } finally {
      setIsProcessing(false);
    }
  };

  // Entry processing functions
  const processSaleEntry = async (dbInstance: any, entry: ParsedEntry, partyId: string | null) => {
    dbInstance.run(`
      INSERT INTO transactions (
        id, date, type, amount, payment_mode,
        party_id, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
    `, [
      entry.data.id,
      entry.data.date,
      'sale',
      entry.data.amount,
      entry.data.payment_mode || null,
      partyId
    ]);

    if (entry.data.payment_mode === 'credit' && partyId) {
      dbInstance.run(`
        UPDATE parties
        SET current_balance = current_balance + ?,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `, [entry.data.amount, partyId]);
    }
  };

  const processExpenseEntry = async (dbInstance: any, entry: ParsedEntry, staffId: string | null, partyId: string | null) => {
    const expenseCategory = getExpenseCategory(entry.data.description);

    dbInstance.run(`
      INSERT INTO transactions (
        id, date, type, amount,
        expense_category, has_gst,
        description, staff_id,
        created_at
      ) VALUES (?, ?, 'expense', ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
    `, [
      entry.data.id,
      entry.data.date,
      entry.data.amount,
      expenseCategory,
      entry.data.hasGST ? 1 : 0,
      entry.data.description || null,
      staffId
    ]);

    if (expenseCategory === 'advance' && staffId) {
      dbInstance.run(`
        UPDATE staff
        SET current_advance = current_advance + ?,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `, [entry.data.amount, staffId]);
    }
  };

  const processBillEntry = async (dbInstance: any, entry: ParsedEntry, partyId: string | null) => {
    dbInstance.run(`
      INSERT INTO transactions (
        id, date, type, amount,
        bill_number, has_gst, description,
        party_id, created_at
      ) VALUES (?, ?, 'bill', ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
    `, [
      entry.data.id,
      entry.data.date,
      entry.data.amount,
      entry.data.billNumber || null,
      entry.data.hasGST ? 1 : 0,
      entry.data.description || null,
      partyId
    ]);

    if (partyId) {
      dbInstance.run(`
        UPDATE parties
        SET current_balance = current_balance + ?,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `, [entry.data.amount, partyId]);
    }
  };

  const processPaymentEntry = async (dbInstance: any, entry: ParsedEntry, partyId: string | null) => {
    dbInstance.run(`
      INSERT INTO transactions (
        id, date, type, amount,
        expense_category, has_gst, description,
        party_id, created_at
      ) VALUES (?, ?, 'expense', ?, 'party_payment', ?, ?, ?, CURRENT_TIMESTAMP)
    `, [
      entry.data.id,
      entry.data.date,
      entry.data.amount,
      entry.data.hasGST ? 1 : 0,
      entry.data.description || null,
      partyId
    ]);

    if (partyId) {
      dbInstance.run(`
        UPDATE parties
        SET current_balance = current_balance - ?,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `, [entry.data.amount, partyId]);
    }
  };

  const getExpenseCategory = (description: string | undefined): string => {
    if (!description) return 'petty';
    
    const category = description.toLowerCase();
    switch (category) {
      case 'goods_purchase':
      case 'gp':
        return 'goods_purchase';
      case 'salary':
        return 'salary';
      case 'advance':
        return 'advance';
      case 'home':
        return 'home';
      case 'rent':
        return 'rent';
      case 'petty':
        return 'petty';
      case 'poly':
        return 'poly';
      case 'food':
        return 'food';
      default:
        return 'petty';
    }
  };

  // Expose functions through ref
  useImperativeHandle(ref, () => ({
    processEntries: async (input: string, date: string) => {
      try {
        const parsed = parseEntries(input, date);
        setParsedEntries(parsed);
        const validEntries = parsed.filter(entry => !('error' in entry)) as ParsedEntry[];
        const validationErrors = validateEntries(validEntries);
        if (validationErrors.length > 0) {
          console.error('Validation errors:', validationErrors);
          setErrors(validationErrors);
          return;
        }
        await handleSubmit();
      } catch (error) {
        console.error('Error processing entries:', error);
      }
    }
  }));

  return (
    <div className="space-y-6" data-component="BulkEntry">
      <h1 className="text-2xl font-semibold text-gray-900">Bulk Entry</h1>
      
      <FormatGuide />
      
      <EntryForm
        entries={entries}
        selectedDate={selectedDate}
        onEntriesChange={handleEntriesChange}
        onDateChange={handleDateChange}
        isProcessing={isProcessing}
      />

      {parsedEntries.length > 0 && (
        <PreviewSection
          parsedEntries={parsedEntries}
          onSubmit={handleSubmit}
          isProcessing={isProcessing}
          hasErrors={errors.length > 0 || duplicates.length > 0}
        />
      )}

      {duplicates.length > 0 && (
        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <AlertTriangle className="h-5 w-5 text-yellow-400" />
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-yellow-800">
                Duplicate Entries Detected
              </h3>
              <div className="mt-2 text-sm text-yellow-700">
                <ul className="list-disc pl-5 space-y-1">
                  {duplicates.map((dup, index) => (
                    <li key={index}>{dup.error}</li>
                  ))}
                </ul>
              </div>
              <div className="mt-4">
                <div className="flex space-x-3">
                  <button
                    type="button"
                    className="text-sm font-medium text-yellow-800 hover:text-yellow-700"
                    onClick={() => setDuplicates([])} // Clear duplicates and allow resubmission
                  >
                    Process Anyway
                  </button>
                  <button
                    type="button"
                    className="text-sm font-medium text-yellow-800 hover:text-yellow-700"
                    onClick={() => setEntries('')} // Clear the form
                  >
                    Clear Form
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <ErrorDisplay errors={errors} />
			<ConfirmationDialog
        show={showConfirmation}
        entry={duplicateEntry}
        onConfirm={async () => {
          if (!duplicateEntry) return;
          
          setIsProcessing(true);
          const dbInstance = await db.init();

          try {
            dbInstance.run('BEGIN TRANSACTION');

            try {
              let partyId = null;

              // Handle party lookup/creation
              if (duplicateEntry.data.party_name) {
                const partyResult = dbInstance.exec(
                  'SELECT id FROM parties WHERE name = ?',
                  [duplicateEntry.data.party_name]
                );

                if (partyResult.length > 0 && partyResult[0].values.length > 0) {
                  partyId = partyResult[0].values[0][0];
                } else {
                  partyId = generateId();
                  dbInstance.run(
                    'INSERT INTO parties (id, name) VALUES (?, ?)',
                    [partyId, duplicateEntry.data.party_name]
                  );
                }
              }

              // Insert transaction
              if (duplicateEntry.type === 'payment') {
                await processPaymentEntry(dbInstance, duplicateEntry, partyId);
              } else if (duplicateEntry.type === 'bill') {
                await processBillEntry(dbInstance, duplicateEntry, partyId);
              }

              dbInstance.run('COMMIT');
              db.save();

              // Clear form
              setEntries('');
              setParsedEntries([]);
              setDuplicates([]);
              if (errors.length === 0) {
                alert('Entry processed successfully!');
              }
            } catch (error) {
              dbInstance.run('ROLLBACK');
              throw error;
            }
          } catch (error) {
            console.error('Error processing entry:', error);
            setErrors(prev => [...prev, 'Failed to process entry. Please try again.']);
          } finally {
            setIsProcessing(false);
            setShowConfirmation(false);
            setDuplicateEntry(null);
          }
        }}
        onCancel={() => {
          setShowConfirmation(false);
          setDuplicateEntry(null);
          setIsProcessing(false);
        }}
      />
    </div>
  );
});

// Helper function for easier date manipulation
const formatDate = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

// Helper function to check if a string represents a valid date
const isValidDate = (dateString: string): boolean => {
  const date = new Date(dateString);
  return date instanceof Date && !isNaN(date.getTime());
};

export default BulkEntry;
