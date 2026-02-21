-- Add screenshots column to task_completions table
ALTER TABLE task_completions 
ADD COLUMN IF NOT EXISTS screenshots TEXT[] DEFAULT ARRAY[]::TEXT[];

-- Add comment to describe the column
COMMENT ON COLUMN task_completions.screenshots IS 'Array of screenshot image URLs (up to 3) stored in Supabase storage/screenshots bucket';

-- Create an index for faster queries
CREATE INDEX IF NOT EXISTS idx_task_completions_screenshots ON task_completions USING gin(screenshots);
