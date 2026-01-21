import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, User, Package, Search, Users, Filter, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import type { ProductWithCategory } from "@/types/database";

interface NewDealDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pipelineId: string;
  firstStageId: string;
}

interface LeadResult {
  id: string;
  full_name: string | null;
  email: string | null;
  ltv: number | null;
}

export function NewDealDialog({
  open,
  onOpenChange,
  pipelineId,
  firstStageId,
}: NewDealDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Main tab state
  const [mainTab, setMainTab] = useState<"new" | "import">("new");

  // ===== NEW LEAD TAB STATE =====
  const [leadTab, setLeadTab] = useState<"existing" | "new">("existing");
  const [selectedLeadId, setSelectedLeadId] = useState("");
  const [selectedProductId, setSelectedProductId] = useState("");
  const [priority, setPriority] = useState("Medium");

  // New lead fields
  const [newLeadName, setNewLeadName] = useState("");
  const [newLeadEmail, setNewLeadEmail] = useState("");
  const [newLeadPhone, setNewLeadPhone] = useState("");

  // ===== IMPORT TAB STATE =====
  const [ltvMin, setLtvMin] = useState("");
  const [ltvMax, setLtvMax] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [dealStatusFilter, setDealStatusFilter] = useState<string>("none");
  const [selectedProductFilters, setSelectedProductFilters] = useState<string[]>([]);
  const [searchResults, setSearchResults] = useState<LeadResult[]>([]);
  const [selectedLeadIds, setSelectedLeadIds] = useState<Set<string>>(new Set());
  const [isSearching, setIsSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [importProductId, setImportProductId] = useState("");

  // Fetch leads for existing lead selector
  const { data: leads } = useQuery({
    queryKey: ["leads-list"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("leads")
        .select("id, full_name, email")
        .order("full_name");
      if (error) throw error;
      return data;
    },
    enabled: open,
  });

  // Fetch products with categories
  const { data: products } = useQuery({
    queryKey: ["products-active-with-categories"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("id, name, price, category_id, product_categories(id, slug, name)")
        .eq("active", true)
        .order("name");
      if (error) throw error;
      return data as ProductWithCategory[];
    },
    enabled: open,
  });

  // Category hierarchy: avancados > intermediarios > basicos
  const CATEGORY_HIERARCHY: Record<string, number> = {
    avancados: 3,
    intermediarios: 2,
    basicos: 1,
  };

  // Get higher tier categories for exclusion
  const getHigherTierCategories = (categorySlug: string): string[] => {
    const level = CATEGORY_HIERARCHY[categorySlug] || 0;
    return Object.entries(CATEGORY_HIERARCHY)
      .filter(([_, lvl]) => lvl > level)
      .map(([slug]) => slug);
  };

  // Get categories that should be excluded based on selected products
  const getCategoryExclusionLevel = (): number => {
    if (!products || selectedProductFilters.length === 0) return 0;
    
    let maxLevel = 0;
    for (const productId of selectedProductFilters) {
      const product = products.find(p => p.id === productId);
      const categorySlug = product?.product_categories?.slug;
      if (categorySlug && CATEGORY_HIERARCHY[categorySlug] > maxLevel) {
        maxLevel = CATEGORY_HIERARCHY[categorySlug];
      }
    }
    return maxLevel;
  };

  // Check if product filter is required
  const canSearch = selectedProductFilters.length > 0;

  // Search leads for import
  const handleSearch = async () => {
    if (!canSearch) {
      toast({
        title: "Selecione um produto",
        description: "É obrigatório selecionar pelo menos um produto para buscar.",
        variant: "destructive",
      });
      return;
    }

    setIsSearching(true);
    setHasSearched(true);
    setSelectedLeadIds(new Set());

    try {
      // Get the highest category level from selected products
      const targetLevel = getCategoryExclusionLevel();
      
      // Get all products from categories STRICTLY ABOVE the target level (for hierarchy exclusion)
      const productsInStrictlyHigherTiers = products?.filter(p => {
        const categorySlug = p.product_categories?.slug;
        return categorySlug && CATEGORY_HIERARCHY[categorySlug] > targetLevel;
      }).map(p => p.id) || [];

      // Get leads who bought the selected products (via sales table)
      const { data: salesData } = await supabase
        .from("sales")
        .select("lead_id")
        .in("product_id", selectedProductFilters);

      const leadIdsWhoBoughtSelected = new Set(salesData?.map((s) => s.lead_id).filter(Boolean) || []);

      // Get leads who bought products from STRICTLY HIGHER tier categories
      let leadIdsWhoBoughtStrictlyHigherTier = new Set<string>();
      if (productsInStrictlyHigherTiers.length > 0) {
        const { data: higherTierSales } = await supabase
          .from("sales")
          .select("lead_id")
          .in("product_id", productsInStrictlyHigherTiers);
        
        leadIdsWhoBoughtStrictlyHigherTier = new Set(higherTierSales?.map((s) => s.lead_id).filter(Boolean) || []);
      }

      // Get leads who bought products from same or higher tier (for "Novo" filter)
      const productsInSameOrHigherTiers = products?.filter(p => {
        const categorySlug = p.product_categories?.slug;
        return categorySlug && CATEGORY_HIERARCHY[categorySlug] >= targetLevel;
      }).map(p => p.id) || [];

      let leadIdsWhoBoughtSameOrHigherTier = new Set<string>();
      if (productsInSameOrHigherTiers.length > 0) {
        const { data: sameOrHigherTierSales } = await supabase
          .from("sales")
          .select("lead_id")
          .in("product_id", productsInSameOrHigherTiers);
        
        leadIdsWhoBoughtSameOrHigherTier = new Set(sameOrHigherTierSales?.map((s) => s.lead_id).filter(Boolean) || []);
      }

      // Get leads by deal status filter (for recovery functionality)
      let leadIdsByDealStatus = new Set<string>();
      if (dealStatusFilter !== "none") {
        const dealStatusValue = dealStatusFilter as "open" | "won" | "lost" | "abandoned" | "archived";
        const { data: dealsData } = await supabase
          .from("deals")
          .select("lead_id")
          .in("product_id", selectedProductFilters)
          .eq("status", dealStatusValue);
        
        leadIdsByDealStatus = new Set(dealsData?.map((d) => d.lead_id).filter(Boolean) || []);
      }

      // Fetch all leads with basic filters
      let query = supabase
        .from("leads")
        .select("id, full_name, email, ltv, status")
        .order("full_name");

      // LTV filters
      if (ltvMin) {
        query = query.gte("ltv", parseFloat(ltvMin));
      }
      if (ltvMax) {
        query = query.lte("ltv", parseFloat(ltvMax));
      }

      const { data: leadsData, error: leadsError } = await query;
      if (leadsError) throw leadsError;

      let filteredLeads = leadsData || [];

      // Apply deal status filter first (if active)
      if (dealStatusFilter !== "none") {
        filteredLeads = filteredLeads.filter((lead) => leadIdsByDealStatus.has(lead.id));
      }

      // Smart filter based on status + product + hierarchy
      if (statusFilter === "Cliente") {
        // Cliente + Produto = quem COMPROU esse produto específico, MAS exclui quem tem produto de tier SUPERIOR
        filteredLeads = filteredLeads.filter((lead) => 
          leadIdsWhoBoughtSelected.has(lead.id) && !leadIdsWhoBoughtStrictlyHigherTier.has(lead.id)
        );
      } else if (statusFilter === "Novo") {
        // Novo + Produto = apenas quem NÃO comprou produtos da mesma categoria ou superior
        filteredLeads = filteredLeads.filter((lead) => !leadIdsWhoBoughtSameOrHigherTier.has(lead.id));
      } else {
        // "Todos" = mostra quem ainda não tem tier superior, mas pode ou não ter comprado o produto
        filteredLeads = filteredLeads.filter((lead) => !leadIdsWhoBoughtStrictlyHigherTier.has(lead.id));
      }

      setSearchResults(filteredLeads);
    } catch (error) {
      console.error("Erro na busca:", error);
      toast({
        title: "Erro na busca",
        description: "Não foi possível buscar os leads.",
        variant: "destructive",
      });
    } finally {
      setIsSearching(false);
    }
  };

  // Toggle product filter selection
  const toggleProductFilter = (productId: string) => {
    setSelectedProductFilters((prev) =>
      prev.includes(productId)
        ? prev.filter((id) => id !== productId)
        : [...prev, productId]
    );
  };

  // Toggle lead selection
  const toggleLeadSelection = (leadId: string) => {
    setSelectedLeadIds((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(leadId)) {
        newSet.delete(leadId);
      } else {
        newSet.add(leadId);
      }
      return newSet;
    });
  };

  // Select/Deselect all
  const toggleSelectAll = () => {
    if (selectedLeadIds.size === searchResults.length) {
      setSelectedLeadIds(new Set());
    } else {
      setSelectedLeadIds(new Set(searchResults.map((l) => l.id)));
    }
  };

  // Create single deal mutation
  const createDeal = useMutation({
    mutationFn: async () => {
      let leadId = selectedLeadId;

      // Create new lead if needed
      if (leadTab === "new") {
        const { data: newLead, error: leadError } = await supabase
          .from("leads")
          .insert({
            full_name: newLeadName,
            email: newLeadEmail || null,
            phone: newLeadPhone || null,
            status: "Novo",
            origin: "crm_manual",
          })
          .select("id")
          .single();

        if (leadError) throw leadError;
        leadId = newLead.id;
      }

      // Check if lead already exists in this pipeline
      const { data: existingDeal } = await supabase
        .from("deals")
        .select("id")
        .eq("lead_id", leadId)
        .eq("pipeline_id", pipelineId)
        .eq("status", "open")
        .maybeSingle();

      if (existingDeal) {
        throw new Error("LEAD_ALREADY_IN_PIPELINE");
      }

      // Usar o preço do produto como valor do deal
      const product = products?.find((p) => p.id === selectedProductId);
      const value = product?.price || null;

      const { error } = await supabase.from("deals").insert({
        lead_id: leadId,
        product_id: selectedProductId || null,
        pipeline_id: pipelineId,
        stage_id: firstStageId,
        value,
        priority,
        status: "open",
      });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["deals"] });
      queryClient.invalidateQueries({ queryKey: ["leads-list"] });
      toast({
        title: "Negócio criado!",
        description: "O card foi adicionado ao pipeline.",
      });
      resetForm();
      onOpenChange(false);
    },
    onError: (error: any) => {
      if (error?.message === "LEAD_ALREADY_IN_PIPELINE") {
        toast({
          title: "Lead já existe neste pipeline",
          description: "Este lead já possui um negócio aberto neste pipeline.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Erro ao criar negócio",
          description: "Não foi possível criar o card.",
          variant: "destructive",
        });
      }
    },
  });

  // Import multiple deals mutation
  const importDeals = useMutation({
    mutationFn: async () => {
      // Get existing leads in this pipeline
      const { data: existingDeals } = await supabase
        .from("deals")
        .select("lead_id")
        .eq("pipeline_id", pipelineId)
        .eq("status", "open");

      const existingLeadIds = new Set(existingDeals?.map(d => d.lead_id) || []);

      // Filter out leads that already exist in this pipeline
      const leadsToImport = Array.from(selectedLeadIds).filter(id => !existingLeadIds.has(id));
      const skippedCount = selectedLeadIds.size - leadsToImport.length;

      if (leadsToImport.length === 0) {
        throw new Error("ALL_LEADS_ALREADY_IN_PIPELINE");
      }

      const selectedProduct = products?.find((p) => p.id === importProductId);
      const productPrice = selectedProduct?.price || null;

      const dealsToInsert = leadsToImport.map((leadId) => {
        return {
          lead_id: leadId,
          product_id: importProductId || null,
          pipeline_id: pipelineId,
          stage_id: firstStageId,
          value: productPrice,
          status: "open" as const,
          priority: "Medium",
        };
      });

      const { error } = await supabase.from("deals").insert(dealsToInsert);
      if (error) throw error;

      return { imported: dealsToInsert.length, skipped: skippedCount };
    },
    onSuccess: ({ imported, skipped }) => {
      queryClient.invalidateQueries({ queryKey: ["deals"] });
      const skippedMsg = skipped > 0 ? ` (${skipped} já existiam no pipeline)` : "";
      toast({
        title: "Importação concluída!",
        description: `${imported} negócio(s) foram criados no pipeline.${skippedMsg}`,
      });
      resetForm();
      onOpenChange(false);
    },
    onError: (error: any) => {
      if (error?.message === "ALL_LEADS_ALREADY_IN_PIPELINE") {
        toast({
          title: "Leads já existem",
          description: "Todos os leads selecionados já possuem negócios abertos neste pipeline.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Erro na importação",
          description: "Não foi possível importar os leads.",
          variant: "destructive",
        });
      }
    },
  });

  const resetForm = () => {
    // New lead tab
    setMainTab("new");
    setLeadTab("existing");
    setSelectedLeadId("");
    setSelectedProductId("");
    setPriority("Medium");
    setNewLeadName("");
    setNewLeadEmail("");
    setNewLeadPhone("");

    // Import tab
    setLtvMin("");
    setLtvMax("");
    setStatusFilter("all");
    setDealStatusFilter("none");
    setSelectedProductFilters([]);
    setSearchResults([]);
    setSelectedLeadIds(new Set());
    setHasSearched(false);
    setImportProductId("");
  };

  const canSubmitNewDeal =
    (leadTab === "existing" && selectedLeadId) ||
    (leadTab === "new" && newLeadName.trim());

  const canImport = selectedLeadIds.size > 0;

  const formatCurrency = (value: number | null) => {
    if (value === null || value === undefined) return "R$ 0,00";
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-primary flex items-center gap-2">
            <Plus className="h-5 w-5" />
            Adicionar ao Pipeline
          </DialogTitle>
        </DialogHeader>

        <Tabs
          value={mainTab}
          onValueChange={(v) => setMainTab(v as "new" | "import")}
        >
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="new" className="gap-2">
              <User className="h-4 w-4" />
              Novo Lead
            </TabsTrigger>
            <TabsTrigger value="import" className="gap-2">
              <Users className="h-4 w-4" />
              Leads da Base
            </TabsTrigger>
          </TabsList>

          {/* ===== NEW LEAD TAB ===== */}
          <TabsContent value="new" className="mt-4">
            <div className="space-y-6 py-2">
              {/* Lead Selection */}
              <div className="space-y-3">
                <Label className="text-primary font-medium flex items-center gap-2">
                  <User className="h-4 w-4" />
                  Lead
                </Label>

                <Tabs
                  value={leadTab}
                  onValueChange={(v) => setLeadTab(v as "existing" | "new")}
                >
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="existing">Lead Existente</TabsTrigger>
                    <TabsTrigger value="new">Criar Novo</TabsTrigger>
                  </TabsList>

                  <TabsContent value="existing" className="mt-3">
                    <Select value={selectedLeadId} onValueChange={setSelectedLeadId}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione um lead..." />
                      </SelectTrigger>
                      <SelectContent>
                        {leads?.map((lead) => (
                          <SelectItem key={lead.id} value={lead.id}>
                            {lead.full_name || lead.email || "Lead sem nome"}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </TabsContent>

                  <TabsContent value="new" className="mt-3 space-y-3">
                    <Input
                      placeholder="Nome completo *"
                      value={newLeadName}
                      onChange={(e) => setNewLeadName(e.target.value)}
                    />
                    <Input
                      type="email"
                      placeholder="Email"
                      value={newLeadEmail}
                      onChange={(e) => setNewLeadEmail(e.target.value)}
                    />
                    <Input
                      placeholder="Telefone"
                      value={newLeadPhone}
                      onChange={(e) => setNewLeadPhone(e.target.value)}
                    />
                  </TabsContent>
                </Tabs>
              </div>

              {/* Product Selection */}
              <div className="space-y-2">
                <Label className="text-primary font-medium flex items-center gap-2">
                  <Package className="h-4 w-4" />
                  Produto
                </Label>
                <Select value={selectedProductId} onValueChange={setSelectedProductId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione um produto..." />
                  </SelectTrigger>
                  <SelectContent>
                    {products?.map((product) => (
                      <SelectItem key={product.id} value={product.id}>
                        {product.name}{" "}
                        {product.price && (
                          <span className="text-muted-foreground">
                            ({formatCurrency(product.price)})
                          </span>
                        )}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Priority */}
              <div className="space-y-2">
                <Label className="text-primary font-medium">Prioridade</Label>
                <Select value={priority} onValueChange={setPriority}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="High">Alta</SelectItem>
                    <SelectItem value="Medium">Média</SelectItem>
                    <SelectItem value="Low">Baixa</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <DialogFooter className="mt-6">
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button
                onClick={() => createDeal.mutate()}
                disabled={!canSubmitNewDeal || createDeal.isPending}
                className="bg-secondary hover:bg-secondary/90 text-secondary-foreground"
              >
                {createDeal.isPending ? "Criando..." : "Criar Negócio"}
              </Button>
            </DialogFooter>
          </TabsContent>

          {/* ===== IMPORT TAB ===== */}
          <TabsContent value="import" className="mt-4 space-y-4">
              <div className="space-y-3">
                {/* Filters Section - Compact */}
                <div className="space-y-2 p-3 bg-muted/30 rounded-lg border">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-xs font-medium text-primary">
                      <Filter className="h-3.5 w-3.5" />
                      Filtros
                    </div>
                    <Button
                      onClick={handleSearch}
                      disabled={isSearching || !canSearch}
                      size="sm"
                      className="h-7 gap-1.5 text-xs"
                    >
                      {isSearching ? (
                        <>
                          <Loader2 className="h-3 w-3 animate-spin" />
                          Buscando...
                        </>
                      ) : (
                        <>
                          <Search className="h-3 w-3" />
                          Buscar
                        </>
                      )}
                    </Button>
                  </div>

                  <div className="grid grid-cols-4 gap-2">
                    <div className="space-y-1">
                      <Label className="text-[10px] text-muted-foreground">Status Lead</Label>
                      <Select value={statusFilter} onValueChange={setStatusFilter}>
                        <SelectTrigger className="h-8 text-sm">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Todos</SelectItem>
                          <SelectItem value="Novo">Novo</SelectItem>
                          <SelectItem value="Cliente">Cliente</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[10px] text-muted-foreground">Status Deal</Label>
                      <Select 
                        value={dealStatusFilter} 
                        onValueChange={setDealStatusFilter}
                        disabled={selectedProductFilters.length === 0}
                      >
                        <SelectTrigger className="h-8 text-sm">
                          <SelectValue placeholder="Nenhum" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">Nenhum</SelectItem>
                          <SelectItem value="lost">Perdido</SelectItem>
                          <SelectItem value="won">Ganho</SelectItem>
                          <SelectItem value="open">Aberto</SelectItem>
                          <SelectItem value="abandoned">Abandonado</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[10px] text-muted-foreground">LTV Mín (R$)</Label>
                      <Input
                        type="number"
                        placeholder="0"
                        value={ltvMin}
                        onChange={(e) => setLtvMin(e.target.value)}
                        className="h-8 text-sm"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[10px] text-muted-foreground">LTV Máx (R$)</Label>
                      <Input
                        type="number"
                        placeholder="999999"
                        value={ltvMax}
                        onChange={(e) => setLtvMax(e.target.value)}
                        className="h-8 text-sm"
                      />
                    </div>
                  </div>

                  {/* Product Filter - Required - Compact Collapsible */}
                  {products && products.length > 0 && (
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <Label className="text-[10px] text-muted-foreground">
                          Produto <span className="text-destructive">*</span>
                          {selectedProductFilters.length > 0 && (
                            <span className="ml-1 text-primary">({selectedProductFilters.length} selecionado{selectedProductFilters.length > 1 ? 's' : ''})</span>
                          )}
                        </Label>
                      </div>
                      
                      {/* Compact inline display */}
                      <div className="flex flex-wrap gap-1 max-h-[80px] overflow-y-auto p-1.5 border rounded bg-background/50">
                        {['avancados', 'intermediarios', 'basicos'].map((categorySlug) => {
                          const categoryProducts = products.filter(
                            p => (p.product_categories as any)?.slug === categorySlug
                          );
                          if (categoryProducts.length === 0) return null;
                          
                          const categoryName = (categoryProducts[0]?.product_categories as any)?.name || categorySlug;
                          const shortName = categoryName.charAt(0).toUpperCase(); // A, I, B
                          
                          return categoryProducts.map((product) => (
                            <Badge
                              key={product.id}
                              variant={selectedProductFilters.includes(product.id) ? "default" : "outline"}
                              className="cursor-pointer hover:bg-secondary/80 transition-colors text-[10px] py-0 h-4 px-1.5"
                              onClick={() => toggleProductFilter(product.id)}
                              title={`${categoryName}: ${product.name}`}
                            >
                              <span className="text-[8px] opacity-60 mr-0.5">{shortName}</span>
                              {product.name.length > 15 ? product.name.slice(0, 15) + '…' : product.name}
                            </Badge>
                          ));
                        })}
                      </div>
                      
                      {selectedProductFilters.length === 0 && (
                        <p className="text-[9px] text-muted-foreground">
                          Selecione pelo menos 1 produto
                        </p>
                      )}
                      {selectedProductFilters.length > 0 && (
                        <p className="text-[9px] text-amber-600">
                          ⚠️ Leads com categorias superiores serão excluídos
                        </p>
                      )}
                    </div>
                  )}
                </div>

                {/* Results Section */}
                <div className="space-y-2">
                  {/* Loading State */}
                  {isSearching && (
                    <div className="h-[150px] flex flex-col items-center justify-center border rounded-lg bg-muted/20">
                      <Loader2 className="h-6 w-6 animate-spin text-primary mb-2" />
                      <p className="text-sm text-muted-foreground">Carregando leads...</p>
                    </div>
                  )}

                  {/* Results List */}
                  {!isSearching && hasSearched && (
                    <>
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">
                          {searchResults.length} lead(s) encontrado(s)
                        </span>
                        {searchResults.length > 0 && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={toggleSelectAll}
                            className="text-xs h-6 px-2"
                          >
                            {selectedLeadIds.size === searchResults.length
                              ? "Desmarcar todos"
                              : "Selecionar todos"}
                          </Button>
                        )}
                      </div>

                      <div className="border rounded-lg overflow-hidden">
                        {searchResults.length === 0 ? (
                          <div className="h-[120px] flex flex-col items-center justify-center text-muted-foreground bg-muted/20">
                            <Users className="h-6 w-6 mb-2 opacity-50" />
                            <p className="text-sm">Nenhum lead encontrado</p>
                          </div>
                        ) : (
                          <ScrollArea className="h-[180px]">
                            <div className="divide-y">
                              {searchResults.map((lead) => (
                                <div
                                  key={lead.id}
                                  className={`flex items-center gap-3 p-2.5 hover:bg-muted/50 cursor-pointer transition-colors ${
                                    selectedLeadIds.has(lead.id) ? "bg-secondary/10" : ""
                                  }`}
                                  onClick={() => toggleLeadSelection(lead.id)}
                                >
                                  <Checkbox
                                    checked={selectedLeadIds.has(lead.id)}
                                    onCheckedChange={() => toggleLeadSelection(lead.id)}
                                  />
                                  <div className="flex-1 min-w-0">
                                    <p className="font-medium text-sm truncate">
                                      {lead.full_name || "Sem nome"}
                                    </p>
                                    <p className="text-xs text-muted-foreground truncate">
                                      {lead.email || "Sem email"}
                                    </p>
                                  </div>
                                  <Badge variant="secondary" className="shrink-0 text-xs">
                                    {formatCurrency(lead.ltv)}
                                  </Badge>
                                </div>
                              ))}
                            </div>
                          </ScrollArea>
                        )}
                      </div>
                    </>
                  )}

                  {/* Initial State */}
                  {!isSearching && !hasSearched && (
                    <div className="h-[120px] flex flex-col items-center justify-center border rounded-lg bg-muted/20 text-muted-foreground">
                      <Search className="h-6 w-6 mb-2 opacity-50" />
                      <p className="text-sm">Clique em "Buscar" para listar leads</p>
                    </div>
                  )}
                </div>
              </div>
                {/* Import Product Selection */}
                <div className="space-y-1.5 pt-3 border-t">
                  <Label className="text-primary font-medium flex items-center gap-2 text-sm">
                    <Package className="h-4 w-4" />
                    Produto para os Deals (opcional)
                  </Label>
                  <Select value={importProductId} onValueChange={setImportProductId}>
                    <SelectTrigger className="h-9">
                      <SelectValue placeholder="Selecione um produto..." />
                    </SelectTrigger>
                    <SelectContent className="min-w-[--radix-select-trigger-width]">
                      {products?.map((product) => (
                        <SelectItem key={product.id} value={product.id}>
                          {product.name}{" "}
                          {product.price && (
                            <span className="text-muted-foreground">
                              ({formatCurrency(product.price)})
                            </span>
                          )}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Footer */}
                <DialogFooter className="pt-4">
                  <Button variant="outline" onClick={() => onOpenChange(false)}>
                    Cancelar
                  </Button>
                  <Button
                    onClick={() => importDeals.mutate()}
                    disabled={selectedLeadIds.size === 0 || importDeals.isPending}
                    className="bg-secondary hover:bg-secondary/90 text-secondary-foreground gap-2"
                  >
                    {importDeals.isPending ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Importando...
                      </>
                    ) : (
                      <>
                        <Users className="h-4 w-4" />
                        {selectedLeadIds.size > 0
                          ? `Importar ${selectedLeadIds.size} Lead(s)`
                          : "Selecione leads"}
                      </>
                    )}
                  </Button>
                </DialogFooter>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
