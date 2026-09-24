-- Added for the BuildBase example: users sign in through BuildBase, so the
-- app keeps their BuildBase ID and no longer stores a password.
ALTER TABLE users
  ADD COLUMN buildbase_id VARCHAR(64) NULL UNIQUE AFTER username,
  DROP COLUMN password;
