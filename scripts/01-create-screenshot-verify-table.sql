-- Create screenshot_verify table (renamed from task_completions)
CREATE TABLE IF NOT EXISTS screenshot_verify (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  completion_pct INTEGER DEFAULT 0 CHECK (completion_pct >= 0 AND completion_pct <= 100),
  earned_amount NUMERIC(10, 2) DEFAULT 0,
  screenshot_verify TEXT[] DEFAULT ARRAY[]::TEXT[],
  started_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(task_id, user_id),
  CONSTRAINT screenshot_verify_max_3_urls CHECK (array_length(screenshot_verify, 1) IS NULL OR array_length(screenshot_verify, 1) <= 3)
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_screenshot_verify_user_id ON screenshot_verify(user_id);
CREATE INDEX IF NOT EXISTS idx_screenshot_verify_task_id ON screenshot_verify(task_id);
CREATE INDEX IF NOT EXISTS idx_screenshot_verify_status ON screenshot_verify(status);
CREATE INDEX IF NOT EXISTS idx_screenshot_verify_screenshots ON screenshot_verify USING gin(screenshot_verify);

-- Add comment to table
COMMENT ON TABLE screenshot_verify IS 'Table to store task completion submissions with screenshots for verification';
COMMENT ON COLUMN screenshot_verify.screenshot_verify IS 'Array of up to 3 screenshot image URLs for task verification';
