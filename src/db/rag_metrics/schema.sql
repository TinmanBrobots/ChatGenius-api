-- RAG METRICS SCHEMA

-- Drop existing trigger if exists
DROP TRIGGER IF EXISTS update_rag_metrics_updated_at ON rag_metrics;
DROP FUNCTION IF EXISTS update_rag_metrics_updated_at();

-- Drop existing table if exists
DROP TABLE IF EXISTS rag_metrics CASCADE;

-- Create rag_metrics table
CREATE TABLE rag_metrics (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    query TEXT NOT NULL,
    channel_id UUID NOT NULL REFERENCES channels(id) ON DELETE CASCADE,
    target_user_id UUID NOT NULL REFERENCES profiles(id),
    response_time_ms INTEGER NOT NULL,
    message_count INTEGER NOT NULL,
    confidence_score FLOAT NOT NULL CHECK (confidence_score >= 0 AND confidence_score <= 1),
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL,
    metadata JSONB DEFAULT '{}'::jsonb
);

-- Create indexes
CREATE INDEX IF NOT EXISTS rag_metrics_channel_id_idx ON rag_metrics(channel_id);
CREATE INDEX IF NOT EXISTS rag_metrics_target_user_id_idx ON rag_metrics(target_user_id);
CREATE INDEX IF NOT EXISTS rag_metrics_timestamp_idx ON rag_metrics(timestamp);
CREATE INDEX IF NOT EXISTS rag_metrics_confidence_score_idx ON rag_metrics(confidence_score);

-- Add trigger for updated_at
CREATE OR REPLACE FUNCTION update_rag_metrics_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = TIMEZONE('utc', NOW());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_rag_metrics_updated_at
    BEFORE UPDATE ON rag_metrics
    FOR EACH ROW
    EXECUTE FUNCTION update_rag_metrics_updated_at(); 