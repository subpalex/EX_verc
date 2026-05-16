-- Add area column to market_photos table
ALTER TABLE public.market_photos 
ADD COLUMN area TEXT;

-- Add comment for documentation
COMMENT ON COLUMN public.market_photos.area IS 'Market area where the photo was taken (e.g., Vegetables Section, Fish Market, etc.)';