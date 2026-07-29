// src/types/database.ts
export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type AppRole = 'customer' | 'cashier' | 'branch_manager' | 'admin' | 'super_admin'

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          phone: string | null
          membership_number: string
          membership_qr_token: string
          name: string | null
          avatar_url: string | null
          preferred_branch_id: string | null
          marketing_consent: boolean
          loyalty_points: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          phone?: string | null
          membership_number?: string
          membership_qr_token?: string
          name?: string | null
          avatar_url?: string | null
          preferred_branch_id?: string | null
          marketing_consent?: boolean
          loyalty_points?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          name?: string | null
          avatar_url?: string | null
          preferred_branch_id?: string | null
          marketing_consent?: boolean
          loyalty_points?: number
          updated_at?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          user_id: string
          role: AppRole
          created_at: string
          updated_at: string
        }
        Insert: {
          user_id: string
          role?: AppRole
          created_at?: string
          updated_at?: string
        }
        Update: {
          role?: AppRole
          updated_at?: string
        }
        Relationships: [{ foreignKeyName: 'user_roles_user_id_fkey', columns: ['user_id'], referencedRelation: 'users', referencedColumns: ['id'] }]
      }
      audit_logs: {
        Row: {
          id: number
          actor_id: string | null
          action: string
          entity_type: string
          entity_id: string | null
          old_data: Json | null
          new_data: Json | null
          ip_metadata: Json | null
          created_at: string
        }
        Insert: {
          id?: number
          actor_id?: string | null
          action: string
          entity_type: string
          entity_id?: string | null
          old_data?: Json | null
          new_data?: Json | null
          ip_metadata?: Json | null
          created_at?: string
        }
        Update: never
        Relationships: [{ foreignKeyName: 'audit_logs_actor_id_fkey', columns: ['actor_id'], referencedRelation: 'users', referencedColumns: ['id'] }]
      }
      branches: {
        Row: {
          id: string
          name: string
          slug: string
          address: string | null
          city: string | null
          latitude: number | null
          longitude: number | null
          phone: string | null
          opening_time: string | null
          closing_time: string | null
          is_active: boolean
          accepts_orders: boolean
          accepts_car_delivery: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          slug: string
          address?: string | null
          city?: string | null
          latitude?: number | null
          longitude?: number | null
          phone?: string | null
          opening_time?: string | null
          closing_time?: string | null
          is_active?: boolean
          accepts_orders?: boolean
          accepts_car_delivery?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          name?: string
          slug?: string
          address?: string | null
          city?: string | null
          latitude?: number | null
          longitude?: number | null
          phone?: string | null
          opening_time?: string | null
          closing_time?: string | null
          is_active?: boolean
          accepts_orders?: boolean
          accepts_car_delivery?: boolean
          updated_at?: string
        }
        Relationships: []
      }
      menu_categories: {
        Row: {
          id: string
          branch_id: string | null
          name: string
          description: string | null
          image_url: string | null
          sort_order: number
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          branch_id?: string | null
          name: string
          description?: string | null
          image_url?: string | null
          sort_order?: number
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          name?: string
          description?: string | null
          image_url?: string | null
          sort_order?: number
          is_active?: boolean
          updated_at?: string
        }
        Relationships: [{ foreignKeyName: 'menu_categories_branch_id_fkey', columns: ['branch_id'], referencedRelation: 'branches', referencedColumns: ['id'] }]
      }
      products: {
        Row: {
          id: string
          category_id: string | null
          name: string
          description: string | null
          image_url: string | null
          base_price: number
          is_available: boolean
          is_active: boolean
          preparation_minutes: number
          sort_order: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          category_id?: string | null
          name: string
          description?: string | null
          image_url?: string | null
          base_price: number
          is_available?: boolean
          is_active?: boolean
          preparation_minutes?: number
          sort_order?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          name?: string
          description?: string | null
          image_url?: string | null
          base_price?: number
          is_available?: boolean
          is_active?: boolean
          preparation_minutes?: number
          sort_order?: number
          updated_at?: string
        }
        Relationships: [{ foreignKeyName: 'products_category_id_fkey', columns: ['category_id'], referencedRelation: 'menu_categories', referencedColumns: ['id'] }]
      }
      product_sizes: {
        Row: {
          id: string
          product_id: string
          name: string
          price_adjustment: number
          is_default: boolean
          is_active: boolean
          sort_order: number
          created_at: string
        }
        Insert: {
          id?: string
          product_id: string
          name: string
          price_adjustment?: number
          is_default?: boolean
          is_active?: boolean
          sort_order?: number
          created_at?: string
        }
        Update: {
          name?: string
          price_adjustment?: number
          is_default?: boolean
          is_active?: boolean
          sort_order?: number
        }
        Relationships: [{ foreignKeyName: 'product_sizes_product_id_fkey', columns: ['product_id'], referencedRelation: 'products', referencedColumns: ['id'] }]
      }
      addon_groups: {
        Row: {
          id: string
          name: string
          selection_type: 'single' | 'multiple'
          min_selection: number
          max_selection: number
          is_required: boolean
          sort_order: number
          is_active: boolean
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          selection_type?: 'single' | 'multiple'
          min_selection?: number
          max_selection?: number
          is_required?: boolean
          sort_order?: number
          is_active?: boolean
          created_at?: string
        }
        Update: {
          name?: string
          selection_type?: 'single' | 'multiple'
          min_selection?: number
          max_selection?: number
          is_required?: boolean
          sort_order?: number
          is_active?: boolean
        }
        Relationships: []
      }
      addon_options: {
        Row: {
          id: string
          group_id: string
          name: string
          price: number
          is_active: boolean
          sort_order: number
          created_at: string
        }
        Insert: {
          id?: string
          group_id: string
          name: string
          price?: number
          is_active?: boolean
          sort_order?: number
          created_at?: string
        }
        Update: {
          name?: string
          price?: number
          is_active?: boolean
          sort_order?: number
        }
        Relationships: [{ foreignKeyName: 'addon_options_group_id_fkey', columns: ['group_id'], referencedRelation: 'addon_groups', referencedColumns: ['id'] }]
      }
      product_addon_groups: {
        Row: {
          product_id: string
          addon_group_id: string
          sort_order: number
        }
        Insert: {
          product_id: string
          addon_group_id: string
          sort_order?: number
        }
        Update: {
          sort_order?: number
        }
        Relationships: [
          { foreignKeyName: 'product_addon_groups_product_id_fkey', columns: ['product_id'], referencedRelation: 'products', referencedColumns: ['id'] },
          { foreignKeyName: 'product_addon_groups_addon_group_id_fkey', columns: ['addon_group_id'], referencedRelation: 'addon_groups', referencedColumns: ['id'] }
        ]
      }
      customer_cars: {
        Row: {
          id: string
          user_id: string
          name: string
          make: string | null
          model: string | null
          color: string | null
          plate_number: string | null
          is_default: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          name: string
          make?: string | null
          model?: string | null
          color?: string | null
          plate_number?: string | null
          is_default?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          name?: string
          make?: string | null
          model?: string | null
          color?: string | null
          plate_number?: string | null
          is_default?: boolean
          updated_at?: string
        }
        Relationships: [{ foreignKeyName: 'customer_cars_user_id_fkey', columns: ['user_id'], referencedRelation: 'users', referencedColumns: ['id'] }]
      }
      carts: {
        Row: {
          id: string
          user_id: string
          branch_id: string | null
          status: 'open' | 'closed' | 'abandoned'
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          branch_id?: string | null
          status?: 'open' | 'closed' | 'abandoned'
          created_at?: string
          updated_at?: string
        }
        Update: {
          branch_id?: string | null
          status?: 'open' | 'closed' | 'abandoned'
          updated_at?: string
        }
        Relationships: [
          { foreignKeyName: 'carts_user_id_fkey', columns: ['user_id'], referencedRelation: 'users', referencedColumns: ['id'] },
          { foreignKeyName: 'carts_branch_id_fkey', columns: ['branch_id'], referencedRelation: 'branches', referencedColumns: ['id'] }
        ]
      }
      cart_items: {
        Row: {
          id: string
          cart_id: string
          product_id: string
          size_id: string | null
          quantity: number
          unit_price: number
          notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          cart_id: string
          product_id: string
          size_id?: string | null
          quantity: number
          unit_price: number
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          quantity?: number
          unit_price?: number
          notes?: string | null
          updated_at?: string
        }
        Relationships: [
          { foreignKeyName: 'cart_items_cart_id_fkey', columns: ['cart_id'], referencedRelation: 'carts', referencedColumns: ['id'] },
          { foreignKeyName: 'cart_items_product_id_fkey', columns: ['product_id'], referencedRelation: 'products', referencedColumns: ['id'] },
          { foreignKeyName: 'cart_items_size_id_fkey', columns: ['size_id'], referencedRelation: 'product_sizes', referencedColumns: ['id'] }
        ]
      }
      cart_item_addons: {
        Row: {
          id: string
          cart_item_id: string
          addon_option_id: string
          price: number
          created_at: string
        }
        Insert: {
          id?: string
          cart_item_id: string
          addon_option_id: string
          price?: number
          created_at?: string
        }
        Update: never
        Relationships: [
          { foreignKeyName: 'cart_item_addons_cart_item_id_fkey', columns: ['cart_item_id'], referencedRelation: 'cart_items', referencedColumns: ['id'] },
          { foreignKeyName: 'cart_item_addons_addon_option_id_fkey', columns: ['addon_option_id'], referencedRelation: 'addon_options', referencedColumns: ['id'] }
        ]
      }
      orders: {
        Row: {
          id: string
          order_number: string
          user_id: string
          branch_id: string | null
          car_id: string | null
          fulfillment_type: 'pickup' | 'car_delivery' | 'dine_in'
          status: 'pending' | 'accepted' | 'preparing' | 'ready' | 'customer_arrived' | 'out_for_delivery' | 'completed' | 'cancelled' | 'rejected'
          payment_method: string
          payment_status: 'unpaid' | 'paid' | 'refunded'
          subtotal: number
          tax_amount: number
          discount_amount: number
          total: number
          customer_notes: string | null
          staff_notes: string | null
          estimated_ready_at: string | null
          placed_at: string
          accepted_at: string | null
          preparing_at: string | null
          ready_at: string | null
          customer_arrived_at: string | null
          out_for_delivery_at: string | null
          completed_at: string | null
          cancelled_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          order_number: string
          user_id: string
          branch_id?: string | null
          car_id?: string | null
          fulfillment_type: 'pickup' | 'car_delivery' | 'dine_in'
          status?: 'pending' | 'accepted' | 'preparing' | 'ready' | 'customer_arrived' | 'out_for_delivery' | 'completed' | 'cancelled' | 'rejected'
          payment_method?: string
          payment_status?: 'unpaid' | 'paid' | 'refunded'
          subtotal: number
          tax_amount?: number
          discount_amount?: number
          total: number
          customer_notes?: string | null
          staff_notes?: string | null
          estimated_ready_at?: string | null
          placed_at?: string
          accepted_at?: string | null
          preparing_at?: string | null
          ready_at?: string | null
          customer_arrived_at?: string | null
          out_for_delivery_at?: string | null
          completed_at?: string | null
          cancelled_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          status?: 'pending' | 'accepted' | 'preparing' | 'ready' | 'customer_arrived' | 'out_for_delivery' | 'completed' | 'cancelled' | 'rejected'
          payment_status?: 'unpaid' | 'paid' | 'refunded'
          customer_notes?: string | null
          staff_notes?: string | null
          estimated_ready_at?: string | null
          accepted_at?: string | null
          preparing_at?: string | null
          ready_at?: string | null
          customer_arrived_at?: string | null
          out_for_delivery_at?: string | null
          completed_at?: string | null
          cancelled_at?: string | null
          updated_at?: string
        }
        Relationships: [
          { foreignKeyName: 'orders_user_id_fkey', columns: ['user_id'], referencedRelation: 'users', referencedColumns: ['id'] },
          { foreignKeyName: 'orders_branch_id_fkey', columns: ['branch_id'], referencedRelation: 'branches', referencedColumns: ['id'] },
          { foreignKeyName: 'orders_car_id_fkey', columns: ['car_id'], referencedRelation: 'customer_cars', referencedColumns: ['id'] }
        ]
      }
      order_items: {
        Row: {
          id: string
          order_id: string
          product_id: string | null
          product_name: string
          size_name: string | null
          quantity: number
          unit_price: number
          total_price: number
          notes: string | null
          created_at: string
        }
        Insert: {
          id?: string
          order_id: string
          product_id?: string | null
          product_name: string
          size_name?: string | null
          quantity: number
          unit_price: number
          total_price: number
          notes?: string | null
          created_at?: string
        }
        Update: never
        Relationships: [
          { foreignKeyName: 'order_items_order_id_fkey', columns: ['order_id'], referencedRelation: 'orders', referencedColumns: ['id'] },
          { foreignKeyName: 'order_items_product_id_fkey', columns: ['product_id'], referencedRelation: 'products', referencedColumns: ['id'] }
        ]
      }
      order_item_addons: {
        Row: {
          id: string
          order_item_id: string
          addon_option_id: string | null
          addon_name: string
          price: number
          created_at: string
        }
        Insert: {
          id?: string
          order_item_id: string
          addon_option_id?: string | null
          addon_name: string
          price?: number
          created_at?: string
        }
        Update: never
        Relationships: [
          { foreignKeyName: 'order_item_addons_order_item_id_fkey', columns: ['order_item_id'], referencedRelation: 'order_items', referencedColumns: ['id'] },
          { foreignKeyName: 'order_item_addons_addon_option_id_fkey', columns: ['addon_option_id'], referencedRelation: 'addon_options', referencedColumns: ['id'] }
        ]
      }
      order_status_logs: {
        Row: {
          id: string
          order_id: string
          old_status: string | null
          new_status: string
          changed_by: string | null
          notes: string | null
          created_at: string
        }
        Insert: {
          id?: string
          order_id: string
          old_status?: string | null
          new_status: string
          changed_by?: string | null
          notes?: string | null
          created_at?: string
        }
        Update: never
        Relationships: [
          { foreignKeyName: 'order_status_logs_order_id_fkey', columns: ['order_id'], referencedRelation: 'orders', referencedColumns: ['id'] },
          { foreignKeyName: 'order_status_logs_changed_by_fkey', columns: ['changed_by'], referencedRelation: 'users', referencedColumns: ['id'] }
        ]
      }
      loyalty_accounts: {
        Row: {
          id: string
          user_id: string
          points_balance: number
          lifetime_points: number
          tier: 'bronze' | 'silver' | 'gold' | 'platinum'
          active_cups: number  // تمت إضافته
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          points_balance?: number
          lifetime_points?: number
          tier?: 'bronze' | 'silver' | 'gold' | 'platinum'
          active_cups?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          points_balance?: number
          lifetime_points?: number
          tier?: 'bronze' | 'silver' | 'gold' | 'platinum'
          active_cups?: number
          updated_at?: string
        }
        Relationships: [{ foreignKeyName: 'loyalty_accounts_user_id_fkey', columns: ['user_id'], referencedRelation: 'users', referencedColumns: ['id'] }]
      }
      loyalty_settings: {
        Row: {
          id: number
          cups_required: number
          minimum_order_amount: number
          reward_type: string
          reward_expiry_days: number | null
          is_program_active: boolean
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          id?: number
          cups_required?: number
          minimum_order_amount?: number
          reward_type?: string
          reward_expiry_days?: number | null
          is_program_active?: boolean
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          cups_required?: number
          minimum_order_amount?: number
          reward_type?: string
          reward_expiry_days?: number | null
          is_program_active?: boolean
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [{ foreignKeyName: 'loyalty_settings_updated_by_fkey', columns: ['updated_by'], referencedRelation: 'profiles', referencedColumns: ['id'] }]
      }
      loyalty_cups: {
        Row: {
          id: string
          customer_id: string
          order_id: string | null
          status: 'active' | 'redeemed' | 'revoked'
          source: 'order' | 'manual_adjustment' | 'promotion' | 'compensation'
          order_amount: number | null
          created_at: string
          redeemed_at: string | null
          revoked_at: string | null
          revoked_reason: string | null
          metadata: Json
        }
        Insert: {
          id?: string
          customer_id: string
          order_id?: string | null
          status?: 'active' | 'redeemed' | 'revoked'
          source?: 'order' | 'manual_adjustment' | 'promotion' | 'compensation'
          order_amount?: number | null
          created_at?: string
          redeemed_at?: string | null
          revoked_at?: string | null
          revoked_reason?: string | null
          metadata?: Json
        }
        Update: {
          status?: 'active' | 'redeemed' | 'revoked'
          redeemed_at?: string | null
          revoked_at?: string | null
          revoked_reason?: string | null
          metadata?: Json
        }
        Relationships: [{ foreignKeyName: 'loyalty_cups_customer_id_fkey', columns: ['customer_id'], referencedRelation: 'profiles', referencedColumns: ['id'] }]
      }
      loyalty_rewards: {
        Row: {
          id: string
          customer_id: string
          reward_code: string
          reward_type: string
          discount_value: number | null
          status: 'active' | 'used' | 'expired' | 'cancelled'
          created_at: string
          expires_at: string | null
          used_at: string | null
          used_order_id: string | null
          metadata: Json
        }
        Insert: {
          id?: string
          customer_id: string
          reward_code: string
          reward_type?: string
          discount_value?: number | null
          status?: 'active' | 'used' | 'expired' | 'cancelled'
          created_at?: string
          expires_at?: string | null
          used_at?: string | null
          used_order_id?: string | null
          metadata?: Json
        }
        Update: {
          status?: 'active' | 'used' | 'expired' | 'cancelled'
          expires_at?: string | null
          used_at?: string | null
          used_order_id?: string | null
          metadata?: Json
        }
        Relationships: [{ foreignKeyName: 'loyalty_rewards_customer_id_fkey', columns: ['customer_id'], referencedRelation: 'profiles', referencedColumns: ['id'] }]
      }
      loyalty_reward_cups: {
        Row: {
          id: string
          reward_id: string
          cup_id: string
          created_at: string
        }
        Insert: {
          id?: string
          reward_id: string
          cup_id: string
          created_at?: string
        }
        Update: never
        Relationships: [
          { foreignKeyName: 'loyalty_reward_cups_reward_id_fkey', columns: ['reward_id'], referencedRelation: 'loyalty_rewards', referencedColumns: ['id'] },
          { foreignKeyName: 'loyalty_reward_cups_cup_id_fkey', columns: ['cup_id'], referencedRelation: 'loyalty_cups', referencedColumns: ['id'] }
        ]
      }
      loyalty_transactions: {
        Row: {
          id: string
          customer_id: string
          transaction_type: 'cup_granted' | 'cup_redeemed' | 'cup_revoked' | 'reward_created' | 'reward_used' | 'reward_expired' | 'manual_adjustment'
          cup_id: string | null
          reward_id: string | null
          order_id: string | null
          description: string | null
          created_by: string | null
          created_at: string
          metadata: Json
        }
        Insert: {
          id?: string
          customer_id: string
          transaction_type: 'cup_granted' | 'cup_redeemed' | 'cup_revoked' | 'reward_created' | 'reward_used' | 'reward_expired' | 'manual_adjustment'
          cup_id?: string | null
          reward_id?: string | null
          order_id?: string | null
          description?: string | null
          created_by?: string | null
          created_at?: string
          metadata?: Json
        }
        Update: never
        Relationships: [
          { foreignKeyName: 'loyalty_transactions_customer_id_fkey', columns: ['customer_id'], referencedRelation: 'profiles', referencedColumns: ['id'] },
          { foreignKeyName: 'loyalty_transactions_cup_id_fkey', columns: ['cup_id'], referencedRelation: 'loyalty_cups', referencedColumns: ['id'] },
          { foreignKeyName: 'loyalty_transactions_reward_id_fkey', columns: ['reward_id'], referencedRelation: 'loyalty_rewards', referencedColumns: ['id'] },
          { foreignKeyName: 'loyalty_transactions_created_by_fkey', columns: ['created_by'], referencedRelation: 'profiles', referencedColumns: ['id'] }
        ]
      }
      card_backgrounds: {
        Row: {
          id: string
          name: string
          image_url: string
          is_active: boolean
          sort_order: number
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          image_url: string
          is_active?: boolean
          sort_order?: number
          created_at?: string
        }
        Update: {
          name?: string
          image_url?: string
          is_active?: boolean
          sort_order?: number
        }
        Relationships: []
      }
      card_stickers: {
        Row: {
          id: string
          name: string
          image_url: string
          category: string | null
          is_active: boolean
          sort_order: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          image_url: string
          category?: string | null
          is_active?: boolean
          sort_order?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          name?: string
          image_url?: string
          category?: string | null
          is_active?: boolean
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      customer_card_designs: {
        Row: {
          id: string
          user_id: string
          background_id: string | null
          design_data: Json
          preview_image_url: string | null
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          background_id?: string | null
          design_data?: Json
          preview_image_url?: string | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          background_id?: string | null
          design_data?: Json
          preview_image_url?: string | null
          is_active?: boolean
          updated_at?: string
        }
        Relationships: [
          { foreignKeyName: 'customer_card_designs_user_id_fkey', columns: ['user_id'], referencedRelation: 'users', referencedColumns: ['id'] },
          { foreignKeyName: 'customer_card_designs_background_id_fkey', columns: ['background_id'], referencedRelation: 'card_backgrounds', referencedColumns: ['id'] }
        ]
      }
      stickers_library: {
        Row: {
          id: string
          name: string
          image_url: string
          storage_path: string | null
          category: string | null
          is_active: boolean
          is_vip_only: boolean
          required_achievement_id: string | null
          sort_order: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          image_url: string
          storage_path?: string | null
          category?: string | null
          is_active?: boolean
          is_vip_only?: boolean
          required_achievement_id?: string | null
          sort_order?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          name?: string
          image_url?: string
          storage_path?: string | null
          category?: string | null
          is_active?: boolean
          is_vip_only?: boolean
          required_achievement_id?: string | null
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      customer_achievements: {
        Row: {
          id: string
          customer_id: string
          achievement_id: string
          unlocked_at: string
          metadata: Json
        }
        Insert: {
          id?: string
          customer_id: string
          achievement_id: string
          unlocked_at?: string
          metadata?: Json
        }
        Update: {
          metadata?: Json
        }
        Relationships: [{ foreignKeyName: 'customer_achievements_customer_id_fkey', columns: ['customer_id'], referencedRelation: 'profiles', referencedColumns: ['id'] }]
      }
      customer_stickers: {
        Row: {
          id: string
          customer_id: string
          image_url: string
          storage_path: string
          original_file_name: string | null
          file_size: number | null
          mime_type: string | null
          created_at: string
        }
        Insert: {
          id?: string
          customer_id: string
          image_url: string
          storage_path: string
          original_file_name?: string | null
          file_size?: number | null
          mime_type?: string | null
          created_at?: string
        }
        Update: never
        Relationships: [{ foreignKeyName: 'customer_stickers_customer_id_fkey', columns: ['customer_id'], referencedRelation: 'profiles', referencedColumns: ['id'] }]
      }
      loyalty_card_designs: {
        Row: {
          id: string
          customer_id: string
          design_name: string
          design_data: Json
          design_version: number
          preview_image_url: string | null
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          customer_id: string
          design_name: string
          design_data: Json
          design_version?: number
          preview_image_url?: string | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          design_name?: string
          design_data?: Json
          design_version?: number
          preview_image_url?: string | null
          is_active?: boolean
          updated_at?: string
        }
        Relationships: [{ foreignKeyName: 'loyalty_card_designs_customer_id_fkey', columns: ['customer_id'], referencedRelation: 'profiles', referencedColumns: ['id'] }]
      }
      notifications: {
        Row: {
          id: string
          user_id: string
          title: string
          message: string | null
          type: string
          entity_type: string | null
          entity_id: string | null
          is_read: boolean
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          title: string
          message?: string | null
          type?: string
          entity_type?: string | null
          entity_id?: string | null
          is_read?: boolean
          created_at?: string
        }
        Update: {
          is_read?: boolean
        }
        Relationships: [{ foreignKeyName: 'notifications_user_id_fkey', columns: ['user_id'], referencedRelation: 'users', referencedColumns: ['id'] }]
      }
    }
    Views: {}
    Functions: {
      has_role: {
        Args: { requested_role: AppRole }
        Returns: boolean
      }
      update_my_profile: {
        Args: {
          p_name: string | null
          p_avatar_url: string | null
          p_marketing_consent: boolean
        }
        Returns: Database['public']['Tables']['profiles']['Row']
      }
      redeem_reward: {
        Args: Record<PropertyKey, never>
        Returns: Json
      }
      grant_cup: {
        Args: {
          p_customer_id: string
          p_order_id: string | null
          p_order_amount?: number | null
          p_source?: 'order' | 'manual_adjustment' | 'promotion' | 'compensation'
          p_metadata?: Json
        }
        Returns: Json
      }
      revoke_cup: {
        Args: {
          p_cup_id: string
          p_reason: string
        }
        Returns: Json
      }
      use_reward: {
        Args: {
          p_reward_code: string
          p_customer_id: string
          p_order_id?: string | null
        }
        Returns: Json
      }
      save_loyalty_card_design: {
        Args: {
          p_design_id: string | null
          p_design_name: string
          p_design_data: Json
          p_preview_image_url?: string | null
          p_activate?: boolean
        }
        Returns: Database['public']['Tables']['loyalty_card_designs']['Row']
      }
      create_order_from_cart: {
        Args: {
          p_cart_id: string
          p_branch_id: string
          p_fulfillment_type: 'pickup' | 'car_delivery' | 'dine_in'
          p_car_id?: string | null
          p_customer_notes?: string | null
          p_payment_method?: string
        }
        Returns: string
      }
    }
    Enums: {
      app_role: AppRole
    }
  }
}

export type Profile = Database['public']['Tables']['profiles']['Row']
export type UserRole = Database['public']['Tables']['user_roles']['Row']
export type Branch = Database['public']['Tables']['branches']['Row']
export type Product = Database['public']['Tables']['products']['Row']
export type Order = Database['public']['Tables']['orders']['Row']
export type Cart = Database['public']['Tables']['carts']['Row']
export type CustomerCar = Database['public']['Tables']['customer_cars']['Row']
