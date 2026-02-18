-- Add keywords column to tasks table
-- This column will store comma-separated keywords/hashtags for tasks

ALTER TABLE tasks
ADD COLUMN IF NOT EXISTS keywords TEXT;

-- Add comment to the column for documentation
COMMENT ON COLUMN tasks.keywords IS 'Comma-separated keywords or hashtags for the task';

-- Optional: Create an index for faster searches on keywords if needed
-- CREATE INDEX IF NOT EXISTS idx_tasks_keywords ON tasks USING gin(to_tsvector('english', keywords));
