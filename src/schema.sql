CREATE TABLE IF NOT EXISTS observations (
    id BIGSERIAL PRIMARY KEY,
    animal TEXT NOT NULL,
    stream TEXT NOT NULL,
    observed_at TIMESTAMPTZ NOT NULL,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_observations_observed_at
    ON observations (observed_at DESC);
