-- Update the ranking function to rank by total points instead of average grade
CREATE OR REPLACE FUNCTION public.update_weekly_rankings(p_week_start date, p_week_end date)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Delete existing rankings for this week
  DELETE FROM public.weekly_rankings
  WHERE week_start = p_week_start AND week_end = p_week_end;
  
  -- Calculate and insert new rankings based on total points
  INSERT INTO public.weekly_rankings (
    vendor_id,
    week_start,
    week_end,
    photo_count,
    total_points,
    verified_clean_count,
    rank
  )
  SELECT
    mp.vendor_id,
    p_week_start,
    p_week_end,
    COUNT(*) as photo_count,
    SUM(COALESCE(mp.points_awarded, 0)) as total_points,
    COUNT(*) FILTER (WHERE mp.is_verified = true AND mp.cleanliness_status = 'clean') as verified_clean_count,
    RANK() OVER (ORDER BY SUM(COALESCE(mp.points_awarded, 0)) DESC) as rank
  FROM public.market_photos mp
  INNER JOIN public.profiles p ON mp.vendor_id = p.id
  WHERE mp.created_at >= p_week_start
    AND mp.created_at < p_week_end + interval '1 day'
    AND p.is_disqualified = false
  GROUP BY mp.vendor_id
  HAVING SUM(COALESCE(mp.points_awarded, 0)) > 0
  ORDER BY total_points DESC;
  
  -- Mark top vendor as clean vendor of the week
  UPDATE public.weekly_rankings
  SET is_clean_vendor_of_week = true
  WHERE week_start = p_week_start
    AND week_end = p_week_end
    AND rank = 1;
END;
$function$;