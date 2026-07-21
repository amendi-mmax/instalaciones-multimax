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
      admins: {
        Row: {
          activo: boolean
          created_at: string
          email: string | null
          empresa_id: string
          id: string
          nombre: string
          telefono: string | null
        }
        Insert: {
          activo?: boolean
          created_at?: string
          email?: string | null
          empresa_id: string
          id: string
          nombre: string
          telefono?: string | null
        }
        Update: {
          activo?: boolean
          created_at?: string
          email?: string | null
          empresa_id?: string
          id?: string
          nombre?: string
          telefono?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "admins_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      coordinadores: {
        Row: {
          activo: boolean
          created_at: string
          empresa_id: string
          id: string
          nombre: string
          rol: string
          tienda_id: string
        }
        Insert: {
          activo?: boolean
          created_at?: string
          empresa_id: string
          id: string
          nombre: string
          rol?: string
          tienda_id: string
        }
        Update: {
          activo?: boolean
          created_at?: string
          empresa_id?: string
          id?: string
          nombre?: string
          rol?: string
          tienda_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "coordinadores_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coordinadores_tienda_id_fkey"
            columns: ["tienda_id"]
            isOneToOne: false
            referencedRelation: "tiendas"
            referencedColumns: ["id"]
          },
        ]
      }
      empresas: {
        Row: {
          activa: boolean
          color_primario: string | null
          contacto_visible_horas: number
          created_at: string
          id: string
          nombre: string
          slug: string
        }
        Insert: {
          activa?: boolean
          color_primario?: string | null
          contacto_visible_horas?: number
          created_at?: string
          id?: string
          nombre: string
          slug: string
        }
        Update: {
          activa?: boolean
          color_primario?: string | null
          contacto_visible_horas?: number
          created_at?: string
          id?: string
          nombre?: string
          slug?: string
        }
        Relationships: []
      }
      instaladores: {
        Row: {
          aceptacion: number | null
          activo: boolean
          created_at: string
          cumplimiento: number | null
          documentos_ok: boolean
          email: string | null
          empresa_id: string
          id: string
          km: number | null
          nombre: string
          prom_respuesta_seg: number | null
          provincia: string | null
          rating: number
          suspendido: boolean
          telefono: string | null
          zona: string | null
        }
        Insert: {
          aceptacion?: number | null
          activo?: boolean
          created_at?: string
          cumplimiento?: number | null
          documentos_ok?: boolean
          email?: string | null
          empresa_id: string
          id: string
          km?: number | null
          nombre: string
          prom_respuesta_seg?: number | null
          provincia?: string | null
          rating?: number
          suspendido?: boolean
          telefono?: string | null
          zona?: string | null
        }
        Update: {
          aceptacion?: number | null
          activo?: boolean
          created_at?: string
          cumplimiento?: number | null
          documentos_ok?: boolean
          email?: string | null
          empresa_id?: string
          id?: string
          km?: number | null
          nombre?: string
          prom_respuesta_seg?: number | null
          provincia?: string | null
          rating?: number
          suspendido?: boolean
          telefono?: string | null
          zona?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "instaladores_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      ofertas: {
        Row: {
          comentario: string | null
          dia: string
          enviado_at: string
          hora: string
          id: string
          instalador_id: string
          precio: number
          trabajo_id: string
        }
        Insert: {
          comentario?: string | null
          dia: string
          enviado_at?: string
          hora: string
          id?: string
          instalador_id: string
          precio: number
          trabajo_id: string
        }
        Update: {
          comentario?: string | null
          dia?: string
          enviado_at?: string
          hora?: string
          id?: string
          instalador_id?: string
          precio?: number
          trabajo_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ofertas_instalador_id_fkey"
            columns: ["instalador_id"]
            isOneToOne: false
            referencedRelation: "instaladores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ofertas_trabajo_id_fkey"
            columns: ["trabajo_id"]
            isOneToOne: false
            referencedRelation: "trabajos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ofertas_trabajo_id_fkey"
            columns: ["trabajo_id"]
            isOneToOne: false
            referencedRelation: "trabajos_para_instalador"
            referencedColumns: ["trabajo_id"]
          },
        ]
      }
      tiendas: {
        Row: {
          activa: boolean
          created_at: string
          direccion: string | null
          empresa_id: string
          id: string
          nombre: string
          provincia: string | null
          zona: string | null
        }
        Insert: {
          activa?: boolean
          created_at?: string
          direccion?: string | null
          empresa_id: string
          id?: string
          nombre: string
          provincia?: string | null
          zona?: string | null
        }
        Update: {
          activa?: boolean
          created_at?: string
          direccion?: string | null
          empresa_id?: string
          id?: string
          nombre?: string
          provincia?: string | null
          zona?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tiendas_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      trabajo_instaladores: {
        Row: {
          abierto_at: string | null
          estado: string
          id: string
          instalador_id: string
          notificado_at: string
          respondido_at: string | null
          trabajo_id: string
        }
        Insert: {
          abierto_at?: string | null
          estado?: string
          id?: string
          instalador_id: string
          notificado_at?: string
          respondido_at?: string | null
          trabajo_id: string
        }
        Update: {
          abierto_at?: string | null
          estado?: string
          id?: string
          instalador_id?: string
          notificado_at?: string
          respondido_at?: string | null
          trabajo_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "trabajo_instaladores_instalador_id_fkey"
            columns: ["instalador_id"]
            isOneToOne: false
            referencedRelation: "instaladores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trabajo_instaladores_trabajo_id_fkey"
            columns: ["trabajo_id"]
            isOneToOne: false
            referencedRelation: "trabajos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trabajo_instaladores_trabajo_id_fkey"
            columns: ["trabajo_id"]
            isOneToOne: false
            referencedRelation: "trabajos_para_instalador"
            referencedColumns: ["trabajo_id"]
          },
        ]
      }
      trabajos: {
        Row: {
          asignado_at: string | null
          bid_cierra_at: string | null
          bid_minutos: number
          calle: string | null
          cliente_nombre: string | null
          cliente_telefono: string | null
          codigo: string
          contacto_visible_hasta: string | null
          coordinador_id: string
          created_at: string
          direccion_exacta: string | null
          empresa_id: string
          equipo: string | null
          estado: string
          extra: string | null
          fecha: string
          hora: string
          id: string
          instalador_asignado_id: string | null
          precio_sugerido: number | null
          provincia: string
          publicado_at: string
          requisitos: string | null
          tienda_id: string
          tipo: string
          tipo_inmueble: string | null
          urgente: boolean
          zona: string
        }
        Insert: {
          asignado_at?: string | null
          bid_cierra_at?: string | null
          bid_minutos?: number
          calle?: string | null
          cliente_nombre?: string | null
          cliente_telefono?: string | null
          codigo: string
          contacto_visible_hasta?: string | null
          coordinador_id: string
          created_at?: string
          direccion_exacta?: string | null
          empresa_id: string
          equipo?: string | null
          estado?: string
          extra?: string | null
          fecha: string
          hora: string
          id?: string
          instalador_asignado_id?: string | null
          precio_sugerido?: number | null
          provincia: string
          publicado_at?: string
          requisitos?: string | null
          tienda_id: string
          tipo: string
          tipo_inmueble?: string | null
          urgente?: boolean
          zona: string
        }
        Update: {
          asignado_at?: string | null
          bid_cierra_at?: string | null
          bid_minutos?: number
          calle?: string | null
          cliente_nombre?: string | null
          cliente_telefono?: string | null
          codigo?: string
          contacto_visible_hasta?: string | null
          coordinador_id?: string
          created_at?: string
          direccion_exacta?: string | null
          empresa_id?: string
          equipo?: string | null
          estado?: string
          extra?: string | null
          fecha?: string
          hora?: string
          id?: string
          instalador_asignado_id?: string | null
          precio_sugerido?: number | null
          provincia?: string
          publicado_at?: string
          requisitos?: string | null
          tienda_id?: string
          tipo?: string
          tipo_inmueble?: string | null
          urgente?: boolean
          zona?: string
        }
        Relationships: [
          {
            foreignKeyName: "trabajos_coordinador_id_fkey"
            columns: ["coordinador_id"]
            isOneToOne: false
            referencedRelation: "coordinadores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trabajos_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trabajos_instalador_asignado_id_fkey"
            columns: ["instalador_asignado_id"]
            isOneToOne: false
            referencedRelation: "instaladores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trabajos_tienda_id_fkey"
            columns: ["tienda_id"]
            isOneToOne: false
            referencedRelation: "tiendas"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      trabajos_para_instalador: {
        Row: {
          bid_cierra_at: string | null
          bid_minutos: number | null
          cliente_nombre: string | null
          cliente_telefono: string | null
          codigo: string | null
          direccion_exacta: string | null
          equipo: string | null
          estado_trabajo: string | null
          extra: string | null
          fecha: string | null
          gane_yo: boolean | null
          hora: string | null
          mi_estado: string | null
          precio_sugerido: number | null
          provincia: string | null
          requisitos: string | null
          tipo: string | null
          tipo_inmueble: string | null
          trabajo_id: string | null
          urgente: boolean | null
          zona: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      asignar_instalador: {
        Args: { p_instalador_id: string; p_trabajo_id: string }
        Returns: undefined
      }
      submit_bid: {
        Args: {
          p_comentario: string
          p_dia: string
          p_hora: string
          p_precio: number
          p_trabajo_id: string
        }
        Returns: undefined
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
    Enums: {},
  },
} as const
