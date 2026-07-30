-- Phase: Event Platform — atomic claiming, processing fingerprints, job claim RPC

-- Exactly-once processing fingerprint (at-most-one active processor per event)
CREATE TABLE IF NOT EXISTS event_processing_fingerprints (
  event_id      UUID PRIMARY KEY REFERENCES domain_events(id) ON DELETE CASCADE,
  processor     TEXT NOT NULL DEFAULT 'dispatch-worker',
  claimed_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at  TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_event_fingerprints_incomplete
  ON event_processing_fingerprints(processor)
  WHERE completed_at IS NULL;

-- Atomic claim for domain events (SKIP LOCKED)
CREATE OR REPLACE FUNCTION claim_domain_events(p_limit INTEGER DEFAULT 50)
RETURNS SETOF domain_events AS $$
BEGIN
  RETURN QUERY
  WITH picked AS (
    SELECT id
    FROM domain_events
    WHERE status IN ('pending', 'failed')
      AND scheduled_at <= now()
    ORDER BY scheduled_at
    LIMIT p_limit
    FOR UPDATE SKIP LOCKED
  )
  UPDATE domain_events e
  SET status = 'processing'
  FROM picked
  WHERE e.id = picked.id
  RETURNING e.*;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Atomic claim for workflow jobs
CREATE OR REPLACE FUNCTION claim_workflow_jobs(p_limit INTEGER DEFAULT 50, p_queue TEXT DEFAULT NULL)
RETURNS SETOF workflow_jobs AS $$
BEGIN
  RETURN QUERY
  WITH picked AS (
    SELECT id
    FROM workflow_jobs
    WHERE status IN ('pending', 'failed')
      AND scheduled_at <= now()
      AND (p_queue IS NULL OR queue_name = p_queue)
    ORDER BY scheduled_at
    LIMIT p_limit
    FOR UPDATE SKIP LOCKED
  )
  UPDATE workflow_jobs j
  SET status = 'processing', started_at = now()
  FROM picked
  WHERE j.id = picked.id
  RETURNING j.*;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Mark event delivered when all workflow runs/jobs for trigger are terminal
CREATE OR REPLACE FUNCTION finalize_domain_event_if_complete(p_event_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  v_pending INTEGER;
BEGIN
  SELECT count(*) INTO v_pending
  FROM workflow_runs r
  JOIN workflow_jobs j ON j.run_id = r.id
  WHERE r.trigger_event_id = p_event_id
    AND (
      r.status NOT IN ('completed', 'failed', 'cancelled')
      OR j.status IN ('pending', 'processing', 'failed')
    );

  IF v_pending = 0 THEN
    UPDATE domain_events
    SET status = 'delivered', processed_at = now()
    WHERE id = p_event_id AND status = 'processing';

    UPDATE event_processing_fingerprints
    SET completed_at = now()
    WHERE event_id = p_event_id AND completed_at IS NULL;

    RETURN TRUE;
  END IF;

  RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION claim_domain_events(INTEGER) TO service_role;
GRANT EXECUTE ON FUNCTION claim_workflow_jobs(INTEGER, TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION finalize_domain_event_if_complete(UUID) TO service_role;
