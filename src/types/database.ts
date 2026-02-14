export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      companies: {
        Row: {
          admin_notes: string | null
          created_at: string
          id: string
          industry: string | null
          name: string
          size: string | null
          stripe_customer_id: string | null
          updated_at: string
          website: string | null
        }
        Insert: {
          admin_notes?: string | null
          created_at?: string
          id?: string
          industry?: string | null
          name: string
          size?: string | null
          stripe_customer_id?: string | null
          updated_at?: string
          website?: string | null
        }
        Update: {
          admin_notes?: string | null
          created_at?: string
          id?: string
          industry?: string | null
          name?: string
          size?: string | null
          stripe_customer_id?: string | null
          updated_at?: string
          website?: string | null
        }
        Relationships: []
      }
      company_contacts: {
        Row: {
          company_id: string
          created_at: string
          id: string
          is_primary: boolean
          profile_id: string
          role_at_company: string | null
        }
        Insert: {
          company_id: string
          created_at?: string
          id?: string
          is_primary?: boolean
          profile_id: string
          role_at_company?: string | null
        }
        Update: {
          company_id?: string
          created_at?: string
          id?: string
          is_primary?: boolean
          profile_id?: string
          role_at_company?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "company_contacts_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "company_contacts_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      developers: {
        Row: {
          admin_notes: string | null
          api_experience: string[] | null
          buying_influence:
            | Database["public"]["Enums"]["buying_influence_level"]
            | null
          cicd_tools: string[] | null
          city: string | null
          cloud_platforms: string[] | null
          company_size: Database["public"]["Enums"]["company_size"] | null
          country: string | null
          created_at: string
          current_company: string | null
          databases: string[] | null
          devops_tools: string[] | null
          folk_group_id: string | null
          folk_person_id: string | null
          frameworks: string[] | null
          github_url: string | null
          id: string
          import_source: string | null
          imported: boolean
          industries: string[] | null
          is_available: boolean
          job_title: string | null
          languages: string[] | null
          last_enriched_at: string | null
          linkedin_url: string | null
          sixtyfour_task_id: string | null
          open_source_activity:
            | Database["public"]["Enums"]["oss_activity"]
            | null
          operating_systems: string[] | null
          other_links: string[] | null
          paid_tools: string[] | null
          paypal_email: string | null
          personal_email: string | null
          preferred_eval_times: string[] | null
          profile_complete: boolean
          profile_id: string
          quality_rating: number | null
          response_rate: number | null
          role_types: string[] | null
          seniority: Database["public"]["Enums"]["seniority_level"] | null
          state_region: string | null
          team_size: number | null
          testing_frameworks: string[] | null
          timezone: string | null
          total_evaluations: number
          twitter_url: string | null
          updated_at: string
          website_url: string | null
          years_experience: number | null
        }
        Insert: {
          admin_notes?: string | null
          api_experience?: string[] | null
          buying_influence?:
            | Database["public"]["Enums"]["buying_influence_level"]
            | null
          cicd_tools?: string[] | null
          city?: string | null
          cloud_platforms?: string[] | null
          company_size?: Database["public"]["Enums"]["company_size"] | null
          country?: string | null
          created_at?: string
          current_company?: string | null
          databases?: string[] | null
          devops_tools?: string[] | null
          folk_group_id?: string | null
          folk_person_id?: string | null
          frameworks?: string[] | null
          github_url?: string | null
          id?: string
          import_source?: string | null
          imported?: boolean
          industries?: string[] | null
          is_available?: boolean
          job_title?: string | null
          languages?: string[] | null
          last_enriched_at?: string | null
          linkedin_url?: string | null
          sixtyfour_task_id?: string | null
          open_source_activity?:
            | Database["public"]["Enums"]["oss_activity"]
            | null
          operating_systems?: string[] | null
          other_links?: string[] | null
          paid_tools?: string[] | null
          paypal_email?: string | null
          personal_email?: string | null
          preferred_eval_times?: string[] | null
          profile_complete?: boolean
          profile_id: string
          quality_rating?: number | null
          response_rate?: number | null
          role_types?: string[] | null
          seniority?: Database["public"]["Enums"]["seniority_level"] | null
          state_region?: string | null
          team_size?: number | null
          testing_frameworks?: string[] | null
          timezone?: string | null
          total_evaluations?: number
          twitter_url?: string | null
          updated_at?: string
          website_url?: string | null
          years_experience?: number | null
        }
        Update: {
          admin_notes?: string | null
          api_experience?: string[] | null
          buying_influence?:
            | Database["public"]["Enums"]["buying_influence_level"]
            | null
          cicd_tools?: string[] | null
          city?: string | null
          cloud_platforms?: string[] | null
          company_size?: Database["public"]["Enums"]["company_size"] | null
          country?: string | null
          created_at?: string
          current_company?: string | null
          databases?: string[] | null
          devops_tools?: string[] | null
          folk_group_id?: string | null
          folk_person_id?: string | null
          frameworks?: string[] | null
          github_url?: string | null
          id?: string
          import_source?: string | null
          imported?: boolean
          industries?: string[] | null
          is_available?: boolean
          job_title?: string | null
          languages?: string[] | null
          last_enriched_at?: string | null
          linkedin_url?: string | null
          sixtyfour_task_id?: string | null
          open_source_activity?:
            | Database["public"]["Enums"]["oss_activity"]
            | null
          operating_systems?: string[] | null
          other_links?: string[] | null
          paid_tools?: string[] | null
          paypal_email?: string | null
          personal_email?: string | null
          preferred_eval_times?: string[] | null
          profile_complete?: boolean
          profile_id?: string
          quality_rating?: number | null
          response_rate?: number | null
          role_types?: string[] | null
          seniority?: Database["public"]["Enums"]["seniority_level"] | null
          state_region?: string | null
          team_size?: number | null
          testing_frameworks?: string[] | null
          timezone?: string | null
          total_evaluations?: number
          twitter_url?: string | null
          updated_at?: string
          website_url?: string | null
          years_experience?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "developers_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      evaluations: {
        Row: {
          admin_notes: string | null
          admin_quality_score: number | null
          admin_review_notes: string | null
          anonymous_descriptor: string | null
          clarityflow_conversation_id: string | null
          created_at: string
          developer_id: string
          id: string
          invitation_expires_at: string | null
          invited_at: string
          paid_at: string | null
          payout_amount: number | null
          payout_method: string | null
          payout_reference: string | null
          project_id: string
          recording_completed_at: string | null
          recording_deadline: string | null
          recording_embed_url: string | null
          responded_at: string | null
          reviewed_at: string | null
          status: Database["public"]["Enums"]["evaluation_status"]
          transcript: string | null
          updated_at: string
        }
        Insert: {
          admin_notes?: string | null
          admin_quality_score?: number | null
          admin_review_notes?: string | null
          anonymous_descriptor?: string | null
          clarityflow_conversation_id?: string | null
          created_at?: string
          developer_id: string
          id?: string
          invitation_expires_at?: string | null
          invited_at?: string
          paid_at?: string | null
          payout_amount?: number | null
          payout_method?: string | null
          payout_reference?: string | null
          project_id: string
          recording_completed_at?: string | null
          recording_deadline?: string | null
          recording_embed_url?: string | null
          responded_at?: string | null
          reviewed_at?: string | null
          status?: Database["public"]["Enums"]["evaluation_status"]
          transcript?: string | null
          updated_at?: string
        }
        Update: {
          admin_notes?: string | null
          admin_quality_score?: number | null
          admin_review_notes?: string | null
          anonymous_descriptor?: string | null
          clarityflow_conversation_id?: string | null
          created_at?: string
          developer_id?: string
          id?: string
          invitation_expires_at?: string | null
          invited_at?: string
          paid_at?: string | null
          payout_amount?: number | null
          payout_method?: string | null
          payout_reference?: string | null
          project_id?: string
          recording_completed_at?: string | null
          recording_deadline?: string | null
          recording_embed_url?: string | null
          responded_at?: string | null
          reviewed_at?: string | null
          status?: Database["public"]["Enums"]["evaluation_status"]
          transcript?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "evaluations_developer_id_fkey"
            columns: ["developer_id"]
            isOneToOne: false
            referencedRelation: "developers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "evaluations_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string
          full_name: string
          id: string
          role: Database["public"]["Enums"]["user_role"]
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email: string
          full_name: string
          id: string
          role: Database["public"]["Enums"]["user_role"]
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string
          full_name?: string
          id?: string
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string
        }
        Relationships: []
      }
      projects: {
        Row: {
          admin_notes: string | null
          company_id: string
          created_at: string
          created_by: string | null
          evaluation_scope: string | null
          findings_report: string | null
          goals: string[] | null
          icp_api_experience: string[] | null
          icp_buying_influence: string[] | null
          icp_cicd_tools: string[] | null
          icp_cloud_platforms: string[] | null
          icp_company_size_range: string[] | null
          icp_databases: string[] | null
          icp_devops_tools: string[] | null
          icp_frameworks: string[] | null
          icp_industries: string[] | null
          icp_languages: string[] | null
          icp_min_experience: number | null
          icp_open_source_activity: string[] | null
          icp_operating_systems: string[] | null
          icp_paid_tools: string[] | null
          icp_role_types: string[] | null
          icp_seniority_levels: string[] | null
          icp_team_size_range: string[] | null
          icp_testing_frameworks: string[] | null
          id: string
          num_evaluations: number
          paid_at: string | null
          preferred_timeline: string | null
          price_per_evaluation: number
          product_category: string | null
          product_description: string | null
          product_name: string
          product_url: string | null
          report_published: boolean
          report_published_at: string | null
          setup_instructions: string | null
          status: Database["public"]["Enums"]["project_status"]
          stripe_checkout_session_id: string | null
          stripe_payment_intent_id: string | null
          time_to_value_milestone: string | null
          total_price: number | null
          updated_at: string
        }
        Insert: {
          admin_notes?: string | null
          company_id: string
          created_at?: string
          created_by?: string | null
          evaluation_scope?: string | null
          findings_report?: string | null
          goals?: string[] | null
          icp_api_experience?: string[] | null
          icp_buying_influence?: string[] | null
          icp_cicd_tools?: string[] | null
          icp_cloud_platforms?: string[] | null
          icp_company_size_range?: string[] | null
          icp_databases?: string[] | null
          icp_devops_tools?: string[] | null
          icp_frameworks?: string[] | null
          icp_industries?: string[] | null
          icp_languages?: string[] | null
          icp_min_experience?: number | null
          icp_open_source_activity?: string[] | null
          icp_operating_systems?: string[] | null
          icp_paid_tools?: string[] | null
          icp_role_types?: string[] | null
          icp_seniority_levels?: string[] | null
          icp_team_size_range?: string[] | null
          icp_testing_frameworks?: string[] | null
          id?: string
          num_evaluations: number
          paid_at?: string | null
          preferred_timeline?: string | null
          price_per_evaluation?: number
          product_category?: string | null
          product_description?: string | null
          product_name: string
          product_url?: string | null
          report_published?: boolean
          report_published_at?: string | null
          setup_instructions?: string | null
          status?: Database["public"]["Enums"]["project_status"]
          stripe_checkout_session_id?: string | null
          stripe_payment_intent_id?: string | null
          time_to_value_milestone?: string | null
          total_price?: number | null
          updated_at?: string
        }
        Update: {
          admin_notes?: string | null
          company_id?: string
          created_at?: string
          created_by?: string
          evaluation_scope?: string | null
          findings_report?: string | null
          goals?: string[] | null
          icp_api_experience?: string[] | null
          icp_buying_influence?: string[] | null
          icp_cicd_tools?: string[] | null
          icp_cloud_platforms?: string[] | null
          icp_company_size_range?: string[] | null
          icp_databases?: string[] | null
          icp_devops_tools?: string[] | null
          icp_frameworks?: string[] | null
          icp_industries?: string[] | null
          icp_languages?: string[] | null
          icp_min_experience?: number | null
          icp_open_source_activity?: string[] | null
          icp_operating_systems?: string[] | null
          icp_paid_tools?: string[] | null
          icp_role_types?: string[] | null
          icp_seniority_levels?: string[] | null
          icp_team_size_range?: string[] | null
          icp_testing_frameworks?: string[] | null
          id?: string
          num_evaluations?: number
          paid_at?: string | null
          preferred_timeline?: string | null
          price_per_evaluation?: number
          product_category?: string | null
          product_description?: string | null
          product_name?: string
          product_url?: string | null
          report_published?: boolean
          report_published_at?: string | null
          setup_instructions?: string | null
          status?: Database["public"]["Enums"]["project_status"]
          stripe_checkout_session_id?: string | null
          stripe_payment_intent_id?: string | null
          time_to_value_milestone?: string | null
          total_price?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "projects_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "projects_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "company_contacts"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      company_evaluations_view: {
        Row: {
          anonymous_descriptor: string | null
          id: string | null
          project_id: string | null
          recording_completed_at: string | null
          recording_embed_url: string | null
          status: Database["public"]["Enums"]["evaluation_status"] | null
          transcript: string | null
        }
        Insert: {
          anonymous_descriptor?: string | null
          id?: string | null
          project_id?: string | null
          recording_completed_at?: string | null
          recording_embed_url?: string | null
          status?: Database["public"]["Enums"]["evaluation_status"] | null
          transcript?: string | null
        }
        Update: {
          anonymous_descriptor?: string | null
          id?: string | null
          project_id?: string | null
          recording_completed_at?: string | null
          recording_embed_url?: string | null
          status?: Database["public"]["Enums"]["evaluation_status"] | null
          transcript?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "evaluations_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      developer_evaluations_view: {
        Row: {
          clarityflow_conversation_id: string | null
          evaluation_scope: string | null
          goals: string[] | null
          id: string | null
          invitation_expires_at: string | null
          invited_at: string | null
          paid_at: string | null
          payout_amount: number | null
          product_description: string | null
          product_name: string | null
          project_id: string | null
          recording_deadline: string | null
          setup_instructions: string | null
          status: Database["public"]["Enums"]["evaluation_status"] | null
          time_to_value_milestone: string | null
        }
        Relationships: [
          {
            foreignKeyName: "evaluations_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      user_role: {
        Args: never
        Returns: Database["public"]["Enums"]["user_role"]
      }
    }
    Enums: {
      buying_influence_level:
        | "individual_contributor"
        | "team_influencer"
        | "decision_maker"
        | "budget_holder"
      company_size:
        | "1-10"
        | "11-50"
        | "51-200"
        | "201-1000"
        | "1001-5000"
        | "5000+"
      evaluation_status:
        | "invited"
        | "accepted"
        | "declined"
        | "expired"
        | "recording"
        | "submitted"
        | "in_review"
        | "approved"
        | "rejected"
        | "paid"
      oss_activity: "none" | "occasional" | "regular" | "maintainer"
      project_status:
        | "draft"
        | "pending_payment"
        | "paid"
        | "matching"
        | "in_progress"
        | "evaluations_complete"
        | "report_drafting"
        | "delivered"
        | "closed"
      seniority_level: "early_career" | "senior" | "leadership"
      user_role: "developer" | "company" | "admin"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      buying_influence_level: [
        "individual_contributor",
        "team_influencer",
        "decision_maker",
        "budget_holder",
      ],
      company_size: [
        "1-10",
        "11-50",
        "51-200",
        "201-1000",
        "1001-5000",
        "5000+",
      ],
      evaluation_status: [
        "invited",
        "accepted",
        "declined",
        "expired",
        "recording",
        "submitted",
        "in_review",
        "approved",
        "rejected",
        "paid",
      ],
      oss_activity: ["none", "occasional", "regular", "maintainer"],
      project_status: [
        "draft",
        "pending_payment",
        "paid",
        "matching",
        "in_progress",
        "evaluations_complete",
        "report_drafting",
        "delivered",
        "closed",
      ],
      seniority_level: [
        "early_career",
        "senior",
        "leadership",
      ],
      user_role: ["developer", "company", "admin"],
    },
  },
} as const
