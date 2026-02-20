-- Add columns to track suspicious completion attempts

-- Add suspicious_completion flag to task_completions table
ALTER TABLE task_completions
ADD COLUMN IF NOT EXISTS suspicious_completion BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS early_submit_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS task_duration_seconds INTEGER,
ADD COLUMN IF NOT EXISTS submission_time_seconds INTEGER;

-- Add suspicious_user flag to users table
ALTER TABLE users
ADD COLUMN IF NOT EXISTS suspicious_user BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS suspicious_attempts INTEGER DEFAULT 0;

-- Create index for querying suspicious users
CREATE INDEX IF NOT EXISTS idx_suspicious_users ON users(suspicious_user) WHERE suspicious_user = TRUE;

-- Create index for querying suspicious completions
CREATE INDEX IF NOT EXISTS idx_suspicious_completions ON task_completions(suspicious_completion) WHERE suspicious_completion = TRUE;

-- Create a table to log all suspicious activities for audit
CREATE TABLE IF NOT EXISTS suspicious_activity_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  task_completion_id UUID REFERENCES task_completions(id) ON DELETE SET NULL,
  activity_type VARCHAR(50) NOT NULL,
  task_duration_seconds INTEGER,
  submission_time_seconds INTEGER,
  early_submit_count INTEGER,
  details TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create index for querying activity logs by user
CREATE INDEX IF NOT EXISTS idx_suspicious_activity_user ON suspicious_activity_log(user_id);

-- Create index for querying activity logs by date
CREATE INDEX IF NOT EXISTS idx_suspicious_activity_date ON suspicious_activity_log(created_at DESC);

COMMENT ON TABLE suspicious_activity_log IS 'Logs all suspicious user activities for monitoring and audit purposes';
COMMENT ON COLUMN task_completions.suspicious_completion IS 'Marks if this completion was flagged as suspicious due to early submissions';
COMMENT ON COLUMN task_completions.early_submit_count IS 'Number of times user tries to submit before 90% of timer';
COMMENT ON COLUMN users.suspicious_user IS 'Marks if user has been flagged for suspicious behavior';
COMMENT ON COLUMN users.suspicious_attempts IS 'Total count of suspicious completion attempts by this user';
