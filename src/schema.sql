-- Serialize schema setup across replicas starting at the same time: concurrent
-- CREATE ... IF NOT EXISTS can still fail on Postgres catalog unique keys.
-- The multi-statement query runs as one implicit transaction, so the lock is
-- held until the end of this file.
SELECT pg_advisory_xact_lock(482617);

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
