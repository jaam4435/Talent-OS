export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

type TableDef<Row> = {
  Row: Row
  Insert: Partial<Row>
  Update: Partial<Row>
  Relationships: []
}

export interface Database {
  public: {
    Tables: {
      tenants: TableDef<{
        id: string
        name: string
        slug: string
        logo_url: string | null
        timezone: string
        currency: string
        settings: Json
        subscription_status: string
        trial_ends_at: string | null
        created_at: string
        updated_at: string
      }>
      profiles: TableDef<{
        id: string
        email: string
        full_name: string | null
        avatar_url: string | null
        phone: string | null
        created_at: string
        updated_at: string
      }>
      tenant_members: TableDef<{
        id: string
        tenant_id: string
        user_id: string
        role: 'admin' | 'talent_manager' | 'freelancer'
        status: 'invited' | 'active' | 'suspended'
        invited_at: string | null
        joined_at: string | null
        created_at: string
      }>
      freelancers: TableDef<{
        id: string
        tenant_id: string
        user_id: string | null
        email: string
        full_name: string
        phone: string | null
        discipline: string
        skills: string[]
        day_rate: number | null
        currency: string
        bio: string | null
        portfolio_url: string | null
        availability: string
        internal_rating: number | null
        internal_notes: string | null
        tags: string[]
        metadata: Json
        last_active_at: string | null
        created_at: string
        updated_at: string
      }>
      opportunities: TableDef<{
        id: string
        tenant_id: string
        created_by: string
        title: string
        description: string | null
        budget: number | null
        currency: string
        required_skills: string[]
        discipline: string | null
        client_name: string | null
        deadline: string | null
        response_deadline: string | null
        status: string
        created_at: string
        updated_at: string
      }>
      opportunity_recipients: TableDef<{
        id: string
        opportunity_id: string
        freelancer_id: string
        tenant_id: string
        response: string
        response_note: string | null
        responded_at: string | null
        whatsapp_sent_at: string | null
        whatsapp_delivered: boolean
        created_at: string
      }>
      projects: TableDef<{
        id: string
        tenant_id: string
        opportunity_id: string | null
        shortlist_id: string | null
        freelancer_id: string
        assigned_by: string
        title: string
        description: string | null
        client_name: string | null
        budget: number | null
        currency: string
        status: string
        started_at: string | null
        completed_at: string | null
        created_at: string
        updated_at: string
      }>
      milestones: TableDef<{
        id: string
        project_id: string
        tenant_id: string
        title: string
        description: string | null
        amount: number
        due_date: string | null
        sort_order: number
        status: string
        submission_note: string | null
        submission_files: Json
        submitted_at: string | null
        reviewed_at: string | null
        reviewed_by: string | null
        review_note: string | null
        created_at: string
        updated_at: string
      }>
      payments: TableDef<{
        id: string
        tenant_id: string
        project_id: string
        milestone_id: string
        freelancer_id: string
        amount: number
        currency: string
        status: string
        approved_by: string | null
        approved_at: string | null
        paid_at: string | null
        payment_reference: string | null
        dispute_reason: string | null
        notes: string | null
        created_at: string
        updated_at: string
      }>
      notifications: TableDef<{
        id: string
        tenant_id: string
        user_id: string
        type: string
        title: string
        body: string | null
        data: Json
        read_at: string | null
        created_at: string
      }>
      domain_events: TableDef<{
        id: string
        tenant_id: string
        event_type: string
        aggregate_type: string
        aggregate_id: string
        idempotency_key: string
        correlation_id: string
        actor_id: string | null
        payload: Json
        status: string
        retry_count: number
        max_retries: number
        last_error: string | null
        scheduled_at: string
        created_at: string
        processed_at: string | null
      }>
      ai_requests: TableDef<{
        id: string
        tenant_id: string
        correlation_id: string | null
        provider: 'openai' | 'claude'
        model: string
        request_type: string
        entity_type: string | null
        entity_id: string | null
        prompt_hash: string | null
        input_tokens: number | null
        output_tokens: number | null
        estimated_cost: number | null
        status: string
        result: Json | null
        error_message: string | null
        duration_ms: number | null
        created_at: string
        completed_at: string | null
      }>
      talent_match_scores: TableDef<{
        id: string
        tenant_id: string
        opportunity_id: string
        freelancer_id: string
        ai_request_id: string | null
        score: number
        rationale: string | null
        skill_overlap: string[]
        rank: number | null
        created_at: string
      }>
    }
    Views: {
      v_dashboard_summary: TableDef<{
        tenant_id: string
        total_freelancers: number
        active_projects: number
        open_opportunities: number
        pending_payments: number
        pending_payments_amount: number
      }>
    }
    Functions: {
      create_tenant_with_admin: {
        Args: { p_name: string; p_slug: string; p_user_id: string }
        Returns: string
      }
      suggest_talent_for_opportunity: {
        Args: { p_opportunity_id: string }
        Returns: Array<{
          freelancer_id: string
          full_name: string
          discipline: string
          day_rate: number | null
          internal_rating: number | null
          skill_match_count: number
        }>
      }
      emit_domain_event: {
        Args: {
          p_tenant_id: string
          p_event_type: string
          p_aggregate_type: string
          p_aggregate_id: string
          p_idempotency_key: string
          p_payload?: Json
          p_actor_id?: string | null
          p_correlation_id?: string | null
          p_scheduled_at?: string
        }
        Returns: string
      }
      get_invite_preview: {
        Args: { p_token_hash: string }
        Returns: Array<{
          invite_id: string
          tenant_id: string
          tenant_name: string
          email: string
          role: string
          expires_at: string
          is_valid: boolean
        }>
      }
      accept_member_invite: {
        Args: { p_token_hash: string; p_user_id: string }
        Returns: string
      }
      revoke_member_invite: {
        Args: { p_invite_id: string; p_actor_id: string }
        Returns: void
      }
    }
    Enums: Record<string, never>
    CompositeTypes: Record<string, never>
  }
}

export type Tables<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Row']

export type Views<T extends keyof Database['public']['Views']> =
  Database['public']['Views'][T]['Row']
