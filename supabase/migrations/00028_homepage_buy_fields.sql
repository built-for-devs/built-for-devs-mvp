-- Store buyer contact info for anonymous (non-authenticated) purchases from the homepage
ALTER TABLE projects ADD COLUMN buyer_email TEXT;
ALTER TABLE projects ADD COLUMN buyer_name TEXT;
