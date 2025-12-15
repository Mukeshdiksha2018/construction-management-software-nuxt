-- Convert estimates date columns to timestamptz and preserve semantics as midnight UTC

-- estimate_date
ALTER TABLE public.estimates
  ALTER COLUMN estimate_date TYPE timestamptz USING (
    CASE
      WHEN estimate_date IS NULL THEN NULL
      ELSE (
        -- Coerce existing values to text, append explicit UTC midnight, then cast to timestamptz
        (estimate_date::text || ' 00:00:00+00')::timestamptz
      )
    END
  );

-- valid_until
ALTER TABLE public.estimates
  ALTER COLUMN valid_until TYPE timestamptz USING (
    CASE
      WHEN valid_until IS NULL OR valid_until::text = '' THEN NULL
      ELSE (
        (valid_until::text || ' 23:59:59+00')::timestamptz
      )
    END
  );

-- Optional: ensure NOT NULL/DEFAULT policies remain unchanged (adjust as needed)


