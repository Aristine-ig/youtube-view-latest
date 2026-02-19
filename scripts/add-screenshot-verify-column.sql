-- Add screenshot_verify column to task_completions table
-- This column stores up to 3 image URLs for task verification
ALTER TABLE task_completions 
ADD COLUMN IF NOT EXISTS screenshot_verify TEXT[] DEFAULT ARRAY[]::TEXT[];

-- Add a check constraint to limit array to 3 URLs
ALTER TABLE task_completions
ADD CONSTRAINT screenshot_verify_max_3_urls CHECK (array_length(screenshot_verify, 1) IS NULL OR array_length(screenshot_verify, 1) <= 3);

-- Add comment to describe the column
COMMENT ON COLUMN task_completions.screenshot_verify IS 'Array of up to 3 screenshot image URLs for task verification';

-- Create a GIN index for faster queries on the array column
CREATE INDEX IF NOT EXISTS idx_task_completions_screenshot_verify ON task_completions USING gin(screenshot_verify);
