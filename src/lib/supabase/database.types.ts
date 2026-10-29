
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  
  "public": {
          Tables: {
            "activities": {
                  Row: {
                    "category": string,"compendium_code": string | null,"created_at": string,"id": number,"met": number,"name": string,"owner_id": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "category": string,"compendium_code"?: string | null,"created_at"?: string,"id"?: never,"met": number,"name": string,"owner_id"?: string | null
                  }
                  Update: {
                    "category"?: string,"compendium_code"?: string | null,"created_at"?: string,"id"?: never,"met"?: number,"name"?: string,"owner_id"?: string | null
                  }
                  Relationships: [
                    
                  ]
                },"activity_entries": {
                  Row: {
                    "activity_id": number | null,"created_at": string,"entry_date": string,"id": number,"kcal": number,"label": string,"minutes": number,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "activity_id"?: number | null,"created_at"?: string,"entry_date": string,"id"?: never,"kcal": number,"label": string,"minutes": number,"user_id"?: string
                  }
                  Update: {
                    "activity_id"?: number | null,"created_at"?: string,"entry_date"?: string,"id"?: never,"kcal"?: number,"label"?: string,"minutes"?: number,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "activity_entries_activity_id_fkey"
      columns: ["activity_id"]
isOneToOne: false
      referencedRelation: "activities"
      referencedColumns: ["id"]
    }
                  ]
                },"food_entries": {
                  Row: {
                    "carbs": number,"created_at": string,"entry_date": string,"fat": number,"food_id": number | null,"grams": number,"id": number,"kcal": number,"label": string,"meal": string,"portion_label": string | null,"protein": number,"quantity": number | null,"recipe_id": number | null,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "carbs"?: number,"created_at"?: string,"entry_date": string,"fat"?: number,"food_id"?: number | null,"grams": number,"id"?: never,"kcal": number,"label": string,"meal": string,"portion_label"?: string | null,"protein"?: number,"quantity"?: number | null,"recipe_id"?: number | null,"user_id"?: string
                  }
                  Update: {
                    "carbs"?: number,"created_at"?: string,"entry_date"?: string,"fat"?: number,"food_id"?: number | null,"grams"?: number,"id"?: never,"kcal"?: number,"label"?: string,"meal"?: string,"portion_label"?: string | null,"protein"?: number,"quantity"?: number | null,"recipe_id"?: number | null,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "food_entries_food_id_fkey"
      columns: ["food_id"]
isOneToOne: false
      referencedRelation: "foods"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "food_entries_recipe_id_fkey"
      columns: ["recipe_id"]
isOneToOne: false
      referencedRelation: "recipes"
      referencedColumns: ["id"]
    }
                  ]
                },"food_favorites": {
                  Row: {
                    "created_at": string,"food_id": number,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"food_id": number,"user_id"?: string
                  }
                  Update: {
                    "created_at"?: string,"food_id"?: number,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "food_favorites_food_id_fkey"
      columns: ["food_id"]
isOneToOne: false
      referencedRelation: "foods"
      referencedColumns: ["id"]
    }
                  ]
                },"food_portions": {
                  Row: {
                    "created_at": string,"food_id": number,"grams": number,"id": number,"label": string,"owner_id": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"food_id": number,"grams": number,"id"?: never,"label": string,"owner_id"?: string | null
                  }
                  Update: {
                    "created_at"?: string,"food_id"?: number,"grams"?: number,"id"?: never,"label"?: string,"owner_id"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "food_portions_food_id_fkey"
      columns: ["food_id"]
isOneToOne: false
      referencedRelation: "foods"
      referencedColumns: ["id"]
    }
                  ]
                },"foods": {
                  Row: {
                    "barcode": string | null,"brand": string | null,"carbs_per_100g": number,"created_at": string,"external_code": string | null,"fat_per_100g": number,"fiber_per_100g": number | null,"food_group": string | null,"id": number,"kcal_per_100g": number,"name": string,"owner_id": string | null,"protein_per_100g": number,"search_name": string,"sodium_mg_per_100g": number | null,"source": string,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "barcode"?: string | null,"brand"?: string | null,"carbs_per_100g"?: number,"created_at"?: string,"external_code"?: string | null,"fat_per_100g"?: number,"fiber_per_100g"?: number | null,"food_group"?: string | null,"id"?: never,"kcal_per_100g": number,"name": string,"owner_id"?: string | null,"protein_per_100g"?: number,"search_name"?: string,"sodium_mg_per_100g"?: number | null,"source": string,"updated_at"?: string
                  }
                  Update: {
                    "barcode"?: string | null,"brand"?: string | null,"carbs_per_100g"?: number,"created_at"?: string,"external_code"?: string | null,"fat_per_100g"?: number,"fiber_per_100g"?: number | null,"food_group"?: string | null,"id"?: never,"kcal_per_100g"?: number,"name"?: string,"owner_id"?: string | null,"protein_per_100g"?: number,"search_name"?: string,"sodium_mg_per_100g"?: number | null,"source"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    
                  ]
                },"insights": {
                  Row: {
                    "content": NonNullable<Json>,"created_at": string,"generated_on": string,"id": number,"model": string,"owner_id": string,"range_days": number
                  }
                  ComputedFields: never
                  Insert: {
                    "content": NonNullable<Json>,"created_at"?: string,"generated_on": string,"id"?: never,"model": string,"owner_id"?: string,"range_days": number
                  }
                  Update: {
                    "content"?: NonNullable<Json>,"created_at"?: string,"generated_on"?: string,"id"?: never,"model"?: string,"owner_id"?: string,"range_days"?: number
                  }
                  Relationships: [
                    
                  ]
                },"profile_versions": {
                  Row: {
                    "activity_level": string | null,"birth_date": string | null,"carbs_share_pct": number,"created_at": string,"effective_date": string,"fat_share_pct": number,"goal": string,"goal_kg_per_week": number,"height_cm": number | null,"protein_g_per_kg": number,"sex": string | null,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "activity_level"?: string | null,"birth_date"?: string | null,"carbs_share_pct": number,"created_at"?: string,"effective_date": string,"fat_share_pct": number,"goal": string,"goal_kg_per_week": number,"height_cm"?: number | null,"protein_g_per_kg": number,"sex"?: string | null,"user_id": string
                  }
                  Update: {
                    "activity_level"?: string | null,"birth_date"?: string | null,"carbs_share_pct"?: number,"created_at"?: string,"effective_date"?: string,"fat_share_pct"?: number,"goal"?: string,"goal_kg_per_week"?: number,"height_cm"?: number | null,"protein_g_per_kg"?: number,"sex"?: string | null,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "profile_versions_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["user_id"]
    }
                  ]
                },"profiles": {
                  Row: {
                    "activity_level": string | null,"birth_date": string | null,"carbs_share_pct": number,"created_at": string,"fat_share_pct": number,"goal": string,"goal_kg_per_week": number,"height_cm": number | null,"protein_g_per_kg": number,"sex": string | null,"updated_at": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "activity_level"?: string | null,"birth_date"?: string | null,"carbs_share_pct"?: number,"created_at"?: string,"fat_share_pct"?: number,"goal"?: string,"goal_kg_per_week"?: number,"height_cm"?: number | null,"protein_g_per_kg"?: number,"sex"?: string | null,"updated_at"?: string,"user_id": string
                  }
                  Update: {
                    "activity_level"?: string | null,"birth_date"?: string | null,"carbs_share_pct"?: number,"created_at"?: string,"fat_share_pct"?: number,"goal"?: string,"goal_kg_per_week"?: number,"height_cm"?: number | null,"protein_g_per_kg"?: number,"sex"?: string | null,"updated_at"?: string,"user_id"?: string
                  }
                  Relationships: [
                    
                  ]
                },"recipe_items": {
                  Row: {
                    "created_at": string,"food_id": number,"grams": number,"id": number,"position": number,"recipe_id": number
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"food_id": number,"grams": number,"id"?: never,"position"?: number,"recipe_id": number
                  }
                  Update: {
                    "created_at"?: string,"food_id"?: number,"grams"?: number,"id"?: never,"position"?: number,"recipe_id"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "recipe_items_food_id_fkey"
      columns: ["food_id"]
isOneToOne: false
      referencedRelation: "foods"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "recipe_items_recipe_id_fkey"
      columns: ["recipe_id"]
isOneToOne: false
      referencedRelation: "recipes"
      referencedColumns: ["id"]
    }
                  ]
                },"recipes": {
                  Row: {
                    "created_at": string,"id": number,"name": string,"notes": string | null,"servings": number,"updated_at": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"id"?: never,"name": string,"notes"?: string | null,"servings"?: number,"updated_at"?: string,"user_id"?: string
                  }
                  Update: {
                    "created_at"?: string,"id"?: never,"name"?: string,"notes"?: string | null,"servings"?: number,"updated_at"?: string,"user_id"?: string
                  }
                  Relationships: [
                    
                  ]
                },"weight_entries": {
                  Row: {
                    "created_at": string,"entry_date": string,"id": number,"kg": number,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"entry_date": string,"id"?: never,"kg": number,"user_id"?: string
                  }
                  Update: {
                    "created_at"?: string,"entry_date"?: string,"id"?: never,"kg"?: number,"user_id"?: string
                  }
                  Relationships: [
                    
                  ]
                }
          }
          Views: {
            [_ in never]: never
          }
          Functions: {
            "consume_insight_request":
{ Args: Record<PropertyKey, never>; Returns: boolean
                           },
"consume_off_request":
{ Args: { "request_kind": string }; Returns: boolean
                           },
"consume_sign_in_attempt":
{ Args: { "client_key": string }; Returns: boolean
                           },
"daily_energy_totals":
{ Args: { "end_date": string,"start_date": string }; Returns: {
              "entry_date": string,"exercise_kcal": number,"food_kcal": number
            }[]
                           },
"daily_macro_totals":
{ Args: { "end_date": string,"start_date": string }; Returns: {
              "carbs_g": number,"entry_date": string,"fat_g": number,"protein_g": number
            }[]
                           },
"off_barcode_recently_missed":
{ Args: { "lookup_barcode": string }; Returns: boolean
                           },
"recent_foods":
{ Args: { "result_limit"?: number }; Returns: {
              "barcode": string,"brand": string,"carbs_per_100g": number,"fat_per_100g": number,"food_group": string,"id": number,"is_favorite": boolean,"is_own": boolean,"kcal_per_100g": number,"name": string,"protein_per_100g": number,"source": string
            }[]
                           },
"record_off_barcode_miss":
{ Args: { "lookup_barcode": string }; Returns: undefined
                           },
"save_recipe":
{ Args: { "ingredients": Json,"name": string,"notes"?: string,"recipe_id"?: number,"servings": number }; Returns: number
                           },
"search_foods":
{ Args: { "favorites_only"?: boolean,"result_limit"?: number,"result_offset"?: number,"search_query"?: string }; Returns: {
              "barcode": string,"brand": string,"carbs_per_100g": number,"fat_per_100g": number,"food_group": string,"id": number,"is_favorite": boolean,"is_own": boolean,"kcal_per_100g": number,"name": string,"protein_per_100g": number,"source": string
            }[]
                           }
          }
          Enums: {
            [_ in never]: never
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
  "public": {
          Enums: {
            
          }
        }
} as const
