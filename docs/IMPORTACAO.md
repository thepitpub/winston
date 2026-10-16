# Importação

## Pipeline

```
npm run importar -- --membros "<planilha de fundadores>.csv"            # prévia
npm run importar -- --membros "<…>.csv" --aplicar --operador "Nome"     # aplica
npm run importar -- --cs "<aba Enriquecimento Publico (CS)>.csv" [--aplicar]
npm run importar -- --compensar <batch_id>                              # desfaz um lote
```

1. Lê o arquivo, calcula o SHA-256, detecta o cabeçalho de duas linhas e guarda a linha física de cada registro.
2. Recusa a importação se houver cabeçalho sem mapeamento (`MAPA_MEMBROS` em `src/lib/dominio/importacao.ts`).
3. Normaliza (Unicode NFC, telefone E.164, listas por `;`, notas 1-5, datas) sem destruir o original.
4. Casa com o que existe, nesta ordem: mesma origem + ID; mesmo telefone com o mesmo nome; nome sozinho nunca casa (vai para revisão).
5. Mandam a linha para **revisão humana**: duplicidade no arquivo, telefone de outro nome, telefone mudado de quem já tem conta, telefone apagado, coluna sensível sem destino preenchida (documentos, endereço, contatos extras).
6. A prévia grava o lote (`mode=dry_run`) e as linhas planejadas, sem tocar em membros.
7. A aplicação refaz o plano contra o estado atual e o aplica **numa transação** (`ch_importar_membros` / `ch_importar_cs`), com trava otimista por `updated_at`. Cada linha guarda bruto (minimizado), normalizado, ação e estado anterior.
8. Idempotente: linha igual vira `unchanged`.
9. Compensação refaz o estado anterior, em ordem reversa, e recusa se um lote posterior tocou os mesmos membros ou se o membro inserido já tem conta ou histórico.

O relatório sai no terminal e em `relatorios/` (fora do git). Nada da planilha vai para log público, analytics ou serviço de IA. Nenhuma conta Auth é criada na importação.

## Onde cada dado foi parar

| Origem | Destino | Quem lê |
|---|---|---|
| Identificação, telefone, nº de fundador | `members` | Membro (a própria linha), equipe |
| Dados declarados (cidade, família, agenda, interesses, bebidas…) | `member_profiles` | Membro (o próprio), equipe com `members.read` |
| Análise comportamental e Histórico/Bio | `member_private_cs.behavioral`, `relationship_history` | Só equipe com `cs.read`, auditado |
| Aba "Enriquecimento Publico (CS)", todas as colunas | `member_private_cs.cs_columns` (+ status, confiança, uso recomendado) | Só equipe com `cs.read`, auditado |
| Linhas brutas | `import_rows.raw` (colunas sensíveis sem destino como "[presente]") | Só chave secreta |

## Resultado das importações feitas (15/10/2026)

| Lote | Arquivo | Modo | Resultado |
|---|---|---|---|
| `d25c619c…` | Membros Fundadores (SHA-256 no lote) | prévia | 11 insert |
| `2626c857…` | Membros Fundadores | aplicação | 11 inseridos |
| `962078fd…` | Enriquecimento Publico (CS) | prévia | 11 insert |
| `2dfbe5e8…` | Enriquecimento Publico (CS) | aplicação | 11 inseridos |
| reexecuções | ambos | prévia | 11 unchanged (idempotência) |

11 membros (`pending`, categoria fundador), 11 perfis declarados, 11 registros de CS e 10 análises comportamentais (um registro não tem). Nenhuma linha em revisão ou erro. A tabela antiga `membros` (portal anterior) não foi lida nem alterada: a fonte foi o CSV.

As observações de qualidade da própria aba de CS (identificação ambígua, pesquisa incompleta, grafia a confirmar) ficam no Command, na Member Intelligence de cada membro. Não são reproduzidas aqui.
