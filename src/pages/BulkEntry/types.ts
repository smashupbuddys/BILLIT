// Transaction and Payment Types
export type TransactionType = 'sale' | 'expense' | 'bill' | 'payment';
export type PaymentMode = 'cash' | 'digital' | 'credit';
export type ExpenseCategory = 
  | 'goods_purchase'
  | 'salary'
  | 'advance'
  | 'home'
  | 'rent'
  | 'party_payment'
  | 'petty'
  | 'poly'
  | 'food';

// Entry Types
export interface ParsedEntry {
  type: TransactionType;
  data: {
    id?: string;
    date: string;
    amount: number;
    payment_mode?: PaymentMode;
    party_name?: string;
    staff_name?: string;
    description?: string;
    billNumber?: string;
    hasGST?: boolean;
  }
}

// Error Entry Type
export interface ErrorEntry {
  error: string;
  line: string;
}

// Component Props
export interface PreviewProps {
  parsedEntries: (ParsedEntry | ErrorEntry)[];
  onSubmit: () => void;
  isProcessing: boolean;
  hasErrors: boolean;
}

export interface EntryFormProps {
  entries: string;
  selectedDate: string;
  onEntriesChange: (value: string) => void;
  onDateChange: (date: string) => void;
  isProcessing: boolean;
}

export interface ConfirmationDialogProps {
  show: boolean;
  entry: ParsedEntry | null;
  onConfirm: () => void;
  onCancel: () => void;
}

export interface ErrorDisplayProps {
  errors: string[];
}

// State Types
export interface DuplicateInfo {
  isDuplicate: boolean;
  existingEntry?: {
    date: string;
    amount: number;
    billNumber?: string;
    type: string;
  };
}

export interface ProcessingResult {
  successfulEntries: ParsedEntry[];
  failedEntries: { 
    entry: ParsedEntry; 
    error: string;
  }[];
  partyBalances?: {
    partyName: string;
    oldBalance: number;
    newBalance: number;
  }[];
}

// Database Model Types
export interface Party {
  id: string;
  name: string;
  credit_limit: number;
  current_balance: number;
  contact_person?: string;
  phone?: string;
  address?: string;
  gst_number?: string;
  created_at: string;
  updated_at: string;
}

export interface Staff {
  id: string;
  name: string;
  role: string;
  salary: number;
  joining_date: string;
  current_advance: number;
  contact_number?: string;
  address?: string;
  created_at: string;
  updated_at: string;
}

export interface Transaction {
  id: string;
  date: string;
  type: TransactionType;
  amount: number;
  payment_mode?: PaymentMode;
  expense_category?: ExpenseCategory;
  has_gst: boolean;
  bill_number?: string;
  return_amount?: number;
  description?: string;
  party_id?: string;
  staff_id?: string;
  created_at: string;
  updated_at: string;
  running_balance?: number;
}

// Component State Types
export interface EntryState {
  confirmedEntries: { [key: string]: boolean };
  duplicateChecks: { [key: string]: DuplicateInfo };
}

// Function Types
export interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

export interface DateRange {
  startDate: string;
  endDate: string;
}

// Utility Types
export interface TransactionFilters {
  dateRange?: DateRange;
  type?: TransactionType[];
  partyId?: string;
  staffId?: string;
  hasGST?: boolean;
  paymentMode?: PaymentMode[];
  expenseCategory?: ExpenseCategory[];
  searchTerm?: string;
}

export interface TransactionSummary {
  totalAmount: number;
  count: number;
  gstAmount?: number;
  byPaymentMode?: {
    [key in PaymentMode]: number;
  };
  byExpenseCategory?: {
    [key in ExpenseCategory]: number;
  };
}
