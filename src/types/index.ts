export type Category =
  | 'Food & Drinks'
  | 'Transport'
  | 'Shopping'
  | 'Entertainment'
  | 'Utilities'
  | 'Health'
  | 'Snacks'
  | 'Lifestyle'
  | 'Essentials'
  | 'Credit Card Bills & EMIs'
  | 'Health Insurance'
  | 'Uncategorized'

export type PatternType = 'daily_habit' | 'time_based' | 'frequency' | 'micro_spend'
export type TimePeriod = 'morning' | 'afternoon' | 'evening' | 'late_night'
export type HabitScore = 'controlled' | 'moderate' | 'risky'
export type InsightType = 'pattern' | 'timing' | 'frequency' | 'health'
export type Severity = 'positive' | 'neutral' | 'warning'
export type DataSource = 'manual' | 'sms' | 'upload'

export interface Transaction {
  id: string
  user_id: string
  amount: number
  category: Category
  sub_category?: string
  merchant?: string
  remarks?: string
  source: DataSource
  raw_sms?: string
  transaction_date: string
  transaction_time?: string
  created_at: string
}

export interface BehaviorPattern {
  id: string
  user_id: string
  pattern_type: PatternType
  category: string
  title: string
  description: string
  amount_avg?: number
  frequency?: number
  time_pattern?: TimePeriod
  intensity: 'low' | 'moderate' | 'high'
  week_start: string
  created_at: string
}

export interface WeeklyMetrics {
  id: string
  user_id: string
  week_start: string
  total_spent: number
  top_category?: string
  habit_score: HabitScore
  habit_score_value: number
  transaction_count: number
  late_night_percent: number
  prev_week_total?: number
  change_percent?: number
  created_at: string
}

export interface InsightCard {
  id: string
  user_id: string
  insight_type: InsightType
  title: string
  body: string
  emoji: string
  severity: Severity
  related_category?: string
  amount?: number
  week_start: string
  is_read: boolean
  created_at: string
}

export interface ParsedSMSTransaction {
  amount: number
  merchant?: string
  date: string
  time?: string
  category: Category
  raw_sms: string
}
