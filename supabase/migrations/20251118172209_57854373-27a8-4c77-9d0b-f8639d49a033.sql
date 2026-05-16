-- Add cleanliness_status enum
CREATE TYPE public.cleanliness_status AS ENUM ('clean', 'needs_cleaning', 'overflowing');

-- Update market_photos table to support the new ranking system
ALTER TABLE public.market_photos
  ADD COLUMN cleanliness_status public.cleanliness_status,
  ADD COLUMN is_verified boolean DEFAULT false,
  ADD COLUMN points_awarded integer DEFAULT 0,
  ADD COLUMN is_flagged boolean DEFAULT false,
  ADD COLUMN flag_reason text;

-- Add points tracking to profiles
ALTER TABLE public.profiles
  ADD COLUMN current_streak integer DEFAULT 0,
  ADD COLUMN is_disqualified boolean DEFAULT false;

-- Update weekly_rankings to use points instead of just photo_count
ALTER TABLE public.weekly_rankings
  ADD COLUMN total_points integer DEFAULT 0,
  ADD COLUMN verified_clean_count integer DEFAULT 0,
  ADD COLUMN streak_bonus integer DEFAULT 0,
  ADD COLUMN penalty_points integer DEFAULT 0;

-- Function to calculate points when photo is verified
CREATE OR REPLACE FUNCTION public.calculate_photo_points()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Only calculate points when status changes to verified
  IF NEW.is_verified = true AND (OLD.is_verified IS NULL OR OLD.is_verified = false) THEN
    -- Award 1 point for verified clean status
    IF NEW.cleanliness_status = 'clean' THEN
      NEW.points_awarded := 1;
      
      -- Update vendor's current streak
      UPDATE public.profiles
      SET current_streak = current_streak + 1
      WHERE id = NEW.vendor_id;
      
      -- Check if vendor reached 5 streak for bonus
      DECLARE
        vendor_streak integer;
      BEGIN
        SELECT current_streak INTO vendor_streak
        FROM public.profiles
        WHERE id = NEW.vendor_id;
        
        IF vendor_streak >= 5 AND vendor_streak % 5 = 0 THEN
          NEW.points_awarded := NEW.points_awarded + 1;
        END IF;
      END;
    ELSE
      -- Reset streak for non-clean statuses
      UPDATE public.profiles
      SET current_streak = 0
      WHERE id = NEW.vendor_id;
    END IF;
  END IF;
  
  -- Handle flagging/penalty
  IF NEW.is_flagged = true AND (OLD.is_flagged IS NULL OR OLD.is_flagged = false) THEN
    NEW.points_awarded := -1;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger for photo points calculation
CREATE TRIGGER calculate_photo_points_trigger
  BEFORE UPDATE ON public.market_photos
  FOR EACH ROW
  EXECUTE FUNCTION public.calculate_photo_points();

-- Function to update weekly rankings
CREATE OR REPLACE FUNCTION public.update_weekly_rankings(
  p_week_start date,
  p_week_end date
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Delete existing rankings for this week
  DELETE FROM public.weekly_rankings
  WHERE week_start = p_week_start AND week_end = p_week_end;
  
  -- Calculate and insert new rankings
  INSERT INTO public.weekly_rankings (
    vendor_id,
    week_start,
    week_end,
    photo_count,
    total_points,
    verified_clean_count,
    streak_bonus,
    penalty_points,
    rank
  )
  SELECT
    mp.vendor_id,
    p_week_start,
    p_week_end,
    COUNT(*) as photo_count,
    SUM(CASE WHEN mp.points_awarded > 0 THEN mp.points_awarded ELSE 0 END) as total_points,
    COUNT(*) FILTER (WHERE mp.is_verified = true AND mp.cleanliness_status = 'clean') as verified_clean_count,
    SUM(CASE WHEN mp.points_awarded > 1 THEN mp.points_awarded - 1 ELSE 0 END) as streak_bonus,
    ABS(SUM(CASE WHEN mp.points_awarded < 0 THEN mp.points_awarded ELSE 0 END)) as penalty_points,
    RANK() OVER (ORDER BY SUM(mp.points_awarded) DESC) as rank
  FROM public.market_photos mp
  INNER JOIN public.profiles p ON mp.vendor_id = p.id
  WHERE mp.created_at >= p_week_start
    AND mp.created_at < p_week_end + interval '1 day'
    AND p.is_disqualified = false
  GROUP BY mp.vendor_id
  ORDER BY SUM(mp.points_awarded) DESC;
  
  -- Mark top vendor as clean vendor of the week
  UPDATE public.weekly_rankings
  SET is_clean_vendor_of_week = true
  WHERE week_start = p_week_start
    AND week_end = p_week_end
    AND rank = 1;
END;
$$;

-- Update market_photos status field to use existing values
UPDATE public.market_photos
SET status = 'pending'
WHERE status IS NULL;