-- Fix all remaining functions with search_path issues

-- Fix calculate_photo_points function
DROP FUNCTION IF EXISTS public.calculate_photo_points() CASCADE;

CREATE OR REPLACE FUNCTION public.calculate_photo_points()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
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
$function$;

-- Fix update_vendor_photo_count function
DROP FUNCTION IF EXISTS public.update_vendor_photo_count() CASCADE;

CREATE OR REPLACE FUNCTION public.update_vendor_photo_count()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.profiles
    SET photo_count = photo_count + 1
    WHERE id = NEW.vendor_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.profiles
    SET photo_count = photo_count - 1
    WHERE id = OLD.vendor_id;
  END IF;
  RETURN NULL;
END;
$function$;

-- Fix update_updated_at function
DROP FUNCTION IF EXISTS public.update_updated_at() CASCADE;

CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $function$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$function$;

-- Recreate triggers that were dropped
CREATE TRIGGER calculate_photo_points_trigger
  BEFORE INSERT OR UPDATE ON public.market_photos
  FOR EACH ROW
  EXECUTE FUNCTION public.calculate_photo_points();

CREATE TRIGGER update_vendor_photo_count_trigger
  AFTER INSERT OR DELETE ON public.market_photos
  FOR EACH ROW
  EXECUTE FUNCTION public.update_vendor_photo_count();

CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();