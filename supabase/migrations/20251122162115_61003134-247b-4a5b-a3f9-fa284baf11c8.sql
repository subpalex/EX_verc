-- Create function to return unified vendor rankings for anyone (including vendors)
CREATE OR REPLACE FUNCTION public.get_vendor_rankings(p_week_start date, p_week_end date)
RETURNS TABLE (
  vendor_id uuid,
  full_name text,
  market_name text,
  total_points integer,
  verified_clean_count integer,
  photo_count integer,
  rank integer
)
LANGUAGE sql
SECURITY DEFINER
SET search_path TO public
AS $function$
  SELECT
    p.id as vendor_id,
    p.full_name,
    p.market_name,
    COALESCE(wr.total_points, 0) as total_points,
    COALESCE(wr.verified_clean_count, 0) as verified_clean_count,
    COALESCE(wr.photo_count, 0) as photo_count,
    RANK() OVER (ORDER BY COALESCE(wr.total_points,0) DESC) as rank
  FROM public.profiles p
  LEFT JOIN public.weekly_rankings wr
    ON wr.vendor_id = p.id
    AND wr.week_start = p_week_start
    AND wr.week_end = p_week_end
  WHERE p.role = 'vendor';
$function$;