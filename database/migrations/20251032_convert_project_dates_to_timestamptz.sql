-- Convert projects date columns to timestamptz and preserve semantics

-- project_start_date -> store as midnight UTC
ALTER TABLE public.projects
  ALTER COLUMN project_start_date TYPE timestamptz USING (
    CASE
      WHEN project_start_date IS NULL THEN NULL
      ELSE (
        (project_start_date::text || ' 00:00:00+00')::timestamptz
      )
    END
  );

-- project_estimated_completion_date -> store as end-of-day UTC
ALTER TABLE public.projects
  ALTER COLUMN project_estimated_completion_date TYPE timestamptz USING (
    CASE
      WHEN project_estimated_completion_date IS NULL OR project_estimated_completion_date::text = '' THEN NULL
      ELSE (
        (project_estimated_completion_date::text || ' 23:59:59+00')::timestamptz
      )
    END
  );



