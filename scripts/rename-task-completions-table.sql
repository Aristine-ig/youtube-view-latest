-- Rename task_completions table to screenshot_verify
ALTER TABLE task_completions RENAME TO screenshot_verify;

-- Rename the primary key constraint
ALTER INDEX task_completions_pkey RENAME TO screenshot_verify_pkey;

-- Rename foreign key constraints if any exist
ALTER TABLE screenshot_verify RENAME CONSTRAINT task_completions_task_id_fkey TO screenshot_verify_task_id_fkey;
ALTER TABLE screenshot_verify RENAME CONSTRAINT task_completions_user_id_fkey TO screenshot_verify_user_id_fkey;

-- Update the comment
COMMENT ON TABLE screenshot_verify IS 'Table to store task completion submissions with screenshots for verification';
