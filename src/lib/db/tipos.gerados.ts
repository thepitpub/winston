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
    PostgrestVersion: "14.17"
  }
  public: {
    Tables: {
      acessos: {
        Row: {
          area_id: string | null
          codigo_lido: string | null
          conflito: boolean
          created_at: string
          dispositivo: string | null
          evento_id: string
          id: string
          ingresso_id: string | null
          leitura_id: string
          lido_em: string
          offline: boolean
          operador_id: string | null
          operador_nome: string | null
          organizacao_id: string
          resultado: string
          resultado_servidor: string | null
          sentido: string
          updated_at: string
        }
        Insert: {
          area_id?: string | null
          codigo_lido?: string | null
          conflito?: boolean
          created_at?: string
          dispositivo?: string | null
          evento_id: string
          id?: string
          ingresso_id?: string | null
          leitura_id: string
          lido_em: string
          offline?: boolean
          operador_id?: string | null
          operador_nome?: string | null
          organizacao_id: string
          resultado: string
          resultado_servidor?: string | null
          sentido: string
          updated_at?: string
        }
        Update: {
          area_id?: string | null
          codigo_lido?: string | null
          conflito?: boolean
          created_at?: string
          dispositivo?: string | null
          evento_id?: string
          id?: string
          ingresso_id?: string | null
          leitura_id?: string
          lido_em?: string
          offline?: boolean
          operador_id?: string | null
          operador_nome?: string | null
          organizacao_id?: string
          resultado?: string
          resultado_servidor?: string | null
          sentido?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "acessos_evento_id_fkey"
            columns: ["evento_id"]
            isOneToOne: false
            referencedRelation: "eventos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "acessos_evento_id_fkey"
            columns: ["evento_id"]
            isOneToOne: false
            referencedRelation: "eventos_com_contagem"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "acessos_organizacao_id_fkey"
            columns: ["organizacao_id"]
            isOneToOne: false
            referencedRelation: "organizacoes"
            referencedColumns: ["id"]
          },
        ]
      }
      announcement_clicks: {
        Row: {
          announcement_id: string
          at: string
          id: string
          member_id: string
          page: string | null
        }
        Insert: {
          announcement_id: string
          at?: string
          id?: string
          member_id: string
          page?: string | null
        }
        Update: {
          announcement_id?: string
          at?: string
          id?: string
          member_id?: string
          page?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "announcement_clicks_announcement_id_fkey"
            columns: ["announcement_id"]
            isOneToOne: false
            referencedRelation: "portal_announcements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "announcement_clicks_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
        ]
      }
      announcement_dismissals: {
        Row: {
          announcement_id: string
          at: string
          id: string
          kind: string
          member_id: string
          page: string | null
        }
        Insert: {
          announcement_id: string
          at?: string
          id?: string
          kind: string
          member_id: string
          page?: string | null
        }
        Update: {
          announcement_id?: string
          at?: string
          id?: string
          kind?: string
          member_id?: string
          page?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "announcement_dismissals_announcement_id_fkey"
            columns: ["announcement_id"]
            isOneToOne: false
            referencedRelation: "portal_announcements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "announcement_dismissals_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
        ]
      }
      announcement_impressions: {
        Row: {
          announcement_id: string
          at: string
          device: string | null
          id: string
          member_id: string
          page: string | null
        }
        Insert: {
          announcement_id: string
          at?: string
          device?: string | null
          id?: string
          member_id: string
          page?: string | null
        }
        Update: {
          announcement_id?: string
          at?: string
          device?: string | null
          id?: string
          member_id?: string
          page?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "announcement_impressions_announcement_id_fkey"
            columns: ["announcement_id"]
            isOneToOne: false
            referencedRelation: "portal_announcements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "announcement_impressions_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
        ]
      }
      antecipacoes: {
        Row: {
          bruto_centavos: number
          cobrancas: string[]
          created_at: string
          id: string
          liquido_centavos: number
          organizacao_id: string
          solicitado_por: string
          status: string
          taxa_centavos: number
          updated_at: string
        }
        Insert: {
          bruto_centavos: number
          cobrancas?: string[]
          created_at?: string
          id?: string
          liquido_centavos: number
          organizacao_id: string
          solicitado_por: string
          status: string
          taxa_centavos: number
          updated_at?: string
        }
        Update: {
          bruto_centavos?: number
          cobrancas?: string[]
          created_at?: string
          id?: string
          liquido_centavos?: number
          organizacao_id?: string
          solicitado_por?: string
          status?: string
          taxa_centavos?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "antecipacoes_organizacao_id_fkey"
            columns: ["organizacao_id"]
            isOneToOne: false
            referencedRelation: "organizacoes"
            referencedColumns: ["id"]
          },
        ]
      }
      app_settings: {
        Row: {
          key: string
          updated_at: string
          updated_by: string | null
          value: Json
        }
        Insert: {
          key: string
          updated_at?: string
          updated_by?: string | null
          value: Json
        }
        Update: {
          key?: string
          updated_at?: string
          updated_by?: string | null
          value?: Json
        }
        Relationships: []
      }
      areas: {
        Row: {
          capacidade: number | null
          cor: string | null
          created_at: string
          evento_id: string
          geral: boolean
          id: string
          nome: string
          ordem: number
          organizacao_id: string
          reentrada: string
          updated_at: string
        }
        Insert: {
          capacidade?: number | null
          cor?: string | null
          created_at?: string
          evento_id: string
          geral?: boolean
          id?: string
          nome: string
          ordem?: number
          organizacao_id: string
          reentrada?: string
          updated_at?: string
        }
        Update: {
          capacidade?: number | null
          cor?: string | null
          created_at?: string
          evento_id?: string
          geral?: boolean
          id?: string
          nome?: string
          ordem?: number
          organizacao_id?: string
          reentrada?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "areas_evento_id_fkey"
            columns: ["evento_id"]
            isOneToOne: false
            referencedRelation: "eventos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "areas_evento_id_fkey"
            columns: ["evento_id"]
            isOneToOne: false
            referencedRelation: "eventos_com_contagem"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "areas_organizacao_id_fkey"
            columns: ["organizacao_id"]
            isOneToOne: false
            referencedRelation: "organizacoes"
            referencedColumns: ["id"]
          },
        ]
      }
      arquivos: {
        Row: {
          caminho: string
          created_at: string
          criado_por: string | null
          id: string
          nome: string
          organizacao_id: string
          tamanho: number
          tipo_mime: string
          updated_at: string
          url: string
        }
        Insert: {
          caminho: string
          created_at?: string
          criado_por?: string | null
          id?: string
          nome: string
          organizacao_id: string
          tamanho: number
          tipo_mime: string
          updated_at?: string
          url: string
        }
        Update: {
          caminho?: string
          created_at?: string
          criado_por?: string | null
          id?: string
          nome?: string
          organizacao_id?: string
          tamanho?: number
          tipo_mime?: string
          updated_at?: string
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "arquivos_organizacao_id_fkey"
            columns: ["organizacao_id"]
            isOneToOne: false
            referencedRelation: "organizacoes"
            referencedColumns: ["id"]
          },
        ]
      }
      assentos: {
        Row: {
          bloco_id: string
          created_at: string
          evento_id: string
          fileira: string | null
          id: string
          ingresso_id: string | null
          mapa_id: string
          numero: number
          organizacao_id: string
          pedido_id: string | null
          raio: number
          reservado_ate: string | null
          rotulo: string
          setor: string
          status: string
          tipo_ingresso_id: string | null
          updated_at: string
          x: number
          y: number
        }
        Insert: {
          bloco_id: string
          created_at?: string
          evento_id: string
          fileira?: string | null
          id?: string
          ingresso_id?: string | null
          mapa_id: string
          numero: number
          organizacao_id: string
          pedido_id?: string | null
          raio: number
          reservado_ate?: string | null
          rotulo: string
          setor: string
          status: string
          tipo_ingresso_id?: string | null
          updated_at?: string
          x: number
          y: number
        }
        Update: {
          bloco_id?: string
          created_at?: string
          evento_id?: string
          fileira?: string | null
          id?: string
          ingresso_id?: string | null
          mapa_id?: string
          numero?: number
          organizacao_id?: string
          pedido_id?: string | null
          raio?: number
          reservado_ate?: string | null
          rotulo?: string
          setor?: string
          status?: string
          tipo_ingresso_id?: string | null
          updated_at?: string
          x?: number
          y?: number
        }
        Relationships: [
          {
            foreignKeyName: "assentos_evento_id_fkey"
            columns: ["evento_id"]
            isOneToOne: false
            referencedRelation: "eventos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assentos_evento_id_fkey"
            columns: ["evento_id"]
            isOneToOne: false
            referencedRelation: "eventos_com_contagem"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assentos_mapa_id_fkey"
            columns: ["mapa_id"]
            isOneToOne: false
            referencedRelation: "mapas_assentos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assentos_organizacao_id_fkey"
            columns: ["organizacao_id"]
            isOneToOne: false
            referencedRelation: "organizacoes"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_logs: {
        Row: {
          action: string
          actor_kind: string
          actor_user_id: string | null
          at: string
          details: Json
          id: number
          ip_hash: string | null
          member_id: string | null
          resource_id: string | null
          resource_type: string | null
          result: string
          user_agent: string | null
        }
        Insert: {
          action: string
          actor_kind: string
          actor_user_id?: string | null
          at?: string
          details?: Json
          id?: never
          ip_hash?: string | null
          member_id?: string | null
          resource_id?: string | null
          resource_type?: string | null
          result?: string
          user_agent?: string | null
        }
        Update: {
          action?: string
          actor_kind?: string
          actor_user_id?: string | null
          at?: string
          details?: Json
          id?: never
          ip_hash?: string | null
          member_id?: string | null
          resource_id?: string | null
          resource_type?: string | null
          result?: string
          user_agent?: string | null
        }
        Relationships: []
      }
      auditoria: {
        Row: {
          acao: string
          alvo_id: string | null
          alvo_tipo: string | null
          created_at: string
          detalhes: Json | null
          id: string
          ip: string | null
          organizacao_id: string | null
          resumo: string
          updated_at: string
          usuario_id: string | null
          usuario_nome: string
        }
        Insert: {
          acao: string
          alvo_id?: string | null
          alvo_tipo?: string | null
          created_at?: string
          detalhes?: Json | null
          id?: string
          ip?: string | null
          organizacao_id?: string | null
          resumo: string
          updated_at?: string
          usuario_id?: string | null
          usuario_nome: string
        }
        Update: {
          acao?: string
          alvo_id?: string | null
          alvo_tipo?: string | null
          created_at?: string
          detalhes?: Json | null
          id?: string
          ip?: string | null
          organizacao_id?: string | null
          resumo?: string
          updated_at?: string
          usuario_id?: string | null
          usuario_nome?: string
        }
        Relationships: []
      }
      auth_otp_challenges: {
        Row: {
          attempts: number
          code_cipher: string | null
          code_hash: string
          consumed_at: string | null
          created_at: string
          delivered_by: string | null
          delivery_status: string
          expires_at: string
          id: string
          invitation_id: string | null
          ip_hash: string | null
          max_attempts: number
          member_id: string | null
          phone_e164: string
          provider: string
          purpose: string
        }
        Insert: {
          attempts?: number
          code_cipher?: string | null
          code_hash: string
          consumed_at?: string | null
          created_at?: string
          delivered_by?: string | null
          delivery_status?: string
          expires_at: string
          id?: string
          invitation_id?: string | null
          ip_hash?: string | null
          max_attempts?: number
          member_id?: string | null
          phone_e164: string
          provider: string
          purpose: string
        }
        Update: {
          attempts?: number
          code_cipher?: string | null
          code_hash?: string
          consumed_at?: string | null
          created_at?: string
          delivered_by?: string | null
          delivery_status?: string
          expires_at?: string
          id?: string
          invitation_id?: string | null
          ip_hash?: string | null
          max_attempts?: number
          member_id?: string | null
          phone_e164?: string
          provider?: string
          purpose?: string
        }
        Relationships: [
          {
            foreignKeyName: "auth_otp_challenges_invitation_id_fkey"
            columns: ["invitation_id"]
            isOneToOne: false
            referencedRelation: "member_invitations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "auth_otp_challenges_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
        ]
      }
      automacoes: {
        Row: {
          acoes: Json
          ativa: boolean
          created_at: string
          evento_id: string | null
          execucoes: number
          gatilho: Json
          id: string
          nome: string
          organizacao_id: string
          tipos_ingresso: string[]
          updated_at: string
        }
        Insert: {
          acoes: Json
          ativa?: boolean
          created_at?: string
          evento_id?: string | null
          execucoes?: number
          gatilho: Json
          id?: string
          nome: string
          organizacao_id: string
          tipos_ingresso?: string[]
          updated_at?: string
        }
        Update: {
          acoes?: Json
          ativa?: boolean
          created_at?: string
          evento_id?: string | null
          execucoes?: number
          gatilho?: Json
          id?: string
          nome?: string
          organizacao_id?: string
          tipos_ingresso?: string[]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "automacoes_evento_id_fkey"
            columns: ["evento_id"]
            isOneToOne: false
            referencedRelation: "eventos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "automacoes_evento_id_fkey"
            columns: ["evento_id"]
            isOneToOne: false
            referencedRelation: "eventos_com_contagem"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "automacoes_organizacao_id_fkey"
            columns: ["organizacao_id"]
            isOneToOne: false
            referencedRelation: "organizacoes"
            referencedColumns: ["id"]
          },
        ]
      }
      avisos: {
        Row: {
          ativo: boolean
          botao_texto: string | null
          botao_url: string | null
          created_at: string
          criado_por: string | null
          fim: string | null
          frequencia: string
          id: string
          imagem_url: string | null
          inicio: string
          membros_ids: string[]
          paginas: Json
          publico: string
          texto: string
          titulo: string
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          botao_texto?: string | null
          botao_url?: string | null
          created_at?: string
          criado_por?: string | null
          fim?: string | null
          frequencia?: string
          id?: string
          imagem_url?: string | null
          inicio?: string
          membros_ids?: string[]
          paginas?: Json
          publico?: string
          texto: string
          titulo: string
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          botao_texto?: string | null
          botao_url?: string | null
          created_at?: string
          criado_por?: string | null
          fim?: string | null
          frequencia?: string
          id?: string
          imagem_url?: string | null
          inicio?: string
          membros_ids?: string[]
          paginas?: Json
          publico?: string
          texto?: string
          titulo?: string
          updated_at?: string
        }
        Relationships: []
      }
      avisos_leituras: {
        Row: {
          aviso_id: string
          clicado_em: string | null
          dispositivo: string | null
          fechado_em: string | null
          membro_id: string
          pagina: string | null
          vezes_clicado: number
          vezes_visto: number
          visto_em: string
        }
        Insert: {
          aviso_id: string
          clicado_em?: string | null
          dispositivo?: string | null
          fechado_em?: string | null
          membro_id: string
          pagina?: string | null
          vezes_clicado?: number
          vezes_visto?: number
          visto_em?: string
        }
        Update: {
          aviso_id?: string
          clicado_em?: string | null
          dispositivo?: string | null
          fechado_em?: string | null
          membro_id?: string
          pagina?: string | null
          vezes_clicado?: number
          vezes_visto?: number
          visto_em?: string
        }
        Relationships: [
          {
            foreignKeyName: "avisos_leituras_aviso_id_fkey"
            columns: ["aviso_id"]
            isOneToOne: false
            referencedRelation: "avisos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "avisos_leituras_membro_id_fkey"
            columns: ["membro_id"]
            isOneToOne: false
            referencedRelation: "membros"
            referencedColumns: ["id"]
          },
        ]
      }
      bloqueios: {
        Row: {
          created_at: string
          criado_por: string | null
          id: string
          motivo: string
          organizacao_id: string | null
          tipo: string
          updated_at: string
          valor: string
        }
        Insert: {
          created_at?: string
          criado_por?: string | null
          id?: string
          motivo: string
          organizacao_id?: string | null
          tipo: string
          updated_at?: string
          valor: string
        }
        Update: {
          created_at?: string
          criado_por?: string | null
          id?: string
          motivo?: string
          organizacao_id?: string | null
          tipo?: string
          updated_at?: string
          valor?: string
        }
        Relationships: []
      }
      campanhas: {
        Row: {
          agendada_para: string | null
          assunto: string
          canal: string
          corpo: string
          created_at: string
          criado_por: string | null
          enviada_em: string | null
          enviadas: number
          falhas: number
          id: string
          nome: string
          organizacao_id: string
          publico: Json
          so_consentidos: boolean
          status: string
          total: number
          updated_at: string
        }
        Insert: {
          agendada_para?: string | null
          assunto: string
          canal: string
          corpo: string
          created_at?: string
          criado_por?: string | null
          enviada_em?: string | null
          enviadas?: number
          falhas?: number
          id?: string
          nome: string
          organizacao_id: string
          publico: Json
          so_consentidos?: boolean
          status: string
          total?: number
          updated_at?: string
        }
        Update: {
          agendada_para?: string | null
          assunto?: string
          canal?: string
          corpo?: string
          created_at?: string
          criado_por?: string | null
          enviada_em?: string | null
          enviadas?: number
          falhas?: number
          id?: string
          nome?: string
          organizacao_id?: string
          publico?: Json
          so_consentidos?: boolean
          status?: string
          total?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "campanhas_organizacao_id_fkey"
            columns: ["organizacao_id"]
            isOneToOne: false
            referencedRelation: "organizacoes"
            referencedColumns: ["id"]
          },
        ]
      }
      carrinhos: {
        Row: {
          contato: Json
          contatos: Json
          created_at: string
          cupom: string | null
          descartado_em: string | null
          etapa: string
          evento_id: string
          id: string
          itens: Json
          organizacao_id: string
          passos: Json
          pedido_id: string | null
          ref: string | null
          sessao: string
          total_centavos: number
          ultima_atividade: string
          updated_at: string
          utm: Json | null
        }
        Insert: {
          contato?: Json
          contatos?: Json
          created_at?: string
          cupom?: string | null
          descartado_em?: string | null
          etapa?: string
          evento_id: string
          id?: string
          itens?: Json
          organizacao_id: string
          passos?: Json
          pedido_id?: string | null
          ref?: string | null
          sessao: string
          total_centavos?: number
          ultima_atividade?: string
          updated_at?: string
          utm?: Json | null
        }
        Update: {
          contato?: Json
          contatos?: Json
          created_at?: string
          cupom?: string | null
          descartado_em?: string | null
          etapa?: string
          evento_id?: string
          id?: string
          itens?: Json
          organizacao_id?: string
          passos?: Json
          pedido_id?: string | null
          ref?: string | null
          sessao?: string
          total_centavos?: number
          ultima_atividade?: string
          updated_at?: string
          utm?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "carrinhos_evento_id_fkey"
            columns: ["evento_id"]
            isOneToOne: false
            referencedRelation: "eventos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "carrinhos_evento_id_fkey"
            columns: ["evento_id"]
            isOneToOne: false
            referencedRelation: "eventos_com_contagem"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "carrinhos_organizacao_id_fkey"
            columns: ["organizacao_id"]
            isOneToOne: false
            referencedRelation: "organizacoes"
            referencedColumns: ["id"]
          },
        ]
      }
      carteira_cartoes: {
        Row: {
          apelido: string | null
          bandeira: string | null
          created_at: string
          gateway: string
          id: string
          membro_id: string
          principal: boolean
          removido_em: string | null
          titular: string | null
          token: string
          ultimos4: string
          validade: string | null
        }
        Insert: {
          apelido?: string | null
          bandeira?: string | null
          created_at?: string
          gateway?: string
          id?: string
          membro_id: string
          principal?: boolean
          removido_em?: string | null
          titular?: string | null
          token: string
          ultimos4: string
          validade?: string | null
        }
        Update: {
          apelido?: string | null
          bandeira?: string | null
          created_at?: string
          gateway?: string
          id?: string
          membro_id?: string
          principal?: boolean
          removido_em?: string | null
          titular?: string | null
          token?: string
          ultimos4?: string
          validade?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "carteira_cartoes_membro_id_fkey"
            columns: ["membro_id"]
            isOneToOne: false
            referencedRelation: "membros"
            referencedColumns: ["id"]
          },
        ]
      }
      carteira_consumos: {
        Row: {
          cartao_id: string | null
          checkin_id: string | null
          descricao: string
          em: string
          gateway_id: string | null
          id: string
          itens: Json
          lancado_por: string | null
          membro_id: string
          pago_em: string | null
          status: string
          valor_centavos: number
        }
        Insert: {
          cartao_id?: string | null
          checkin_id?: string | null
          descricao: string
          em?: string
          gateway_id?: string | null
          id?: string
          itens?: Json
          lancado_por?: string | null
          membro_id: string
          pago_em?: string | null
          status?: string
          valor_centavos: number
        }
        Update: {
          cartao_id?: string | null
          checkin_id?: string | null
          descricao?: string
          em?: string
          gateway_id?: string | null
          id?: string
          itens?: Json
          lancado_por?: string | null
          membro_id?: string
          pago_em?: string | null
          status?: string
          valor_centavos?: number
        }
        Relationships: [
          {
            foreignKeyName: "carteira_consumos_cartao_id_fkey"
            columns: ["cartao_id"]
            isOneToOne: false
            referencedRelation: "carteira_cartoes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "carteira_consumos_checkin_id_fkey"
            columns: ["checkin_id"]
            isOneToOne: false
            referencedRelation: "membros_checkins"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "carteira_consumos_membro_id_fkey"
            columns: ["membro_id"]
            isOneToOne: false
            referencedRelation: "membros"
            referencedColumns: ["id"]
          },
        ]
      }
      chaves_api: {
        Row: {
          created_at: string
          criada_por: string | null
          escopos: string[]
          hash: string
          id: string
          nome: string
          organizacao_id: string
          prefixo: string
          revogada_em: string | null
          ultimo_uso: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          criada_por?: string | null
          escopos?: string[]
          hash: string
          id?: string
          nome: string
          organizacao_id: string
          prefixo: string
          revogada_em?: string | null
          ultimo_uso?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          criada_por?: string | null
          escopos?: string[]
          hash?: string
          id?: string
          nome?: string
          organizacao_id?: string
          prefixo?: string
          revogada_em?: string | null
          ultimo_uso?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "chaves_api_organizacao_id_fkey"
            columns: ["organizacao_id"]
            isOneToOne: false
            referencedRelation: "organizacoes"
            referencedColumns: ["id"]
          },
        ]
      }
      checkin_events: {
        Row: {
          created_at: string
          created_by: string | null
          duplicate_policy: string
          ends_at: string | null
          id: string
          kind: string
          location: string | null
          name: string
          starts_at: string
          status: string
          updated_at: string
          visible_to_members: boolean
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          duplicate_policy?: string
          ends_at?: string | null
          id?: string
          kind?: string
          location?: string | null
          name: string
          starts_at: string
          status?: string
          updated_at?: string
          visible_to_members?: boolean
        }
        Update: {
          created_at?: string
          created_by?: string | null
          duplicate_policy?: string
          ends_at?: string | null
          id?: string
          kind?: string
          location?: string | null
          name?: string
          starts_at?: string
          status?: string
          updated_at?: string
          visible_to_members?: boolean
        }
        Relationships: []
      }
      checkin_validation_logs: {
        Row: {
          at: string
          checkin_id: string | null
          event_id: string | null
          id: string
          member_id: string | null
          operator_user_id: string | null
          query: string | null
          reason: string | null
          result: string
          source: string
        }
        Insert: {
          at?: string
          checkin_id?: string | null
          event_id?: string | null
          id?: string
          member_id?: string | null
          operator_user_id?: string | null
          query?: string | null
          reason?: string | null
          result: string
          source: string
        }
        Update: {
          at?: string
          checkin_id?: string | null
          event_id?: string | null
          id?: string
          member_id?: string | null
          operator_user_id?: string | null
          query?: string | null
          reason?: string | null
          result?: string
          source?: string
        }
        Relationships: [
          {
            foreignKeyName: "checkin_validation_logs_checkin_id_fkey"
            columns: ["checkin_id"]
            isOneToOne: false
            referencedRelation: "member_checkins"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "checkin_validation_logs_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "checkin_events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "checkin_validation_logs_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
        ]
      }
      checkins: {
        Row: {
          cpf: string
          data_hora_checkin: string
          email: string | null
          evento_id: string
          id: string
          nome_completo: string
          pelotao: string | null
          sexo: string | null
          telefone: string
          validacao_do_checkin: boolean
          validated_at: string | null
        }
        Insert: {
          cpf: string
          data_hora_checkin?: string
          email?: string | null
          evento_id: string
          id?: string
          nome_completo: string
          pelotao?: string | null
          sexo?: string | null
          telefone: string
          validacao_do_checkin?: boolean
          validated_at?: string | null
        }
        Update: {
          cpf?: string
          data_hora_checkin?: string
          email?: string | null
          evento_id?: string
          id?: string
          nome_completo?: string
          pelotao?: string | null
          sexo?: string | null
          telefone?: string
          validacao_do_checkin?: boolean
          validated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "checkins_evento_id_fkey"
            columns: ["evento_id"]
            isOneToOne: false
            referencedRelation: "eventos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "checkins_evento_id_fkey"
            columns: ["evento_id"]
            isOneToOne: false
            referencedRelation: "eventos_com_contagem"
            referencedColumns: ["id"]
          },
        ]
      }
      cliques: {
        Row: {
          created_at: string
          dia: string
          evento_id: string
          id: string
          organizacao_id: string
          promoter_id: string | null
          ref: string | null
          updated_at: string
          utm_campaign: string | null
          utm_medium: string | null
          utm_source: string | null
          visitante: string
        }
        Insert: {
          created_at?: string
          dia: string
          evento_id: string
          id?: string
          organizacao_id: string
          promoter_id?: string | null
          ref?: string | null
          updated_at?: string
          utm_campaign?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          visitante: string
        }
        Update: {
          created_at?: string
          dia?: string
          evento_id?: string
          id?: string
          organizacao_id?: string
          promoter_id?: string | null
          ref?: string | null
          updated_at?: string
          utm_campaign?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          visitante?: string
        }
        Relationships: [
          {
            foreignKeyName: "cliques_evento_id_fkey"
            columns: ["evento_id"]
            isOneToOne: false
            referencedRelation: "eventos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cliques_evento_id_fkey"
            columns: ["evento_id"]
            isOneToOne: false
            referencedRelation: "eventos_com_contagem"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cliques_organizacao_id_fkey"
            columns: ["organizacao_id"]
            isOneToOne: false
            referencedRelation: "organizacoes"
            referencedColumns: ["id"]
          },
        ]
      }
      concierge_assignments: {
        Row: {
          assigned_at: string
          assigned_by: string | null
          assignee_user_id: string
          id: string
          request_id: string
          unassigned_at: string | null
        }
        Insert: {
          assigned_at?: string
          assigned_by?: string | null
          assignee_user_id: string
          id?: string
          request_id: string
          unassigned_at?: string | null
        }
        Update: {
          assigned_at?: string
          assigned_by?: string | null
          assignee_user_id?: string
          id?: string
          request_id?: string
          unassigned_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "concierge_assignments_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "concierge_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      concierge_conversations: {
        Row: {
          created_at: string
          id: string
          last_message_at: string
          member_id: string
          title: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          last_message_at?: string
          member_id: string
          title?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          last_message_at?: string
          member_id?: string
          title?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "concierge_conversations_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
        ]
      }
      concierge_messages: {
        Row: {
          author_kind: string
          author_name: string | null
          author_user_id: string | null
          body: string
          conversation_id: string | null
          created_at: string
          feedback: number | null
          id: string
          intent: string | null
          internal: boolean
          metadata: Json
          request_id: string | null
        }
        Insert: {
          author_kind: string
          author_name?: string | null
          author_user_id?: string | null
          body: string
          conversation_id?: string | null
          created_at?: string
          feedback?: number | null
          id?: string
          intent?: string | null
          internal?: boolean
          metadata?: Json
          request_id?: string | null
        }
        Update: {
          author_kind?: string
          author_name?: string | null
          author_user_id?: string | null
          body?: string
          conversation_id?: string | null
          created_at?: string
          feedback?: number | null
          id?: string
          intent?: string | null
          internal?: boolean
          metadata?: Json
          request_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "concierge_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "concierge_conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "concierge_messages_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "concierge_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      concierge_requests: {
        Row: {
          category: string
          closed_at: string | null
          conversation_id: string | null
          created_at: string
          id: string
          idempotency_key: string
          member_id: string
          origin: string
          priority: string
          resolved_at: string | null
          status: string
          subject: string
          updated_at: string
        }
        Insert: {
          category: string
          closed_at?: string | null
          conversation_id?: string | null
          created_at?: string
          id?: string
          idempotency_key: string
          member_id: string
          origin?: string
          priority?: string
          resolved_at?: string | null
          status?: string
          subject: string
          updated_at?: string
        }
        Update: {
          category?: string
          closed_at?: string | null
          conversation_id?: string | null
          created_at?: string
          id?: string
          idempotency_key?: string
          member_id?: string
          origin?: string
          priority?: string
          resolved_at?: string | null
          status?: string
          subject?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "concierge_requests_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "concierge_conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "concierge_requests_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
        ]
      }
      consentimentos: {
        Row: {
          aceito: boolean
          cpf: string | null
          created_at: string
          email: string | null
          finalidade: string
          id: string
          ip: string | null
          organizacao_id: string
          origem: string
          pedido_id: string | null
          pessoa_id: string | null
          updated_at: string
          versao: string
        }
        Insert: {
          aceito: boolean
          cpf?: string | null
          created_at?: string
          email?: string | null
          finalidade: string
          id?: string
          ip?: string | null
          organizacao_id: string
          origem: string
          pedido_id?: string | null
          pessoa_id?: string | null
          updated_at?: string
          versao: string
        }
        Update: {
          aceito?: boolean
          cpf?: string | null
          created_at?: string
          email?: string | null
          finalidade?: string
          id?: string
          ip?: string | null
          organizacao_id?: string
          origem?: string
          pedido_id?: string | null
          pessoa_id?: string | null
          updated_at?: string
          versao?: string
        }
        Relationships: [
          {
            foreignKeyName: "consentimentos_organizacao_id_fkey"
            columns: ["organizacao_id"]
            isOneToOne: false
            referencedRelation: "organizacoes"
            referencedColumns: ["id"]
          },
        ]
      }
      contas_compradores: {
        Row: {
          cpf: string
          created_at: string
          data_nascimento: string | null
          email: string
          id: string
          nome: string
          senha_hash: string
          sexo: string | null
          telefone: string | null
          ultimo_acesso: string | null
          updated_at: string
        }
        Insert: {
          cpf: string
          created_at?: string
          data_nascimento?: string | null
          email: string
          id?: string
          nome: string
          senha_hash: string
          sexo?: string | null
          telefone?: string | null
          ultimo_acesso?: string | null
          updated_at?: string
        }
        Update: {
          cpf?: string
          created_at?: string
          data_nascimento?: string | null
          email?: string
          id?: string
          nome?: string
          senha_hash?: string
          sexo?: string | null
          telefone?: string | null
          ultimo_acesso?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      conversas_gerente: {
        Row: {
          aberta_em: string
          assunto: string | null
          encerrada_em: string | null
          id: string
          membro_id: string
          status: string
        }
        Insert: {
          aberta_em?: string
          assunto?: string | null
          encerrada_em?: string | null
          id?: string
          membro_id: string
          status?: string
        }
        Update: {
          aberta_em?: string
          assunto?: string | null
          encerrada_em?: string | null
          id?: string
          membro_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversas_gerente_membro_id_fkey"
            columns: ["membro_id"]
            isOneToOne: false
            referencedRelation: "membros"
            referencedColumns: ["id"]
          },
        ]
      }
      convites: {
        Row: {
          aceito_em: string | null
          created_at: string
          criado_por: string | null
          email: string
          expira_em: string
          id: string
          nome: string | null
          organizacao_id: string
          papel: string
          token_hash: string
          updated_at: string
        }
        Insert: {
          aceito_em?: string | null
          created_at?: string
          criado_por?: string | null
          email: string
          expira_em: string
          id?: string
          nome?: string | null
          organizacao_id: string
          papel: string
          token_hash: string
          updated_at?: string
        }
        Update: {
          aceito_em?: string | null
          created_at?: string
          criado_por?: string | null
          email?: string
          expira_em?: string
          id?: string
          nome?: string | null
          organizacao_id?: string
          papel?: string
          token_hash?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "convites_organizacao_id_fkey"
            columns: ["organizacao_id"]
            isOneToOne: false
            referencedRelation: "organizacoes"
            referencedColumns: ["id"]
          },
        ]
      }
      cupons: {
        Row: {
          ativo: boolean
          codigo: string
          created_at: string
          descricao: string | null
          evento_id: string | null
          exclusivo: boolean
          fim: string | null
          id: string
          inicio: string | null
          isenta_taxa: boolean
          lotes: string[]
          max_por_cpf: number | null
          max_usos: number | null
          minimo_itens: number
          organizacao_id: string
          parceiro: string | null
          promoter_id: string | null
          tipo: string
          tipos_ingresso: string[]
          updated_at: string
          usos: number
          valor: number
        }
        Insert: {
          ativo?: boolean
          codigo: string
          created_at?: string
          descricao?: string | null
          evento_id?: string | null
          exclusivo?: boolean
          fim?: string | null
          id?: string
          inicio?: string | null
          isenta_taxa?: boolean
          lotes?: string[]
          max_por_cpf?: number | null
          max_usos?: number | null
          minimo_itens?: number
          organizacao_id: string
          parceiro?: string | null
          promoter_id?: string | null
          tipo: string
          tipos_ingresso?: string[]
          updated_at?: string
          usos?: number
          valor: number
        }
        Update: {
          ativo?: boolean
          codigo?: string
          created_at?: string
          descricao?: string | null
          evento_id?: string | null
          exclusivo?: boolean
          fim?: string | null
          id?: string
          inicio?: string | null
          isenta_taxa?: boolean
          lotes?: string[]
          max_por_cpf?: number | null
          max_usos?: number | null
          minimo_itens?: number
          organizacao_id?: string
          parceiro?: string | null
          promoter_id?: string | null
          tipo?: string
          tipos_ingresso?: string[]
          updated_at?: string
          usos?: number
          valor?: number
        }
        Relationships: [
          {
            foreignKeyName: "cupons_evento_id_fkey"
            columns: ["evento_id"]
            isOneToOne: false
            referencedRelation: "eventos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cupons_evento_id_fkey"
            columns: ["evento_id"]
            isOneToOne: false
            referencedRelation: "eventos_com_contagem"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cupons_organizacao_id_fkey"
            columns: ["organizacao_id"]
            isOneToOne: false
            referencedRelation: "organizacoes"
            referencedColumns: ["id"]
          },
        ]
      }
      directory_events: {
        Row: {
          at: string
          id: string
          kind: string
          member_id: string
          query: Json | null
          target_member_id: string | null
        }
        Insert: {
          at?: string
          id?: string
          kind: string
          member_id: string
          query?: Json | null
          target_member_id?: string | null
        }
        Update: {
          at?: string
          id?: string
          kind?: string
          member_id?: string
          query?: Json | null
          target_member_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "directory_events_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "directory_events_target_member_id_fkey"
            columns: ["target_member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
        ]
      }
      directory_preferences: {
        Row: {
          city: string | null
          company: string | null
          consented_at: string | null
          contact_email: string | null
          contact_instagram: string | null
          contact_linkedin: string | null
          contact_whatsapp: boolean
          description: string | null
          display_name: string | null
          interests: string[]
          member_id: string
          moderated_by: string | null
          moderation_note: string | null
          moderation_status: string
          profession: string | null
          skills: string[]
          updated_at: string
          visible: boolean
        }
        Insert: {
          city?: string | null
          company?: string | null
          consented_at?: string | null
          contact_email?: string | null
          contact_instagram?: string | null
          contact_linkedin?: string | null
          contact_whatsapp?: boolean
          description?: string | null
          display_name?: string | null
          interests?: string[]
          member_id: string
          moderated_by?: string | null
          moderation_note?: string | null
          moderation_status?: string
          profession?: string | null
          skills?: string[]
          updated_at?: string
          visible?: boolean
        }
        Update: {
          city?: string | null
          company?: string | null
          consented_at?: string | null
          contact_email?: string | null
          contact_instagram?: string | null
          contact_linkedin?: string | null
          contact_whatsapp?: boolean
          description?: string | null
          display_name?: string | null
          interests?: string[]
          member_id?: string
          moderated_by?: string | null
          moderation_note?: string | null
          moderation_status?: string
          profession?: string | null
          skills?: string[]
          updated_at?: string
          visible?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "directory_preferences_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: true
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
        ]
      }
      entregas: {
        Row: {
          created_at: string
          evento: string
          id: string
          organizacao_id: string
          payload: Json
          proxima_tentativa: string | null
          resposta_status: number | null
          resposta_trecho: string | null
          status: string
          tentativas: number
          updated_at: string
          webhook_id: string
        }
        Insert: {
          created_at?: string
          evento: string
          id?: string
          organizacao_id: string
          payload: Json
          proxima_tentativa?: string | null
          resposta_status?: number | null
          resposta_trecho?: string | null
          status: string
          tentativas?: number
          updated_at?: string
          webhook_id: string
        }
        Update: {
          created_at?: string
          evento?: string
          id?: string
          organizacao_id?: string
          payload?: Json
          proxima_tentativa?: string | null
          resposta_status?: number | null
          resposta_trecho?: string | null
          status?: string
          tentativas?: number
          updated_at?: string
          webhook_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "entregas_organizacao_id_fkey"
            columns: ["organizacao_id"]
            isOneToOne: false
            referencedRelation: "organizacoes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "entregas_webhook_id_fkey"
            columns: ["webhook_id"]
            isOneToOne: false
            referencedRelation: "webhooks"
            referencedColumns: ["id"]
          },
        ]
      }
      eventos: {
        Row: {
          abertura_executada: boolean
          arquivado_em: string | null
          capacidade: number | null
          categoria: string | null
          checkin_abertura: string | null
          checkin_fechamento: string | null
          checkin_status: string
          cidade: string | null
          classificacao: string
          created_at: string
          criado_por: string | null
          data_evento: string
          data_fim: string | null
          descricao: string | null
          fechamento_executada: boolean
          formato: string
          horario_fim: string | null
          horario_inicio: string
          id: string
          imagem_capa: string | null
          imagem_mobile: string | null
          imagens: string[]
          link_online: string | null
          local: string
          local_url: string | null
          lp_url: string | null
          modo: string
          organizacao_id: string
          organizador: Json | null
          pagina: Json | null
          pelotoes: string[]
          politica: Json
          regras_venda: Json
          slug: string
          termos: string | null
          tipo: string
          titulo: string
          uf: string | null
          updated_at: string
          vendidos: number
          visibilidade: string
        }
        Insert: {
          abertura_executada?: boolean
          arquivado_em?: string | null
          capacidade?: number | null
          categoria?: string | null
          checkin_abertura?: string | null
          checkin_fechamento?: string | null
          checkin_status?: string
          cidade?: string | null
          classificacao?: string
          created_at?: string
          criado_por?: string | null
          data_evento: string
          data_fim?: string | null
          descricao?: string | null
          fechamento_executada?: boolean
          formato?: string
          horario_fim?: string | null
          horario_inicio?: string
          id?: string
          imagem_capa?: string | null
          imagem_mobile?: string | null
          imagens?: string[]
          link_online?: string | null
          local?: string
          local_url?: string | null
          lp_url?: string | null
          modo?: string
          organizacao_id?: string
          organizador?: Json | null
          pagina?: Json | null
          pelotoes?: string[]
          politica?: Json
          regras_venda?: Json
          slug: string
          termos?: string | null
          tipo?: string
          titulo: string
          uf?: string | null
          updated_at?: string
          vendidos?: number
          visibilidade?: string
        }
        Update: {
          abertura_executada?: boolean
          arquivado_em?: string | null
          capacidade?: number | null
          categoria?: string | null
          checkin_abertura?: string | null
          checkin_fechamento?: string | null
          checkin_status?: string
          cidade?: string | null
          classificacao?: string
          created_at?: string
          criado_por?: string | null
          data_evento?: string
          data_fim?: string | null
          descricao?: string | null
          fechamento_executada?: boolean
          formato?: string
          horario_fim?: string | null
          horario_inicio?: string
          id?: string
          imagem_capa?: string | null
          imagem_mobile?: string | null
          imagens?: string[]
          link_online?: string | null
          local?: string
          local_url?: string | null
          lp_url?: string | null
          modo?: string
          organizacao_id?: string
          organizador?: Json | null
          pagina?: Json | null
          pelotoes?: string[]
          politica?: Json
          regras_venda?: Json
          slug?: string
          termos?: string | null
          tipo?: string
          titulo?: string
          uf?: string | null
          updated_at?: string
          vendidos?: number
          visibilidade?: string
        }
        Relationships: [
          {
            foreignKeyName: "eventos_organizacao_id_fkey"
            columns: ["organizacao_id"]
            isOneToOne: false
            referencedRelation: "organizacoes"
            referencedColumns: ["id"]
          },
        ]
      }
      eventos_gateway: {
        Row: {
          created_at: string
          evento_id: string
          gateway: string
          id: string
          processado_em: string | null
          recebido: Json | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          evento_id: string
          gateway: string
          id?: string
          processado_em?: string | null
          recebido?: Json | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          evento_id?: string
          gateway?: string
          id?: string
          processado_em?: string | null
          recebido?: Json | null
          updated_at?: string
        }
        Relationships: []
      }
      eventos_secretos: {
        Row: {
          capacidade: number | null
          codinome: string
          created_at: string
          criado_por: string | null
          custo_moedas: number
          descricao: string | null
          dress_code: string | null
          fim: string | null
          id: string
          inicio: string
          local: string | null
          revela_em: string | null
          status: string
          titulo: string | null
          updated_at: string
        }
        Insert: {
          capacidade?: number | null
          codinome: string
          created_at?: string
          criado_por?: string | null
          custo_moedas?: number
          descricao?: string | null
          dress_code?: string | null
          fim?: string | null
          id?: string
          inicio: string
          local?: string | null
          revela_em?: string | null
          status?: string
          titulo?: string | null
          updated_at?: string
        }
        Update: {
          capacidade?: number | null
          codinome?: string
          created_at?: string
          criado_por?: string | null
          custo_moedas?: number
          descricao?: string | null
          dress_code?: string | null
          fim?: string | null
          id?: string
          inicio?: string
          local?: string | null
          revela_em?: string | null
          status?: string
          titulo?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      eventos_secretos_convites: {
        Row: {
          acompanhantes: number
          convidado_em: string
          evento_id: string
          id: string
          membro_id: string
          presente: boolean | null
          respondido_em: string | null
          resposta: string
        }
        Insert: {
          acompanhantes?: number
          convidado_em?: string
          evento_id: string
          id?: string
          membro_id: string
          presente?: boolean | null
          respondido_em?: string | null
          resposta?: string
        }
        Update: {
          acompanhantes?: number
          convidado_em?: string
          evento_id?: string
          id?: string
          membro_id?: string
          presente?: boolean | null
          respondido_em?: string | null
          resposta?: string
        }
        Relationships: [
          {
            foreignKeyName: "eventos_secretos_convites_evento_id_fkey"
            columns: ["evento_id"]
            isOneToOne: false
            referencedRelation: "eventos_secretos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "eventos_secretos_convites_membro_id_fkey"
            columns: ["membro_id"]
            isOneToOne: false
            referencedRelation: "membros"
            referencedColumns: ["id"]
          },
        ]
      }
      execucoes: {
        Row: {
          alvo_id: string
          automacao_id: string
          created_at: string
          id: string
          organizacao_id: string
          resultado: string
          updated_at: string
        }
        Insert: {
          alvo_id: string
          automacao_id: string
          created_at?: string
          id?: string
          organizacao_id: string
          resultado: string
          updated_at?: string
        }
        Update: {
          alvo_id?: string
          automacao_id?: string
          created_at?: string
          id?: string
          organizacao_id?: string
          resultado?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "execucoes_automacao_id_fkey"
            columns: ["automacao_id"]
            isOneToOne: false
            referencedRelation: "automacoes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "execucoes_organizacao_id_fkey"
            columns: ["organizacao_id"]
            isOneToOne: false
            referencedRelation: "organizacoes"
            referencedColumns: ["id"]
          },
        ]
      }
      gold_coin_accounts: {
        Row: {
          created_at: string
          id: string
          member_id: string
          status: string
        }
        Insert: {
          created_at?: string
          id?: string
          member_id: string
          status?: string
        }
        Update: {
          created_at?: string
          id?: string
          member_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "gold_coin_accounts_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: true
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
        ]
      }
      gold_coin_rules: {
        Row: {
          active: boolean
          amount: number
          code: string
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          amount: number
          code: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          amount?: number
          code?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      gold_coin_transactions: {
        Row: {
          account_id: string
          amount: number
          created_at: string
          id: string
          idempotency_key: string
          kind: string
          operator_user_id: string | null
          reason: string
          reference: string | null
          reverses_id: string | null
          rule_id: string | null
        }
        Insert: {
          account_id: string
          amount: number
          created_at?: string
          id?: string
          idempotency_key: string
          kind: string
          operator_user_id?: string | null
          reason: string
          reference?: string | null
          reverses_id?: string | null
          rule_id?: string | null
        }
        Update: {
          account_id?: string
          amount?: number
          created_at?: string
          id?: string
          idempotency_key?: string
          kind?: string
          operator_user_id?: string | null
          reason?: string
          reference?: string | null
          reverses_id?: string | null
          rule_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "gold_coin_transactions_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "gold_coin_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gold_coin_transactions_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "gold_coin_balances"
            referencedColumns: ["account_id"]
          },
          {
            foreignKeyName: "gold_coin_transactions_reverses_id_fkey"
            columns: ["reverses_id"]
            isOneToOne: true
            referencedRelation: "gold_coin_transactions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gold_coin_transactions_rule_id_fkey"
            columns: ["rule_id"]
            isOneToOne: false
            referencedRelation: "gold_coin_rules"
            referencedColumns: ["id"]
          },
        ]
      }
      import_batches: {
        Row: {
          counts: Json
          finished_at: string | null
          id: string
          kind: string
          mode: string
          operator: string
          report: Json
          source_file: string
          source_sha256: string
          started_at: string
          status: string
        }
        Insert: {
          counts?: Json
          finished_at?: string | null
          id?: string
          kind: string
          mode: string
          operator: string
          report?: Json
          source_file: string
          source_sha256: string
          started_at?: string
          status?: string
        }
        Update: {
          counts?: Json
          finished_at?: string | null
          id?: string
          kind?: string
          mode?: string
          operator?: string
          report?: Json
          source_file?: string
          source_sha256?: string
          started_at?: string
          status?: string
        }
        Relationships: []
      }
      import_errors: {
        Row: {
          batch_id: string
          created_at: string
          field: string | null
          id: string
          message: string
          source_row: number | null
        }
        Insert: {
          batch_id: string
          created_at?: string
          field?: string | null
          id?: string
          message: string
          source_row?: number | null
        }
        Update: {
          batch_id?: string
          created_at?: string
          field?: string | null
          id?: string
          message?: string
          source_row?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "import_errors_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "import_batches"
            referencedColumns: ["id"]
          },
        ]
      }
      import_rows: {
        Row: {
          action: string
          batch_id: string
          created_at: string
          id: string
          member_id: string | null
          normalized: Json | null
          note: string | null
          previous: Json | null
          raw: Json
          source_row: number
        }
        Insert: {
          action: string
          batch_id: string
          created_at?: string
          id?: string
          member_id?: string | null
          normalized?: Json | null
          note?: string | null
          previous?: Json | null
          raw: Json
          source_row: number
        }
        Update: {
          action?: string
          batch_id?: string
          created_at?: string
          id?: string
          member_id?: string | null
          normalized?: Json | null
          note?: string | null
          previous?: Json | null
          raw?: Json
          source_row?: number
        }
        Relationships: [
          {
            foreignKeyName: "import_rows_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "import_batches"
            referencedColumns: ["id"]
          },
        ]
      }
      ingressos: {
        Row: {
          areas_extras: string[]
          assento_id: string | null
          assento_rotulo: string | null
          cancelado_em: string | null
          checkin_em: string | null
          codigo: string
          created_at: string
          credencial: string | null
          emitido_por: string | null
          evento_id: string
          id: string
          lote_id: string | null
          lote_nome: string | null
          motivo_cancelamento: string | null
          no_show: boolean
          organizacao_id: string
          origem: string
          pedido_id: string | null
          pessoa_id: string | null
          qr_conteudo: string | null
          sessao_id: string | null
          status: string
          tipo_id: string
          tipo_nome: string
          titular: Json
          transferencias: number
          transferido_de: string | null
          transferido_para: string | null
          updated_at: string
          valor_centavos: number
          versao: number
        }
        Insert: {
          areas_extras?: string[]
          assento_id?: string | null
          assento_rotulo?: string | null
          cancelado_em?: string | null
          checkin_em?: string | null
          codigo: string
          created_at?: string
          credencial?: string | null
          emitido_por?: string | null
          evento_id: string
          id?: string
          lote_id?: string | null
          lote_nome?: string | null
          motivo_cancelamento?: string | null
          no_show?: boolean
          organizacao_id: string
          origem: string
          pedido_id?: string | null
          pessoa_id?: string | null
          qr_conteudo?: string | null
          sessao_id?: string | null
          status: string
          tipo_id: string
          tipo_nome: string
          titular: Json
          transferencias?: number
          transferido_de?: string | null
          transferido_para?: string | null
          updated_at?: string
          valor_centavos?: number
          versao?: number
        }
        Update: {
          areas_extras?: string[]
          assento_id?: string | null
          assento_rotulo?: string | null
          cancelado_em?: string | null
          checkin_em?: string | null
          codigo?: string
          created_at?: string
          credencial?: string | null
          emitido_por?: string | null
          evento_id?: string
          id?: string
          lote_id?: string | null
          lote_nome?: string | null
          motivo_cancelamento?: string | null
          no_show?: boolean
          organizacao_id?: string
          origem?: string
          pedido_id?: string | null
          pessoa_id?: string | null
          qr_conteudo?: string | null
          sessao_id?: string | null
          status?: string
          tipo_id?: string
          tipo_nome?: string
          titular?: Json
          transferencias?: number
          transferido_de?: string | null
          transferido_para?: string | null
          updated_at?: string
          valor_centavos?: number
          versao?: number
        }
        Relationships: [
          {
            foreignKeyName: "ingressos_evento_id_fkey"
            columns: ["evento_id"]
            isOneToOne: false
            referencedRelation: "eventos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ingressos_evento_id_fkey"
            columns: ["evento_id"]
            isOneToOne: false
            referencedRelation: "eventos_com_contagem"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ingressos_organizacao_id_fkey"
            columns: ["organizacao_id"]
            isOneToOne: false
            referencedRelation: "organizacoes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ingressos_pedido_id_fkey"
            columns: ["pedido_id"]
            isOneToOne: false
            referencedRelation: "pedidos"
            referencedColumns: ["id"]
          },
        ]
      }
      inscricoes_push: {
        Row: {
          auth: string
          created_at: string
          endpoint: string
          id: string
          ingresso_id: string | null
          organizacao_id: string
          p256dh: string
          pessoa_id: string | null
          updated_at: string
        }
        Insert: {
          auth: string
          created_at?: string
          endpoint: string
          id?: string
          ingresso_id?: string | null
          organizacao_id: string
          p256dh: string
          pessoa_id?: string | null
          updated_at?: string
        }
        Update: {
          auth?: string
          created_at?: string
          endpoint?: string
          id?: string
          ingresso_id?: string | null
          organizacao_id?: string
          p256dh?: string
          pessoa_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "inscricoes_push_organizacao_id_fkey"
            columns: ["organizacao_id"]
            isOneToOne: false
            referencedRelation: "organizacoes"
            referencedColumns: ["id"]
          },
        ]
      }
      lancamentos: {
        Row: {
          antecipacao_id: string | null
          created_at: string
          criado_por: string | null
          descricao: string
          disponivel_em: string
          evento_id: string | null
          id: string
          organizacao_id: string
          pedido_id: string | null
          saque_id: string | null
          tipo: string
          updated_at: string
          valor_centavos: number
        }
        Insert: {
          antecipacao_id?: string | null
          created_at?: string
          criado_por?: string | null
          descricao: string
          disponivel_em: string
          evento_id?: string | null
          id?: string
          organizacao_id: string
          pedido_id?: string | null
          saque_id?: string | null
          tipo: string
          updated_at?: string
          valor_centavos: number
        }
        Update: {
          antecipacao_id?: string | null
          created_at?: string
          criado_por?: string | null
          descricao?: string
          disponivel_em?: string
          evento_id?: string | null
          id?: string
          organizacao_id?: string
          pedido_id?: string | null
          saque_id?: string | null
          tipo?: string
          updated_at?: string
          valor_centavos?: number
        }
        Relationships: [
          {
            foreignKeyName: "lancamentos_organizacao_id_fkey"
            columns: ["organizacao_id"]
            isOneToOne: false
            referencedRelation: "organizacoes"
            referencedColumns: ["id"]
          },
        ]
      }
      lotes: {
        Row: {
          ativo: boolean
          created_at: string
          evento_id: string
          fim: string | null
          id: string
          inicio: string | null
          nome: string
          ordem: number
          organizacao_id: string
          preco_centavos: number
          quantidade: number | null
          tipo_id: string
          updated_at: string
          vendidos: number
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          evento_id: string
          fim?: string | null
          id?: string
          inicio?: string | null
          nome: string
          ordem?: number
          organizacao_id: string
          preco_centavos?: number
          quantidade?: number | null
          tipo_id: string
          updated_at?: string
          vendidos?: number
        }
        Update: {
          ativo?: boolean
          created_at?: string
          evento_id?: string
          fim?: string | null
          id?: string
          inicio?: string | null
          nome?: string
          ordem?: number
          organizacao_id?: string
          preco_centavos?: number
          quantidade?: number | null
          tipo_id?: string
          updated_at?: string
          vendidos?: number
        }
        Relationships: [
          {
            foreignKeyName: "lotes_evento_id_fkey"
            columns: ["evento_id"]
            isOneToOne: false
            referencedRelation: "eventos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lotes_evento_id_fkey"
            columns: ["evento_id"]
            isOneToOne: false
            referencedRelation: "eventos_com_contagem"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lotes_organizacao_id_fkey"
            columns: ["organizacao_id"]
            isOneToOne: false
            referencedRelation: "organizacoes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lotes_tipo_id_fkey"
            columns: ["tipo_id"]
            isOneToOne: false
            referencedRelation: "tipos_ingresso"
            referencedColumns: ["id"]
          },
        ]
      }
      mapas_assentos: {
        Row: {
          altura: number
          blocos: Json
          created_at: string
          evento_id: string
          id: string
          largura: number
          nome: string
          organizacao_id: string
          palco: Json | null
          updated_at: string
        }
        Insert: {
          altura: number
          blocos?: Json
          created_at?: string
          evento_id: string
          id?: string
          largura: number
          nome: string
          organizacao_id: string
          palco?: Json | null
          updated_at?: string
        }
        Update: {
          altura?: number
          blocos?: Json
          created_at?: string
          evento_id?: string
          id?: string
          largura?: number
          nome?: string
          organizacao_id?: string
          palco?: Json | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "mapas_assentos_evento_id_fkey"
            columns: ["evento_id"]
            isOneToOne: false
            referencedRelation: "eventos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mapas_assentos_evento_id_fkey"
            columns: ["evento_id"]
            isOneToOne: false
            referencedRelation: "eventos_com_contagem"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mapas_assentos_organizacao_id_fkey"
            columns: ["organizacao_id"]
            isOneToOne: false
            referencedRelation: "organizacoes"
            referencedColumns: ["id"]
          },
        ]
      }
      member_checkins: {
        Row: {
          event_id: string
          exception_reason: string | null
          id: string
          local_day: string
          member_id: string
          operator_user_id: string | null
          source: string
          validated_at: string
        }
        Insert: {
          event_id: string
          exception_reason?: string | null
          id?: string
          local_day: string
          member_id: string
          operator_user_id?: string | null
          source: string
          validated_at?: string
        }
        Update: {
          event_id?: string
          exception_reason?: string | null
          id?: string
          local_day?: string
          member_id?: string
          operator_user_id?: string | null
          source?: string
          validated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "member_checkins_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "checkin_events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "member_checkins_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
        ]
      }
      member_connections: {
        Row: {
          addressee_id: string
          blocked_by: string | null
          created_at: string
          id: string
          message: string | null
          requester_id: string
          responded_at: string | null
          status: string
        }
        Insert: {
          addressee_id: string
          blocked_by?: string | null
          created_at?: string
          id?: string
          message?: string | null
          requester_id: string
          responded_at?: string | null
          status?: string
        }
        Update: {
          addressee_id?: string
          blocked_by?: string | null
          created_at?: string
          id?: string
          message?: string | null
          requester_id?: string
          responded_at?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "member_connections_addressee_id_fkey"
            columns: ["addressee_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "member_connections_blocked_by_fkey"
            columns: ["blocked_by"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "member_connections_requester_id_fkey"
            columns: ["requester_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
        ]
      }
      member_credentials: {
        Row: {
          id: string
          issued_at: string
          issued_by: string | null
          member_id: string
          public_code: string
          revoked_at: string | null
          revoked_by: string | null
          status: string
          version: number
        }
        Insert: {
          id?: string
          issued_at?: string
          issued_by?: string | null
          member_id: string
          public_code: string
          revoked_at?: string | null
          revoked_by?: string | null
          status?: string
          version?: number
        }
        Update: {
          id?: string
          issued_at?: string
          issued_by?: string | null
          member_id?: string
          public_code?: string
          revoked_at?: string | null
          revoked_by?: string | null
          status?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "member_credentials_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
        ]
      }
      member_invitations: {
        Row: {
          accepted_at: string | null
          created_at: string
          created_by: string | null
          expires_at: string
          id: string
          member_id: string
          revoked_at: string | null
          revoked_by: string | null
          token_hash: string
        }
        Insert: {
          accepted_at?: string | null
          created_at?: string
          created_by?: string | null
          expires_at: string
          id?: string
          member_id: string
          revoked_at?: string | null
          revoked_by?: string | null
          token_hash: string
        }
        Update: {
          accepted_at?: string | null
          created_at?: string
          created_by?: string | null
          expires_at?: string
          id?: string
          member_id?: string
          revoked_at?: string | null
          revoked_by?: string | null
          token_hash?: string
        }
        Relationships: [
          {
            foreignKeyName: "member_invitations_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
        ]
      }
      member_notifications: {
        Row: {
          body: string | null
          created_at: string
          id: string
          kind: string
          link: string | null
          member_id: string
          read_at: string | null
          title: string
        }
        Insert: {
          body?: string | null
          created_at?: string
          id?: string
          kind: string
          link?: string | null
          member_id: string
          read_at?: string | null
          title: string
        }
        Update: {
          body?: string | null
          created_at?: string
          id?: string
          kind?: string
          link?: string | null
          member_id?: string
          read_at?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "member_notifications_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
        ]
      }
      member_private_cs: {
        Row: {
          behavioral: Json
          behavioral_source: Json | null
          confidence: string | null
          cs_columns: Json
          cs_source: Json | null
          identification_status: string | null
          internal_notes: string | null
          member_id: string
          recommended_use: string | null
          relationship_history: string | null
          search_text: string | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          behavioral?: Json
          behavioral_source?: Json | null
          confidence?: string | null
          cs_columns?: Json
          cs_source?: Json | null
          identification_status?: string | null
          internal_notes?: string | null
          member_id: string
          recommended_use?: string | null
          relationship_history?: string | null
          search_text?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          behavioral?: Json
          behavioral_source?: Json | null
          confidence?: string | null
          cs_columns?: Json
          cs_source?: Json | null
          identification_status?: string | null
          internal_notes?: string | null
          member_id?: string
          recommended_use?: string | null
          relationship_history?: string | null
          search_text?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "member_private_cs_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: true
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
        ]
      }
      member_profiles: {
        Row: {
          base_city: string | null
          best_days: string[]
          best_times: string[]
          birth_date: string | null
          birthday_text: string | null
          brand_referrals: string | null
          business: string | null
          cities_context: string | null
          concierge_channels: string[]
          contribution_profile: string[]
          curiosity: string | null
          declared_at: string | null
          dietary_restrictions: string | null
          drink_notes: string | null
          drinks: string[]
          event_frequency: string | null
          experiences: string[]
          family: Json
          family_events_interest: number | null
          family_frequency: string | null
          food_preferences: string | null
          format_notes: string | null
          formats: string[]
          hometown: string | null
          how_to_contribute: string | null
          interests: string[]
          international_cities: string[]
          marital_status: string | null
          member_id: string
          open_to_debate: string | null
          other_cities: string[]
          proactivity: number | null
          public_exposure: number | null
          sectors: string[]
          source_file: string | null
          source_row: number | null
          spirituality: string | null
          sports_team: string | null
          updated_at: string
        }
        Insert: {
          base_city?: string | null
          best_days?: string[]
          best_times?: string[]
          birth_date?: string | null
          birthday_text?: string | null
          brand_referrals?: string | null
          business?: string | null
          cities_context?: string | null
          concierge_channels?: string[]
          contribution_profile?: string[]
          curiosity?: string | null
          declared_at?: string | null
          dietary_restrictions?: string | null
          drink_notes?: string | null
          drinks?: string[]
          event_frequency?: string | null
          experiences?: string[]
          family?: Json
          family_events_interest?: number | null
          family_frequency?: string | null
          food_preferences?: string | null
          format_notes?: string | null
          formats?: string[]
          hometown?: string | null
          how_to_contribute?: string | null
          interests?: string[]
          international_cities?: string[]
          marital_status?: string | null
          member_id: string
          open_to_debate?: string | null
          other_cities?: string[]
          proactivity?: number | null
          public_exposure?: number | null
          sectors?: string[]
          source_file?: string | null
          source_row?: number | null
          spirituality?: string | null
          sports_team?: string | null
          updated_at?: string
        }
        Update: {
          base_city?: string | null
          best_days?: string[]
          best_times?: string[]
          birth_date?: string | null
          birthday_text?: string | null
          brand_referrals?: string | null
          business?: string | null
          cities_context?: string | null
          concierge_channels?: string[]
          contribution_profile?: string[]
          curiosity?: string | null
          declared_at?: string | null
          dietary_restrictions?: string | null
          drink_notes?: string | null
          drinks?: string[]
          event_frequency?: string | null
          experiences?: string[]
          family?: Json
          family_events_interest?: number | null
          family_frequency?: string | null
          food_preferences?: string | null
          format_notes?: string | null
          formats?: string[]
          hometown?: string | null
          how_to_contribute?: string | null
          interests?: string[]
          international_cities?: string[]
          marital_status?: string | null
          member_id?: string
          open_to_debate?: string | null
          other_cities?: string[]
          proactivity?: number | null
          public_exposure?: number | null
          sectors?: string[]
          source_file?: string | null
          source_row?: number | null
          spirituality?: string | null
          sports_team?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "member_profiles_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: true
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
        ]
      }
      member_roles: {
        Row: {
          granted_at: string
          granted_by: string | null
          id: string
          role: string
          user_id: string
        }
        Insert: {
          granted_at?: string
          granted_by?: string | null
          id?: string
          role: string
          user_id: string
        }
        Update: {
          granted_at?: string
          granted_by?: string | null
          id?: string
          role?: string
          user_id?: string
        }
        Relationships: []
      }
      member_sessions: {
        Row: {
          created_at: string
          id: string
          ip_hash: string | null
          is_staff: boolean
          last_seen_at: string
          member_id: string | null
          revoke_reason: string | null
          revoked_at: string | null
          revoked_by: string | null
          user_agent: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          id: string
          ip_hash?: string | null
          is_staff?: boolean
          last_seen_at?: string
          member_id?: string | null
          revoke_reason?: string | null
          revoked_at?: string | null
          revoked_by?: string | null
          user_agent?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          ip_hash?: string | null
          is_staff?: boolean
          last_seen_at?: string
          member_id?: string | null
          revoke_reason?: string | null
          revoked_at?: string | null
          revoked_by?: string | null
          user_agent?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "member_sessions_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
        ]
      }
      members: {
        Row: {
          category: string
          created_at: string
          display_name: string | null
          founder_number: number | null
          full_name: string
          id: string
          import_batch_id: string | null
          imported_at: string | null
          is_synthetic: boolean
          joined_at: string | null
          legacy_id: string | null
          phone_e164: string | null
          source_file: string | null
          source_hash: string | null
          source_row: number | null
          source_system: string | null
          status: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          category?: string
          created_at?: string
          display_name?: string | null
          founder_number?: number | null
          full_name: string
          id?: string
          import_batch_id?: string | null
          imported_at?: string | null
          is_synthetic?: boolean
          joined_at?: string | null
          legacy_id?: string | null
          phone_e164?: string | null
          source_file?: string | null
          source_hash?: string | null
          source_row?: number | null
          source_system?: string | null
          status?: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          category?: string
          created_at?: string
          display_name?: string | null
          founder_number?: number | null
          full_name?: string
          id?: string
          import_batch_id?: string | null
          imported_at?: string | null
          is_synthetic?: boolean
          joined_at?: string | null
          legacy_id?: string | null
          phone_e164?: string | null
          source_file?: string | null
          source_hash?: string | null
          source_row?: number | null
          source_system?: string | null
          status?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "members_import_batch_id_fkey"
            columns: ["import_batch_id"]
            isOneToOne: false
            referencedRelation: "import_batches"
            referencedColumns: ["id"]
          },
        ]
      }
      membros: {
        Row: {
          aniversario: string | null
          aniversario_conjuge: string | null
          apelido: string | null
          ativacao_codigo_hash: string | null
          ativacao_expira_em: string | null
          ativacao_gerada_por: string | null
          atuacao: string | null
          bairro: string | null
          bebidas: string[]
          bio: string | null
          bloqueado_ate: string | null
          canal_concierge: string[]
          cartao_versao: number
          cep: string | null
          cidade_base: string | null
          cidade_uf: string | null
          ciente_beneficios: string | null
          como_contribuir: string | null
          complemento: string | null
          conjuge: string | null
          contato_apoio: string | null
          contexto_pracas: string | null
          cpf: string | null
          created_at: string
          data_casamento: string | null
          data_nascimento: string | null
          debate_time_religiao: string | null
          dias: string[]
          email: string | null
          endereco: string | null
          eneagrama_justificativa: string | null
          eneagrama_tipo: string | null
          enriquecimento: Json
          enriquecimento_em: string | null
          estado_civil: string | null
          experiencias: string[]
          exposicao_publica: number | null
          filhos: Json
          formatos: string[]
          foto_url: string | null
          frequencia_eventos: string | null
          frequencia_familia: string | null
          horarios: string[]
          id: string
          instagram: string | null
          interesse_familia: number | null
          linkedin: string | null
          marcas_indicadas: string | null
          naturalidade: string | null
          nome: string
          notas_familia: string | null
          numero: number
          numero_filhos: number | null
          obs_bebidas: string | null
          obs_filhos: string | null
          obs_formato: string | null
          pais: string | null
          passaporte: string | null
          passaporte_validade: string | null
          perfil_comportamental: string | null
          perfil_contribuicao: string[]
          potencial_clube: string | null
          pracas_brasil: string[]
          pracas_internacionais: string[]
          preferencias_gastronomicas: string | null
          primeiro_acesso_em: string | null
          proatividade: number | null
          publico: Json
          qr_segredo: string
          religiao: string | null
          respondido_em: string | null
          restricoes_alimentares: string | null
          rg: string | null
          rg_emissor: string | null
          risco_desengajamento: string | null
          setores: string[]
          status: string
          telefone: string
          telefone_alternativo: string | null
          tema_curiosidade: string | null
          temas_interesse: string[]
          time_futebol: string | null
          totp_ativado_em: string | null
          totp_falhas: number
          totp_segredo: string | null
          totp_ultimo_contador: number | null
          ultimo_acesso_em: string | null
          updated_at: string
        }
        Insert: {
          aniversario?: string | null
          aniversario_conjuge?: string | null
          apelido?: string | null
          ativacao_codigo_hash?: string | null
          ativacao_expira_em?: string | null
          ativacao_gerada_por?: string | null
          atuacao?: string | null
          bairro?: string | null
          bebidas?: string[]
          bio?: string | null
          bloqueado_ate?: string | null
          canal_concierge?: string[]
          cartao_versao?: number
          cep?: string | null
          cidade_base?: string | null
          cidade_uf?: string | null
          ciente_beneficios?: string | null
          como_contribuir?: string | null
          complemento?: string | null
          conjuge?: string | null
          contato_apoio?: string | null
          contexto_pracas?: string | null
          cpf?: string | null
          created_at?: string
          data_casamento?: string | null
          data_nascimento?: string | null
          debate_time_religiao?: string | null
          dias?: string[]
          email?: string | null
          endereco?: string | null
          eneagrama_justificativa?: string | null
          eneagrama_tipo?: string | null
          enriquecimento?: Json
          enriquecimento_em?: string | null
          estado_civil?: string | null
          experiencias?: string[]
          exposicao_publica?: number | null
          filhos?: Json
          formatos?: string[]
          foto_url?: string | null
          frequencia_eventos?: string | null
          frequencia_familia?: string | null
          horarios?: string[]
          id?: string
          instagram?: string | null
          interesse_familia?: number | null
          linkedin?: string | null
          marcas_indicadas?: string | null
          naturalidade?: string | null
          nome: string
          notas_familia?: string | null
          numero: number
          numero_filhos?: number | null
          obs_bebidas?: string | null
          obs_filhos?: string | null
          obs_formato?: string | null
          pais?: string | null
          passaporte?: string | null
          passaporte_validade?: string | null
          perfil_comportamental?: string | null
          perfil_contribuicao?: string[]
          potencial_clube?: string | null
          pracas_brasil?: string[]
          pracas_internacionais?: string[]
          preferencias_gastronomicas?: string | null
          primeiro_acesso_em?: string | null
          proatividade?: number | null
          publico?: Json
          qr_segredo?: string
          religiao?: string | null
          respondido_em?: string | null
          restricoes_alimentares?: string | null
          rg?: string | null
          rg_emissor?: string | null
          risco_desengajamento?: string | null
          setores?: string[]
          status?: string
          telefone: string
          telefone_alternativo?: string | null
          tema_curiosidade?: string | null
          temas_interesse?: string[]
          time_futebol?: string | null
          totp_ativado_em?: string | null
          totp_falhas?: number
          totp_segredo?: string | null
          totp_ultimo_contador?: number | null
          ultimo_acesso_em?: string | null
          updated_at?: string
        }
        Update: {
          aniversario?: string | null
          aniversario_conjuge?: string | null
          apelido?: string | null
          ativacao_codigo_hash?: string | null
          ativacao_expira_em?: string | null
          ativacao_gerada_por?: string | null
          atuacao?: string | null
          bairro?: string | null
          bebidas?: string[]
          bio?: string | null
          bloqueado_ate?: string | null
          canal_concierge?: string[]
          cartao_versao?: number
          cep?: string | null
          cidade_base?: string | null
          cidade_uf?: string | null
          ciente_beneficios?: string | null
          como_contribuir?: string | null
          complemento?: string | null
          conjuge?: string | null
          contato_apoio?: string | null
          contexto_pracas?: string | null
          cpf?: string | null
          created_at?: string
          data_casamento?: string | null
          data_nascimento?: string | null
          debate_time_religiao?: string | null
          dias?: string[]
          email?: string | null
          endereco?: string | null
          eneagrama_justificativa?: string | null
          eneagrama_tipo?: string | null
          enriquecimento?: Json
          enriquecimento_em?: string | null
          estado_civil?: string | null
          experiencias?: string[]
          exposicao_publica?: number | null
          filhos?: Json
          formatos?: string[]
          foto_url?: string | null
          frequencia_eventos?: string | null
          frequencia_familia?: string | null
          horarios?: string[]
          id?: string
          instagram?: string | null
          interesse_familia?: number | null
          linkedin?: string | null
          marcas_indicadas?: string | null
          naturalidade?: string | null
          nome?: string
          notas_familia?: string | null
          numero?: number
          numero_filhos?: number | null
          obs_bebidas?: string | null
          obs_filhos?: string | null
          obs_formato?: string | null
          pais?: string | null
          passaporte?: string | null
          passaporte_validade?: string | null
          perfil_comportamental?: string | null
          perfil_contribuicao?: string[]
          potencial_clube?: string | null
          pracas_brasil?: string[]
          pracas_internacionais?: string[]
          preferencias_gastronomicas?: string | null
          primeiro_acesso_em?: string | null
          proatividade?: number | null
          publico?: Json
          qr_segredo?: string
          religiao?: string | null
          respondido_em?: string | null
          restricoes_alimentares?: string | null
          rg?: string | null
          rg_emissor?: string | null
          risco_desengajamento?: string | null
          setores?: string[]
          status?: string
          telefone?: string
          telefone_alternativo?: string | null
          tema_curiosidade?: string | null
          temas_interesse?: string[]
          time_futebol?: string | null
          totp_ativado_em?: string | null
          totp_falhas?: number
          totp_segredo?: string | null
          totp_ultimo_contador?: number | null
          ultimo_acesso_em?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      membros_checkins: {
        Row: {
          em: string
          evento_id: string | null
          id: string
          latitude: number | null
          local: string
          longitude: number | null
          membro_id: string
          metodo: string
          saida_em: string | null
          validado_por: string | null
        }
        Insert: {
          em?: string
          evento_id?: string | null
          id?: string
          latitude?: number | null
          local?: string
          longitude?: number | null
          membro_id: string
          metodo: string
          saida_em?: string | null
          validado_por?: string | null
        }
        Update: {
          em?: string
          evento_id?: string | null
          id?: string
          latitude?: number | null
          local?: string
          longitude?: number | null
          membro_id?: string
          metodo?: string
          saida_em?: string | null
          validado_por?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "membros_checkins_membro_id_fkey"
            columns: ["membro_id"]
            isOneToOne: false
            referencedRelation: "membros"
            referencedColumns: ["id"]
          },
        ]
      }
      membros_sessoes: {
        Row: {
          created_at: string
          dispositivo: string | null
          expira_em: string
          id: string
          membro_id: string
          revogada_em: string | null
          token_hash: string
        }
        Insert: {
          created_at?: string
          dispositivo?: string | null
          expira_em: string
          id?: string
          membro_id: string
          revogada_em?: string | null
          token_hash: string
        }
        Update: {
          created_at?: string
          dispositivo?: string | null
          expira_em?: string
          id?: string
          membro_id?: string
          revogada_em?: string | null
          token_hash?: string
        }
        Relationships: [
          {
            foreignKeyName: "membros_sessoes_membro_id_fkey"
            columns: ["membro_id"]
            isOneToOne: false
            referencedRelation: "membros"
            referencedColumns: ["id"]
          },
        ]
      }
      mensagens: {
        Row: {
          assunto: string
          automacao_id: string | null
          campanha_id: string | null
          canal: string
          corpo_html: string | null
          corpo_texto: string
          created_at: string
          enviada_em: string | null
          evento_id: string | null
          id: string
          link: string | null
          modelo: string
          motivo: string | null
          organizacao_id: string
          para: string
          pedido_id: string | null
          pessoa_id: string | null
          provedor: string | null
          provedor_id: string | null
          status: string
          tentativas: number
          updated_at: string
        }
        Insert: {
          assunto: string
          automacao_id?: string | null
          campanha_id?: string | null
          canal: string
          corpo_html?: string | null
          corpo_texto: string
          created_at?: string
          enviada_em?: string | null
          evento_id?: string | null
          id?: string
          link?: string | null
          modelo: string
          motivo?: string | null
          organizacao_id: string
          para: string
          pedido_id?: string | null
          pessoa_id?: string | null
          provedor?: string | null
          provedor_id?: string | null
          status: string
          tentativas?: number
          updated_at?: string
        }
        Update: {
          assunto?: string
          automacao_id?: string | null
          campanha_id?: string | null
          canal?: string
          corpo_html?: string | null
          corpo_texto?: string
          created_at?: string
          enviada_em?: string | null
          evento_id?: string | null
          id?: string
          link?: string | null
          modelo?: string
          motivo?: string | null
          organizacao_id?: string
          para?: string
          pedido_id?: string | null
          pessoa_id?: string | null
          provedor?: string | null
          provedor_id?: string | null
          status?: string
          tentativas?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "mensagens_organizacao_id_fkey"
            columns: ["organizacao_id"]
            isOneToOne: false
            referencedRelation: "organizacoes"
            referencedColumns: ["id"]
          },
        ]
      }
      mensagens_gerente: {
        Row: {
          anexo_url: string | null
          autor: string
          autor_nome: string | null
          conversa_id: string
          em: string
          id: string
          lida_em: string | null
          texto: string
        }
        Insert: {
          anexo_url?: string | null
          autor: string
          autor_nome?: string | null
          conversa_id: string
          em?: string
          id?: string
          lida_em?: string | null
          texto: string
        }
        Update: {
          anexo_url?: string | null
          autor?: string
          autor_nome?: string | null
          conversa_id?: string
          em?: string
          id?: string
          lida_em?: string | null
          texto?: string
        }
        Relationships: [
          {
            foreignKeyName: "mensagens_gerente_conversa_id_fkey"
            columns: ["conversa_id"]
            isOneToOne: false
            referencedRelation: "conversas_gerente"
            referencedColumns: ["id"]
          },
        ]
      }
      modelos: {
        Row: {
          assunto: string
          ativo: boolean
          canal: string
          chave: string
          corpo: string
          created_at: string
          id: string
          organizacao_id: string
          updated_at: string
        }
        Insert: {
          assunto: string
          ativo?: boolean
          canal?: string
          chave: string
          corpo: string
          created_at?: string
          id?: string
          organizacao_id: string
          updated_at?: string
        }
        Update: {
          assunto?: string
          ativo?: boolean
          canal?: string
          chave?: string
          corpo?: string
          created_at?: string
          id?: string
          organizacao_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "modelos_organizacao_id_fkey"
            columns: ["organizacao_id"]
            isOneToOne: false
            referencedRelation: "organizacoes"
            referencedColumns: ["id"]
          },
        ]
      }
      moedas_lancamentos: {
        Row: {
          criado_por: string | null
          descricao: string | null
          em: string
          id: string
          membro_id: string
          motivo: string
          referencia: string | null
          valor: number
        }
        Insert: {
          criado_por?: string | null
          descricao?: string | null
          em?: string
          id?: string
          membro_id: string
          motivo: string
          referencia?: string | null
          valor: number
        }
        Update: {
          criado_por?: string | null
          descricao?: string | null
          em?: string
          id?: string
          membro_id?: string
          motivo?: string
          referencia?: string | null
          valor?: number
        }
        Relationships: [
          {
            foreignKeyName: "moedas_lancamentos_membro_id_fkey"
            columns: ["membro_id"]
            isOneToOne: false
            referencedRelation: "membros"
            referencedColumns: ["id"]
          },
        ]
      }
      organizacoes: {
        Row: {
          ativa: boolean
          created_at: string
          documento: string | null
          dominio: string | null
          email_contato: string | null
          financeiro: Json
          id: string
          listar_na_vitrine: boolean
          marca: Json
          nome: string
          remetente: Json | null
          slug: string
          updated_at: string
        }
        Insert: {
          ativa?: boolean
          created_at?: string
          documento?: string | null
          dominio?: string | null
          email_contato?: string | null
          financeiro: Json
          id?: string
          listar_na_vitrine?: boolean
          marca: Json
          nome: string
          remetente?: Json | null
          slug: string
          updated_at?: string
        }
        Update: {
          ativa?: boolean
          created_at?: string
          documento?: string | null
          dominio?: string | null
          email_contato?: string | null
          financeiro?: Json
          id?: string
          listar_na_vitrine?: boolean
          marca?: Json
          nome?: string
          remetente?: Json | null
          slug?: string
          updated_at?: string
        }
        Relationships: []
      }
      pedidos: {
        Row: {
          aceite_termos_em: string | null
          cancelado_em: string | null
          cobranca: Json | null
          cobranca_id: string | null
          codigo: string
          comprador: Json
          consentimento_marketing: boolean
          contexto: Json | null
          created_at: string
          cupom_codigo: string | null
          cupom_id: string | null
          desconto_centavos: number
          estoque_liberado: boolean
          evento_id: string
          expira_em: string
          gateway: string | null
          id: string
          ingressos_emitidos: boolean
          isencao_taxa: string | null
          itens: Json
          liquido_produtor_centavos: number
          metodo: string | null
          organizacao_id: string
          pago_em: string | null
          parcelas: number
          pessoa_id: string | null
          promoter_id: string | null
          reembolsado_centavos: number
          ref: string | null
          risco: Json | null
          status: string
          subtotal_centavos: number
          taxa_plataforma_centavos: number
          taxa_servico_centavos: number
          total_centavos: number
          updated_at: string
          utm: Json | null
        }
        Insert: {
          aceite_termos_em?: string | null
          cancelado_em?: string | null
          cobranca?: Json | null
          cobranca_id?: string | null
          codigo: string
          comprador: Json
          consentimento_marketing?: boolean
          contexto?: Json | null
          created_at?: string
          cupom_codigo?: string | null
          cupom_id?: string | null
          desconto_centavos?: number
          estoque_liberado?: boolean
          evento_id: string
          expira_em: string
          gateway?: string | null
          id?: string
          ingressos_emitidos?: boolean
          isencao_taxa?: string | null
          itens: Json
          liquido_produtor_centavos?: number
          metodo?: string | null
          organizacao_id: string
          pago_em?: string | null
          parcelas?: number
          pessoa_id?: string | null
          promoter_id?: string | null
          reembolsado_centavos?: number
          ref?: string | null
          risco?: Json | null
          status: string
          subtotal_centavos: number
          taxa_plataforma_centavos?: number
          taxa_servico_centavos?: number
          total_centavos: number
          updated_at?: string
          utm?: Json | null
        }
        Update: {
          aceite_termos_em?: string | null
          cancelado_em?: string | null
          cobranca?: Json | null
          cobranca_id?: string | null
          codigo?: string
          comprador?: Json
          consentimento_marketing?: boolean
          contexto?: Json | null
          created_at?: string
          cupom_codigo?: string | null
          cupom_id?: string | null
          desconto_centavos?: number
          estoque_liberado?: boolean
          evento_id?: string
          expira_em?: string
          gateway?: string | null
          id?: string
          ingressos_emitidos?: boolean
          isencao_taxa?: string | null
          itens?: Json
          liquido_produtor_centavos?: number
          metodo?: string | null
          organizacao_id?: string
          pago_em?: string | null
          parcelas?: number
          pessoa_id?: string | null
          promoter_id?: string | null
          reembolsado_centavos?: number
          ref?: string | null
          risco?: Json | null
          status?: string
          subtotal_centavos?: number
          taxa_plataforma_centavos?: number
          taxa_servico_centavos?: number
          total_centavos?: number
          updated_at?: string
          utm?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "pedidos_evento_id_fkey"
            columns: ["evento_id"]
            isOneToOne: false
            referencedRelation: "eventos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pedidos_evento_id_fkey"
            columns: ["evento_id"]
            isOneToOne: false
            referencedRelation: "eventos_com_contagem"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pedidos_organizacao_id_fkey"
            columns: ["organizacao_id"]
            isOneToOne: false
            referencedRelation: "organizacoes"
            referencedColumns: ["id"]
          },
        ]
      }
      pedidos_titular: {
        Row: {
          atendido_em: string | null
          atendido_por: string | null
          created_at: string
          detalhes: string | null
          email: string
          id: string
          organizacao_id: string
          pessoa_id: string | null
          prazo: string
          resposta: string | null
          status: string
          tipo: string
          updated_at: string
        }
        Insert: {
          atendido_em?: string | null
          atendido_por?: string | null
          created_at?: string
          detalhes?: string | null
          email: string
          id?: string
          organizacao_id: string
          pessoa_id?: string | null
          prazo: string
          resposta?: string | null
          status: string
          tipo: string
          updated_at?: string
        }
        Update: {
          atendido_em?: string | null
          atendido_por?: string | null
          created_at?: string
          detalhes?: string | null
          email?: string
          id?: string
          organizacao_id?: string
          pessoa_id?: string | null
          prazo?: string
          resposta?: string | null
          status?: string
          tipo?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "pedidos_titular_organizacao_id_fkey"
            columns: ["organizacao_id"]
            isOneToOne: false
            referencedRelation: "organizacoes"
            referencedColumns: ["id"]
          },
        ]
      }
      pessoas: {
        Row: {
          anonimizada_em: string | null
          cpf: string | null
          created_at: string
          data_nascimento: string | null
          email: string | null
          id: string
          interesses: string[]
          marketing: boolean | null
          marketing_em: string | null
          nome: string
          notas: string | null
          organizacao_id: string
          origem: string
          tags: string[]
          telefone: string | null
          updated_at: string
        }
        Insert: {
          anonimizada_em?: string | null
          cpf?: string | null
          created_at?: string
          data_nascimento?: string | null
          email?: string | null
          id?: string
          interesses?: string[]
          marketing?: boolean | null
          marketing_em?: string | null
          nome: string
          notas?: string | null
          organizacao_id: string
          origem: string
          tags?: string[]
          telefone?: string | null
          updated_at?: string
        }
        Update: {
          anonimizada_em?: string | null
          cpf?: string | null
          created_at?: string
          data_nascimento?: string | null
          email?: string | null
          id?: string
          interesses?: string[]
          marketing?: boolean | null
          marketing_em?: string | null
          nome?: string
          notas?: string | null
          organizacao_id?: string
          origem?: string
          tags?: string[]
          telefone?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "pessoas_organizacao_id_fkey"
            columns: ["organizacao_id"]
            isOneToOne: false
            referencedRelation: "organizacoes"
            referencedColumns: ["id"]
          },
        ]
      }
      portal_announcements: {
        Row: {
          active: boolean
          audience: Json
          body: string
          created_at: string
          created_by: string | null
          cta_label: string | null
          cta_target: string | null
          ends_at: string | null
          frequency: string
          id: string
          kind: string
          pages: string[]
          priority: number
          starts_at: string
          title: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          audience?: Json
          body: string
          created_at?: string
          created_by?: string | null
          cta_label?: string | null
          cta_target?: string | null
          ends_at?: string | null
          frequency?: string
          id?: string
          kind?: string
          pages?: string[]
          priority?: number
          starts_at?: string
          title: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          audience?: Json
          body?: string
          created_at?: string
          created_by?: string | null
          cta_label?: string | null
          cta_target?: string | null
          ends_at?: string | null
          frequency?: string
          id?: string
          kind?: string
          pages?: string[]
          priority?: number
          starts_at?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      promoters: {
        Row: {
          ativo: boolean
          codigo: string
          comissao: Json
          created_at: string
          cupom_id: string | null
          email: string | null
          eventos: string[]
          id: string
          meta_ingressos: number | null
          meta_receita_centavos: number | null
          nome: string
          organizacao_id: string
          telefone: string | null
          tipo: string
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          codigo: string
          comissao: Json
          created_at?: string
          cupom_id?: string | null
          email?: string | null
          eventos?: string[]
          id?: string
          meta_ingressos?: number | null
          meta_receita_centavos?: number | null
          nome: string
          organizacao_id: string
          telefone?: string | null
          tipo: string
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          codigo?: string
          comissao?: Json
          created_at?: string
          cupom_id?: string | null
          email?: string | null
          eventos?: string[]
          id?: string
          meta_ingressos?: number | null
          meta_receita_centavos?: number | null
          nome?: string
          organizacao_id?: string
          telefone?: string | null
          tipo?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "promoters_organizacao_id_fkey"
            columns: ["organizacao_id"]
            isOneToOne: false
            referencedRelation: "organizacoes"
            referencedColumns: ["id"]
          },
        ]
      }
      reembolsos: {
        Row: {
          arrependimento: boolean
          automatico: boolean
          created_at: string
          decidido_em: string | null
          decidido_por: string | null
          erro: string | null
          evento_id: string
          gateway_id: string | null
          id: string
          ingresso_ids: string[]
          motivo: string
          observacao: string | null
          organizacao_id: string
          pedido_id: string
          solicitado_por: string
          status: string
          taxa_devolvida_centavos: number
          updated_at: string
          valor_centavos: number
        }
        Insert: {
          arrependimento?: boolean
          automatico?: boolean
          created_at?: string
          decidido_em?: string | null
          decidido_por?: string | null
          erro?: string | null
          evento_id: string
          gateway_id?: string | null
          id?: string
          ingresso_ids: string[]
          motivo: string
          observacao?: string | null
          organizacao_id: string
          pedido_id: string
          solicitado_por: string
          status: string
          taxa_devolvida_centavos?: number
          updated_at?: string
          valor_centavos: number
        }
        Update: {
          arrependimento?: boolean
          automatico?: boolean
          created_at?: string
          decidido_em?: string | null
          decidido_por?: string | null
          erro?: string | null
          evento_id?: string
          gateway_id?: string | null
          id?: string
          ingresso_ids?: string[]
          motivo?: string
          observacao?: string | null
          organizacao_id?: string
          pedido_id?: string
          solicitado_por?: string
          status?: string
          taxa_devolvida_centavos?: number
          updated_at?: string
          valor_centavos?: number
        }
        Relationships: [
          {
            foreignKeyName: "reembolsos_organizacao_id_fkey"
            columns: ["organizacao_id"]
            isOneToOne: false
            referencedRelation: "organizacoes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reembolsos_pedido_id_fkey"
            columns: ["pedido_id"]
            isOneToOne: false
            referencedRelation: "pedidos"
            referencedColumns: ["id"]
          },
        ]
      }
      respostas_nps: {
        Row: {
          comentario: string | null
          created_at: string
          evento_id: string
          id: string
          ingresso_id: string
          nota: number
          organizacao_id: string
          pessoa_id: string | null
          updated_at: string
        }
        Insert: {
          comentario?: string | null
          created_at?: string
          evento_id: string
          id?: string
          ingresso_id: string
          nota: number
          organizacao_id: string
          pessoa_id?: string | null
          updated_at?: string
        }
        Update: {
          comentario?: string | null
          created_at?: string
          evento_id?: string
          id?: string
          ingresso_id?: string
          nota?: number
          organizacao_id?: string
          pessoa_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "respostas_nps_evento_id_fkey"
            columns: ["evento_id"]
            isOneToOne: false
            referencedRelation: "eventos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "respostas_nps_evento_id_fkey"
            columns: ["evento_id"]
            isOneToOne: false
            referencedRelation: "eventos_com_contagem"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "respostas_nps_organizacao_id_fkey"
            columns: ["organizacao_id"]
            isOneToOne: false
            referencedRelation: "organizacoes"
            referencedColumns: ["id"]
          },
        ]
      }
      role_permissions: {
        Row: {
          permission: string
          role: string
        }
        Insert: {
          permission: string
          role: string
        }
        Update: {
          permission?: string
          role?: string
        }
        Relationships: []
      }
      saques: {
        Row: {
          created_at: string
          destino: Json
          erro: string | null
          gateway_id: string | null
          id: string
          organizacao_id: string
          processado_em: string | null
          solicitado_por: string
          status: string
          updated_at: string
          valor_centavos: number
        }
        Insert: {
          created_at?: string
          destino: Json
          erro?: string | null
          gateway_id?: string | null
          id?: string
          organizacao_id: string
          processado_em?: string | null
          solicitado_por: string
          status: string
          updated_at?: string
          valor_centavos: number
        }
        Update: {
          created_at?: string
          destino?: Json
          erro?: string | null
          gateway_id?: string | null
          id?: string
          organizacao_id?: string
          processado_em?: string | null
          solicitado_por?: string
          status?: string
          updated_at?: string
          valor_centavos?: number
        }
        Relationships: [
          {
            foreignKeyName: "saques_organizacao_id_fkey"
            columns: ["organizacao_id"]
            isOneToOne: false
            referencedRelation: "organizacoes"
            referencedColumns: ["id"]
          },
        ]
      }
      segmentos: {
        Row: {
          combinacao: string
          condicoes: Json
          created_at: string
          descricao: string | null
          id: string
          nome: string
          organizacao_id: string
          updated_at: string
        }
        Insert: {
          combinacao?: string
          condicoes?: Json
          created_at?: string
          descricao?: string | null
          id?: string
          nome: string
          organizacao_id: string
          updated_at?: string
        }
        Update: {
          combinacao?: string
          condicoes?: Json
          created_at?: string
          descricao?: string | null
          id?: string
          nome?: string
          organizacao_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "segmentos_organizacao_id_fkey"
            columns: ["organizacao_id"]
            isOneToOne: false
            referencedRelation: "organizacoes"
            referencedColumns: ["id"]
          },
        ]
      }
      sessoes_evento: {
        Row: {
          capacidade: number | null
          created_at: string
          evento_id: string
          fim: string | null
          id: string
          inicio: string
          nome: string
          organizacao_id: string
          updated_at: string
          vendidos: number
        }
        Insert: {
          capacidade?: number | null
          created_at?: string
          evento_id: string
          fim?: string | null
          id?: string
          inicio: string
          nome: string
          organizacao_id: string
          updated_at?: string
          vendidos?: number
        }
        Update: {
          capacidade?: number | null
          created_at?: string
          evento_id?: string
          fim?: string | null
          id?: string
          inicio?: string
          nome?: string
          organizacao_id?: string
          updated_at?: string
          vendidos?: number
        }
        Relationships: [
          {
            foreignKeyName: "sessoes_evento_evento_id_fkey"
            columns: ["evento_id"]
            isOneToOne: false
            referencedRelation: "eventos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sessoes_evento_evento_id_fkey"
            columns: ["evento_id"]
            isOneToOne: false
            referencedRelation: "eventos_com_contagem"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sessoes_evento_organizacao_id_fkey"
            columns: ["organizacao_id"]
            isOneToOne: false
            referencedRelation: "organizacoes"
            referencedColumns: ["id"]
          },
        ]
      }
      sessoes_login: {
        Row: {
          created_at: string
          expira_em: string
          id: string
          ip: string | null
          organizacao_id: string | null
          revogada_em: string | null
          updated_at: string
          user_agent: string | null
          usuario_id: string
        }
        Insert: {
          created_at?: string
          expira_em: string
          id?: string
          ip?: string | null
          organizacao_id?: string | null
          revogada_em?: string | null
          updated_at?: string
          user_agent?: string | null
          usuario_id: string
        }
        Update: {
          created_at?: string
          expira_em?: string
          id?: string
          ip?: string | null
          organizacao_id?: string | null
          revogada_em?: string | null
          updated_at?: string
          user_agent?: string | null
          usuario_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sessoes_login_usuario_id_fkey"
            columns: ["usuario_id"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
        ]
      }
      staff_members: {
        Row: {
          created_at: string
          email: string
          full_name: string
          is_synthetic: boolean
          must_change_password: boolean
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          email: string
          full_name: string
          is_synthetic?: boolean
          must_change_password?: boolean
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          email?: string
          full_name?: string
          is_synthetic?: boolean
          must_change_password?: boolean
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      tipos_ingresso: {
        Row: {
          acesso: string
          areas: string[]
          ativo: boolean
          capacidade: number | null
          cor: string | null
          created_at: string
          descricao: string | null
          evento_id: string
          gratuito: boolean
          id: string
          idade_minima: number | null
          max_por_cpf: number | null
          max_por_pedido: number | null
          meia_entrada: boolean
          min_por_pedido: number
          nome: string
          ordem: number
          organizacao_id: string
          pessoas: number
          premium: boolean
          sessao_id: string | null
          setor: string | null
          updated_at: string
          vendidos: number
        }
        Insert: {
          acesso?: string
          areas?: string[]
          ativo?: boolean
          capacidade?: number | null
          cor?: string | null
          created_at?: string
          descricao?: string | null
          evento_id: string
          gratuito?: boolean
          id?: string
          idade_minima?: number | null
          max_por_cpf?: number | null
          max_por_pedido?: number | null
          meia_entrada?: boolean
          min_por_pedido?: number
          nome: string
          ordem?: number
          organizacao_id: string
          pessoas?: number
          premium?: boolean
          sessao_id?: string | null
          setor?: string | null
          updated_at?: string
          vendidos?: number
        }
        Update: {
          acesso?: string
          areas?: string[]
          ativo?: boolean
          capacidade?: number | null
          cor?: string | null
          created_at?: string
          descricao?: string | null
          evento_id?: string
          gratuito?: boolean
          id?: string
          idade_minima?: number | null
          max_por_cpf?: number | null
          max_por_pedido?: number | null
          meia_entrada?: boolean
          min_por_pedido?: number
          nome?: string
          ordem?: number
          organizacao_id?: string
          pessoas?: number
          premium?: boolean
          sessao_id?: string | null
          setor?: string | null
          updated_at?: string
          vendidos?: number
        }
        Relationships: [
          {
            foreignKeyName: "tipos_ingresso_evento_id_fkey"
            columns: ["evento_id"]
            isOneToOne: false
            referencedRelation: "eventos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tipos_ingresso_evento_id_fkey"
            columns: ["evento_id"]
            isOneToOne: false
            referencedRelation: "eventos_com_contagem"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tipos_ingresso_organizacao_id_fkey"
            columns: ["organizacao_id"]
            isOneToOne: false
            referencedRelation: "organizacoes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tipos_ingresso_sessao_id_fkey"
            columns: ["sessao_id"]
            isOneToOne: false
            referencedRelation: "sessoes_evento"
            referencedColumns: ["id"]
          },
        ]
      }
      user_permissions: {
        Row: {
          granted_at: string
          granted_by: string | null
          permission: string
          user_id: string
        }
        Insert: {
          granted_at?: string
          granted_by?: string | null
          permission: string
          user_id: string
        }
        Update: {
          granted_at?: string
          granted_by?: string | null
          permission?: string
          user_id?: string
        }
        Relationships: []
      }
      usuarios: {
        Row: {
          ativo: boolean
          created_at: string
          email: string
          id: string
          nome: string
          senha_hash: string
          superadmin: boolean
          ultimo_acesso: string | null
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          email: string
          id?: string
          nome: string
          senha_hash: string
          superadmin?: boolean
          ultimo_acesso?: string | null
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          created_at?: string
          email?: string
          id?: string
          nome?: string
          senha_hash?: string
          superadmin?: boolean
          ultimo_acesso?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      vinculos: {
        Row: {
          created_at: string
          id: string
          organizacao_id: string
          papel: string
          updated_at: string
          usuario_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          organizacao_id: string
          papel: string
          updated_at?: string
          usuario_id: string
        }
        Update: {
          created_at?: string
          id?: string
          organizacao_id?: string
          papel?: string
          updated_at?: string
          usuario_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "vinculos_organizacao_id_fkey"
            columns: ["organizacao_id"]
            isOneToOne: false
            referencedRelation: "organizacoes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vinculos_usuario_id_fkey"
            columns: ["usuario_id"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
        ]
      }
      webhooks: {
        Row: {
          ativo: boolean
          created_at: string
          descricao: string | null
          eventos: string[]
          falhas_seguidas: number
          id: string
          organizacao_id: string
          segredo: string
          updated_at: string
          url: string
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          descricao?: string | null
          eventos?: string[]
          falhas_seguidas?: number
          id?: string
          organizacao_id: string
          segredo: string
          updated_at?: string
          url: string
        }
        Update: {
          ativo?: boolean
          created_at?: string
          descricao?: string | null
          eventos?: string[]
          falhas_seguidas?: number
          id?: string
          organizacao_id?: string
          segredo?: string
          updated_at?: string
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "webhooks_organizacao_id_fkey"
            columns: ["organizacao_id"]
            isOneToOne: false
            referencedRelation: "organizacoes"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      eventos_com_contagem: {
        Row: {
          abertura_executada: boolean | null
          arquivado_em: string | null
          capacidade: number | null
          categoria: string | null
          checkin_abertura: string | null
          checkin_count: number | null
          checkin_fechamento: string | null
          checkin_status: string | null
          cidade: string | null
          classificacao: string | null
          created_at: string | null
          criado_por: string | null
          data_evento: string | null
          data_fim: string | null
          descricao: string | null
          fechamento_executada: boolean | null
          formato: string | null
          horario_fim: string | null
          horario_inicio: string | null
          id: string | null
          imagem_capa: string | null
          imagens: string[] | null
          link_online: string | null
          local: string | null
          local_url: string | null
          lp_url: string | null
          modo: string | null
          organizacao_id: string | null
          organizador: Json | null
          pagina: Json | null
          pelotoes: string[] | null
          politica: Json | null
          regras_venda: Json | null
          slug: string | null
          termos: string | null
          tipo: string | null
          titulo: string | null
          uf: string | null
          updated_at: string | null
          vendidos: number | null
          visibilidade: string | null
        }
        Relationships: [
          {
            foreignKeyName: "eventos_organizacao_id_fkey"
            columns: ["organizacao_id"]
            isOneToOne: false
            referencedRelation: "organizacoes"
            referencedColumns: ["id"]
          },
        ]
      }
      gold_coin_balances: {
        Row: {
          account_id: string | null
          balance: number | null
          last_movement_at: string | null
          member_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "gold_coin_accounts_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: true
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
        ]
      }
      moedas_saldos: {
        Row: {
          membro_id: string | null
          saldo: number | null
          ultimo_em: string | null
        }
        Relationships: [
          {
            foreignKeyName: "moedas_lancamentos_membro_id_fkey"
            columns: ["membro_id"]
            isOneToOne: false
            referencedRelation: "membros"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      ch_aal2: { Args: never; Returns: boolean }
      ch_coin_lancar: {
        Args: {
          p_amount: number
          p_idempotency_key: string
          p_kind: string
          p_member: string
          p_operator?: string
          p_reason: string
          p_reference?: string
          p_reverses?: string
          p_rule?: string
        }
        Returns: Json
      }
      ch_coins_em_circulacao: { Args: never; Returns: number }
      ch_comunicados_do_membro: {
        Args: { p_member: string; p_page?: string }
        Returns: {
          active: boolean
          audience: Json
          body: string
          created_at: string
          created_by: string | null
          cta_label: string | null
          cta_target: string | null
          ends_at: string | null
          frequency: string
          id: string
          kind: string
          pages: string[]
          priority: number
          starts_at: string
          title: string
          updated_at: string
        }[]
        SetofOptions: {
          from: "*"
          to: "portal_announcements"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      ch_definir_papel: {
        Args: { p_by: string; p_role: string; p_user: string }
        Returns: undefined
      }
      ch_importar_compensar: { Args: { p_batch: string }; Returns: Json }
      ch_importar_cs: {
        Args: {
          p_batch: string
          p_itens: Json
          p_sha: string
          p_source_file: string
        }
        Returns: Json
      }
      ch_importar_membros: {
        Args: { p_batch: string; p_itens: Json; p_source_file: string }
        Returns: Json
      }
      ch_membro_listavel: { Args: { p_member: string }; Returns: boolean }
      ch_metricas_comunicados: {
        Args: { p_ids: string[] }
        Returns: {
          alcance: number
          announcement_id: string
          clicantes: number
          cliques: number
          fechamentos: number
          impressoes: number
          reconhecimentos: number
        }[]
      }
      ch_revogar_sessao_auth: {
        Args: { p_session: string; p_user: string }
        Returns: number
      }
      ch_revogar_sessoes_auth: { Args: { p_user: string }; Returns: number }
      ch_validar_checkin: {
        Args: {
          p_event: string
          p_exception_reason?: string
          p_member: string
          p_operator: string
          p_query?: string
          p_source: string
        }
        Returns: Json
      }
      current_member_id: { Args: never; Returns: string }
      has_permission: { Args: { p: string }; Returns: boolean }
      labpub_incrementar: {
        Args: {
          p_campo: string
          p_delta: number
          p_id: string
          p_tabela: string
          p_teto_campo?: string
          p_teto_valor?: number
        }
        Returns: boolean
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
    Enums: {},
  },
} as const
