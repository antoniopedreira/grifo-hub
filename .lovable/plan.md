
## Plano: Filtro por Região + Exportação XLSX na Base de Leads

### Resumo
Adicionar um filtro de região baseado no DDD do telefone dos leads e permitir exportar os dados filtrados para arquivo XLSX com as colunas: Nome, Email, Telefone, Região e LTV.

---

### 1. Novo Filtro por Região

Será adicionado um dropdown ao lado do filtro de produtos com as opções:
- **Todas as regiões** (padrão)
- Sudeste
- Sul  
- Nordeste
- Norte
- Centro-Oeste
- Internacional

A filtragem usará a função `getRegionByPhone()` já existente em `ddd-regions.ts` para determinar a região de cada lead baseado no telefone.

---

### 2. Exportação XLSX

**Nova dependência**: Será instalado o pacote `xlsx` (SheetJS) para gerar arquivos Excel nativos.

**Colunas do arquivo exportado**:
| Nome | Email | Telefone | Região | LTV |
|------|-------|----------|--------|-----|

O botão atual "CSV" será substituído por "XLSX" e exportará apenas os leads visíveis após aplicação de todos os filtros (busca, produto e região).

---

### Detalhes Técnicos

**Arquivo**: `src/pages/Leads.tsx`

**Alterações**:

1. **Novo estado** para o filtro de região:
   ```typescript
   const [regionFilter, setRegionFilter] = useState("all");
   ```

2. **Novo Select** com as 6 opções de região + "Todas"

3. **Lógica de filtragem** atualizada para considerar a região:
   ```typescript
   const matchesRegion = regionFilter === "all" || 
     getRegionByPhone(lead.phone)?.region === regionFilter;
   ```

4. **Nova função de exportação XLSX**:
   ```typescript
   import * as XLSX from 'xlsx';
   
   const handleExportXLSX = () => {
     const data = filteredAndSortedLeads.map(lead => {
       const regionInfo = getRegionByPhone(lead.phone);
       return {
         Nome: lead.full_name || "",
         Email: lead.email || "",
         Telefone: lead.phone || "",
         Região: regionInfo?.region || "-",
         LTV: lead.ltv || 0
       };
     });
     
     const worksheet = XLSX.utils.json_to_sheet(data);
     const workbook = XLSX.utils.book_new();
     XLSX.utils.book_append_sheet(workbook, worksheet, "Leads");
     XLSX.writeFile(workbook, `leads_${format(new Date(), "yyyy-MM-dd")}.xlsx`);
   };
   ```

**Nova dependência**: `xlsx` (SheetJS Community Edition)

---

### Layout Final dos Filtros

```text
┌─────────────────────────┬──────────────────┬──────────────────┬────────┬────────────┐
│ 🔍 Buscar por nome...   │ Filtrar produto  │ Filtrar região   │  XLSX  │ Novo Lead  │
└─────────────────────────┴──────────────────┴──────────────────┴────────┴────────────┘
```

---

### Arquivos Modificados

| Arquivo | Ação |
|---------|------|
| `package.json` | Adicionar dependência `xlsx` |
| `src/pages/Leads.tsx` | Adicionar filtro de região e exportação XLSX |
