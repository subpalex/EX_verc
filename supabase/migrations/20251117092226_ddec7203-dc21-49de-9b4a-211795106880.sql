-- Create enum for user roles
CREATE TYPE public.user_role AS ENUM ('vendor', 'officer', 'admin');

-- Create profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT NOT NULL,
  role user_role NOT NULL DEFAULT 'vendor',
  market_name TEXT,
  vendor_rating INTEGER DEFAULT 0,
  photo_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Enable RLS on profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Create storage bucket for market photos
INSERT INTO storage.buckets (id, name, public) 
VALUES ('market-photos', 'market-photos', true);

-- Create market_photos table
CREATE TABLE public.market_photos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  photo_url TEXT NOT NULL,
  market_name TEXT NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'reviewed', 'cleaned')),
  reviewed_by UUID REFERENCES public.profiles(id),
  reviewed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Enable RLS on market_photos
ALTER TABLE public.market_photos ENABLE ROW LEVEL SECURITY;

-- Create weekly rankings table
CREATE TABLE public.weekly_rankings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  week_start DATE NOT NULL,
  week_end DATE NOT NULL,
  photo_count INTEGER NOT NULL DEFAULT 0,
  rank INTEGER,
  is_clean_vendor_of_week BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  UNIQUE(vendor_id, week_start)
);

-- Enable RLS on weekly_rankings
ALTER TABLE public.weekly_rankings ENABLE ROW LEVEL SECURITY;

-- RLS Policies for profiles
CREATE POLICY "Users can view their own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Officers can view all profiles"
  ON public.profiles FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role IN ('officer', 'admin')
    )
  );

-- RLS Policies for market_photos
CREATE POLICY "Vendors can insert their own photos"
  ON public.market_photos FOR INSERT
  WITH CHECK (auth.uid() = vendor_id);

CREATE POLICY "Vendors can view their own photos"
  ON public.market_photos FOR SELECT
  USING (auth.uid() = vendor_id);

CREATE POLICY "Officers can view all photos"
  ON public.market_photos FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role IN ('officer', 'admin')
    )
  );

CREATE POLICY "Officers can update photo status"
  ON public.market_photos FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role IN ('officer', 'admin')
    )
  );

-- RLS Policies for weekly_rankings
CREATE POLICY "Anyone can view rankings"
  ON public.weekly_rankings FOR SELECT
  USING (true);

CREATE POLICY "Officers can manage rankings"
  ON public.weekly_rankings FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role IN ('officer', 'admin')
    )
  );

-- Storage policies for market-photos bucket
CREATE POLICY "Vendors can upload photos"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'market-photos' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Anyone can view photos"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'market-photos');

CREATE POLICY "Vendors can delete their own photos"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'market-photos' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

-- Function to handle new user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role)
  VALUES (
    new.id,
    new.email,
    COALESCE(new.raw_user_meta_data->>'full_name', 'User'),
    COALESCE((new.raw_user_meta_data->>'role')::user_role, 'vendor')
  );
  RETURN new;
END;
$$;

-- Trigger for new user creation
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Function to update photo count
CREATE OR REPLACE FUNCTION public.update_vendor_photo_count()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
$$;

-- Trigger to update photo count
CREATE TRIGGER update_photo_count
  AFTER INSERT OR DELETE ON public.market_photos
  FOR EACH ROW EXECUTE FUNCTION public.update_vendor_photo_count();

-- Function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- Trigger for profiles updated_at
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();