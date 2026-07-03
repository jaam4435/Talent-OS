-- Add client role enum value (must be in its own migration — PG cannot use new enum values in the same transaction)
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'client';
