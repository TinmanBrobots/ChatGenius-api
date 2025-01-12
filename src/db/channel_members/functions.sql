-- FUNCTIONS

-- -- Drop function and trigger if they exist
-- DROP TRIGGER IF EXISTS set_channel_owner ON channel_members;
-- DROP FUNCTION IF EXISTS set_channel_owner();

-- Add trigger to automatically set owner role for channel creator
CREATE OR REPLACE FUNCTION set_channel_owner()
RETURNS TRIGGER AS $$
BEGIN
    IF (
				NEW.profile_id = (
						SELECT created_by 
						FROM channels 
						WHERE id = NEW.channel_id
    		)
				AND NOT 'direct' = (
					SELECT type
					FROM channels
					WHERE id = NEW.channel_id
				)
		) THEN
        NEW.role = 'owner';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER set_channel_owner
    BEFORE INSERT ON channel_members
    FOR EACH ROW
    EXECUTE FUNCTION set_channel_owner(); 