export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      parties: {
        Row: {
          id: string
          name: string
          credit_limit: number
          current_balance: number
          contact_person: string | null
          phone: string | null
          address: string | null
          gst_number: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          credit_limit?: number
          current_balance?: number
          contact_person?: string | null
          phone?: string | null
          address?: string | null
          gst_number?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          credit_limit?: number
          current_balance?: number
          contact_person?: string | null
          phone?: string | null
          address?: string | null
          gst_number?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      staff: {
        Row: {
          id: string
          name: string
          role: string
          salary: number
          joining_date: string
          current_advance: number
          contact_number: string | null
          address: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          role: string
          salary: number
          joining_date: string
          current_advance?: number
          contact_number?: string | null
          address?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          role?: string
          salary?: number
          joining_date?: string
          current_advance?: number
          contact_number?: string | null
          address?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      transactions: {
        Row: {
          id: string
          date: string
          type: Database['public']['Enums']['transaction_type']
          amount: number
          payment_mode: Database['public']['Enums']['payment_mode'] | null
          expense_category: Database['public']['Enums']['expense_category'] | null
          has_gst: boolean
          bill_number: string | null
          return_amount: number | null
          description: string | null
          party_id: string | null
          staff_id: string | null
          created_at: string
          updated_at: string
          created_by: string
        }
        Insert: {
          id?: string
          date: string
          type: Database['public']['Enums']['transaction_type']
          amount: number
          payment_mode?: Database['public']['Enums']['payment_mode'] | null
          expense_category?: Database['public']['Enums']['expense_category'] | null
          has_gst?: boolean
          bill_number?: string | null
          return_amount?: number | null
          description?: string | null
          party_id?: string | null
          staff_id?: string | null
          created_at?: string
          updated_at?: string
          created_by: string
        }
        Update: {
          id?: string
          date?: string
          type?: Database['public']['Enums']['transaction_type']
          amount?: number
          payment_mode?: Database['public']['Enums']['payment_mode'] | null
          expense_category?: Database['public']['Enums']['expense_category'] | null
          has_gst?: boolean
          bill_number?: string | null
          return_amount?: number | null
          description?: string | null
          party_id?: string | null
          staff_id?: string | null
          created_at?: string
          updated_at?: string
          created_by?: string
        }
      }
      running_balances: {
        Row: {
          id: string
          date: string
          cash_balance: number
          credit_balance: number
          expense_total: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          date: string
          cash_balance?: number
          credit_balance?: number
          expense_total?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          date?: string
          cash_balance?: number
          credit_balance?: number
          expense_total?: number
          created_at?: string
          updated_at?: string
        }
      }
    }
    Enums: {
      transaction_type: 'sale' | 'expense' | 'bill'
      payment_mode: 'cash' | 'digital' | 'credit'
      expense_category: 'goods_purchase' | 'salary' | 'advance' | 'home' | 'rent' | 'party_payment' | 'petty' | 'poly' | 'food'
    }
  }
}
