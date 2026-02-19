-- Rename screenshots column to screenshot_verify in task_completions table
ALTER TABLE task_completions 
RENAME COLUMN screenshots TO screenshot_verify;

-- Update the column comment
COMMENT ON COLUMN task_completions.screenshot_verify IS 'Array of up to 3 screenshot image URLs for task verification';
