/**
 * Supabase database types for Kin.
 *
 * Re-generate with:
 *   npm run gen:types
 *
 * This file is committed so the repo compiles without a live Supabase
 * connection. Run the script above after any schema migration to keep
 * it in sync.
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          email: string;
          family_name: string | null;
          first_name: string | null;
          household_type: "two-parent" | "single-parent" | "blended" | "other" | null;
          parent_role: "mom" | "dad" | "parent" | null;
          subscription_tier: "free" | "starter" | "family";
          trial_ends_at: string | null;
          subscription_charge_count: number;
          referral_code: string | null;
          referred_by: string | null;
          stripe_customer_id: string | null;
          onboarding_completed: boolean;
          household_id: string | null;
          cancelled_at: string | null;
          data_deletion_at: string | null;
          deletion_reminded: boolean | null;
          today_screen_first_opened: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          email: string;
          family_name?: string | null;
          first_name?: string | null;
          household_type?: "two-parent" | "single-parent" | "blended" | "other" | null;
          parent_role?: "mom" | "dad" | "parent" | null;
          subscription_tier?: "free" | "starter" | "family";
          trial_ends_at?: string | null;
          subscription_charge_count?: number;
          referral_code?: string | null;
          referred_by?: string | null;
          stripe_customer_id?: string | null;
          onboarding_completed?: boolean;
          household_id?: string | null;
          cancelled_at?: string | null;
          data_deletion_at?: string | null;
          deletion_reminded?: boolean | null;
          today_screen_first_opened?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          family_name?: string | null;
          first_name?: string | null;
          household_type?: "two-parent" | "single-parent" | "blended" | "other" | null;
          parent_role?: "mom" | "dad" | "parent" | null;
          subscription_tier?: "free" | "starter" | "family";
          trial_ends_at?: string | null;
          subscription_charge_count?: number;
          referral_code?: string | null;
          referred_by?: string | null;
          stripe_customer_id?: string | null;
          onboarding_completed?: boolean;
          household_id?: string | null;
          cancelled_at?: string | null;
          data_deletion_at?: string | null;
          deletion_reminded?: boolean | null;
          today_screen_first_opened?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "profiles_household_id_fkey";
            columns: ["household_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "profiles_referred_by_fkey";
            columns: ["referred_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      family_members: {
        Row: {
          id: string;
          profile_id: string;
          name: string;
          age: number | null;
          member_type: "adult" | "child" | "pet";
          created_at: string;
        };
        Insert: {
          id?: string;
          profile_id: string;
          name: string;
          age?: number | null;
          member_type: "adult" | "child" | "pet";
          created_at?: string;
        };
        Update: {
          id?: string;
          profile_id?: string;
          name?: string;
          age?: number | null;
          member_type?: "adult" | "child" | "pet";
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "family_members_profile_id_fkey";
            columns: ["profile_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      onboarding_preferences: {
        Row: {
          id: string;
          profile_id: string;
          weekly_grocery_budget: number | null;
          dietary_preferences: string[];
          food_loves: string[];
          food_dislikes: string[];
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          profile_id: string;
          weekly_grocery_budget?: number | null;
          dietary_preferences?: string[];
          food_loves?: string[];
          food_dislikes?: string[];
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          profile_id?: string;
          weekly_grocery_budget?: number | null;
          dietary_preferences?: string[];
          food_loves?: string[];
          food_dislikes?: string[];
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "onboarding_preferences_profile_id_fkey";
            columns: ["profile_id"];
            isOneToOne: true;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      conversations: {
        Row: {
          id: string;
          profile_id: string;
          role: "user" | "assistant";
          content: string;
          thread_id: string | null;
          is_private: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          profile_id: string;
          role: "user" | "assistant";
          content: string;
          thread_id?: string | null;
          is_private?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          profile_id?: string;
          role?: "user" | "assistant";
          content?: string;
          thread_id?: string | null;
          is_private?: boolean;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "conversations_profile_id_fkey";
            columns: ["profile_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "conversations_thread_id_fkey";
            columns: ["thread_id"];
            isOneToOne: false;
            referencedRelation: "chat_threads";
            referencedColumns: ["id"];
          },
        ];
      };
      chat_threads: {
        Row: {
          id: string;
          profile_id: string;
          household_id: string | null;
          title: string | null;
          thread_type: "personal" | "household" | "general";
          is_private: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          profile_id: string;
          household_id?: string | null;
          title?: string | null;
          thread_type?: "personal" | "household" | "general";
          is_private?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          profile_id?: string;
          household_id?: string | null;
          title?: string | null;
          thread_type?: "personal" | "household" | "general";
          is_private?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "chat_threads_profile_id_fkey";
            columns: ["profile_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "chat_threads_household_id_fkey";
            columns: ["household_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      saved_meals: {
        Row: {
          id: string;
          profile_id: string;
          meal_name: string;
          meal_type: "breakfast" | "lunch" | "dinner" | "snack";
          prep_time_minutes: number | null;
          calories: number | null;
          protein: number | null;
          carbs: number | null;
          fat: number | null;
          kid_friendly: boolean | null;
          description: string | null;
          recipe: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          profile_id: string;
          meal_name: string;
          meal_type: "breakfast" | "lunch" | "dinner" | "snack";
          prep_time_minutes?: number | null;
          calories?: number | null;
          protein?: number | null;
          carbs?: number | null;
          fat?: number | null;
          kid_friendly?: boolean | null;
          description?: string | null;
          recipe?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          profile_id?: string;
          meal_name?: string;
          meal_type?: "breakfast" | "lunch" | "dinner" | "snack";
          prep_time_minutes?: number | null;
          calories?: number | null;
          protein?: number | null;
          carbs?: number | null;
          fat?: number | null;
          kid_friendly?: boolean | null;
          description?: string | null;
          recipe?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "saved_meals_profile_id_fkey";
            columns: ["profile_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      meal_ratings: {
        Row: {
          id: string;
          profile_id: string;
          meal_name: string;
          rating: number;
          notes: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          profile_id: string;
          meal_name: string;
          rating: number;
          notes?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          profile_id?: string;
          meal_name?: string;
          rating?: number;
          notes?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "meal_ratings_profile_id_fkey";
            columns: ["profile_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      meal_plans: {
        Row: {
          id: string;
          profile_id: string;
          meal_options: Json;
          generated_at: string;
          week_start: string | null;
        };
        Insert: {
          id?: string;
          profile_id: string;
          meal_options: Json;
          generated_at?: string;
          week_start?: string | null;
        };
        Update: {
          id?: string;
          profile_id?: string;
          meal_options?: Json;
          generated_at?: string;
          week_start?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "meal_plans_profile_id_fkey";
            columns: ["profile_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      household_income: {
        Row: {
          id: string;
          profile_id: string;
          monthly_income: number;
          pay_frequency: "weekly" | "biweekly" | "monthly" | null;
          updated_at: string;
        };
        Insert: {
          id?: string;
          profile_id: string;
          monthly_income?: number;
          pay_frequency?: "weekly" | "biweekly" | "monthly" | null;
          updated_at?: string;
        };
        Update: {
          id?: string;
          profile_id?: string;
          monthly_income?: number;
          pay_frequency?: "weekly" | "biweekly" | "monthly" | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "household_income_profile_id_fkey";
            columns: ["profile_id"];
            isOneToOne: true;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      transactions: {
        Row: {
          id: string;
          profile_id: string;
          amount: number;
          category: string;
          bucket: "needs" | "wants" | "savings";
          description: string | null;
          date: string;
          budget_category_id: string | null;
          household_member: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          profile_id: string;
          amount: number;
          category: string;
          bucket: "needs" | "wants" | "savings";
          description?: string | null;
          date?: string;
          budget_category_id?: string | null;
          household_member?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          profile_id?: string;
          amount?: number;
          category?: string;
          bucket?: "needs" | "wants" | "savings";
          description?: string | null;
          date?: string;
          budget_category_id?: string | null;
          household_member?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "transactions_profile_id_fkey";
            columns: ["profile_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "transactions_budget_category_id_fkey";
            columns: ["budget_category_id"];
            isOneToOne: false;
            referencedRelation: "budget_categories";
            referencedColumns: ["id"];
          },
        ];
      };
      budget_categories: {
        Row: {
          id: string;
          profile_id: string;
          name: string;
          monthly_limit: number;
          color: string;
          sort_order: number;
          active: boolean;
          last_overspend_notified_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          profile_id: string;
          name: string;
          monthly_limit: number;
          color?: string;
          sort_order?: number;
          active?: boolean;
          last_overspend_notified_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          profile_id?: string;
          name?: string;
          monthly_limit?: number;
          color?: string;
          sort_order?: number;
          active?: boolean;
          last_overspend_notified_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "budget_categories_profile_id_fkey";
            columns: ["profile_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      referrals: {
        Row: {
          id: string;
          referrer_id: string;
          referred_user_id: string | null;
          status: "pending" | "trial" | "paid" | "rewarded";
          created_at: string;
          converted_at: string | null;
        };
        Insert: {
          id?: string;
          referrer_id: string;
          referred_user_id?: string | null;
          status?: "pending" | "trial" | "paid" | "rewarded";
          created_at?: string;
          converted_at?: string | null;
        };
        Update: {
          id?: string;
          referrer_id?: string;
          referred_user_id?: string | null;
          status?: "pending" | "trial" | "paid" | "rewarded";
          created_at?: string;
          converted_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "referrals_referrer_id_fkey";
            columns: ["referrer_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "referrals_referred_user_id_fkey";
            columns: ["referred_user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      referral_rewards: {
        Row: {
          id: string;
          profile_id: string;
          reward_type: "free_month" | "credit";
          amount: number;
          referral_id: string | null;
          applied_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          profile_id: string;
          reward_type: "free_month" | "credit";
          amount?: number;
          referral_id?: string | null;
          applied_at?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          profile_id?: string;
          reward_type?: "free_month" | "credit";
          amount?: number;
          referral_id?: string | null;
          applied_at?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "referral_rewards_profile_id_fkey";
            columns: ["profile_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "referral_rewards_referral_id_fkey";
            columns: ["referral_id"];
            isOneToOne: false;
            referencedRelation: "referrals";
            referencedColumns: ["id"];
          },
        ];
      };
      calendar_connections: {
        Row: {
          id: string;
          profile_id: string;
          provider: "google" | "apple";
          access_token: string | null;
          refresh_token: string | null;
          token_expires_at: string | null;
          caldav_url: string | null;
          google_calendar_id: string | null;
          google_sync_token: string | null;
          google_channel_id: string | null;
          google_channel_expiry: string | null;
          google_resource_id: string | null;
          last_synced_at: string | null;
          sync_status: "idle" | "syncing" | "error";
          sync_error: string | null;
          enabled: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          profile_id: string;
          provider: "google" | "apple";
          access_token?: string | null;
          refresh_token?: string | null;
          token_expires_at?: string | null;
          caldav_url?: string | null;
          google_calendar_id?: string | null;
          google_sync_token?: string | null;
          google_channel_id?: string | null;
          google_channel_expiry?: string | null;
          google_resource_id?: string | null;
          last_synced_at?: string | null;
          sync_status?: "idle" | "syncing" | "error";
          sync_error?: string | null;
          enabled?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          profile_id?: string;
          provider?: "google" | "apple";
          access_token?: string | null;
          refresh_token?: string | null;
          token_expires_at?: string | null;
          caldav_url?: string | null;
          google_calendar_id?: string | null;
          google_sync_token?: string | null;
          google_channel_id?: string | null;
          google_channel_expiry?: string | null;
          google_resource_id?: string | null;
          last_synced_at?: string | null;
          sync_status?: "idle" | "syncing" | "error";
          sync_error?: string | null;
          enabled?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "calendar_connections_profile_id_fkey";
            columns: ["profile_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      calendar_events: {
        Row: {
          id: string;
          profile_id: string;
          household_id: string | null;
          title: string;
          description: string | null;
          location: string | null;
          start_time: string;
          end_time: string;
          all_day: boolean;
          recurrence_rule: string | null;
          color: string | null;
          external_id: string | null;
          external_source: "google" | "apple" | "kin";
          external_calendar_id: string | null;
          external_etag: string | null;
          last_synced_at: string | null;
          sync_status: "synced" | "pending_push" | "pending_pull" | "error" | "conflict";
          owner_parent_id: string;
          is_shared: boolean;
          is_kid_event: boolean;
          assigned_member: string | null;
          created_at: string;
          updated_at: string;
          deleted_at: string | null;
        };
        Insert: {
          id?: string;
          profile_id: string;
          household_id?: string | null;
          title: string;
          description?: string | null;
          location?: string | null;
          start_time: string;
          end_time: string;
          all_day?: boolean;
          recurrence_rule?: string | null;
          color?: string | null;
          external_id?: string | null;
          external_source?: "google" | "apple" | "kin";
          external_calendar_id?: string | null;
          external_etag?: string | null;
          last_synced_at?: string | null;
          sync_status?: "synced" | "pending_push" | "pending_pull" | "error" | "conflict";
          owner_parent_id: string;
          is_shared?: boolean;
          is_kid_event?: boolean;
          assigned_member?: string | null;
          created_at?: string;
          updated_at?: string;
          deleted_at?: string | null;
        };
        Update: {
          id?: string;
          profile_id?: string;
          household_id?: string | null;
          title?: string;
          description?: string | null;
          location?: string | null;
          start_time?: string;
          end_time?: string;
          all_day?: boolean;
          recurrence_rule?: string | null;
          color?: string | null;
          external_id?: string | null;
          external_source?: "google" | "apple" | "kin";
          external_calendar_id?: string | null;
          external_etag?: string | null;
          last_synced_at?: string | null;
          sync_status?: "synced" | "pending_push" | "pending_pull" | "error" | "conflict";
          owner_parent_id?: string;
          is_shared?: boolean;
          is_kid_event?: boolean;
          assigned_member?: string | null;
          created_at?: string;
          updated_at?: string;
          deleted_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "calendar_events_profile_id_fkey";
            columns: ["profile_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "calendar_events_owner_parent_id_fkey";
            columns: ["owner_parent_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      calendar_conflicts: {
        Row: {
          id: string;
          household_id: string;
          event_a_id: string;
          event_b_id: string;
          conflict_type: "time_overlap" | "kid_conflict" | "meal_conflict";
          description: string | null;
          resolved: boolean;
          resolved_at: string | null;
          resolution_note: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          household_id: string;
          event_a_id: string;
          event_b_id: string;
          conflict_type: "time_overlap" | "kid_conflict" | "meal_conflict";
          description?: string | null;
          resolved?: boolean;
          resolved_at?: string | null;
          resolution_note?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          household_id?: string;
          event_a_id?: string;
          event_b_id?: string;
          conflict_type?: "time_overlap" | "kid_conflict" | "meal_conflict";
          description?: string | null;
          resolved?: boolean;
          resolved_at?: string | null;
          resolution_note?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "calendar_conflicts_household_id_fkey";
            columns: ["household_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "calendar_conflicts_event_a_id_fkey";
            columns: ["event_a_id"];
            isOneToOne: false;
            referencedRelation: "calendar_events";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "calendar_conflicts_event_b_id_fkey";
            columns: ["event_b_id"];
            isOneToOne: false;
            referencedRelation: "calendar_events";
            referencedColumns: ["id"];
          },
        ];
      };
      calendar_sync_queue: {
        Row: {
          id: string;
          connection_id: string;
          event_id: string;
          action: "create" | "update" | "delete";
          attempts: number;
          max_attempts: number;
          last_error: string | null;
          next_retry_at: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          connection_id: string;
          event_id: string;
          action: "create" | "update" | "delete";
          attempts?: number;
          max_attempts?: number;
          last_error?: string | null;
          next_retry_at?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          connection_id?: string;
          event_id?: string;
          action?: "create" | "update" | "delete";
          attempts?: number;
          max_attempts?: number;
          last_error?: string | null;
          next_retry_at?: string;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "calendar_sync_queue_connection_id_fkey";
            columns: ["connection_id"];
            isOneToOne: false;
            referencedRelation: "calendar_connections";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "calendar_sync_queue_event_id_fkey";
            columns: ["event_id"];
            isOneToOne: false;
            referencedRelation: "calendar_events";
            referencedColumns: ["id"];
          },
        ];
      };
      household_invites: {
        Row: {
          id: string;
          inviter_profile_id: string;
          invitee_email: string;
          invite_code: string;
          accepted: boolean;
          accepted_by_profile_id: string | null;
          accepted_at: string | null;
          expires_at: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          inviter_profile_id: string;
          invitee_email: string;
          invite_code: string;
          accepted?: boolean;
          accepted_by_profile_id?: string | null;
          accepted_at?: string | null;
          expires_at?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          inviter_profile_id?: string;
          invitee_email?: string;
          invite_code?: string;
          accepted?: boolean;
          accepted_by_profile_id?: string | null;
          accepted_at?: string | null;
          expires_at?: string;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "household_invites_inviter_profile_id_fkey";
            columns: ["inviter_profile_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "household_invites_accepted_by_profile_id_fkey";
            columns: ["accepted_by_profile_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      push_tokens: {
        Row: {
          id: string;
          profile_id: string;
          token: string;
          platform: "ios" | "android" | "web";
          device_name: string | null;
          active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          profile_id: string;
          token: string;
          platform: "ios" | "android" | "web";
          device_name?: string | null;
          active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          profile_id?: string;
          token?: string;
          platform?: "ios" | "android" | "web";
          device_name?: string | null;
          active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "push_tokens_profile_id_fkey";
            columns: ["profile_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      children_details: {
        Row: {
          id: string;
          family_member_id: string;
          profile_id: string;
          school_name: string | null;
          grade: string | null;
          schedule_notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          family_member_id: string;
          profile_id: string;
          school_name?: string | null;
          grade?: string | null;
          schedule_notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          family_member_id?: string;
          profile_id?: string;
          school_name?: string | null;
          grade?: string | null;
          schedule_notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "children_details_family_member_id_fkey";
            columns: ["family_member_id"];
            isOneToOne: false;
            referencedRelation: "family_members";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "children_details_profile_id_fkey";
            columns: ["profile_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      children_allergies: {
        Row: {
          id: string;
          family_member_id: string;
          profile_id: string;
          allergen: string;
          severity: "mild" | "moderate" | "severe";
          notes: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          family_member_id: string;
          profile_id: string;
          allergen: string;
          severity: "mild" | "moderate" | "severe";
          notes?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          family_member_id?: string;
          profile_id?: string;
          allergen?: string;
          severity?: "mild" | "moderate" | "severe";
          notes?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "children_allergies_family_member_id_fkey";
            columns: ["family_member_id"];
            isOneToOne: false;
            referencedRelation: "family_members";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "children_allergies_profile_id_fkey";
            columns: ["profile_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      children_activities: {
        Row: {
          id: string;
          family_member_id: string;
          profile_id: string;
          name: string;
          day_of_week: string[] | null;
          start_time: string | null;
          end_time: string | null;
          location: string | null;
          active: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          family_member_id: string;
          profile_id: string;
          name: string;
          day_of_week?: string[] | null;
          start_time?: string | null;
          end_time?: string | null;
          location?: string | null;
          active?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          family_member_id?: string;
          profile_id?: string;
          name?: string;
          day_of_week?: string[] | null;
          start_time?: string | null;
          end_time?: string | null;
          location?: string | null;
          active?: boolean;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "children_activities_family_member_id_fkey";
            columns: ["family_member_id"];
            isOneToOne: false;
            referencedRelation: "family_members";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "children_activities_profile_id_fkey";
            columns: ["profile_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      pet_details: {
        Row: {
          id: string;
          family_member_id: string;
          profile_id: string;
          species: string | null;
          breed: string | null;
          vet_name: string | null;
          vet_phone: string | null;
          vet_next_appointment: string | null;
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          family_member_id: string;
          profile_id: string;
          species?: string | null;
          breed?: string | null;
          vet_name?: string | null;
          vet_phone?: string | null;
          vet_next_appointment?: string | null;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          family_member_id?: string;
          profile_id?: string;
          species?: string | null;
          breed?: string | null;
          vet_name?: string | null;
          vet_phone?: string | null;
          vet_next_appointment?: string | null;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "pet_details_family_member_id_fkey";
            columns: ["family_member_id"];
            isOneToOne: false;
            referencedRelation: "family_members";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "pet_details_profile_id_fkey";
            columns: ["profile_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      pet_medications: {
        Row: {
          id: string;
          family_member_id: string;
          profile_id: string;
          name: string;
          dosage: string | null;
          frequency: string | null;
          time_of_day: string[] | null;
          notes: string | null;
          active: boolean;
          last_confirmed_at: string | null;
          med_notified_date: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          family_member_id: string;
          profile_id: string;
          name: string;
          dosage?: string | null;
          frequency?: string | null;
          time_of_day?: string[] | null;
          notes?: string | null;
          active?: boolean;
          last_confirmed_at?: string | null;
          med_notified_date?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          family_member_id?: string;
          profile_id?: string;
          name?: string;
          dosage?: string | null;
          frequency?: string | null;
          time_of_day?: string[] | null;
          notes?: string | null;
          active?: boolean;
          last_confirmed_at?: string | null;
          med_notified_date?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "pet_medications_family_member_id_fkey";
            columns: ["family_member_id"];
            isOneToOne: false;
            referencedRelation: "family_members";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "pet_medications_profile_id_fkey";
            columns: ["profile_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      pet_vaccinations: {
        Row: {
          id: string;
          family_member_id: string;
          profile_id: string;
          name: string;
          given_date: string | null;
          next_due_date: string | null;
          notes: string | null;
          vax_7day_notified_due_date: string | null;
          vax_1day_notified_due_date: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          family_member_id: string;
          profile_id: string;
          name: string;
          given_date?: string | null;
          next_due_date?: string | null;
          notes?: string | null;
          vax_7day_notified_due_date?: string | null;
          vax_1day_notified_due_date?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          family_member_id?: string;
          profile_id?: string;
          name?: string;
          given_date?: string | null;
          next_due_date?: string | null;
          notes?: string | null;
          vax_7day_notified_due_date?: string | null;
          vax_1day_notified_due_date?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "pet_vaccinations_family_member_id_fkey";
            columns: ["family_member_id"];
            isOneToOne: false;
            referencedRelation: "family_members";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "pet_vaccinations_profile_id_fkey";
            columns: ["profile_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      fitness_profiles: {
        Row: {
          id: string;
          profile_id: string;
          goal: "lose_weight" | "gain_muscle" | "maintain" | "endurance" | "general_fitness";
          current_weight_lbs: number | null;
          target_weight_lbs: number | null;
          target_date: string | null;
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          profile_id: string;
          goal: "lose_weight" | "gain_muscle" | "maintain" | "endurance" | "general_fitness";
          current_weight_lbs?: number | null;
          target_weight_lbs?: number | null;
          target_date?: string | null;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          profile_id?: string;
          goal?: "lose_weight" | "gain_muscle" | "maintain" | "endurance" | "general_fitness";
          current_weight_lbs?: number | null;
          target_weight_lbs?: number | null;
          target_date?: string | null;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "fitness_profiles_profile_id_fkey";
            columns: ["profile_id"];
            isOneToOne: true;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      workout_sessions: {
        Row: {
          id: string;
          profile_id: string;
          workout_date: string;
          duration_minutes: number | null;
          notes: string | null;
          exercises: Json;
          created_at: string;
        };
        Insert: {
          id?: string;
          profile_id: string;
          workout_date?: string;
          duration_minutes?: number | null;
          notes?: string | null;
          exercises?: Json;
          created_at?: string;
        };
        Update: {
          id?: string;
          profile_id?: string;
          workout_date?: string;
          duration_minutes?: number | null;
          notes?: string | null;
          exercises?: Json;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "workout_sessions_profile_id_fkey";
            columns: ["profile_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      parent_schedules: {
        Row: {
          id: string;
          profile_id: string;
          raw_description: string | null;
          structured_data: Json | null;
          home_location: string | null;
          work_location: string | null;
          commute_mode: "drive" | "transit" | "walk" | "bike" | "remote" | null;
          commute_departure_notified_date: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          profile_id: string;
          raw_description?: string | null;
          structured_data?: Json | null;
          home_location?: string | null;
          work_location?: string | null;
          commute_mode?: "drive" | "transit" | "walk" | "bike" | "remote" | null;
          commute_departure_notified_date?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          profile_id?: string;
          raw_description?: string | null;
          structured_data?: Json | null;
          home_location?: string | null;
          work_location?: string | null;
          commute_mode?: "drive" | "transit" | "walk" | "bike" | "remote" | null;
          commute_departure_notified_date?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "parent_schedules_profile_id_fkey";
            columns: ["profile_id"];
            isOneToOne: true;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      morning_briefings: {
        Row: {
          id: string;
          profile_id: string;
          briefing_date: string;
          content: string;
          delivery_status: "generated" | "sent" | "failed";
          sent_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          profile_id: string;
          briefing_date?: string;
          content: string;
          delivery_status?: "generated" | "sent" | "failed";
          sent_at?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          profile_id?: string;
          briefing_date?: string;
          content?: string;
          delivery_status?: "generated" | "sent" | "failed";
          sent_at?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "morning_briefings_profile_id_fkey";
            columns: ["profile_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      date_nights: {
        Row: {
          id: string;
          profile_id: string;
          date: string;
          notes: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          profile_id: string;
          date: string;
          notes?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          profile_id?: string;
          date?: string;
          notes?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "date_nights_profile_id_fkey";
            columns: ["profile_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      grocery_list_items: {
        Row: {
          id: string;
          household_id: string;
          name: string;
          quantity: string;
          estimated_cost: number;
          store: string;
          is_kid_item: boolean;
          checked: boolean;
          checked_by_profile_id: string | null;
          checked_at: string | null;
          sort_order: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          household_id: string;
          name: string;
          quantity?: string;
          estimated_cost?: number;
          store?: string;
          is_kid_item?: boolean;
          checked?: boolean;
          checked_by_profile_id?: string | null;
          checked_at?: string | null;
          sort_order?: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          household_id?: string;
          name?: string;
          quantity?: string;
          estimated_cost?: number;
          store?: string;
          is_kid_item?: boolean;
          checked?: boolean;
          checked_by_profile_id?: string | null;
          checked_at?: string | null;
          sort_order?: number;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "grocery_list_items_household_id_fkey";
            columns: ["household_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "grocery_list_items_checked_by_profile_id_fkey";
            columns: ["checked_by_profile_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      coordination_issues: {
        Row: {
          id: string;
          household_id: string;
          trigger_type:
            | "pickup_risk"
            | "late_schedule_change"
            | "schedule_compression"
            | "responsibility_shift"
            | "budget_overspend"
            | "other";
          state: "OPEN" | "ACKNOWLEDGED" | "RESOLVED";
          content: string;
          event_window_start: string | null;
          event_window_end: string | null;
          surfaced_at: string;
          acknowledged_at: string | null;
          resolved_at: string | null;
          last_escalation_tier: "T6" | "T2" | "T45" | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          household_id: string;
          trigger_type:
            | "pickup_risk"
            | "late_schedule_change"
            | "schedule_compression"
            | "responsibility_shift"
            | "budget_overspend"
            | "other";
          state?: "OPEN" | "ACKNOWLEDGED" | "RESOLVED";
          content: string;
          event_window_start?: string | null;
          event_window_end?: string | null;
          surfaced_at?: string;
          acknowledged_at?: string | null;
          resolved_at?: string | null;
          last_escalation_tier?: "T6" | "T2" | "T45" | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          household_id?: string;
          trigger_type?:
            | "pickup_risk"
            | "late_schedule_change"
            | "schedule_compression"
            | "responsibility_shift"
            | "budget_overspend"
            | "other";
          state?: "OPEN" | "ACKNOWLEDGED" | "RESOLVED";
          content?: string;
          event_window_start?: string | null;
          event_window_end?: string | null;
          surfaced_at?: string;
          acknowledged_at?: string | null;
          resolved_at?: string | null;
          last_escalation_tier?: "T6" | "T2" | "T45" | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "coordination_issues_household_id_fkey";
            columns: ["household_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      kin_check_ins: {
        Row: {
          id: string;
          profile_id: string;
          household_id: string | null;
          content: string;
          prompt: string | null;
          dismissed: boolean;
          check_in_date: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          profile_id: string;
          household_id?: string | null;
          content: string;
          prompt?: string | null;
          dismissed?: boolean;
          check_in_date?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          profile_id?: string;
          household_id?: string | null;
          content?: string;
          prompt?: string | null;
          dismissed?: boolean;
          check_in_date?: string;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "kin_check_ins_profile_id_fkey";
            columns: ["profile_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "kin_check_ins_household_id_fkey";
            columns: ["household_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: {
      budget_summary_view: {
        Row: {
          profile_id: string | null;
          category_id: string | null;
          category_name: string | null;
          monthly_limit: number | null;
          total_spent: number | null;
          remaining: number | null;
          month_start: string | null;
          month_end: string | null;
        };
        Relationships: [];
      };
    };
    Functions: {
      get_budget_summary: {
        Args: { user_id: string };
        Returns: {
          profile_id: string;
          category_id: string;
          category_name: string;
          monthly_limit: number;
          total_spent: number;
          remaining: number;
          month_start: string;
          month_end: string;
        }[];
      };
      get_household_partner_id: {
        Args: { user_id: string };
        Returns: string | null;
      };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};

// Convenience type helpers (mirrors the pattern from @supabase/supabase-js)
export type Tables<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Row"];

export type TablesInsert<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Insert"];

export type TablesUpdate<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Update"];

export type Views<T extends keyof Database["public"]["Views"]> =
  Database["public"]["Views"][T]["Row"];
