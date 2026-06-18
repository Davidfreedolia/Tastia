export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      admins: {
        Row: { added_at: string; user_id: string }
        Insert: { added_at?: string; user_id: string }
        Update: { added_at?: string; user_id?: string }
        Relationships: []
      }
      avatars: {
        Row: {
          active: boolean
          created_at: string
          external_avatar_id: string | null
          id: string
          name: string
          persona_prompt_en: string | null
          persona_prompt_es: string | null
          provider: string | null
          updated_at: string
          voice_id: string | null
        }
        Insert: {
          active?: boolean
          created_at?: string
          external_avatar_id?: string | null
          id?: string
          name: string
          persona_prompt_en?: string | null
          persona_prompt_es?: string | null
          provider?: string | null
          updated_at?: string
          voice_id?: string | null
        }
        Update: {
          active?: boolean
          created_at?: string
          external_avatar_id?: string | null
          id?: string
          name?: string
          persona_prompt_en?: string | null
          persona_prompt_es?: string | null
          provider?: string | null
          updated_at?: string
          voice_id?: string | null
        }
        Relationships: []
      }
      brand_assets: {
        Row: {
          created_at: string
          file_url: string
          id: string
          language: string | null
          name: string
          notes: string | null
          type: Database["public"]["Enums"]["brand_asset_type"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          file_url: string
          id?: string
          language?: string | null
          name: string
          notes?: string | null
          type: Database["public"]["Enums"]["brand_asset_type"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          file_url?: string
          id?: string
          language?: string | null
          name?: string
          notes?: string | null
          type?: Database["public"]["Enums"]["brand_asset_type"]
          updated_at?: string
        }
        Relationships: []
      }
      clients: {
        Row: {
          address_line: string | null
          city: string | null
          country: string | null
          created_at: string
          email: string | null
          full_name: string
          id: string
          notes: string | null
          phone: string | null
          postal_code: string | null
          province: string | null
          updated_at: string
        }
        Insert: {
          address_line?: string | null
          city?: string | null
          country?: string | null
          created_at?: string
          email?: string | null
          full_name: string
          id?: string
          notes?: string | null
          phone?: string | null
          postal_code?: string | null
          province?: string | null
          updated_at?: string
        }
        Update: {
          address_line?: string | null
          city?: string | null
          country?: string | null
          created_at?: string
          email?: string | null
          full_name?: string
          id?: string
          notes?: string | null
          phone?: string | null
          postal_code?: string | null
          province?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      game_questions: {
        Row: {
          active: boolean
          correct_answer: string | null
          created_at: string
          id: string
          options: Json | null
          points: number
          text_en: string | null
          text_es: string
          type: Database["public"]["Enums"]["question_type"]
          updated_at: string
          wine_id: string | null
        }
        Insert: {
          active?: boolean
          correct_answer?: string | null
          created_at?: string
          id?: string
          options?: Json | null
          points?: number
          text_en?: string | null
          text_es: string
          type: Database["public"]["Enums"]["question_type"]
          updated_at?: string
          wine_id?: string | null
        }
        Update: {
          active?: boolean
          correct_answer?: string | null
          created_at?: string
          id?: string
          options?: Json | null
          points?: number
          text_en?: string | null
          text_es?: string
          type?: Database["public"]["Enums"]["question_type"]
          updated_at?: string
          wine_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "game_questions_wine_id_fkey"
            columns: ["wine_id"]
            isOneToOne: false
            referencedRelation: "wines"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory: {
        Row: {
          id: string
          location: string | null
          product_id: string | null
          qty_on_hand: number
          updated_at: string
          wine_id: string | null
        }
        Insert: {
          id?: string
          location?: string | null
          product_id?: string | null
          qty_on_hand?: number
          updated_at?: string
          wine_id?: string | null
        }
        Update: {
          id?: string
          location?: string | null
          product_id?: string | null
          qty_on_hand?: number
          updated_at?: string
          wine_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "inventory_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_wine_id_fkey"
            columns: ["wine_id"]
            isOneToOne: false
            referencedRelation: "wines"
            referencedColumns: ["id"]
          },
        ]
      }
      order_items: {
        Row: {
          description: string
          id: string
          order_id: string
          pack_tier_id: string | null
          product_id: string | null
          qty: number
          unit_price_cents: number
        }
        Insert: {
          description: string
          id?: string
          order_id: string
          pack_tier_id?: string | null
          product_id?: string | null
          qty?: number
          unit_price_cents?: number
        }
        Update: {
          description?: string
          id?: string
          order_id?: string
          pack_tier_id?: string | null
          product_id?: string | null
          qty?: number
          unit_price_cents?: number
        }
        Relationships: [
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      order_wines: {
        Row: {
          created_at: string
          id: string
          order_id: string
          pack_tier_id: string | null
          position: number
          wine_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          order_id: string
          pack_tier_id?: string | null
          position: number
          wine_id: string
        }
        Update: {
          created_at?: string
          id?: string
          order_id?: string
          pack_tier_id?: string | null
          position?: number
          wine_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "order_wines_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_wines_pack_tier_id_fkey"
            columns: ["pack_tier_id"]
            isOneToOne: false
            referencedRelation: "pack_tiers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_wines_wine_id_fkey"
            columns: ["wine_id"]
            isOneToOne: false
            referencedRelation: "wines"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          access_code: string | null
          client_id: string | null
          created_at: string
          email: string
          id: string
          is_first_order: boolean
          phone: string | null
          ship_address_line: string | null
          ship_city: string | null
          ship_country: string | null
          ship_name: string | null
          ship_postal_code: string | null
          ship_province: string | null
          shipping_cents: number
          status: Database["public"]["Enums"]["order_status"]
          stripe_session_id: string | null
          subtotal_cents: number
          total_cents: number
          updated_at: string
        }
        Insert: {
          access_code?: string | null
          client_id?: string | null
          created_at?: string
          email: string
          id?: string
          is_first_order?: boolean
          phone?: string | null
          ship_address_line?: string | null
          ship_city?: string | null
          ship_country?: string | null
          ship_name?: string | null
          ship_postal_code?: string | null
          ship_province?: string | null
          shipping_cents?: number
          status?: Database["public"]["Enums"]["order_status"]
          stripe_session_id?: string | null
          subtotal_cents?: number
          total_cents?: number
          updated_at?: string
        }
        Update: {
          access_code?: string | null
          client_id?: string | null
          created_at?: string
          email?: string
          id?: string
          is_first_order?: boolean
          phone?: string | null
          ship_address_line?: string | null
          ship_city?: string | null
          ship_country?: string | null
          ship_name?: string | null
          ship_postal_code?: string | null
          ship_province?: string | null
          shipping_cents?: number
          status?: Database["public"]["Enums"]["order_status"]
          stripe_session_id?: string | null
          subtotal_cents?: number
          total_cents?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "orders_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      pack_tier_components: {
        Row: {
          first_order_only: boolean
          id: string
          pack_tier_id: string
          product_id: string
          qty: number
        }
        Insert: {
          first_order_only?: boolean
          id?: string
          pack_tier_id: string
          product_id: string
          qty?: number
        }
        Update: {
          first_order_only?: boolean
          id?: string
          pack_tier_id?: string
          product_id?: string
          qty?: number
        }
        Relationships: [
          {
            foreignKeyName: "pack_tier_components_pack_tier_id_fkey"
            columns: ["pack_tier_id"]
            isOneToOne: false
            referencedRelation: "pack_tiers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pack_tier_components_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      pack_tiers: {
        Row: {
          active: boolean
          band: Database["public"]["Enums"]["price_band"]
          bottle_price_max_cents: number | null
          bottle_price_min_cents: number | null
          created_at: string
          id: string
          name_en: string | null
          name_es: string
          pack_price_cents: number
          slug: string
          sort_order: number
          tagline_en: string | null
          tagline_es: string | null
          updated_at: string
          wine_count: number
        }
        Insert: {
          active?: boolean
          band: Database["public"]["Enums"]["price_band"]
          bottle_price_max_cents?: number | null
          bottle_price_min_cents?: number | null
          created_at?: string
          id?: string
          name_en?: string | null
          name_es: string
          pack_price_cents: number
          slug: string
          sort_order?: number
          tagline_en?: string | null
          tagline_es?: string | null
          updated_at?: string
          wine_count?: number
        }
        Update: {
          active?: boolean
          band?: Database["public"]["Enums"]["price_band"]
          bottle_price_max_cents?: number | null
          bottle_price_min_cents?: number | null
          created_at?: string
          id?: string
          name_en?: string | null
          name_es?: string
          pack_price_cents?: number
          slug?: string
          sort_order?: number
          tagline_en?: string | null
          tagline_es?: string | null
          updated_at?: string
          wine_count?: number
        }
        Relationships: []
      }
      products: {
        Row: {
          active: boolean
          cost_cents: number | null
          created_at: string
          description_en: string | null
          description_es: string | null
          id: string
          image_url: string | null
          kind: Database["public"]["Enums"]["product_kind"]
          name_en: string | null
          name_es: string
          sku: string | null
          supplier_id: string | null
          updated_at: string
        }
        Insert: {
          active?: boolean
          cost_cents?: number | null
          created_at?: string
          description_en?: string | null
          description_es?: string | null
          id?: string
          image_url?: string | null
          kind: Database["public"]["Enums"]["product_kind"]
          name_en?: string | null
          name_es: string
          sku?: string | null
          supplier_id?: string | null
          updated_at?: string
        }
        Update: {
          active?: boolean
          cost_cents?: number | null
          created_at?: string
          description_en?: string | null
          description_es?: string | null
          id?: string
          image_url?: string | null
          kind?: Database["public"]["Enums"]["product_kind"]
          name_en?: string | null
          name_es?: string
          sku?: string | null
          supplier_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "products_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      purchase_items: {
        Row: {
          description: string | null
          id: string
          product_id: string | null
          purchase_id: string
          qty: number
          unit_cost_cents: number
          wine_id: string | null
        }
        Insert: {
          description?: string | null
          id?: string
          product_id?: string | null
          purchase_id: string
          qty?: number
          unit_cost_cents?: number
          wine_id?: string | null
        }
        Update: {
          description?: string | null
          id?: string
          product_id?: string | null
          purchase_id?: string
          qty?: number
          unit_cost_cents?: number
          wine_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "purchase_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_items_purchase_id_fkey"
            columns: ["purchase_id"]
            isOneToOne: false
            referencedRelation: "purchases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_items_wine_id_fkey"
            columns: ["wine_id"]
            isOneToOne: false
            referencedRelation: "wines"
            referencedColumns: ["id"]
          },
        ]
      }
      purchases: {
        Row: {
          created_at: string
          id: string
          invoice_number: string | null
          notes: string | null
          purchase_date: string
          status: Database["public"]["Enums"]["purchase_status"]
          supplier_id: string | null
          total_cents: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          invoice_number?: string | null
          notes?: string | null
          purchase_date?: string
          status?: Database["public"]["Enums"]["purchase_status"]
          supplier_id?: string | null
          total_cents?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          invoice_number?: string | null
          notes?: string | null
          purchase_date?: string
          status?: Database["public"]["Enums"]["purchase_status"]
          supplier_id?: string | null
          total_cents?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "purchases_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      shipping_zones: {
        Row: {
          active: boolean
          id: string
          lead_time_hours: number | null
          name_en: string | null
          name_es: string
          price_cents: number
        }
        Insert: {
          active?: boolean
          id?: string
          lead_time_hours?: number | null
          name_en?: string | null
          name_es: string
          price_cents?: number
        }
        Update: {
          active?: boolean
          id?: string
          lead_time_hours?: number | null
          name_en?: string | null
          name_es?: string
          price_cents?: number
        }
        Relationships: []
      }
      supplier_invoices: {
        Row: {
          amount_cents: number
          created_at: string
          due_date: string | null
          file_url: string | null
          id: string
          issue_date: string | null
          notes: string | null
          number: string | null
          status: Database["public"]["Enums"]["invoice_status"]
          supplier_id: string
          updated_at: string
        }
        Insert: {
          amount_cents?: number
          created_at?: string
          due_date?: string | null
          file_url?: string | null
          id?: string
          issue_date?: string | null
          notes?: string | null
          number?: string | null
          status?: Database["public"]["Enums"]["invoice_status"]
          supplier_id: string
          updated_at?: string
        }
        Update: {
          amount_cents?: number
          created_at?: string
          due_date?: string | null
          file_url?: string | null
          id?: string
          issue_date?: string | null
          notes?: string | null
          number?: string | null
          status?: Database["public"]["Enums"]["invoice_status"]
          supplier_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "supplier_invoices_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      suppliers: {
        Row: {
          active: boolean
          address_line: string | null
          city: string | null
          contact_name: string | null
          country: string | null
          created_at: string
          email: string | null
          id: string
          name: string
          notes: string | null
          phone: string | null
          postal_code: string | null
          province: string | null
          updated_at: string
        }
        Insert: {
          active?: boolean
          address_line?: string | null
          city?: string | null
          contact_name?: string | null
          country?: string | null
          created_at?: string
          email?: string | null
          id?: string
          name: string
          notes?: string | null
          phone?: string | null
          postal_code?: string | null
          province?: string | null
          updated_at?: string
        }
        Update: {
          active?: boolean
          address_line?: string | null
          city?: string | null
          contact_name?: string | null
          country?: string | null
          created_at?: string
          email?: string | null
          id?: string
          name?: string
          notes?: string | null
          phone?: string | null
          postal_code?: string | null
          province?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      tasting_notes: {
        Row: {
          boca_en: string | null
          boca_es: string | null
          curiosidad_en: string | null
          curiosidad_es: string | null
          maridaje_en: string | null
          maridaje_es: string | null
          nariz_en: string | null
          nariz_es: string | null
          pdf_url: string | null
          updated_at: string
          vista_en: string | null
          vista_es: string | null
          wine_id: string
        }
        Insert: {
          boca_en?: string | null
          boca_es?: string | null
          curiosidad_en?: string | null
          curiosidad_es?: string | null
          maridaje_en?: string | null
          maridaje_es?: string | null
          nariz_en?: string | null
          nariz_es?: string | null
          pdf_url?: string | null
          updated_at?: string
          vista_en?: string | null
          vista_es?: string | null
          wine_id: string
        }
        Update: {
          boca_en?: string | null
          boca_es?: string | null
          curiosidad_en?: string | null
          curiosidad_es?: string | null
          maridaje_en?: string | null
          maridaje_es?: string | null
          nariz_en?: string | null
          nariz_es?: string | null
          pdf_url?: string | null
          updated_at?: string
          vista_en?: string | null
          vista_es?: string | null
          wine_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tasting_notes_wine_id_fkey"
            columns: ["wine_id"]
            isOneToOne: true
            referencedRelation: "wines"
            referencedColumns: ["id"]
          },
        ]
      }
      wines: {
        Row: {
          active: boolean
          bodega: string | null
          bottle_price_cents: number | null
          cost_cents: number | null
          created_at: string
          grape: string | null
          id: string
          image_url: string | null
          name: string
          price_band: Database["public"]["Enums"]["price_band"] | null
          region_en: string | null
          region_es: string | null
          sku: string | null
          supplier_id: string | null
          updated_at: string
          vintage: number | null
        }
        Insert: {
          active?: boolean
          bodega?: string | null
          bottle_price_cents?: number | null
          cost_cents?: number | null
          created_at?: string
          grape?: string | null
          id?: string
          image_url?: string | null
          name: string
          price_band?: Database["public"]["Enums"]["price_band"] | null
          region_en?: string | null
          region_es?: string | null
          sku?: string | null
          supplier_id?: string | null
          updated_at?: string
          vintage?: number | null
        }
        Update: {
          active?: boolean
          bodega?: string | null
          bottle_price_cents?: number | null
          cost_cents?: number | null
          created_at?: string
          grape?: string | null
          id?: string
          image_url?: string | null
          name?: string
          price_band?: Database["public"]["Enums"]["price_band"] | null
          region_en?: string | null
          region_es?: string | null
          sku?: string | null
          supplier_id?: string | null
          updated_at?: string
          vintage?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "wines_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: { [_ in never]: never }
    Functions: {
      assemble_order_pack: {
        Args: { p_order_id: string; p_pack_slug: string }
        Returns: number
      }
      is_admin: { Args: never; Returns: boolean }
    }
    Enums: {
      brand_asset_type: "logo" | "tarjeta_impresion" | "etiqueta" | "imagen" | "otro"
      invoice_status: "pendiente" | "pagada" | "vencida"
      order_status: "pendiente" | "pagado" | "enviado" | "entregado" | "cancelado"
      price_band: "basico" | "normal" | "premium"
      product_kind:
        | "vino"
        | "caja"
        | "copa"
        | "abridor"
        | "bolsa_cata"
        | "tarjetas_juego"
        | "sobre_lacrado"
        | "otro"
      purchase_status: "borrador" | "pedido" | "recibido" | "pagado"
      question_type: "variedad" | "denominacion" | "precio" | "anada" | "trivia"
    }
    CompositeTypes: { [_ in never]: never }
  }
}
