-- RAG METRICS POLICIES

-- Enable RLS
ALTER TABLE rag_metrics ENABLE ROW LEVEL SECURITY;

-- Create policies
-- 1. Insert policy: Only authenticated users can insert metrics
CREATE POLICY "Users can insert their own metrics"
    ON rag_metrics
    FOR INSERT
    TO authenticated
    WITH CHECK (
        -- Verify user has access to the channel
        EXISTS (
            SELECT 1 FROM channel_members
            WHERE channel_members.channel_id = rag_metrics.channel_id
            AND channel_members.profile_id = auth.uid()
        )
    );

-- 2. Select policy: Users can view metrics for channels they are members of
CREATE POLICY "Users can view metrics for their channels"
    ON rag_metrics
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM channel_members
            WHERE channel_members.channel_id = rag_metrics.channel_id
            AND channel_members.profile_id = auth.uid()
        )
    );

-- 3. Update policy: Only admins can update metrics
CREATE POLICY "Only admins can update metrics"
    ON rag_metrics
    FOR UPDATE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.is_admin = true
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.is_admin = true
        )
    );

-- 4. Delete policy: Only admins can delete metrics
CREATE POLICY "Only admins can delete metrics"
    ON rag_metrics
    FOR DELETE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.is_admin = true
        )
    ); 