-- Fix search_path security warning by using single quotes
DROP FUNCTION IF EXISTS public.update_weekly_rankings(date, date);

CREATE OR REPLACE FUNCTION public.update_weekly_rankings(p_week_start date, p_week_end date)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  -- Delete existing rankings for this week
  DELETE FROM public.weekly_rankings
  WHERE week_start = p_week_start AND week_end = p_week_end;
  
  -- Calculate and insert new rankings based on average grades
  INSERT INTO public.weekly_rankings (
    vendor_id,
    week_start,
    week_end,
    photo_count,
    total_points,
    verified_clean_count,
    total_grade_points,
    average_grade,
    rank
  )
  SELECT
    mp.vendor_id,
    p_week_start,
    p_week_end,
    COUNT(*) as photo_count,
    -- Keep the old points system for backward compatibility
    SUM(CASE WHEN mp.points_awarded > 0 THEN mp.points_awarded ELSE 0 END) as total_points,
    COUNT(*) FILTER (WHERE mp.is_verified = true AND mp.cleanliness_status = 'clean') as verified_clean_count,
    -- New grade-based system
    SUM(COALESCE(mp.grade, 0)) as total_grade_points,
    ROUND(AVG(mp.grade) FILTER (WHERE mp.is_verified = true AND mp.grade IS NOT NULL), 2) as average_grade,
    RANK() OVER (ORDER BY AVG(mp.grade) FILTER (WHERE mp.is_verified = true AND mp.grade IS NOT NULL) DESC NULLS LAST) as rank
  FROM public.market_photos mp
  INNER JOIN public.profiles p ON mp.vendor_id = p.id
  WHERE mp.created_at >= p_week_start
    AND mp.created_at < p_week_end + interval '1 day'
    AND p.is_disqualified = false
  GROUP BY mp.vendor_id
  HAVING COUNT(*) FILTER (WHERE mp.is_verified = true AND mp.grade IS NOT NULL) > 0
  ORDER BY average_grade DESC NULLS LAST;
  
  -- Mark top vendor as clean vendor of the week
  UPDATE public.weekly_rankings
  SET is_clean_vendor_of_week = true
  WHERE week_start = p_week_start
    AND week_end = p_week_end
    AND rank = 1;
END;
$function$;