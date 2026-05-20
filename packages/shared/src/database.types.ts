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
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
      activity_log: {
        Row: {
          created_at: string
          email: string | null
          event_type: string
          id: number
          metadata: Json | null
          profile_id: string | null
        }
        Insert: {
          created_at?: string
          email?: string | null
          event_type: string
          id?: number
          metadata?: Json | null
          profile_id?: string | null
        }
        Update: {
          created_at?: string
          email?: string | null
          event_type?: string
          id?: number
          metadata?: Json | null
          profile_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "activity_log_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      calendar_connections: {
        Row: {
          access_token: string | null
          caldav_url: string | null
          created_at: string
          enabled: boolean
          google_calendar_id: string | null
          google_channel_expiry: string | null
          google_channel_id: string | null
          google_resource_id: string | null
          google_sync_token: string | null
          id: string
          last_synced_at: string | null
          profile_id: string
          provider: string
          refresh_token: string | null
          sync_error: string | null
          sync_status: string
          token_expires_at: string | null
          updated_at: string
        }
        Insert: {
          access_token?: string | null
          caldav_url?: string | null
          created_at?: string
          enabled?: boolean
          google_calendar_id?: string | null
          google_channel_expiry?: string | null
          google_channel_id?: string | null
          google_resource_id?: string | null
          google_sync_token?: string | null
          id?: string
          last_synced_at?: string | null
          profile_id: string
          provider: string
          refresh_token?: string | null
          sync_error?: string | null
          sync_status?: string
          token_expires_at?: string | null
          updated_at?: string
        }
        Update: {
          access_token?: string | null
          caldav_url?: string | null
          created_at?: string
          enabled?: boolean
          google_calendar_id?: string | null
          google_channel_expiry?: string | null
          google_channel_id?: string | null
          google_resource_id?: string | null
          google_sync_token?: string | null
          id?: string
          last_synced_at?: string | null
          profile_id?: string
          provider?: string
          refresh_token?: string | null
          sync_error?: string | null
          sync_status?: string
          token_expires_at?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "calendar_connections_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      calendar_events: {
        Row: {
          all_day: boolean
          assigned_member: string | null
          color: string | null
          created_at: string
          deleted_at: string | null
          description: string | null
          end_time: string
          external_calendar_id: string | null
          external_etag: string | null
          external_id: string | null
          external_source: string
          household_id: string | null
          id: string
          is_kid_event: boolean
          is_shared: boolean
          last_synced_at: string | null
          location: string | null
          owner_parent_id: string
          profile_id: string
          recurrence_rule: string | null
          start_time: string
          sync_status: string
          title: string
          updated_at: string
          visibility: string
        }
        Insert: {
          all_day?: boolean
          assigned_member?: string | null
          color?: string | null
          created_at?: string
          deleted_at?: string | null
          description?: string | null
          end_time: string
          external_calendar_id?: string | null
          external_etag?: string | null
          external_id?: string | null
          external_source?: string
          household_id?: string | null
          id?: string
          is_kid_event?: boolean
          is_shared?: boolean
          last_synced_at?: string | null
          location?: string | null
          owner_parent_id: string
          profile_id: string
          recurrence_rule?: string | null
          start_time: string
          sync_status?: string
          title: string
          updated_at?: string
          visibility?: string
        }
        Update: {
          all_day?: boolean
          assigned_member?: string | null
          color?: string | null
          created_at?: string
          deleted_at?: string | null
          description?: string | null
          end_time?: string
          external_calendar_id?: string | null
          external_etag?: string | null
          external_id?: string | null
          external_source?: string
          household_id?: string | null
          id?: string
          is_kid_event?: boolean
          is_shared?: boolean
          last_synced_at?: string | null
          location?: string | null
          owner_parent_id?: string
          profile_id?: string
          recurrence_rule?: string | null
          start_time?: string
          sync_status?: string
          title?: string
          updated_at?: string
          visibility?: string
        }
        Relationships: [
          {
            foreignKeyName: "calendar_events_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "calendar_events_owner_parent_id_fkey"
            columns: ["owner_parent_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "calendar_events_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_threads: {
        Row: {
          created_at: string
          household_id: string | null
          id: string
          is_private: boolean
          profile_id: string
          thread_type: string
          title: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          household_id?: string | null
          id?: string
          is_private?: boolean
          profile_id: string
          thread_type?: string
          title?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          household_id?: string | null
          id?: string
          is_private?: boolean
          profile_id?: string
          thread_type?: string
          title?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_threads_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_threads_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      conversations: {
        Row: {
          content: string
          created_at: string
          id: string
          is_private: boolean
          profile_id: string
          role: string
          thread_id: string | null
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          is_private?: boolean
          profile_id: string
          role: string
          thread_id?: string | null
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          is_private?: boolean
          profile_id?: string
          role?: string
          thread_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "conversations_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversations_thread_id_fkey"
            columns: ["thread_id"]
            isOneToOne: false
            referencedRelation: "chat_threads"
            referencedColumns: ["id"]
          },
        ]
      }
      coordination_issues: {
        Row: {
          acknowledged_at: string | null
          alert_sms_sent_at: string | null
          content: string
          created_at: string
          event_window_end: string | null
          event_window_start: string | null
          household_id: string
          id: string
          last_escalation_tier: string | null
          resolved_at: string | null
          severity: string | null
          state: string
          surfaced_at: string
          trigger_type: string
          updated_at: string
        }
        Insert: {
          acknowledged_at?: string | null
          alert_sms_sent_at?: string | null
          content: string
          created_at?: string
          event_window_end?: string | null
          event_window_start?: string | null
          household_id: string
          id?: string
          last_escalation_tier?: string | null
          resolved_at?: string | null
          severity?: string | null
          state?: string
          surfaced_at?: string
          trigger_type: string
          updated_at?: string
        }
        Update: {
          acknowledged_at?: string | null
          alert_sms_sent_at?: string | null
          content?: string
          created_at?: string
          event_window_end?: string | null
          event_window_start?: string | null
          household_id?: string
          id?: string
          last_escalation_tier?: string | null
          resolved_at?: string | null
          severity?: string | null
          state?: string
          surfaced_at?: string
          trigger_type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "coordination_issues_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      family_members: {
        Row: {
          age: number | null
          confidence: number
          created_at: string
          household_id: string | null
          id: string
          member_type: string
          name: string
          notes: string | null
          profile_id: string
          relationship: string | null
          source_conversation_id: string | null
          updated_at: string
        }
        Insert: {
          age?: number | null
          confidence?: number
          created_at?: string
          household_id?: string | null
          id?: string
          member_type: string
          name: string
          notes?: string | null
          profile_id: string
          relationship?: string | null
          source_conversation_id?: string | null
          updated_at?: string
        }
        Update: {
          age?: number | null
          confidence?: number
          created_at?: string
          household_id?: string | null
          id?: string
          member_type?: string
          name?: string
          notes?: string | null
          profile_id?: string
          relationship?: string | null
          source_conversation_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "family_members_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "family_members_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "family_members_source_conversation_id_fkey"
            columns: ["source_conversation_id"]
            isOneToOne: false
            referencedRelation: "sms_conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      family_preferences: {
        Row: {
          confidence: number
          created_at: string
          family_member_id: string | null
          household_id: string
          id: string
          label: string
          observation_count: number
          preference_type: string
          sentiment: string
          source_conversation_id: string | null
          updated_at: string
          value: string
        }
        Insert: {
          confidence?: number
          created_at?: string
          family_member_id?: string | null
          household_id: string
          id?: string
          label: string
          observation_count?: number
          preference_type: string
          sentiment?: string
          source_conversation_id?: string | null
          updated_at?: string
          value: string
        }
        Update: {
          confidence?: number
          created_at?: string
          family_member_id?: string | null
          household_id?: string
          id?: string
          label?: string
          observation_count?: number
          preference_type?: string
          sentiment?: string
          source_conversation_id?: string | null
          updated_at?: string
          value?: string
        }
        Relationships: [
          {
            foreignKeyName: "family_preferences_family_member_id_fkey"
            columns: ["family_member_id"]
            isOneToOne: false
            referencedRelation: "family_members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "family_preferences_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "family_preferences_source_conversation_id_fkey"
            columns: ["source_conversation_id"]
            isOneToOne: false
            referencedRelation: "sms_conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      family_routines: {
        Row: {
          active: boolean
          confidence: number
          created_at: string
          days_of_week: string[]
          description: string | null
          end_time: string | null
          family_member_id: string | null
          household_id: string
          id: string
          location: string | null
          observation_count: number
          routine_type: string
          source_conversation_id: string | null
          start_time: string | null
          title: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          confidence?: number
          created_at?: string
          days_of_week?: string[]
          description?: string | null
          end_time?: string | null
          family_member_id?: string | null
          household_id: string
          id?: string
          location?: string | null
          observation_count?: number
          routine_type: string
          source_conversation_id?: string | null
          start_time?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          confidence?: number
          created_at?: string
          days_of_week?: string[]
          description?: string | null
          end_time?: string | null
          family_member_id?: string | null
          household_id?: string
          id?: string
          location?: string | null
          observation_count?: number
          routine_type?: string
          source_conversation_id?: string | null
          start_time?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "family_routines_family_member_id_fkey"
            columns: ["family_member_id"]
            isOneToOne: false
            referencedRelation: "family_members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "family_routines_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "family_routines_source_conversation_id_fkey"
            columns: ["source_conversation_id"]
            isOneToOne: false
            referencedRelation: "sms_conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      household_context: {
        Row: {
          category: string
          confidence: number
          created_at: string
          fact_key: string
          fact_value: string
          household_id: string
          id: string
          observation_count: number
          source_conversation_id: string | null
          updated_at: string
        }
        Insert: {
          category?: string
          confidence?: number
          created_at?: string
          fact_key: string
          fact_value: string
          household_id: string
          id?: string
          observation_count?: number
          source_conversation_id?: string | null
          updated_at?: string
        }
        Update: {
          category?: string
          confidence?: number
          created_at?: string
          fact_key?: string
          fact_value?: string
          household_id?: string
          id?: string
          observation_count?: number
          source_conversation_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "household_context_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "household_context_source_conversation_id_fkey"
            columns: ["source_conversation_id"]
            isOneToOne: false
            referencedRelation: "sms_conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      household_invites: {
        Row: {
          accepted: boolean
          accepted_at: string | null
          accepted_by_profile_id: string | null
          created_at: string
          expires_at: string
          id: string
          invite_code: string
          invitee_email: string
          inviter_profile_id: string
        }
        Insert: {
          accepted?: boolean
          accepted_at?: string | null
          accepted_by_profile_id?: string | null
          created_at?: string
          expires_at?: string
          id?: string
          invite_code: string
          invitee_email: string
          inviter_profile_id: string
        }
        Update: {
          accepted?: boolean
          accepted_at?: string | null
          accepted_by_profile_id?: string | null
          created_at?: string
          expires_at?: string
          id?: string
          invite_code?: string
          invitee_email?: string
          inviter_profile_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "household_invites_accepted_by_profile_id_fkey"
            columns: ["accepted_by_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "household_invites_inviter_profile_id_fkey"
            columns: ["inviter_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      kin_check_ins: {
        Row: {
          check_in_date: string
          content: string
          created_at: string
          dismissed: boolean
          household_id: string | null
          id: string
          profile_id: string
          prompt: string | null
        }
        Insert: {
          check_in_date?: string
          content: string
          created_at?: string
          dismissed?: boolean
          household_id?: string | null
          id?: string
          profile_id: string
          prompt?: string | null
        }
        Update: {
          check_in_date?: string
          content?: string
          created_at?: string
          dismissed?: boolean
          household_id?: string | null
          id?: string
          profile_id?: string
          prompt?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "kin_check_ins_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "kin_check_ins_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      morning_briefing_log: {
        Row: {
          briefing_date: string
          category: string | null
          id: string
          insight_key: string
          insight_summary: string
          surfaced_at: string
        }
        Insert: {
          briefing_date?: string
          category?: string | null
          id?: string
          insight_key: string
          insight_summary: string
          surfaced_at?: string
        }
        Update: {
          briefing_date?: string
          category?: string | null
          id?: string
          insight_key?: string
          insight_summary?: string
          surfaced_at?: string
        }
        Relationships: []
      }
      morning_briefings: {
        Row: {
          briefing_date: string
          content: string
          created_at: string
          delivery_status: string
          id: string
          profile_id: string
          sent_at: string | null
        }
        Insert: {
          briefing_date?: string
          content: string
          created_at?: string
          delivery_status?: string
          id?: string
          profile_id: string
          sent_at?: string | null
        }
        Update: {
          briefing_date?: string
          content?: string
          created_at?: string
          delivery_status?: string
          id?: string
          profile_id?: string
          sent_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "morning_briefings_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      onboarding_preferences: {
        Row: {
          created_at: string
          dietary_preferences: string[] | null
          food_dislikes: string[] | null
          food_loves: string[] | null
          id: string
          profile_id: string
          updated_at: string
          weekly_grocery_budget: number | null
        }
        Insert: {
          created_at?: string
          dietary_preferences?: string[] | null
          food_dislikes?: string[] | null
          food_loves?: string[] | null
          id?: string
          profile_id: string
          updated_at?: string
          weekly_grocery_budget?: number | null
        }
        Update: {
          created_at?: string
          dietary_preferences?: string[] | null
          food_dislikes?: string[] | null
          food_loves?: string[] | null
          id?: string
          profile_id?: string
          updated_at?: string
          weekly_grocery_budget?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "onboarding_preferences_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          billing_exempt: boolean
          calendar_connect_token: string | null
          cancelled_at: string | null
          context_notes: string | null
          created_at: string
          data_deletion_at: string | null
          deletion_reminded: boolean | null
          email: string | null
          family_name: string | null
          first_name: string | null
          household_id: string | null
          household_type: string | null
          id: string
          last_name: string | null
          nudges_sent: Json
          onboarding_completed: boolean
          onboarding_step: number
          parent_role: string | null
          partner_phone_pending: string | null
          payment_email_sent_at: string | null
          phone_number: string | null
          referral_code: string | null
          referred_by: string | null
          sms_opted_out_at: string | null
          stripe_customer_id: string | null
          subscription_charge_count: number
          subscription_status: Database["public"]["Enums"]["subscription_status"]
          subscription_tier: string
          sunday_checkin_reply_at: string | null
          sunday_checkin_sent_at: string | null
          timezone: string
          today_screen_first_opened: string | null
          trial_day2_email_sent_at: string | null
          trial_day4_email_sent_at: string | null
          trial_day6_email_sent_at: string | null
          trial_ends_at: string | null
          trial_expiry_email_sent_at: string | null
          updated_at: string
          weekly_recap_sent_at: string | null
          welcome_email_sent_at: string | null
          welcome_sms_sent_at: string | null
        }
        Insert: {
          billing_exempt?: boolean
          calendar_connect_token?: string | null
          cancelled_at?: string | null
          context_notes?: string | null
          created_at?: string
          data_deletion_at?: string | null
          deletion_reminded?: boolean | null
          email?: string | null
          family_name?: string | null
          first_name?: string | null
          household_id?: string | null
          household_type?: string | null
          id: string
          last_name?: string | null
          nudges_sent?: Json
          onboarding_completed?: boolean
          onboarding_step?: number
          parent_role?: string | null
          partner_phone_pending?: string | null
          payment_email_sent_at?: string | null
          phone_number?: string | null
          referral_code?: string | null
          referred_by?: string | null
          sms_opted_out_at?: string | null
          stripe_customer_id?: string | null
          subscription_charge_count?: number
          subscription_status?: Database["public"]["Enums"]["subscription_status"]
          subscription_tier?: string
          sunday_checkin_reply_at?: string | null
          sunday_checkin_sent_at?: string | null
          timezone?: string
          today_screen_first_opened?: string | null
          trial_day2_email_sent_at?: string | null
          trial_day4_email_sent_at?: string | null
          trial_day6_email_sent_at?: string | null
          trial_ends_at?: string | null
          trial_expiry_email_sent_at?: string | null
          updated_at?: string
          weekly_recap_sent_at?: string | null
          welcome_email_sent_at?: string | null
          welcome_sms_sent_at?: string | null
        }
        Update: {
          billing_exempt?: boolean
          calendar_connect_token?: string | null
          cancelled_at?: string | null
          context_notes?: string | null
          created_at?: string
          data_deletion_at?: string | null
          deletion_reminded?: boolean | null
          email?: string | null
          family_name?: string | null
          first_name?: string | null
          household_id?: string | null
          household_type?: string | null
          id?: string
          last_name?: string | null
          nudges_sent?: Json
          onboarding_completed?: boolean
          onboarding_step?: number
          parent_role?: string | null
          partner_phone_pending?: string | null
          payment_email_sent_at?: string | null
          phone_number?: string | null
          referral_code?: string | null
          referred_by?: string | null
          sms_opted_out_at?: string | null
          stripe_customer_id?: string | null
          subscription_charge_count?: number
          subscription_status?: Database["public"]["Enums"]["subscription_status"]
          subscription_tier?: string
          sunday_checkin_reply_at?: string | null
          sunday_checkin_sent_at?: string | null
          timezone?: string
          today_screen_first_opened?: string | null
          trial_day2_email_sent_at?: string | null
          trial_day4_email_sent_at?: string | null
          trial_day6_email_sent_at?: string | null
          trial_ends_at?: string | null
          trial_expiry_email_sent_at?: string | null
          updated_at?: string
          weekly_recap_sent_at?: string | null
          welcome_email_sent_at?: string | null
          welcome_sms_sent_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_referred_by_fkey"
            columns: ["referred_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      push_tokens: {
        Row: {
          active: boolean
          created_at: string
          device_name: string | null
          id: string
          platform: string
          profile_id: string
          token: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          device_name?: string | null
          id?: string
          platform: string
          profile_id: string
          token: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          created_at?: string
          device_name?: string | null
          id?: string
          platform?: string
          profile_id?: string
          token?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "push_tokens_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      sms_approved_numbers: {
        Row: {
          approved_by: string | null
          created_at: string
          id: string
          note: string | null
          phone_number: string
        }
        Insert: {
          approved_by?: string | null
          created_at?: string
          id?: string
          note?: string | null
          phone_number: string
        }
        Update: {
          approved_by?: string | null
          created_at?: string
          id?: string
          note?: string | null
          phone_number?: string
        }
        Relationships: []
      }
      sms_conversations: {
        Row: {
          body: string
          direction: string
          from_number: string | null
          id: string
          profile_id: string | null
          sent_at: string
          to_number: string | null
        }
        Insert: {
          body: string
          direction: string
          from_number?: string | null
          id?: string
          profile_id?: string | null
          sent_at?: string
          to_number?: string | null
        }
        Update: {
          body?: string
          direction?: string
          from_number?: string | null
          id?: string
          profile_id?: string | null
          sent_at?: string
          to_number?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sms_conversations_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      sms_waitlist: {
        Row: {
          approved_at: string | null
          created_at: string
          first_message: string | null
          id: string
          last_texted_at: string
          message_count: number
          phone_number: string
        }
        Insert: {
          approved_at?: string | null
          created_at?: string
          first_message?: string | null
          id?: string
          last_texted_at?: string
          message_count?: number
          phone_number: string
        }
        Update: {
          approved_at?: string | null
          created_at?: string
          first_message?: string | null
          id?: string
          last_texted_at?: string
          message_count?: number
          phone_number?: string
        }
        Relationships: []
      }
      user_context_notes: {
        Row: {
          content: string
          created_at: string
          expires_at: string
          id: string
          profile_id: string
          source: string
        }
        Insert: {
          content: string
          created_at?: string
          expires_at?: string
          id?: string
          profile_id: string
          source?: string
        }
        Update: {
          content?: string
          created_at?: string
          expires_at?: string
          id?: string
          profile_id?: string
          source?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_context_notes_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      waitlist: {
        Row: {
          created_at: string
          email: string | null
          first_name: string | null
          id: string
          last_name: string | null
          name: string | null
          phone: string | null
          situation: string | null
          sms_consent: boolean
          sms_consent_at: string | null
          sms_consent_source: string | null
          sms_consent_text: string | null
          sms_opted_out_at: string | null
          source: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          first_name?: string | null
          id?: string
          last_name?: string | null
          name?: string | null
          phone?: string | null
          situation?: string | null
          sms_consent?: boolean
          sms_consent_at?: string | null
          sms_consent_source?: string | null
          sms_consent_text?: string | null
          sms_opted_out_at?: string | null
          source?: string
        }
        Update: {
          created_at?: string
          email?: string | null
          first_name?: string | null
          id?: string
          last_name?: string | null
          name?: string | null
          phone?: string | null
          situation?: string | null
          sms_consent?: boolean
          sms_consent_at?: string | null
          sms_consent_source?: string | null
          sms_consent_text?: string | null
          sms_opted_out_at?: string | null
          source?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      is_household_member: { Args: { hid: string }; Returns: boolean }
    }
    Enums: {
      subscription_status: "trial" | "active" | "past_due" | "canceled"
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
      subscription_status: ["trial", "active", "past_due", "canceled"],
    },
  },
} as const
