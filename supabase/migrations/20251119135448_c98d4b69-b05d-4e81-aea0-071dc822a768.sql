-- Add length constraints to prevent database bloat and validate input
ALTER TABLE market_photos 
ADD CONSTRAINT description_length CHECK (description IS NULL OR length(description) <= 500);

ALTER TABLE market_photos 
ADD CONSTRAINT flag_reason_length CHECK (flag_reason IS NULL OR length(flag_reason) <= 500);

ALTER TABLE market_photos
ADD CONSTRAINT market_name_length CHECK (length(market_name) <= 100);