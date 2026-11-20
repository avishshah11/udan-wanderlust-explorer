
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  
  "graphql_public": {
          Tables: {
            [_ in never]: never
          }
          Views: {
            [_ in never]: never
          }
          Functions: {
            "graphql":
{ Args: { "extensions"?: Json,"operationName"?: string,"query"?: string,"variables"?: Json }; Returns: Json
                           }
          }
          Enums: {
            [_ in never]: never
          }
          CompositeTypes: {
            [_ in never]: never
          }
        },"public": {
          Tables: {
            "audit_log": {
                  Row: {
                    "action": string,"actor": string | null,"at": string,"detail": NonNullable<Json>,"id": number,"request_id": string | null,"row_id": string | null,"table_name": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "action": string,"actor"?: string | null,"at"?: string,"detail"?: NonNullable<Json>,"id"?: never,"request_id"?: string | null,"row_id"?: string | null,"table_name"?: string | null
                  }
                  Update: {
                    "action"?: string,"actor"?: string | null,"at"?: string,"detail"?: NonNullable<Json>,"id"?: never,"request_id"?: string | null,"row_id"?: string | null,"table_name"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "audit_log_request_id_fkey"
      columns: ["request_id"]
isOneToOne: false
      referencedRelation: "quote_requests"
      referencedColumns: ["id"]
    }
                  ]
                },"customers": {
                  Row: {
                    "alert_sms": boolean,"alert_whatsapp": boolean,"country": string | null,"created_at": string,"display_currency": string,"email": string,"email_verified_at": string | null,"id": string,"name": string | null,"phone": string | null,"source": Database["public"]['Enums']["request_channel"],"time_zone": string | null,"updated_at": string,"user_id": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "alert_sms"?: boolean,"alert_whatsapp"?: boolean,"country"?: string | null,"created_at"?: string,"display_currency"?: string,"email": string,"email_verified_at"?: string | null,"id"?: string,"name"?: string | null,"phone"?: string | null,"source": Database["public"]['Enums']["request_channel"],"time_zone"?: string | null,"updated_at"?: string,"user_id"?: string | null
                  }
                  Update: {
                    "alert_sms"?: boolean,"alert_whatsapp"?: boolean,"country"?: string | null,"created_at"?: string,"display_currency"?: string,"email"?: string,"email_verified_at"?: string | null,"id"?: string,"name"?: string | null,"phone"?: string | null,"source"?: Database["public"]['Enums']["request_channel"],"time_zone"?: string | null,"updated_at"?: string,"user_id"?: string | null
                  }
                  Relationships: [
                    
                  ]
                },"destinations": {
                  Row: {
                    "best_months": (number)[],"country": string,"created_at": string,"destination_group": string,"is_domestic": boolean,"name": string,"published": boolean,"slug": string,"summary": string | null,"typical_inclusions": (string)[],"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "best_months"?: (number)[],"country": string,"created_at"?: string,"destination_group": string,"is_domestic": boolean,"name": string,"published"?: boolean,"slug": string,"summary"?: string | null,"typical_inclusions"?: (string)[],"updated_at"?: string
                  }
                  Update: {
                    "best_months"?: (number)[],"country"?: string,"created_at"?: string,"destination_group"?: string,"is_domestic"?: boolean,"name"?: string,"published"?: boolean,"slug"?: string,"summary"?: string | null,"typical_inclusions"?: (string)[],"updated_at"?: string
                  }
                  Relationships: [
                    
                  ]
                },"documents": {
                  Row: {
                    "content_type": string | null,"file_name": string,"id": string,"request_id": string,"size_bytes": number | null,"storage_path": string,"type": Database["public"]['Enums']["document_type"],"uploaded_at": string,"uploaded_by": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "content_type"?: string | null,"file_name": string,"id"?: string,"request_id": string,"size_bytes"?: number | null,"storage_path": string,"type": Database["public"]['Enums']["document_type"],"uploaded_at"?: string,"uploaded_by"?: string | null
                  }
                  Update: {
                    "content_type"?: string | null,"file_name"?: string,"id"?: string,"request_id"?: string,"size_bytes"?: number | null,"storage_path"?: string,"type"?: Database["public"]['Enums']["document_type"],"uploaded_at"?: string,"uploaded_by"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "documents_request_id_fkey"
      columns: ["request_id"]
isOneToOne: false
      referencedRelation: "quote_requests"
      referencedColumns: ["id"]
    }
                  ]
                },"fx_rates": {
                  Row: {
                    "currency": string,"inr_per_unit": number,"rate_date": string,"source": string
                  }
                  ComputedFields: never
                  Insert: {
                    "currency": string,"inr_per_unit": number,"rate_date": string,"source": string
                  }
                  Update: {
                    "currency"?: string,"inr_per_unit"?: number,"rate_date"?: string,"source"?: string
                  }
                  Relationships: [
                    
                  ]
                },"markup_rules": {
                  Row: {
                    "active": boolean,"created_at": string,"destination_group": string | null,"id": string,"markup_pct": number,"note": string | null,"product_type": Database["public"]['Enums']["line_type"] | null,"updated_at": string,"updated_by": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "active"?: boolean,"created_at"?: string,"destination_group"?: string | null,"id"?: string,"markup_pct": number,"note"?: string | null,"product_type"?: Database["public"]['Enums']["line_type"] | null,"updated_at"?: string,"updated_by"?: string | null
                  }
                  Update: {
                    "active"?: boolean,"created_at"?: string,"destination_group"?: string | null,"id"?: string,"markup_pct"?: number,"note"?: string | null,"product_type"?: Database["public"]['Enums']["line_type"] | null,"updated_at"?: string,"updated_by"?: string | null
                  }
                  Relationships: [
                    
                  ]
                },"payments": {
                  Row: {
                    "amount": number,"created_at": string,"currency": string,"id": string,"kind": Database["public"]['Enums']["payment_kind"],"method": Database["public"]['Enums']["payment_method"],"note": string | null,"received_at": string | null,"recorded_by": string | null,"request_id": string,"requested_at": string,"status": Database["public"]['Enums']["payment_status"],"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "amount": number,"created_at"?: string,"currency"?: string,"id"?: string,"kind": Database["public"]['Enums']["payment_kind"],"method": Database["public"]['Enums']["payment_method"],"note"?: string | null,"received_at"?: string | null,"recorded_by"?: string | null,"request_id": string,"requested_at"?: string,"status"?: Database["public"]['Enums']["payment_status"],"updated_at"?: string
                  }
                  Update: {
                    "amount"?: number,"created_at"?: string,"currency"?: string,"id"?: string,"kind"?: Database["public"]['Enums']["payment_kind"],"method"?: Database["public"]['Enums']["payment_method"],"note"?: string | null,"received_at"?: string | null,"recorded_by"?: string | null,"request_id"?: string,"requested_at"?: string,"status"?: Database["public"]['Enums']["payment_status"],"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "payments_request_id_fkey"
      columns: ["request_id"]
isOneToOne: false
      referencedRelation: "quote_requests"
      referencedColumns: ["id"]
    }
                  ]
                },"quote_lines": {
                  Row: {
                    "created_at": string,"description": string,"id": string,"markup_overridden": boolean,"markup_pct": number,"markup_rule_id": string | null,"net_cost": number,"position": number,"request_id": string,"sell_price": number | null,"supplier_ref": string | null,"type": Database["public"]['Enums']["line_type"],"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"description": string,"id"?: string,"markup_overridden"?: boolean,"markup_pct": number,"markup_rule_id"?: string | null,"net_cost": number,"position"?: number,"request_id": string,"sell_price"?: never,"supplier_ref"?: string | null,"type": Database["public"]['Enums']["line_type"],"updated_at"?: string
                  }
                  Update: {
                    "created_at"?: string,"description"?: string,"id"?: string,"markup_overridden"?: boolean,"markup_pct"?: number,"markup_rule_id"?: string | null,"net_cost"?: number,"position"?: number,"request_id"?: string,"sell_price"?: never,"supplier_ref"?: string | null,"type"?: Database["public"]['Enums']["line_type"],"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "quote_lines_markup_rule_id_fkey"
      columns: ["markup_rule_id"]
isOneToOne: false
      referencedRelation: "markup_rules"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "quote_lines_request_id_fkey"
      columns: ["request_id"]
isOneToOne: false
      referencedRelation: "quote_requests"
      referencedColumns: ["id"]
    }
                  ]
                },"quote_requests": {
                  Row: {
                    "accept_requested_at": string | null,"accepted_at": string | null,"adults": number,"assigned_to": string | null,"budget_currency": string,"budget_max": number | null,"budget_min": number | null,"cabin_class": Database["public"]['Enums']["cabin_class"] | null,"cancelled_at": string | null,"channel": Database["public"]['Enums']["request_channel"],"child_ages": (number)[],"children": number,"created_at": string,"customer_id": string,"customer_notes": string | null,"destination": string,"destination_slug": string | null,"end_date": string | null,"exclusions": string | null,"first_sent_at": string | null,"flexibility": Database["public"]['Enums']["flexibility"],"hotel_tier": Database["public"]['Enums']["hotel_tier"] | null,"id": string,"inclusions": string | null,"inclusions_wanted": (string)[],"nights": number | null,"origin_city": string | null,"ota_comparison": Json | null,"preferred_currency": string,"priced_at": string | null,"pricing_started_at": string | null,"quote_version": number,"reference": string,"request_type": Database["public"]['Enums']["request_type"],"requested_items": NonNullable<Json>,"rooms": number | null,"sent_at": string | null,"start_date": string | null,"status": Database["public"]['Enums']["request_status"],"total_sell_inr": number | null,"travel_month": string,"updated_at": string,"valid_until": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "accept_requested_at"?: string | null,"accepted_at"?: string | null,"adults": number,"assigned_to"?: string | null,"budget_currency"?: string,"budget_max"?: number | null,"budget_min"?: number | null,"cabin_class"?: Database["public"]['Enums']["cabin_class"] | null,"cancelled_at"?: string | null,"channel": Database["public"]['Enums']["request_channel"],"child_ages"?: (number)[],"children"?: number,"created_at"?: string,"customer_id": string,"customer_notes"?: string | null,"destination": string,"destination_slug"?: string | null,"end_date"?: string | null,"exclusions"?: string | null,"first_sent_at"?: string | null,"flexibility"?: Database["public"]['Enums']["flexibility"],"hotel_tier"?: Database["public"]['Enums']["hotel_tier"] | null,"id"?: string,"inclusions"?: string | null,"inclusions_wanted"?: (string)[],"nights"?: number | null,"origin_city"?: string | null,"ota_comparison"?: Json | null,"preferred_currency"?: string,"priced_at"?: string | null,"pricing_started_at"?: string | null,"quote_version"?: number,"reference"?: string,"request_type"?: Database["public"]['Enums']["request_type"],"requested_items"?: NonNullable<Json>,"rooms"?: number | null,"sent_at"?: string | null,"start_date"?: string | null,"status"?: Database["public"]['Enums']["request_status"],"total_sell_inr"?: number | null,"travel_month": string,"updated_at"?: string,"valid_until"?: string | null
                  }
                  Update: {
                    "accept_requested_at"?: string | null,"accepted_at"?: string | null,"adults"?: number,"assigned_to"?: string | null,"budget_currency"?: string,"budget_max"?: number | null,"budget_min"?: number | null,"cabin_class"?: Database["public"]['Enums']["cabin_class"] | null,"cancelled_at"?: string | null,"channel"?: Database["public"]['Enums']["request_channel"],"child_ages"?: (number)[],"children"?: number,"created_at"?: string,"customer_id"?: string,"customer_notes"?: string | null,"destination"?: string,"destination_slug"?: string | null,"end_date"?: string | null,"exclusions"?: string | null,"first_sent_at"?: string | null,"flexibility"?: Database["public"]['Enums']["flexibility"],"hotel_tier"?: Database["public"]['Enums']["hotel_tier"] | null,"id"?: string,"inclusions"?: string | null,"inclusions_wanted"?: (string)[],"nights"?: number | null,"origin_city"?: string | null,"ota_comparison"?: Json | null,"preferred_currency"?: string,"priced_at"?: string | null,"pricing_started_at"?: string | null,"quote_version"?: number,"reference"?: string,"request_type"?: Database["public"]['Enums']["request_type"],"requested_items"?: NonNullable<Json>,"rooms"?: number | null,"sent_at"?: string | null,"start_date"?: string | null,"status"?: Database["public"]['Enums']["request_status"],"total_sell_inr"?: number | null,"travel_month"?: string,"updated_at"?: string,"valid_until"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "quote_requests_assigned_to_fkey"
      columns: ["assigned_to"]
isOneToOne: false
      referencedRelation: "staff"
      referencedColumns: ["user_id"]
    },{
      foreignKeyName: "quote_requests_customer_id_fkey"
      columns: ["customer_id"]
isOneToOne: false
      referencedRelation: "customers"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "quote_requests_destination_slug_fkey"
      columns: ["destination_slug"]
isOneToOne: false
      referencedRelation: "destinations"
      referencedColumns: ["slug"]
    }
                  ]
                },"rate_card": {
                  Row: {
                    "destination_slug": string,"hotel_tier": Database["public"]['Enums']["hotel_tier"],"month": number | null,"nights_group": Database["public"]['Enums']["nights_group"],"pax_basis": string,"price_high": number,"price_low": number,"sample_count": number,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "destination_slug": string,"hotel_tier": Database["public"]['Enums']["hotel_tier"],"month"?: number | null,"nights_group": Database["public"]['Enums']["nights_group"],"pax_basis"?: string,"price_high": number,"price_low": number,"sample_count": number,"updated_at"?: string
                  }
                  Update: {
                    "destination_slug"?: string,"hotel_tier"?: Database["public"]['Enums']["hotel_tier"],"month"?: number | null,"nights_group"?: Database["public"]['Enums']["nights_group"],"pax_basis"?: string,"price_high"?: number,"price_low"?: number,"sample_count"?: number,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "rate_card_destination_slug_fkey"
      columns: ["destination_slug"]
isOneToOne: false
      referencedRelation: "destinations"
      referencedColumns: ["slug"]
    }
                  ]
                },"rate_samples": {
                  Row: {
                    "adults": number,"children": number,"created_at": string,"created_by": string | null,"destination_slug": string,"hotel_tier": Database["public"]['Enums']["hotel_tier"],"id": string,"import_batch": string | null,"import_key": string | null,"land_total_inr": number,"nights": number,"note": string | null,"quoted_on": string | null,"request_id": string | null,"source": string,"travel_month": number,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "adults": number,"children"?: number,"created_at"?: string,"created_by"?: string | null,"destination_slug": string,"hotel_tier": Database["public"]['Enums']["hotel_tier"],"id"?: string,"import_batch"?: string | null,"import_key"?: string | null,"land_total_inr": number,"nights": number,"note"?: string | null,"quoted_on"?: string | null,"request_id"?: string | null,"source": string,"travel_month": number,"updated_at"?: string
                  }
                  Update: {
                    "adults"?: number,"children"?: number,"created_at"?: string,"created_by"?: string | null,"destination_slug"?: string,"hotel_tier"?: Database["public"]['Enums']["hotel_tier"],"id"?: string,"import_batch"?: string | null,"import_key"?: string | null,"land_total_inr"?: number,"nights"?: number,"note"?: string | null,"quoted_on"?: string | null,"request_id"?: string | null,"source"?: string,"travel_month"?: number,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "rate_samples_destination_slug_fkey"
      columns: ["destination_slug"]
isOneToOne: false
      referencedRelation: "destinations"
      referencedColumns: ["slug"]
    },{
      foreignKeyName: "rate_samples_request_id_fkey"
      columns: ["request_id"]
isOneToOne: true
      referencedRelation: "quote_requests"
      referencedColumns: ["id"]
    }
                  ]
                },"request_messages": {
                  Row: {
                    "body": string,"created_at": string,"id": string,"request_id": string,"sent_by": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "body": string,"created_at"?: string,"id"?: string,"request_id": string,"sent_by"?: string | null
                  }
                  Update: {
                    "body"?: string,"created_at"?: string,"id"?: string,"request_id"?: string,"sent_by"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "request_messages_request_id_fkey"
      columns: ["request_id"]
isOneToOne: false
      referencedRelation: "quote_requests"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "request_messages_sent_by_fkey"
      columns: ["sent_by"]
isOneToOne: false
      referencedRelation: "staff"
      referencedColumns: ["user_id"]
    }
                  ]
                },"staff": {
                  Row: {
                    "active": boolean,"created_at": string,"email": string,"name": string,"receives_alerts": boolean,"role": Database["public"]['Enums']["staff_role"],"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "active"?: boolean,"created_at"?: string,"email": string,"name": string,"receives_alerts"?: boolean,"role"?: Database["public"]['Enums']["staff_role"],"user_id": string
                  }
                  Update: {
                    "active"?: boolean,"created_at"?: string,"email"?: string,"name"?: string,"receives_alerts"?: boolean,"role"?: Database["public"]['Enums']["staff_role"],"user_id"?: string
                  }
                  Relationships: [
                    
                  ]
                }
          }
          Views: {
            "fx_latest": {
                  Row: {
                    "currency": string,"inr_per_unit": number,"rate_date": string,"source": string
                  }
                  ComputedFields: never
                  Relationships: [
                    
                  ]
                },"rate_import_batches": {
                  Row: {
                    "import_batch": string | null,"imported_at": string | null,"imported_by": string | null,"samples": number | null
                  }
                  ComputedFields: never
                  Relationships: [
                    
                  ]
                },"rate_sample_summary": {
                  Row: {
                    "banded_samples": number | null,"desk_samples": number | null,"destination_slug": string,"imported_samples": number | null
                  }
                  ComputedFields: never
                  Relationships: [
                    {
      foreignKeyName: "rate_samples_destination_slug_fkey"
      columns: ["destination_slug"]
isOneToOne: false
      referencedRelation: "destinations"
      referencedColumns: ["slug"]
    }
                  ]
                }
          }
          Functions: {
            "accept_quote":
{ Args: { "p_reference": string }; Returns: Json
                           },
"desk_metrics":
{ Args: { "p_since"?: string }; Returns: Json
                           },
"intake_quote_request":
{ Args: { "p_channel": Database["public"]['Enums']["request_channel"],"p_email": string,"p_name": string,"p_phone": string,"p_request": Json }; Returns: {
              "customer_id": string,"reference": string,"request_id": string
            }[]
                           },
"is_owner":
{ Args: Record<PropertyKey, never>; Returns: boolean
                           },
"is_staff":
{ Args: Record<PropertyKey, never>; Returns: boolean
                           },
"my_customer_id":
{ Args: Record<PropertyKey, never>; Returns: string
                           },
"nights_group":
{ Args: { "p_nights": number }; Returns: Database["public"]['Enums']["nights_group"]
                           },
"quote_for_customer":
{ Args: { "p_reference": string }; Returns: Json
                           },
"refresh_rate_card":
{ Args: Record<PropertyKey, never>; Returns: Json
                           },
"send_quote":
{ Args: { "p_exclusions": string,"p_inclusions": string,"p_request_id": string,"p_valid_until": string }; Returns: Json
                           },
"submit_quote_request":
{ Args: { "p_channel": Database["public"]['Enums']["request_channel"],"p_request": Json }; Returns: {
              "customer_id": string,"reference": string,"request_id": string
            }[]
                           }
          }
          Enums: {
            "cabin_class": "economy"|"premium_economy"|"business"|"first","document_type": "voucher"|"ticket"|"visa"|"insurance"|"invoice"|"itinerary"|"ota_screenshot"|"other","flexibility": "fixed"|"few_days"|"flexible","hotel_tier": "3_star"|"4_star"|"5_star","line_type": "hotel"|"flight"|"transfer"|"activity"|"visa"|"insurance"|"package"|"other","nights_group": "1-2"|"3-4"|"5-6"|"7-9"|"10+","payment_kind": "advance"|"balance","payment_method": "bank"|"upi"|"card_link"|"cash","payment_status": "awaiting"|"received","request_channel": "claude"|"web"|"email"|"staff","request_status": "queued"|"pricing"|"sent"|"awaiting_payment"|"advance_received"|"balance_received"|"cancelled","request_type": "package"|"flights"|"hotels","staff_role": "owner"|"pricer"
          }
          CompositeTypes: {
            [_ in never]: never
          }
        }
}

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>

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
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
  ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
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
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
    : never = never
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
    : never = never
> = PublicCompositeTypeNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
  ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
  : never

export const Constants = {
  "graphql_public": {
          Enums: {
            
          }
        },"public": {
          Enums: {
            "cabin_class": ["economy", "premium_economy", "business", "first"],"document_type": ["voucher", "ticket", "visa", "insurance", "invoice", "itinerary", "ota_screenshot", "other"],"flexibility": ["fixed", "few_days", "flexible"],"hotel_tier": ["3_star", "4_star", "5_star"],"line_type": ["hotel", "flight", "transfer", "activity", "visa", "insurance", "package", "other"],"nights_group": ["1-2", "3-4", "5-6", "7-9", "10+"],"payment_kind": ["advance", "balance"],"payment_method": ["bank", "upi", "card_link", "cash"],"payment_status": ["awaiting", "received"],"request_channel": ["claude", "web", "email", "staff"],"request_status": ["queued", "pricing", "sent", "awaiting_payment", "advance_received", "balance_received", "cancelled"],"request_type": ["package", "flights", "hotels"],"staff_role": ["owner", "pricer"]
          }
        }
} as const
