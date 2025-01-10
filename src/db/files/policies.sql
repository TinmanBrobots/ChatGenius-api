-- Files policies
-- Users can view files if they are members of the channel
CREATE POLICY "Users can view files in channels they are members of"
    ON public.files
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.channel_members cm
            WHERE cm.channel_id = files.channel_id
            AND cm.profile_id = auth.uid()
        )
    );

-- Users can upload files to channels they are members of
CREATE POLICY "Users can upload files to channels they are members of"
    ON public.files
    FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.channel_members cm
            WHERE cm.channel_id = files.channel_id
            AND cm.profile_id = auth.uid()
        )
    );

-- Only file uploaders can update their own files
CREATE POLICY "Users can update their own files"
    ON public.files
    FOR UPDATE
    USING (uploader_id = auth.uid())
    WITH CHECK (uploader_id = auth.uid());

-- Only file uploaders and channel admins can delete files
CREATE POLICY "Users can delete their own files or if they are channel admins"
    ON public.files
    FOR DELETE
    USING (
        uploader_id = auth.uid()
        OR EXISTS (
            SELECT 1 FROM public.channel_members cm
            WHERE cm.channel_id = files.channel_id
            AND cm.profile_id = auth.uid()
            AND cm.role IN ('admin', 'owner')
        )
    ); 