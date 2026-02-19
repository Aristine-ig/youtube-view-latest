-- Add screenshot_verify column to task_completions table
-- Run this in your Supabase SQL Editor

-- Step 1: Add the column
ALTER TABLE task_completions 
ADD COLUMN IF NOT EXISTS screenshot_verify TEXT[] DEFAULT '{}';

-- Step 2: Add constraint to limit to max 3 URLs
ALTER TABLE task_completions
DROP CONSTRAINT IF EXISTS screenshot_verify_max_3_urls;

ALTER TABLE task_completions
ADD CONSTRAINT screenshot_verify_max_3_urls 
CHECK (array_length(screenshot_verify, 1) IS NULL OR array_length(screenshot_verify, 1) <= 3);

-- Step 3: Create index for better performance
CREATE INDEX IF NOT EXISTS idx_task_completions_screenshot_verify 
ON task_completions USING gin(screenshot_verify);

-- Verify the column was added
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'task_completions' 
AND column_name = 'screenshot_verify';
