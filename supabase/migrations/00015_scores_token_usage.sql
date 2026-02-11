-- Track Anthropic API token usage per score for cost monitoring
ALTER TABLE scores ADD COLUMN input_tokens INTEGER;
ALTER TABLE scores ADD COLUMN output_tokens INTEGER;
