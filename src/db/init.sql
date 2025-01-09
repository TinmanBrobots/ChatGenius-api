-- Set timezone
alter database postgres set timezone to 'UTC';

-- Load utility functions
\i utils/functions.sql

-- Drop existing policies
DO $$ 
DECLARE
    pol record;
BEGIN
    -- Loop through all policies in the public schema
    FOR pol IN 
        SELECT schemaname, tablename, policyname 
        FROM pg_policies 
        WHERE schemaname = 'public'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', 
            pol.policyname, 
            pol.schemaname, 
            pol.tablename);
    END LOOP;
END $$;

-- Load utility functions and triggers
\i utils/triggers.sql

-- Load schemas
\i profiles/schema.sql
\i channels/schema.sql
\i channel_members/schema.sql
\i messages/schema.sql
\i reactions/schema.sql

-- Load policies
\i profiles/policies.sql
\i channels/policies.sql
\i channel_members/policies.sql
\i messages/policies.sql
\i reactions/policies.sql 