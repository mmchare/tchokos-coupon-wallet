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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      admin_logs: {
        Row: {
          action: string
          admin_id: string
          created_at: string
          details: Json | null
          id: string
          target_id: string | null
          target_type: string
        }
        Insert: {
          action: string
          admin_id: string
          created_at?: string
          details?: Json | null
          id?: string
          target_id?: string | null
          target_type: string
        }
        Update: {
          action?: string
          admin_id?: string
          created_at?: string
          details?: Json | null
          id?: string
          target_id?: string | null
          target_type?: string
        }
        Relationships: []
      }
      admin_users: {
        Row: {
          created_at: string
          id: string
          phone: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          phone: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          phone?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "admin_users_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      bids: {
        Row: {
          amount: number
          created_at: string
          id: string
          product_id: string
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          id?: string
          product_id: string
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          product_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "bids_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bids_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      categories: {
        Row: {
          bg_color: string
          created_at: string
          icon: string
          icon_color: string
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          bg_color?: string
          created_at?: string
          icon?: string
          icon_color?: string
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          bg_color?: string
          created_at?: string
          icon?: string
          icon_color?: string
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      comment_likes: {
        Row: {
          comment_id: string
          created_at: string
          id: string
          user_id: string
        }
        Insert: {
          comment_id: string
          created_at?: string
          id?: string
          user_id: string
        }
        Update: {
          comment_id?: string
          created_at?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "comment_likes_comment_id_fkey"
            columns: ["comment_id"]
            isOneToOne: false
            referencedRelation: "product_comments"
            referencedColumns: ["id"]
          },
        ]
      }
      conversations: {
        Row: {
          buyer_id: string
          created_at: string
          custom_order_id: string | null
          id: string
          is_resolved: boolean
          last_message_at: string
          product_id: string | null
          resolved_at: string | null
          resolved_by: string | null
          seller_id: string
        }
        Insert: {
          buyer_id: string
          created_at?: string
          custom_order_id?: string | null
          id?: string
          is_resolved?: boolean
          last_message_at?: string
          product_id?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          seller_id: string
        }
        Update: {
          buyer_id?: string
          created_at?: string
          custom_order_id?: string | null
          id?: string
          is_resolved?: boolean
          last_message_at?: string
          product_id?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          seller_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversations_custom_order_id_fkey"
            columns: ["custom_order_id"]
            isOneToOne: false
            referencedRelation: "custom_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      custom_orders: {
        Row: {
          admin_response: string | null
          budget_max: number | null
          budget_min: number | null
          created_at: string
          details: string | null
          id: string
          images: string[] | null
          order_id: string | null
          product_link: string | null
          product_name: string
          quote_amount: number | null
          quote_delay_days: number | null
          quoted_at: string | null
          status: string
          updated_at: string
          user_id: string
          whatsapp_number: string | null
        }
        Insert: {
          admin_response?: string | null
          budget_max?: number | null
          budget_min?: number | null
          created_at?: string
          details?: string | null
          id?: string
          images?: string[] | null
          order_id?: string | null
          product_link?: string | null
          product_name: string
          quote_amount?: number | null
          quote_delay_days?: number | null
          quoted_at?: string | null
          status?: string
          updated_at?: string
          user_id: string
          whatsapp_number?: string | null
        }
        Update: {
          admin_response?: string | null
          budget_max?: number | null
          budget_min?: number | null
          created_at?: string
          details?: string | null
          id?: string
          images?: string[] | null
          order_id?: string | null
          product_link?: string | null
          product_name?: string
          quote_amount?: number | null
          quote_delay_days?: number | null
          quoted_at?: string | null
          status?: string
          updated_at?: string
          user_id?: string
          whatsapp_number?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "custom_orders_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      delivery_addresses: {
        Row: {
          address: string
          city: string
          created_at: string
          id: string
          is_default: boolean
          label: string
          phone: string
          user_id: string
        }
        Insert: {
          address: string
          city: string
          created_at?: string
          id?: string
          is_default?: boolean
          label?: string
          phone: string
          user_id: string
        }
        Update: {
          address?: string
          city?: string
          created_at?: string
          id?: string
          is_default?: boolean
          label?: string
          phone?: string
          user_id?: string
        }
        Relationships: []
      }
      favorites: {
        Row: {
          created_at: string
          id: string
          product_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          product_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          product_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "favorites_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      jinbao_chat_history: {
        Row: {
          content: string
          created_at: string
          id: string
          role: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          role: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "jinbao_chat_history_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          content: string
          content_translated: string | null
          conversation_id: string
          created_at: string
          file_name: string | null
          file_type: string | null
          file_url: string | null
          id: string
          image_url: string | null
          is_read: boolean
          original_language: string | null
          sender_id: string
        }
        Insert: {
          content: string
          content_translated?: string | null
          conversation_id: string
          created_at?: string
          file_name?: string | null
          file_type?: string | null
          file_url?: string | null
          id?: string
          image_url?: string | null
          is_read?: boolean
          original_language?: string | null
          sender_id: string
        }
        Update: {
          content?: string
          content_translated?: string | null
          conversation_id?: string
          created_at?: string
          file_name?: string | null
          file_type?: string | null
          file_url?: string | null
          id?: string
          image_url?: string | null
          is_read?: boolean
          original_language?: string | null
          sender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          created_at: string
          id: string
          is_read: boolean
          message_body: string
          message_type: string
          order_id: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_read?: boolean
          message_body: string
          message_type: string
          order_id?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_read?: boolean
          message_body?: string
          message_type?: string
          order_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      order_status_history: {
        Row: {
          changed_by: string | null
          created_at: string
          id: string
          new_status: string | null
          new_step: number | null
          notes: string | null
          order_id: string
          previous_status: string | null
          previous_step: number | null
        }
        Insert: {
          changed_by?: string | null
          created_at?: string
          id?: string
          new_status?: string | null
          new_step?: number | null
          notes?: string | null
          order_id: string
          previous_status?: string | null
          previous_step?: number | null
        }
        Update: {
          changed_by?: string | null
          created_at?: string
          id?: string
          new_status?: string | null
          new_step?: number | null
          notes?: string | null
          order_id?: string
          previous_status?: string | null
          previous_step?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "order_status_history_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      order_tracking_shares: {
        Row: {
          created_at: string
          expires_at: string
          id: string
          order_id: string
          share_token: string
        }
        Insert: {
          created_at?: string
          expires_at?: string
          id?: string
          order_id: string
          share_token?: string
        }
        Update: {
          created_at?: string
          expires_at?: string
          id?: string
          order_id?: string
          share_token?: string
        }
        Relationships: [
          {
            foreignKeyName: "order_tracking_shares_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          city: string
          created_at: string
          current_step_started_at: string
          delivery_address: string
          estimated_delivery_at: string | null
          id: string
          logistics_step: number
          product_id: string | null
          product_image: string | null
          product_name: string | null
          shipping_mode: string
          status: string
          total_amount: number
          updated_at: string
          user_id: string
          whatsapp_number: string
        }
        Insert: {
          city: string
          created_at?: string
          current_step_started_at?: string
          delivery_address: string
          estimated_delivery_at?: string | null
          id?: string
          logistics_step?: number
          product_id?: string | null
          product_image?: string | null
          product_name?: string | null
          shipping_mode?: string
          status?: string
          total_amount: number
          updated_at?: string
          user_id: string
          whatsapp_number: string
        }
        Update: {
          city?: string
          created_at?: string
          current_step_started_at?: string
          delivery_address?: string
          estimated_delivery_at?: string | null
          id?: string
          logistics_step?: number
          product_id?: string | null
          product_image?: string | null
          product_name?: string | null
          shipping_mode?: string
          status?: string
          total_amount?: number
          updated_at?: string
          user_id?: string
          whatsapp_number?: string
        }
        Relationships: [
          {
            foreignKeyName: "orders_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      otp_codes: {
        Row: {
          code: string
          created_at: string
          expires_at: string
          id: string
          phone: string
          verified: boolean
        }
        Insert: {
          code: string
          created_at?: string
          expires_at?: string
          id?: string
          phone: string
          verified?: boolean
        }
        Update: {
          code?: string
          created_at?: string
          expires_at?: string
          id?: string
          phone?: string
          verified?: boolean
        }
        Relationships: []
      }
      price_alerts: {
        Row: {
          created_at: string
          id: string
          initial_price: number
          is_active: boolean
          notified_at: string | null
          product_id: string
          target_price: number | null
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          initial_price: number
          is_active?: boolean
          notified_at?: string | null
          product_id: string
          target_price?: number | null
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          initial_price?: number
          is_active?: boolean
          notified_at?: string | null
          product_id?: string
          target_price?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "price_alerts_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      product_comments: {
        Row: {
          content: string
          created_at: string
          id: string
          image_url: string | null
          likes_count: number
          parent_id: string | null
          product_id: string
          updated_at: string
          user_id: string
          user_name: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          image_url?: string | null
          likes_count?: number
          parent_id?: string | null
          product_id: string
          updated_at?: string
          user_id: string
          user_name: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          image_url?: string | null
          likes_count?: number
          parent_id?: string | null
          product_id?: string
          updated_at?: string
          user_id?: string
          user_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_comments_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "product_comments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_comments_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          auction_end_date: string | null
          category: string | null
          created_at: string
          description: string | null
          description_en: string | null
          description_zh: string | null
          id: string
          images: string[] | null
          is_auction: boolean
          is_verified: boolean
          name: string
          name_en: string | null
          name_zh: string | null
          original_price: number | null
          price: number
          seller_id: string | null
          source_link: string | null
          sponsored_until: string | null
          stock_available: number
          updated_at: string
          video_url: string | null
        }
        Insert: {
          auction_end_date?: string | null
          category?: string | null
          created_at?: string
          description?: string | null
          description_en?: string | null
          description_zh?: string | null
          id?: string
          images?: string[] | null
          is_auction?: boolean
          is_verified?: boolean
          name: string
          name_en?: string | null
          name_zh?: string | null
          original_price?: number | null
          price?: number
          seller_id?: string | null
          source_link?: string | null
          sponsored_until?: string | null
          stock_available?: number
          updated_at?: string
          video_url?: string | null
        }
        Update: {
          auction_end_date?: string | null
          category?: string | null
          created_at?: string
          description?: string | null
          description_en?: string | null
          description_zh?: string | null
          id?: string
          images?: string[] | null
          is_auction?: boolean
          is_verified?: boolean
          name?: string
          name_en?: string | null
          name_zh?: string | null
          original_price?: number | null
          price?: number
          seller_id?: string | null
          source_link?: string | null
          sponsored_until?: string | null
          stock_available?: number
          updated_at?: string
          video_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "products_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: false
            referencedRelation: "seller_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          delivery_address: string | null
          full_name: string
          id: string
          phone: string | null
          wallet_balance: number
        }
        Insert: {
          created_at?: string
          delivery_address?: string | null
          full_name: string
          id: string
          phone?: string | null
          wallet_balance?: number
        }
        Update: {
          created_at?: string
          delivery_address?: string | null
          full_name?: string
          id?: string
          phone?: string | null
          wallet_balance?: number
        }
        Relationships: []
      }
      promo_code_uses: {
        Row: {
          created_at: string
          discount_amount: number
          id: string
          order_id: string | null
          promo_code_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          discount_amount: number
          id?: string
          order_id?: string | null
          promo_code_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          discount_amount?: number
          id?: string
          order_id?: string | null
          promo_code_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "promo_code_uses_promo_code_id_fkey"
            columns: ["promo_code_id"]
            isOneToOne: false
            referencedRelation: "promo_codes"
            referencedColumns: ["id"]
          },
        ]
      }
      promo_codes: {
        Row: {
          code: string
          created_at: string
          current_uses: number
          description: string | null
          discount_type: string
          discount_value: number
          expires_at: string | null
          id: string
          is_active: boolean
          max_uses: number | null
          max_uses_per_user: number
          min_order_amount: number
          seller_id: string | null
          updated_at: string
        }
        Insert: {
          code: string
          created_at?: string
          current_uses?: number
          description?: string | null
          discount_type: string
          discount_value: number
          expires_at?: string | null
          id?: string
          is_active?: boolean
          max_uses?: number | null
          max_uses_per_user?: number
          min_order_amount?: number
          seller_id?: string | null
          updated_at?: string
        }
        Update: {
          code?: string
          created_at?: string
          current_uses?: number
          description?: string | null
          discount_type?: string
          discount_value?: number
          expires_at?: string | null
          id?: string
          is_active?: boolean
          max_uses?: number | null
          max_uses_per_user?: number
          min_order_amount?: number
          seller_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "promo_codes_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: false
            referencedRelation: "seller_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      push_subscriptions: {
        Row: {
          auth: string
          created_at: string
          endpoint: string
          id: string
          p256dh: string
          user_id: string
        }
        Insert: {
          auth: string
          created_at?: string
          endpoint: string
          id?: string
          p256dh: string
          user_id: string
        }
        Update: {
          auth?: string
          created_at?: string
          endpoint?: string
          id?: string
          p256dh?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "push_subscriptions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      quick_sale_listings: {
        Row: {
          category: string | null
          created_at: string
          description: string | null
          id: string
          images: string[] | null
          price: number
          status: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          category?: string | null
          created_at?: string
          description?: string | null
          id?: string
          images?: string[] | null
          price: number
          status?: string
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          category?: string | null
          created_at?: string
          description?: string | null
          id?: string
          images?: string[] | null
          price?: number
          status?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      referral_codes: {
        Row: {
          code: string
          created_at: string
          id: string
          user_id: string
        }
        Insert: {
          code: string
          created_at?: string
          id?: string
          user_id: string
        }
        Update: {
          code?: string
          created_at?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "referral_codes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      referrals: {
        Row: {
          created_at: string
          id: string
          referred_id: string
          referrer_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          referred_id: string
          referrer_id: string
        }
        Update: {
          created_at?: string
          id?: string
          referred_id?: string
          referrer_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "referrals_referred_id_fkey"
            columns: ["referred_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "referrals_referrer_id_fkey"
            columns: ["referrer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      reports: {
        Row: {
          admin_notes: string | null
          created_at: string
          details: string | null
          id: string
          reason: string
          reporter_id: string
          reviewed_at: string | null
          status: string
          target_id: string
          target_type: string
        }
        Insert: {
          admin_notes?: string | null
          created_at?: string
          details?: string | null
          id?: string
          reason: string
          reporter_id: string
          reviewed_at?: string | null
          status?: string
          target_id: string
          target_type: string
        }
        Update: {
          admin_notes?: string | null
          created_at?: string
          details?: string | null
          id?: string
          reason?: string
          reporter_id?: string
          reviewed_at?: string | null
          status?: string
          target_id?: string
          target_type?: string
        }
        Relationships: []
      }
      reviews: {
        Row: {
          comment: string
          created_at: string
          id: string
          is_verified_client: boolean
          photos: string[] | null
          product_id: string
          rating: number
          user_id: string
          user_name: string
        }
        Insert: {
          comment: string
          created_at?: string
          id?: string
          is_verified_client?: boolean
          photos?: string[] | null
          product_id: string
          rating: number
          user_id: string
          user_name: string
        }
        Update: {
          comment?: string
          created_at?: string
          id?: string
          is_verified_client?: boolean
          photos?: string[] | null
          product_id?: string
          rating?: number
          user_id?: string
          user_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "reviews_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      search_history: {
        Row: {
          created_at: string
          id: string
          query: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          query: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          query?: string
          user_id?: string
        }
        Relationships: []
      }
      seller_escrow: {
        Row: {
          commission_amount: number
          commission_rate: number
          created_at: string
          gross_amount: number
          id: string
          net_amount: number
          order_id: string
          released_at: string | null
          seller_id: string
          status: Database["public"]["Enums"]["escrow_status"]
        }
        Insert: {
          commission_amount: number
          commission_rate?: number
          created_at?: string
          gross_amount: number
          id?: string
          net_amount: number
          order_id: string
          released_at?: string | null
          seller_id: string
          status?: Database["public"]["Enums"]["escrow_status"]
        }
        Update: {
          commission_amount?: number
          commission_rate?: number
          created_at?: string
          gross_amount?: number
          id?: string
          net_amount?: number
          order_id?: string
          released_at?: string | null
          seller_id?: string
          status?: Database["public"]["Enums"]["escrow_status"]
        }
        Relationships: [
          {
            foreignKeyName: "seller_escrow_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "seller_escrow_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: false
            referencedRelation: "seller_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      seller_profiles: {
        Row: {
          chinese_phone: string
          chinese_phone_verified: boolean
          created_at: string
          id: string
          is_suspended: boolean
          rating: number
          rejection_reason: string | null
          residence_document_url: string | null
          shop_description: string | null
          shop_name: string | null
          subscription_expires_at: string | null
          subscription_tier: Database["public"]["Enums"]["subscription_tier"]
          total_sales: number
          updated_at: string
          user_id: string
          verification_status: Database["public"]["Enums"]["seller_status"]
          verified_at: string | null
          verified_by: string | null
        }
        Insert: {
          chinese_phone: string
          chinese_phone_verified?: boolean
          created_at?: string
          id?: string
          is_suspended?: boolean
          rating?: number
          rejection_reason?: string | null
          residence_document_url?: string | null
          shop_description?: string | null
          shop_name?: string | null
          subscription_expires_at?: string | null
          subscription_tier?: Database["public"]["Enums"]["subscription_tier"]
          total_sales?: number
          updated_at?: string
          user_id: string
          verification_status?: Database["public"]["Enums"]["seller_status"]
          verified_at?: string | null
          verified_by?: string | null
        }
        Update: {
          chinese_phone?: string
          chinese_phone_verified?: boolean
          created_at?: string
          id?: string
          is_suspended?: boolean
          rating?: number
          rejection_reason?: string | null
          residence_document_url?: string | null
          shop_description?: string | null
          shop_name?: string | null
          subscription_expires_at?: string | null
          subscription_tier?: Database["public"]["Enums"]["subscription_tier"]
          total_sales?: number
          updated_at?: string
          user_id?: string
          verification_status?: Database["public"]["Enums"]["seller_status"]
          verified_at?: string | null
          verified_by?: string | null
        }
        Relationships: []
      }
      seller_reviews: {
        Row: {
          comment: string | null
          created_at: string
          id: string
          order_id: string
          photos: string[] | null
          rating: number
          reviewer_id: string
          reviewer_name: string | null
          seller_id: string
        }
        Insert: {
          comment?: string | null
          created_at?: string
          id?: string
          order_id: string
          photos?: string[] | null
          rating: number
          reviewer_id: string
          reviewer_name?: string | null
          seller_id: string
        }
        Update: {
          comment?: string | null
          created_at?: string
          id?: string
          order_id?: string
          photos?: string[] | null
          rating?: number
          reviewer_id?: string
          reviewer_name?: string | null
          seller_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "seller_reviews_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: false
            referencedRelation: "seller_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      seller_subscriptions: {
        Row: {
          amount: number
          auto_renew: boolean
          created_at: string
          expires_at: string
          id: string
          notes: string | null
          payment_method: string
          seller_id: string
          starts_at: string
          status: string
          tier: Database["public"]["Enums"]["subscription_tier"]
          updated_at: string
          user_id: string
        }
        Insert: {
          amount?: number
          auto_renew?: boolean
          created_at?: string
          expires_at: string
          id?: string
          notes?: string | null
          payment_method?: string
          seller_id: string
          starts_at?: string
          status?: string
          tier?: Database["public"]["Enums"]["subscription_tier"]
          updated_at?: string
          user_id: string
        }
        Update: {
          amount?: number
          auto_renew?: boolean
          created_at?: string
          expires_at?: string
          id?: string
          notes?: string | null
          payment_method?: string
          seller_id?: string
          starts_at?: string
          status?: string
          tier?: Database["public"]["Enums"]["subscription_tier"]
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      seller_wallets: {
        Row: {
          available_balance: number
          created_at: string
          id: string
          pending_balance: number
          seller_id: string
          total_earned: number
          updated_at: string
        }
        Insert: {
          available_balance?: number
          created_at?: string
          id?: string
          pending_balance?: number
          seller_id: string
          total_earned?: number
          updated_at?: string
        }
        Update: {
          available_balance?: number
          created_at?: string
          id?: string
          pending_balance?: number
          seller_id?: string
          total_earned?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "seller_wallets_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: true
            referencedRelation: "seller_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      seller_withdrawals: {
        Row: {
          amount: number
          created_at: string
          failure_reason: string | null
          id: string
          notchpay_reference: string | null
          payment_method: string
          phone_number: string
          processed_at: string | null
          provider: string | null
          provider_reference: string | null
          seller_id: string
          status: string
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          failure_reason?: string | null
          id?: string
          notchpay_reference?: string | null
          payment_method: string
          phone_number: string
          processed_at?: string | null
          provider?: string | null
          provider_reference?: string | null
          seller_id: string
          status?: string
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          failure_reason?: string | null
          id?: string
          notchpay_reference?: string | null
          payment_method?: string
          phone_number?: string
          processed_at?: string | null
          provider?: string | null
          provider_reference?: string | null
          seller_id?: string
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "seller_withdrawals_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: false
            referencedRelation: "seller_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      shared_coupons: {
        Row: {
          code: string
          created_at: string
          creator_id: string | null
          expires_at: string
          id: string
          items: Json
        }
        Insert: {
          code: string
          created_at?: string
          creator_id?: string | null
          expires_at?: string
          id?: string
          items: Json
        }
        Update: {
          code?: string
          created_at?: string
          creator_id?: string | null
          expires_at?: string
          id?: string
          items?: Json
        }
        Relationships: [
          {
            foreignKeyName: "shared_coupons_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_activity: {
        Row: {
          activity_type: string
          created_at: string
          duration_seconds: number | null
          id: string
          product_id: string
          user_id: string
        }
        Insert: {
          activity_type: string
          created_at?: string
          duration_seconds?: number | null
          id?: string
          product_id: string
          user_id: string
        }
        Update: {
          activity_type?: string
          created_at?: string
          duration_seconds?: number | null
          id?: string
          product_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_activity_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      wallet_transactions: {
        Row: {
          amount: number
          created_at: string
          description: string | null
          id: string
          payment_method: string | null
          provider: string | null
          provider_reference: string | null
          status: string
          type: string
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          description?: string | null
          id?: string
          payment_method?: string | null
          provider?: string | null
          provider_reference?: string | null
          status?: string
          type: string
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          description?: string | null
          id?: string
          payment_method?: string | null
          provider?: string | null
          provider_reference?: string | null
          status?: string
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "wallet_transactions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      public_reviews: {
        Row: {
          comment: string | null
          created_at: string | null
          id: string | null
          is_verified_client: boolean | null
          photos: string[] | null
          product_id: string | null
          rating: number | null
          user_name: string | null
        }
        Insert: {
          comment?: string | null
          created_at?: string | null
          id?: string | null
          is_verified_client?: boolean | null
          photos?: string[] | null
          product_id?: string | null
          rating?: number | null
          user_name?: string | null
        }
        Update: {
          comment?: string | null
          created_at?: string | null
          id?: string | null
          is_verified_client?: boolean | null
          photos?: string[] | null
          product_id?: string | null
          rating?: number | null
          user_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "reviews_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      cancel_premium_auto_renew: { Args: never; Returns: Json }
      check_referral_code_exists: { Args: { p_code: string }; Returns: boolean }
      cleanup_expired_otps: { Args: never; Returns: undefined }
      consume_promo_code: {
        Args: {
          p_discount_amount: number
          p_order_id: string
          p_promo_code_id: string
          p_user_id: string
        }
        Returns: undefined
      }
      create_otp_code: {
        Args: { p_code: string; p_phone: string }
        Returns: string
      }
      debit_seller_wallet: {
        Args: { p_amount: number; p_seller_id: string }
        Returns: boolean
      }
      generate_referral_code: { Args: { p_user_id: string }; Returns: string }
      get_or_create_support_conversation:
        | { Args: never; Returns: string }
        | { Args: { p_custom_order_id?: string }; Returns: string }
      get_seller_commission_rate: {
        Args: { p_seller_id: string }
        Returns: number
      }
      get_seller_tier: {
        Args: { p_seller_id: string }
        Returns: Database["public"]["Enums"]["subscription_tier"]
      }
      is_admin: { Args: never; Returns: boolean }
      is_verified_seller: { Args: { p_user_id?: string }; Returns: boolean }
      log_admin_action: {
        Args: {
          p_action: string
          p_details?: Json
          p_target_id?: string
          p_target_type: string
        }
        Returns: string
      }
      refund_seller_wallet: {
        Args: { p_amount: number; p_seller_id: string }
        Returns: undefined
      }
      renew_premium_subscriptions: { Args: never; Returns: Json }
      set_conversation_resolved: {
        Args: { p_conversation_id: string; p_resolved: boolean }
        Returns: Json
      }
      sponsor_product: {
        Args: { p_days: number; p_product_id: string }
        Returns: Json
      }
      subscribe_seller_premium: {
        Args: { p_auto_renew?: boolean }
        Returns: Json
      }
      validate_promo_code: {
        Args: { p_code: string; p_order_total: number; p_user_id: string }
        Returns: Json
      }
      validate_referral_code: { Args: { p_code: string }; Returns: string }
      verify_admin_password: {
        Args: { input_password: string }
        Returns: boolean
      }
      verify_otp_code: {
        Args: { p_code: string; p_phone: string }
        Returns: boolean
      }
    }
    Enums: {
      escrow_status: "held" | "released" | "refunded"
      seller_status: "pending" | "verified" | "rejected"
      subscription_tier: "free" | "premium"
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
      escrow_status: ["held", "released", "refunded"],
      seller_status: ["pending", "verified", "rejected"],
      subscription_tier: ["free", "premium"],
    },
  },
} as const
