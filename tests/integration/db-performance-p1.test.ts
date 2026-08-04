import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const ROOT = process.cwd()

function read(path: string) {
  return readFileSync(join(ROOT, path), 'utf8')
}

describe('Migration 035 — database performance P1', () => {
  const sql = read('supabase/migrations/035_db_performance_p1.sql')

  it('enables pg_trgm for text search indexes', () => {
    expect(sql).toContain('CREATE EXTENSION IF NOT EXISTS pg_trgm')
  })

  it('adds payments indexes for revenue analytics', () => {
    expect(sql).toContain('idx_payments_tenant_status_created')
    expect(sql).toContain('idx_payments_paid_at')
    expect(sql).toMatch(/payments \(tenant_id, status, created_at\)/)
  })

  it('adds domain_events retry dispatch index', () => {
    expect(sql).toContain('idx_domain_events_status_scheduled')
    expect(sql).toMatch(/status IN \('pending', 'failed'\)/)
  })

  it('adds whatsapp_messages tenant and phone indexes', () => {
    expect(sql).toContain('idx_whatsapp_messages_tenant_created')
    expect(sql).toContain('idx_whatsapp_messages_phone_tenant')
  })

  it('adds opportunity_recipients pending lookup index', () => {
    expect(sql).toContain('idx_opp_recipients_freelancer_pending')
    expect(sql).toMatch(/response = 'pending'/)
  })

  it('adds workflow_jobs dead_letter index', () => {
    expect(sql).toContain('idx_workflow_jobs_dead_letter')
    expect(sql).toMatch(/status = 'dead_letter'/)
  })

  it('adds crm_audit_logs entity lookup index', () => {
    expect(sql).toContain('idx_crm_audit_entity')
    expect(sql).toMatch(/entity_type, entity_id/)
  })

  it('adds activity_logs action filter index', () => {
    expect(sql).toContain('idx_activity_logs_tenant_action_created')
  })

  it('adds companies name search indexes', () => {
    expect(sql).toContain('idx_companies_tenant_lower_name')
    expect(sql).toContain('idx_companies_name_trgm')
  })

  it('adds freelancers search indexes', () => {
    expect(sql).toContain('idx_freelancers_name_trgm')
    expect(sql).toContain('idx_freelancers_search_tsvector')
  })

  it('adds projects freelancer dashboard index', () => {
    expect(sql).toContain('idx_projects_freelancer_status_active')
  })

  it('adds milestones overdue cron composite index', () => {
    expect(sql).toContain('idx_milestones_status_due_open')
    expect(sql).toMatch(/status, due_date/)
  })

  it('documents CONCURRENTLY production runbook', () => {
    expect(sql).toContain('CREATE INDEX CONCURRENTLY')
  })

  it('adds analytics snapshot refresh function', () => {
    expect(sql).toContain('refresh_analytics_tenant_snapshots')
    expect(sql).toContain('analytics_cache_snapshots')
  })

  it('allows service_role on analytics RPCs for cron refresh', () => {
    expect(sql).toContain("auth.role() = 'service_role'")
  })
})

describe('Analytics snapshot cron', () => {
  it('registers cron route with auth cron', () => {
    const src = read('app/api/cron/analytics-snapshot/route.ts')
    expect(src).toContain("auth: 'cron'")
    expect(src).toContain('refreshAllSnapshots')
  })

  it('schedules analytics snapshot in vercel.json', () => {
    const config = read('vercel.json')
    expect(config).toContain('/api/cron/analytics-snapshot')
    expect(config).toContain('*/15 * * * *')
  })
})

describe('Analytics repository performance hooks', () => {
  it('logs slow RPCs above threshold', () => {
    const src = read('lib/repositories/analytics-module.repository.ts')
    expect(src).toContain('ANALYTICS_SLOW_RPC_MS')
    expect(src).toContain('[analytics] slow RPC')
  })

  it('reads persisted cache snapshots before RPC', () => {
    const src = read('lib/repositories/analytics-module.repository.ts')
    expect(src).toContain('getPersistedSnapshot')
    expect(src).toContain('analytics_cache_snapshots')
  })

  it('exposes refreshAllSnapshots on module service', () => {
    const src = read('lib/services/analytics-module.service.ts')
    expect(src).toContain('refreshAllSnapshots')
    expect(src).toContain('refreshTenantSnapshots')
  })
})

describe('Assignment conflict indexes preserved', () => {
  it('keeps opportunity allocation index from P0 migration', () => {
    expect(read('supabase/migrations/032_db_integrity_p0.sql')).toContain(
      'idx_assignment_allocations_opportunity'
    )
  })
})
