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
        role: 'admin' | 'talent_manager' | 'freelancer' | 'client'
        status: 'invited' | 'active' | 'suspended'
        invited_at: string | null
        joined_at: string | null
        company_id: string | null
        created_at: string
      }>
      companies: TableDef<{
        id: string
        tenant_id: string
        name: string
        slug: string
        logo_url: string | null
        contact_email: string | null
        contact_name: string | null
        website: string | null
        notes: string | null
        created_at: string
        updated_at: string
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
        company_id: string | null
        deadline: string | null
        response_deadline: string | null
        status: string
        requirements: Record<string, unknown>
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
        company_id: string | null
        budget: number | null
        currency: string
        status: string
        requirements: Record<string, unknown>
        ai_summary: Record<string, unknown> | null
        ai_status_assessment: Record<string, unknown> | null
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
      workflow_runs: TableDef<{
        id: string
        tenant_id: string
        workflow_id: string
        trigger_event_id: string | null
        trigger_event_type: string
        status: string
        context: Json
        current_step_id: string | null
        correlation_id: string
        started_at: string | null
        completed_at: string | null
        last_error: string | null
        created_at: string
      }>
      workflow_jobs: TableDef<{
        id: string
        tenant_id: string
        run_id: string
        step_id: string
        queue_name: string
        action_type: string
        config: Json
        status: string
        retry_count: number
        max_retries: number
        last_error: string | null
        scheduled_at: string
        started_at: string | null
        completed_at: string | null
        created_at: string
      }>
      approval_requests: TableDef<{
        id: string
        tenant_id: string
        run_id: string
        job_id: string
        approver_id: string | null
        approver_role: string | null
        status: string
        title: string
        body: string | null
        entity_type: string | null
        entity_id: string | null
        metadata: Json
        expires_at: string | null
        decided_at: string | null
        decided_by: string | null
        decision_note: string | null
        created_at: string
      }>
      whatsapp_conversations: TableDef<{
        id: string
        tenant_id: string
        freelancer_id: string
        phone: string
        active_intent: string | null
        active_entity_type: string | null
        active_entity_id: string | null
        context: Json
        last_message_at: string
        created_at: string
        updated_at: string
      }>
      knowledge_entries: TableDef<{
        id: string
        tenant_id: string
        category:
          | 'meeting_note'
          | 'sop'
          | 'client_preference'
          | 'project_history'
          | 'deliverable'
          | 'feedback'
          | 'document'
        title: string
        content: string | null
        summary: string | null
        entity_type: string | null
        entity_id: string | null
        company_id: string | null
        project_id: string | null
        opportunity_id: string | null
        freelancer_id: string | null
        milestone_id: string | null
        storage_bucket: string | null
        storage_path: string | null
        mime_type: string | null
        file_size_bytes: number | null
        tags: string[]
        metadata: Json
        embedding_status: 'pending' | 'processing' | 'indexed' | 'failed' | 'skipped'
        created_by: string | null
        updated_by: string | null
        created_at: string
        updated_at: string
      }>
      knowledge_embeddings: TableDef<{
        id: string
        tenant_id: string
        entry_id: string
        chunk_index: number
        content: string
        token_count: number | null
        embedding: string | null
        model: string | null
        model_version: string | null
        metadata: Json
        created_at: string
      }>
      agent_configs: TableDef<{
        id: string
        tenant_id: string
        agent_id:
          | 'recruiter'
          | 'project_manager'
          | 'finance'
          | 'qa'
          | 'executive'
          | 'knowledge'
        enabled: boolean
        instruction_prompt_id: string
        instruction_version: string | null
        allowed_tools: string[]
        required_permissions: string[]
        memory_policy: Json
        model_override: string | null
        metadata: Json
        created_at: string
        updated_at: string
      }>
      agent_instruction_versions: TableDef<{
        id: string
        tenant_id: string | null
        agent_id:
          | 'recruiter'
          | 'project_manager'
          | 'finance'
          | 'qa'
          | 'executive'
          | 'knowledge'
        prompt_id: string
        version: string
        content: string
        active: boolean
        created_by: string | null
        created_at: string
      }>
      agent_sessions: TableDef<{
        id: string
        tenant_id: string
        agent_id:
          | 'recruiter'
          | 'project_manager'
          | 'finance'
          | 'qa'
          | 'executive'
          | 'knowledge'
        user_id: string | null
        entity_type: string | null
        entity_id: string | null
        status: 'active' | 'completed' | 'failed'
        context: Json
        correlation_id: string | null
        created_at: string
        updated_at: string
        completed_at: string | null
      }>
      agent_memory_entries: TableDef<{
        id: string
        tenant_id: string
        agent_id:
          | 'recruiter'
          | 'project_manager'
          | 'finance'
          | 'qa'
          | 'executive'
          | 'knowledge'
        session_id: string | null
        scope: 'session' | 'entity' | 'tenant'
        entity_type: string | null
        entity_id: string | null
        memory_key: string
        content: string
        metadata: Json
        expires_at: string | null
        created_at: string
        updated_at: string
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
      freelancer_portfolio_items: TableDef<{
        id: string
        tenant_id: string
        freelancer_id: string
        title: string
        description: string | null
        project_url: string | null
        image_path: string | null
        sort_order: number
        created_at: string
        updated_at: string
      }>
      freelancer_rating_history: TableDef<{
        id: string
        tenant_id: string
        freelancer_id: string
        rated_by: string
        rating: number
        note: string | null
        created_at: string
      }>
      shortlists: TableDef<{
        id: string
        tenant_id: string
        opportunity_id: string
        created_by: string
        status: string
        created_at: string
        updated_at: string
      }>
      shortlist_items: TableDef<{
        id: string
        shortlist_id: string
        freelancer_id: string
        tenant_id: string
        rank: number
        notes: string | null
        status: string
        rejection_reason: string | null
        created_at: string
        updated_at: string
      }>
      activity_logs: TableDef<{
        id: string
        tenant_id: string
        actor_id: string | null
        entity_type: string
        entity_id: string
        action: string
        metadata: Json
        created_at: string
      }>
      member_invites: TableDef<{
        id: string
        tenant_id: string
        email: string
        role: string
        expires_at: string
        created_at: string
        accepted_at: string | null
        revoked_at: string | null
      }>
      integration_configs: TableDef<{
        id: string
        tenant_id: string
        provider: string
        config: Json
        is_active: boolean
        created_at: string
        updated_at: string
      }>
      webhook_deliveries: TableDef<{
        id: string
        tenant_id: string | null
        source: string
        idempotency_key: string
        correlation_id: string | null
        event_type: string | null
        payload: Json
        status: string
        error_message: string | null
        processed_at: string | null
        created_at: string
      }>
      whatsapp_messages: TableDef<{
        id: string
        tenant_id: string
        freelancer_id: string
        direction: string
        wa_message_id: string
        phone: string
        body: string
        status: string
        entity_id: string | null
        created_at: string
      }>
      email_logs: TableDef<{
        id: string
        tenant_id: string
        to_email: string | null
        template_name: string | null
        subject: string | null
        status: string
        provider_id: string | null
        entity_type: string | null
        entity_id: string | null
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
      create_project_with_milestones: {
        Args: {
          p_tenant_id: string
          p_assigned_by: string
          p_freelancer_id: string
          p_title: string
          p_milestones: Json
          p_opportunity_id?: string | null
          p_shortlist_id?: string | null
          p_description?: string | null
          p_client_name?: string | null
          p_budget?: number | null
          p_currency?: string
          p_status?: string
        }
        Returns: string
      }
      search_freelancers: {
        Args: {
          p_tenant_id: string
          p_query?: string | null
          p_discipline?: string | null
          p_availability?: string | null
          p_min_rate?: number | null
          p_max_rate?: number | null
          p_min_rating?: number | null
          p_sort?: string | null
          p_limit?: number | null
          p_offset?: number | null
        }
        Returns: Tables<'freelancers'>[]
      }
      search_knowledge_entries: {
        Args: {
          p_tenant_id: string
          p_query: string
          p_categories?:
            | (
                | 'meeting_note'
                | 'sop'
                | 'client_preference'
                | 'project_history'
                | 'deliverable'
                | 'feedback'
                | 'document'
              )[]
            | null
          p_entity_type?: string | null
          p_entity_id?: string | null
          p_limit?: number
          p_offset?: number
        }
        Returns: Array<{
          id: string
          category:
            | 'meeting_note'
            | 'sop'
            | 'client_preference'
            | 'project_history'
            | 'deliverable'
            | 'feedback'
            | 'document'
          title: string
          summary: string | null
          content: string | null
          entity_type: string | null
          entity_id: string | null
          rank: number
        }>
      }
      search_knowledge_vector: {
        Args: {
          p_tenant_id: string
          p_query_embedding: string
          p_categories?:
            | (
                | 'meeting_note'
                | 'sop'
                | 'client_preference'
                | 'project_history'
                | 'deliverable'
                | 'feedback'
                | 'document'
              )[]
            | null
          p_limit?: number
        }
        Returns: Array<{
          entry_id: string
          chunk_id: string
          category:
            | 'meeting_note'
            | 'sop'
            | 'client_preference'
            | 'project_history'
            | 'deliverable'
            | 'feedback'
            | 'document'
          title: string
          chunk_content: string
          similarity: number
        }>
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
