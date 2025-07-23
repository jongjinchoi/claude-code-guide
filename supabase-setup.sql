-- Supabase Setup SQL for Claude Code Guide Analytics
-- Run this in Supabase SQL Editor

-- 1. Counters table (for visitor count)
CREATE TABLE IF NOT EXISTS counters (
  id SERIAL PRIMARY KEY,
  name VARCHAR(50) UNIQUE NOT NULL,
  value BIGINT DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- Initialize visitors counter with existing value
INSERT INTO counters (name, value) 
VALUES ('visitors', 502) -- Current value from Google Sheets
ON CONFLICT (name) DO NOTHING;

-- 2. Raw Events table (matching Google Sheets structure)
CREATE TABLE IF NOT EXISTS raw_events (
  id SERIAL PRIMARY KEY,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  event_category VARCHAR(50),
  event_name VARCHAR(100),
  user_id VARCHAR(100),
  session_id VARCHAR(100),
  is_new_user BOOLEAN DEFAULT FALSE,
  page_path TEXT,
  referrer_source VARCHAR(100),
  referrer_medium VARCHAR(50),
  guide_step_number INTEGER,
  guide_step_name VARCHAR(100),
  guide_progress DECIMAL(3,2),
  time_on_step INTEGER,
  action_type VARCHAR(50),
  action_target TEXT,
  action_value TEXT,
  interaction_count INTEGER,
  device_category VARCHAR(50),
  os VARCHAR(50),
  browser VARCHAR(50),
  is_success BOOLEAN DEFAULT TRUE,
  error_type VARCHAR(100),
  error_message TEXT,
  feedback_score INTEGER,
  feedback_text TEXT,
  total_time_minutes DECIMAL(10,2)
);

-- 3. Function to increment counter atomically
CREATE OR REPLACE FUNCTION increment_counter(counter_name VARCHAR)
RETURNS BIGINT AS $$
DECLARE
  new_value BIGINT;
BEGIN
  UPDATE counters 
  SET value = value + 1,
      updated_at = TIMEZONE('utc', NOW())
  WHERE name = counter_name
  RETURNING value INTO new_value;
  
  RETURN new_value;
END;
$$ LANGUAGE plpgsql;

-- 4. Indexes for performance
CREATE INDEX idx_raw_events_timestamp ON raw_events(timestamp);
CREATE INDEX idx_raw_events_event_name ON raw_events(event_name);
CREATE INDEX idx_raw_events_user_id ON raw_events(user_id);
CREATE INDEX idx_raw_events_session_id ON raw_events(session_id);
CREATE INDEX idx_raw_events_page_path ON raw_events(page_path);

-- 5. RLS (Row Level Security) policies
ALTER TABLE counters ENABLE ROW LEVEL SECURITY;
ALTER TABLE raw_events ENABLE ROW LEVEL SECURITY;

-- Allow anonymous read for counters
CREATE POLICY "Allow anonymous read counters" ON counters
  FOR SELECT USING (true);

-- Allow anonymous update for counters (only through function)
CREATE POLICY "Allow anonymous increment counters" ON counters
  FOR UPDATE USING (name = 'visitors');

-- Allow anonymous insert for raw_events
CREATE POLICY "Allow anonymous insert events" ON raw_events
  FOR INSERT WITH CHECK (true);

-- Allow anonymous read for raw_events (optional, for debugging)
CREATE POLICY "Allow anonymous read events" ON raw_events
  FOR SELECT USING (true);

-- 6. Create views for analytics (optional)
CREATE OR REPLACE VIEW daily_summary AS
SELECT 
  DATE(timestamp) as date,
  COUNT(DISTINCT user_id) as unique_users,
  COUNT(*) as total_events,
  COUNT(DISTINCT session_id) as sessions,
  COUNT(CASE WHEN event_name = 'page_view' THEN 1 END) as page_views,
  COUNT(CASE WHEN event_name = 'guide_completed' THEN 1 END) as completions
FROM raw_events
GROUP BY DATE(timestamp)
ORDER BY date DESC;

-- 7. Create view for funnel analysis
CREATE OR REPLACE VIEW funnel_analysis AS
SELECT 
  DATE(timestamp) as date,
  COUNT(DISTINCT CASE WHEN event_name = 'page_view' AND page_path LIKE '%guide%' THEN user_id END) as guide_views,
  COUNT(DISTINCT CASE WHEN event_name = 'guide_started' THEN user_id END) as guide_starts,
  COUNT(DISTINCT CASE WHEN event_name = 'step_completed' AND guide_step_number = 1 THEN user_id END) as step_1_completed,
  COUNT(DISTINCT CASE WHEN event_name = 'guide_completed' THEN user_id END) as guide_completed
FROM raw_events
GROUP BY DATE(timestamp)
ORDER BY date DESC;

-- Grant permissions to anon role
GRANT USAGE ON SCHEMA public TO anon;
GRANT SELECT, UPDATE ON counters TO anon;
GRANT INSERT, SELECT ON raw_events TO anon;
GRANT SELECT ON daily_summary TO anon;
GRANT SELECT ON funnel_analysis TO anon;
GRANT EXECUTE ON FUNCTION increment_counter TO anon;