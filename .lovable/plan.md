

# Plano: Sistema de Templates para Formulários NPS

## Contexto

Atualmente, todos os formulários NPS usam o mesmo design fixo (premium com animações framer-motion). Você precisa poder escolher diferentes templates visuais para cada formulário NPS, similar ao que já existe para produtos com `page_templates`.

---

## Arquitetura da Solução

A solução segue o mesmo padrão já existente para templates de páginas:

```text
+------------------+          +-------------------+          +--------------------+
|   nps_forms      |  ------> |  page_templates   |  ------> |  Template Registry |
|   (template_id)  |          |  (component_key)  |          |  (React Components)|
+------------------+          +-------------------+          +--------------------+
```

---

## Etapas de Implementação

### 1. Alteração no Banco de Dados

Adicionar coluna `template_id` na tabela `nps_forms`:

- **Tipo**: `uuid` (opcional, nullable)
- **FK**: Referencia `page_templates.id`
- **Comportamento**: Se null, usa o template padrão premium

### 2. Criar Templates NPS no Registry

Adicionar novos templates específicos para NPS no sistema:

| Component Key | Nome | Descrição |
|--------------|------|-----------|
| `nps_premium` | NPS Premium | Design atual - multi-step animado (padrão) |
| `nps_simple` | NPS Simples | Versão compacta, tudo em uma tela |
| `nps_cards` | NPS Cards | Cards interativos com emojis |

### 3. Criar Componentes de Template

Criar 2 novos componentes de template NPS:

- `src/components/templates/NpsPremium.tsx` - Extrair o código atual
- `src/components/templates/NpsSimple.tsx` - Nova versão simplificada
- `src/components/templates/NpsCards.tsx` - Versão com emojis/cards

### 4. Atualizar o Registry

Registrar os novos templates NPS no arquivo `registry.tsx` com interface específica:

```text
Interface NpsTemplateProps:
  - form.id
  - form.title  
  - form.description
  - productName (opcional)
```

### 5. Atualizar Admin de NPS (NpsFormsList)

Adicionar seletor de template no formulário de criação/edição:

- Campo "Template" com dropdown
- Lista apenas templates do tipo NPS
- Preview do template selecionado (opcional)

### 6. Atualizar Renderizador Público (NpsPageRenderer)

Modificar para:

1. Fazer join com `page_templates` na query
2. Buscar o componente correto do registry
3. Passar as props esperadas pelo template
4. Fallback para template padrão se não configurado

### 7. Inserir Templates Iniciais

Executar migration para criar os registros na tabela `page_templates`:

- Adicionar novo tipo ENUM: `nps_form` 
- Inserir os 3 templates NPS

---

## Detalhes Técnicos

### Migration SQL

```sql
-- 1. Adicionar novo tipo de template
ALTER TYPE template_type ADD VALUE 'nps_form';

-- 2. Adicionar coluna template_id em nps_forms
ALTER TABLE nps_forms 
ADD COLUMN template_id UUID REFERENCES page_templates(id);

-- 3. Inserir templates NPS
INSERT INTO page_templates (name, type, component_key) VALUES
  ('NPS Premium (Padrão)', 'nps_form', 'nps_premium'),
  ('NPS Simples', 'nps_form', 'nps_simple'),
  ('NPS Cards Emoji', 'nps_form', 'nps_cards');
```

### Estrutura de Arquivos

```text
src/components/templates/
├── registry.tsx          (atualizar)
├── NpsPremium.tsx        (novo - extrair de NpsFormPublic)
├── NpsSimple.tsx         (novo)
└── NpsCards.tsx          (novo)

src/components/nps/
├── NpsFormsList.tsx      (atualizar - adicionar seletor template)
└── NpsFormPublic.tsx     (manter como fallback/legado)

src/pages/
└── NpsPageRenderer.tsx   (atualizar - usar registry)
```

### Interface dos Templates NPS

```text
NpsTemplateComponentProps:
  form:
    id: string
    title: string
    description: string | null
  productName: string | null
  onSubmit: (score, feedback) => Promise<void>
```

---

## Resultado Esperado

Após implementação:

1. **Admin**: Ao criar/editar NPS, aparece campo "Template" com opções visuais
2. **Público**: Cada formulário renderiza com o template escolhido
3. **Flexibilidade**: Fácil adicionar novos templates no futuro

---

## Ordem de Execução

1. Migration do banco (template_id + registros)
2. Criar componentes de template NPS
3. Atualizar registry
4. Atualizar NpsFormsList (admin)
5. Atualizar NpsPageRenderer (público)
6. Regenerar types do Supabase
7. Testar fluxo completo

