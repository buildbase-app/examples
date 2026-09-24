ALTER TABLE users
  ADD COLUMN password VARCHAR(255) NOT NULL DEFAULT '' AFTER username,
  DROP COLUMN buildbase_id;
