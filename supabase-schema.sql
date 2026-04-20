-- ============================================================
-- RupeeLens Database Schema
-- Run this entire file in your Supabase SQL Editor
-- Dashboard → SQL Editor → New Query → Paste → Run
-- ============================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- USERS PROFILE TABLE
-- (Extends Supabase auth.users)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  phone TEXT,
  display_name TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, phone)
  VALUES (NEW.id, NEW.phone);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================================
-- TRANSACTIONS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS public.transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount NUMERIC(12, 2) NOT NULL,
  category TEXT NOT NULL DEFAULT 'Uncategorized',
  sub_category TEXT,
  merchant TEXT,
  remarks TEXT,
  source TEXT NOT NULL DEFAULT 'manual', -- 'manual' | 'sms' | 'upload'
  raw_sms TEXT,
  transaction_date DATE NOT NULL,
  transaction_time TIME,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own transactions" ON public.transactions
  FOR ALL USING (auth.uid() = user_id);

CREATE INDEX idx_transactions_user_date ON public.transactions(user_id, transaction_date DESC);
CREATE INDEX idx_transactions_category ON public.transactions(user_id, category);

-- ============================================================
-- BEHAVIOR PATTERNS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS public.behavior_patterns (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  pattern_type TEXT NOT NULL, -- 'daily_habit' | 'time_based' | 'frequency' | 'micro_spend'
  category TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  amount_avg NUMERIC(12, 2),
  frequency INTEGER, -- times per week
  time_pattern TEXT, -- 'morning' | 'afternoon' | 'evening' | 'late_night'
  intensity TEXT NOT NULL DEFAULT 'moderate', -- 'low' | 'moderate' | 'high'
  week_start DATE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.behavior_patterns ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own patterns" ON public.behavior_patterns
  FOR ALL USING (auth.uid() = user_id);

CREATE INDEX idx_patterns_user_week ON public.behavior_patterns(user_id, week_start DESC);

-- ============================================================
-- WEEKLY METRICS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS public.weekly_metrics (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  week_start DATE NOT NULL,
  total_spent NUMERIC(12, 2) DEFAULT 0,
  top_category TEXT,
  habit_score TEXT DEFAULT 'moderate', -- 'controlled' | 'moderate' | 'risky'
  habit_score_value INTEGER DEFAULT 50, -- 0-100
  transaction_count INTEGER DEFAULT 0,
  late_night_percent NUMERIC(5, 2) DEFAULT 0,
  prev_week_total NUMERIC(12, 2),
  change_percent NUMERIC(8, 2),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, week_start)
);

ALTER TABLE public.weekly_metrics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own metrics" ON public.weekly_metrics
  FOR ALL USING (auth.uid() = user_id);

-- ============================================================
-- INSIGHT CARDS TABLE (AI-generated, cached)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.insight_cards (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  insight_type TEXT NOT NULL, -- 'pattern' | 'timing' | 'frequency' | 'health'
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  emoji TEXT DEFAULT '💡',
  severity TEXT DEFAULT 'neutral', -- 'positive' | 'neutral' | 'warning'
  related_category TEXT,
  amount NUMERIC(12, 2),
  week_start DATE NOT NULL,
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.insight_cards ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own insights" ON public.insight_cards
  FOR ALL USING (auth.uid() = user_id);

CREATE INDEX idx_insights_user_week ON public.insight_cards(user_id, week_start DESC, created_at DESC);

-- ============================================================
-- DONE! Your RupeeLens database is ready.
-- ============================================================
