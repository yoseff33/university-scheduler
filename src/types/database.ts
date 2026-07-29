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
          active_cups: number  // <-- أضيف هذا العمود
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          points_balance?: number
          lifetime_points?: number
          tier?: 'bronze' | 'silver' | 'gold' | 'platinum'
          active_cups?: number  // <-- أضيف هذا العمود
          created_at?: string
          updated_at?: string
        }
        Update: {
          points_balance?: number
          lifetime_points?: number
          tier?: 'bronze' | 'silver' | 'gold' | 'platinum'
          active_cups?: number  // <-- أضيف هذا العمود
          updated_at?: string
        }
        Relationships: [{ foreignKeyName: 'loyalty_accounts_user_id_fkey', columns: ['user_id'], referencedRelation: 'users', referencedColumns: ['id'] }]
      }
      loyalty_settings: {
        Row: {
          id: number
          cups_required: number          // موجود بالفعل
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
      // باقي الجداول كما هي ...
      loyalty_cups: { /* ... */ },
      loyalty_rewards: { /* ... */ },
      loyalty_reward_cups: { /* ... */ },
      loyalty_transactions: { /* ... */ },
      card_backgrounds: { /* ... */ },
      card_stickers: { /* ... */ },
      customer_card_designs: { /* ... */ },
      stickers_library: { /* ... */ },
      customer_achievements: { /* ... */ },
      customer_stickers: { /* ... */ },
      loyalty_card_designs: { /* ... */ },
      notifications: { /* ... */ }
    }
    Views: {}
    Functions: { /* ... */ }
    Enums: { app_role: AppRole }
  }
}

export type Profile = Database['public']['Tables']['profiles']['Row']
export type UserRole = Database['public']['Tables']['user_roles']['Row']
export type Branch = Database['public']['Tables']['branches']['Row']
export type Product = Database['public']['Tables']['products']['Row']
export type Order = Database['public']['Tables']['orders']['Row']
export type Cart = Database['public']['Tables']['carts']['Row']
export type CustomerCar = Database['public']['Tables']['customer_cars']['Row']
// يمكن إضافة أنواع أخرى حسب الحاجة
