export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  graphql_public: {
    Tables: {
      [_ in never]: never;
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      graphql: {
        Args: { extensions?: Json; operationName?: string; query?: string; variables?: Json };
        Returns: Json;
      };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
  public: {
    Tables: {
      audit_logs: {
        Row: {
          action: string;
          actor: string | null;
          id: string;
          metadata: NonNullable<Json>;
          target: string | null;
          time: string;
        };
        ComputedFields: never;
        Insert: {
          action: string;
          actor?: string | null;
          id?: string;
          metadata?: NonNullable<Json>;
          target?: string | null;
          time?: string;
        };
        Update: {
          action?: string;
          actor?: string | null;
          id?: string;
          metadata?: NonNullable<Json>;
          target?: string | null;
          time?: string;
        };
        Relationships: [];
      };
      chunks: {
        Row: {
          chunk_index: number;
          document_id: string;
          embedding: string;
          embedding_model: string;
          fts: unknown;
          fts_unaccent: unknown;
          id: string;
          page: number | null;
          pipeline_version: string;
          row: number | null;
          section: string | null;
          sheet: string | null;
          text: string;
        };
        ComputedFields: never;
        Insert: {
          chunk_index: number;
          document_id: string;
          embedding: string;
          embedding_model: string;
          fts?: never;
          fts_unaccent?: never;
          id?: string;
          page?: number | null;
          pipeline_version: string;
          row?: number | null;
          section?: string | null;
          sheet?: string | null;
          text: string;
        };
        Update: {
          chunk_index?: number;
          document_id?: string;
          embedding?: string;
          embedding_model?: string;
          fts?: never;
          fts_unaccent?: never;
          id?: string;
          page?: number | null;
          pipeline_version?: string;
          row?: number | null;
          section?: string | null;
          sheet?: string | null;
          text?: string;
        };
        Relationships: [
          {
            foreignKeyName: "chunks_document_id_fkey";
            columns: ["document_id"];
            isOneToOne: false;
            referencedRelation: "documents";
            referencedColumns: ["id"];
          },
        ];
      };
      conversations: {
        Row: {
          created_at: string;
          id: string;
          title: string | null;
          updated_at: string;
          user_id: string;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          id?: string;
          title?: string | null;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          title?: string | null;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      documents: {
        Row: {
          academic_year: string | null;
          access_level: string;
          batch_id: string | null;
          content_hash: string | null;
          created_at: string;
          effective_date: string | null;
          error: string | null;
          file_type: string;
          id: string;
          is_current: boolean;
          name: string;
          owner: string;
          status: string;
          storage_path: string;
          supersedes_id: string | null;
        };
        ComputedFields: never;
        Insert: {
          academic_year?: string | null;
          access_level?: string;
          batch_id?: string | null;
          content_hash?: string | null;
          created_at?: string;
          effective_date?: string | null;
          error?: string | null;
          file_type: string;
          id?: string;
          is_current?: boolean;
          name: string;
          owner: string;
          status?: string;
          storage_path: string;
          supersedes_id?: string | null;
        };
        Update: {
          academic_year?: string | null;
          access_level?: string;
          batch_id?: string | null;
          content_hash?: string | null;
          created_at?: string;
          effective_date?: string | null;
          error?: string | null;
          file_type?: string;
          id?: string;
          is_current?: boolean;
          name?: string;
          owner?: string;
          status?: string;
          storage_path?: string;
          supersedes_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "documents_batch_id_fkey";
            columns: ["batch_id"];
            isOneToOne: false;
            referencedRelation: "upload_batches";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "documents_owner_fkey";
            columns: ["owner"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["user_id"];
          },
          {
            foreignKeyName: "documents_supersedes_id_fkey";
            columns: ["supersedes_id"];
            isOneToOne: false;
            referencedRelation: "documents";
            referencedColumns: ["id"];
          },
        ];
      };
      messages: {
        Row: {
          citations: NonNullable<Json>;
          content: string;
          conversation_id: string;
          cost_usd: number | null;
          created_at: string;
          duration_ms: number | null;
          id: string;
          outcome: string | null;
          rating: number | null;
          retrieved_chunk_ids: string[] | null;
          role: string;
          tokens_in: number | null;
          tokens_out: number | null;
          top_score: number | null;
        };
        ComputedFields: never;
        Insert: {
          citations?: NonNullable<Json>;
          content: string;
          conversation_id: string;
          cost_usd?: number | null;
          created_at?: string;
          duration_ms?: number | null;
          id?: string;
          outcome?: string | null;
          rating?: number | null;
          retrieved_chunk_ids?: string[] | null;
          role: string;
          tokens_in?: number | null;
          tokens_out?: number | null;
          top_score?: number | null;
        };
        Update: {
          citations?: NonNullable<Json>;
          content?: string;
          conversation_id?: string;
          cost_usd?: number | null;
          created_at?: string;
          duration_ms?: number | null;
          id?: string;
          outcome?: string | null;
          rating?: number | null;
          retrieved_chunk_ids?: string[] | null;
          role?: string;
          tokens_in?: number | null;
          tokens_out?: number | null;
          top_score?: number | null;
        };
        Relationships: [
          {
            foreignKeyName: "messages_conversation_id_fkey";
            columns: ["conversation_id"];
            isOneToOne: false;
            referencedRelation: "conversations";
            referencedColumns: ["id"];
          },
        ];
      };
      profiles: {
        Row: {
          consent_at: string | null;
          created_at: string;
          email: string;
          name: string;
          role: string;
          semester: string | null;
          status: string;
          user_id: string;
        };
        ComputedFields: never;
        Insert: {
          consent_at?: string | null;
          created_at?: string;
          email: string;
          name: string;
          role?: string;
          semester?: string | null;
          status?: string;
          user_id: string;
        };
        Update: {
          consent_at?: string | null;
          created_at?: string;
          email?: string;
          name?: string;
          role?: string;
          semester?: string | null;
          status?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      upload_batches: {
        Row: {
          created_at: string;
          done_count: number;
          failed_count: number;
          id: string;
          uploaded_by: string;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          done_count?: number;
          failed_count?: number;
          id?: string;
          uploaded_by: string;
        };
        Update: {
          created_at?: string;
          done_count?: number;
          failed_count?: number;
          id?: string;
          uploaded_by?: string;
        };
        Relationships: [
          {
            foreignKeyName: "upload_batches_uploaded_by_fkey";
            columns: ["uploaded_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["user_id"];
          },
        ];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      current_user_level: { Args: Record<PropertyKey, never>; Returns: string };
      immutable_unaccent: { Args: { input: string }; Returns: string };
      keyword_tsquery: { Args: { question: string }; Returns: unknown };
      search_chunks_keyword: {
        Args: { match_count?: number; query: string };
        Returns: {
          chunk_id: string;
          chunk_text: string;
          document_id: string;
          document_name: string;
          keyword_rank: number;
          page: number;
        }[];
      };
      search_stop_words: { Args: Record<PropertyKey, never>; Returns: string[] };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    keyof DefaultSchema["Enums"] | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    keyof DefaultSchema["CompositeTypes"] | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {},
  },
} as const;
