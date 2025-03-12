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

export type TransactionType = 'sale' | 'expense' | 'bill';
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

export interface Transaction {
  id: string;
  date: string;
  type: TransactionType;
  amount: number;
  payment_mode?: PaymentMode;
  expense_category?: ExpenseCategory;
  has_gst?: boolean;
  bill_number?: string;
  return_amount?: number;
  description?: string;
  party_id?: string;
  staff_id?: string;
  created_at: string;
  updated_at: string;
}

export interface RunningBalance {
  id: string;
  date: string;
  cash_balance: number;
  credit_balance: number;
  expense_total: number;
  created_at: string;
  updated_at: string;
}

export interface Notification {
  id: string;
  user_id: string;
  type: string;
  message: string;
  related_id?: string;
  is_read: boolean;
  created_at: string;
  updated_at: string;
}
