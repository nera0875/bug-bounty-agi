import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

export const supabaseAdmin = supabaseServiceKey
  ? createClient(supabaseUrl, supabaseServiceKey)
  : null

export type Database = {
  public: {
    Tables: {
      projects: {
        Row: {
          id: string
          name: string
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          created_at?: string
        }
      }
      requests: {
        Row: {
          id: string
          project_id: string
          raw_text: string
          embedding: number[] | null
          tags: string[]
          signature: string | null
          method: string | null
          endpoint: string | null
          params: any | null
          created_at: string
        }
        Insert: {
          id?: string
          project_id: string
          raw_text: string
          embedding?: number[] | null
          tags?: string[]
          signature?: string | null
          method?: string | null
          endpoint?: string | null
          params?: any | null
          created_at?: string
        }
      }
      sessions: {
        Row: {
          id: string
          project_id: string
          claude_history: any
          findings: any
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          project_id: string
          claude_history?: any
          findings?: any
          created_at?: string
          updated_at?: string
        }
      }
    }
  }
}