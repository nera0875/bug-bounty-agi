import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://clcpszhztwfhnvirexao.supabase.co'
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNsY3BzemhodHdmaG52aXJleGFvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MjQ0MjkzNDIsImV4cCI6MjAzNzAwNTM0Mn0.LiIQB4IrfuMoKLN2YJJBaB1Vkp5U6kKHJ5kxl6k6wAI'
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase environment variables')
}

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