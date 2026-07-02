-- Sprint 6: AI Project Manager — requirements storage and status assessment fields

ALTER TABLE opportunities
  ADD COLUMN IF NOT EXISTS requirements JSONB NOT NULL DEFAULT '{}';

ALTER TABLE projects
  ADD COLUMN IF NOT EXISTS requirements JSONB NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS ai_summary JSONB,
  ADD COLUMN IF NOT EXISTS ai_status_assessment JSONB;

CREATE INDEX IF NOT EXISTS idx_projects_ai_summary
  ON projects(tenant_id)
  WHERE ai_summary IS NOT NULL;

COMMENT ON COLUMN opportunities.requirements IS 'AI-parsed structured requirements from brief_parse';
COMMENT ON COLUMN projects.requirements IS 'Structured project requirements gathered at kickoff';
COMMENT ON COLUMN projects.ai_summary IS 'Latest AI-generated project status summary';
COMMENT ON COLUMN projects.ai_status_assessment IS 'Latest AI risk/status assessment';
