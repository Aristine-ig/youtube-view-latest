-- Add completed_count column to tasks table
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS completed_count INTEGER DEFAULT 0;

-- Update existing tasks to have completed_count = 0 if null
UPDATE tasks SET completed_count = 0 WHERE completed_count IS NULL;