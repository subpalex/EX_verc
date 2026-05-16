-- Security fix: Add RLS policies to protect grade-related columns from unauthorized modification
-- Only officers and admins can update grade, graded_by, graded_at, and grade_reason fields

-- First, drop the existing "Vendors cannot modify grades" policy if it exists
DROP POLICY IF EXISTS "Vendors cannot modify grades" ON market_photos;

-- The existing "Officers can update all photo fields" policy already restricts updates to officers
-- We don't need a separate vendor policy since vendors don't have UPDATE permissions on market_photos
-- The INSERT policy for vendors ensures they can only create their own records

-- Add database-level constraint to ensure grades are in valid range (1-5)
ALTER TABLE market_photos
ADD CONSTRAINT valid_grade_range
CHECK (grade IS NULL OR (grade >= 1 AND grade <= 5));

-- Add constraint to ensure graded_by is set when grade is assigned
ALTER TABLE market_photos
ADD CONSTRAINT grade_requires_grader
CHECK (
  (grade IS NULL AND graded_by IS NULL AND graded_at IS NULL)
  OR (grade IS NOT NULL AND graded_by IS NOT NULL AND graded_at IS NOT NULL)
);

-- Add helpful comments
COMMENT ON CONSTRAINT valid_grade_range ON market_photos IS 'Ensures grades are between 1-5 when assigned';
COMMENT ON CONSTRAINT grade_requires_grader ON market_photos IS 'Ensures graded_by and graded_at are set when grade is assigned';