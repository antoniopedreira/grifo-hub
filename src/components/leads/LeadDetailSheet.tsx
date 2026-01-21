import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Mail,
  Phone,
  Calendar,
  DollarSign,
  FileText,
  Loader2,
  ShoppingBag,
  Plus,
  Package,
  TrendingUp,
  MapPin,
} from "lucide-react";
import { getRegionByPhone, getRegionColor } from "@/lib/ddd-regions";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { useState, useEffect } from "react";

interface Lead {
  id: string;
  full_name: string | null;
  email: string | null;
  phone: string | null;
  status: string | null;
  origin: string | null;
  ltv: number | null;
  company_revenue: number | null; // Adicionado aqui
  created_at: string | null;
}

interface FormSubmission {
  id: string;
  answers: Record<string, unknown>;
  submitted_at: string | null;
  product_id: string | null;
  product: { name: string } | null;
}

interface Sale {
  id: string;
  amount: number;
  transaction_date: string | null;
  product_id: string | null;
  product_name: string | null;
  origin: string;
  products: { name: string } | null;
}

interface Product {
  id: string;
  name: string;
  price: number | null;
}

interface LeadDetailSheetProps {
  lead: Lead | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const statusColors: Record<string, string> = {
  Novo: "bg-blue-100 text-blue-800",
  Cliente: "bg-green-100 text-green-800",
  Arquivado: "bg-gray-100 text-gray-800",
};

const formatAnswerKey = (key: string): string => {
  const keyMap: Record<string, string> = {
    full_name: "Nome Completo",
    email: "Email",
    phone: "Telefone",
    whatsapp: "WhatsApp",
    faturamento: "Faturamento",
    revenue: "Faturamento",
    empresa: "Empresa",
    company: "Empresa",
    cargo: "Cargo",
    position: "Cargo",
    interesse: "Interesse",
    interest: "Interesse",
    objetivo: "Objetivo",
    goal: "Objetivo",
    desafio: "Desafio Principal",
    challenge: "Desafio Principal",
    experiencia: "Experiência",
    experience: "Experiência",
    investimento: "Capacidade de Investimento",
    investment: "Capacidade de Investimento",
    urgencia: "Urgência",
    urgency: "Urgência",
    como_conheceu: "Como nos Conheceu",
    how_found: "Como nos Conheceu",
    mensagem: "Mensagem",
    message: "Mensagem",
  };
  return keyMap[key.toLowerCase()] || key.charAt(0).toUpperCase() + key.slice(1).replace(/_/g, " ");
};

// Formata valores de respostas, especialmente faturamento
const formatAnswerValue = (key: string, value: unknown): string => {
  if (value === null || value === undefined || value === "") return "-";
  
  const strValue = String(value);
  
  // Formata faturamento/revenue
  if (key.toLowerCase() === "faturamento" || key.toLowerCase() === "revenue") {
    const revenueLabels: Record<string, string> = {
      "<500k": "Até R$ 500 mil",
      "500k-1M": "Entre R$ 500 mil e R$ 1 mi",
      "1M-5M": "Entre R$ 1 mi e R$ 5 mi",
      "5M-10M": "Entre R$ 5 mi e R$ 10 mi",
      "10M-50M": "Entre R$ 10 mi e R$ 50 mi",
      "+50M": "Acima de R$ 50 mi",
    };
    return revenueLabels[strValue] || strValue;
  }
  
  return strValue;
};

// Função auxiliar para traduzir o valor numérico para texto da faixa
const getRevenueLabel = (value: number | null) => {
  if (value === null || value === undefined) return "Não informado";
  if (value === 0) return "Até R$ 500 mil";
  if (value === 500000) return "Entre R$ 500 mil e R$ 1 mi";
  if (value === 1000000) return "Entre R$ 1 mi e R$ 5 mi";
  if (value === 5000000) return "Entre R$ 5 mi e R$ 10 mi";
  if (value === 10000000) return "Entre R$ 10 mi e R$ 50 mi";
  if (value === 50000000) return "Acima de R$ 50 mi";
  return "R$ " + value.toLocaleString("pt-BR");
};

export function LeadDetailSheet({ lead, open, onOpenChange }: LeadDetailSheetProps) {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("perfil");

  // Editable contact fields
  const [editName, setEditName] = useState(lead?.full_name || "");
  const [editEmail, setEditEmail] = useState(lead?.email || "");
  const [editPhone, setEditPhone] = useState(lead?.phone || "");
  const [isEditing, setIsEditing] = useState(false);

  // Manual sale form state
  const [saleDialogOpen, setSaleDialogOpen] = useState(false);
  const [selectedProductId, setSelectedProductId] = useState("");
  const [saleDate, setSaleDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [saleValue, setSaleValue] = useState("");

  useEffect(() => {
    if (lead) {
      setEditName(lead.full_name || "");
      setEditEmail(lead.email || "");
      setEditPhone(lead.phone || "");
      setIsEditing(false);
    }
  }, [lead]);

  // Fetch form submissions with product join
  const { data: submissions, isLoading: loadingSubmissions } = useQuery({
    queryKey: ["lead-submissions", lead?.id],
    queryFn: async () => {
      if (!lead?.id) return [];
      const { data, error } = await supabase
        .from("form_submissions")
        .select("*, product:products(name)")
        .eq("lead_id", lead.id)
        .order("submitted_at", { ascending: false });
      if (error) throw error;
      return data as FormSubmission[];
    },
    enabled: !!lead?.id && open,
  });

  // Fetch sales for this lead with product join
  const { data: sales, isLoading: loadingSales } = useQuery({
    queryKey: ["lead-sales", lead?.id],
    queryFn: async () => {
      if (!lead?.id) return [];
      const { data, error } = await supabase
        .from("sales")
        .select("*, products(name)")
        .eq("lead_id", lead.id)
        .order("transaction_date", { ascending: false });
      if (error) throw error;
      return data as Sale[];
    },
    enabled: !!lead?.id && open,
  });

  // Fetch products for the manual sale select
  const { data: products } = useQuery({
    queryKey: ["products-for-sale"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("id, name, price")
        .eq("active", true)
        .order("name");
      if (error) throw error;
      return data as Product[];
    },
    enabled: open,
  });

  // Calculate total LTV from sales
  const calculatedLtv = sales?.reduce((sum, sale) => sum + (sale.amount || 0), 0) || 0;

  // Update contact info mutation with optimistic updates
  const updateLead = useMutation({
    mutationFn: async () => {
      if (!lead?.id) return;
      const { error } = await supabase
        .from("leads")
        .update({
          full_name: editName || null,
          email: editEmail || null,
          phone: editPhone || null,
        })
        .eq("id", lead.id);
      if (error) throw error;
    },
    onMutate: async () => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: ["leads"] });
      await queryClient.cancelQueries({ queryKey: ["deals"] });

      // Snapshot previous values
      const previousLeads = queryClient.getQueryData(["leads"]);
      const previousDeals = queryClient.getQueryData(["deals"]);

      // Optimistically update leads cache
      queryClient.setQueryData(["leads"], (old: any) => {
        if (!old || !Array.isArray(old)) return old;
        return old.map((l: any) =>
          l.id === lead?.id
            ? { ...l, full_name: editName || null, email: editEmail || null, phone: editPhone || null }
            : l
        );
      });

      // Optimistically update deals cache (leads are nested inside deals)
      queryClient.setQueryData(["deals"], (old: any) => {
        if (!old || !Array.isArray(old)) return old;
        return old.map((d: any) =>
          d.lead_id === lead?.id
            ? { ...d, lead: { ...d.lead, full_name: editName || null, email: editEmail || null, phone: editPhone || null } }
            : d
        );
      });

      return { previousLeads, previousDeals };
    },
    onError: (error, _, context) => {
      // Rollback on error
      if (context?.previousLeads) {
        queryClient.setQueryData(["leads"], context.previousLeads);
      }
      if (context?.previousDeals) {
        queryClient.setQueryData(["deals"], context.previousDeals);
      }
      toast.error("Erro ao atualizar: " + error.message);
    },
    onSuccess: () => {
      toast.success("Contato atualizado!");
      setIsEditing(false);
    },
    onSettled: () => {
      // Always refetch to ensure consistency
      queryClient.invalidateQueries({ queryKey: ["leads"] });
      queryClient.invalidateQueries({ queryKey: ["deals"] });
    },
  });

  // Create manual sale mutation
  const createSale = useMutation({
    mutationFn: async () => {
      if (!lead?.id || !selectedProductId) return;
      const selectedProduct = products?.find((p) => p.id === selectedProductId);
      const { error } = await supabase.from("sales").insert({
        lead_id: lead.id,
        product_id: selectedProductId,
        product_name: selectedProduct?.name || "Produto Manual",
        amount: parseFloat(saleValue) || 0,
        transaction_date: saleDate,
        origin: "crm_manual" as const,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["lead-sales", lead?.id] });
      queryClient.invalidateQueries({ queryKey: ["leads"] });
      toast.success("Venda registrada com sucesso!");
      setSaleDialogOpen(false);
      setSelectedProductId("");
      setSaleValue("");
      setSaleDate(format(new Date(), "yyyy-MM-dd"));
    },
    onError: (error) => {
      toast.error("Erro ao registrar venda: " + error.message);
    },
  });

  // When product is selected, update sale value with product price
  const handleProductSelect = (productId: string) => {
    setSelectedProductId(productId);
    const product = products?.find((p) => p.id === productId);
    if (product?.price) {
      setSaleValue(product.price.toString());
    }
  };

  const handleCancelEdit = () => {
    setEditName(lead?.full_name || "");
    setEditEmail(lead?.email || "");
    setEditPhone(lead?.phone || "");
    setIsEditing(false);
  };

  if (!lead) return null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg">
        <SheetHeader>
          <SheetTitle className="text-primary">Detalhes do Lead</SheetTitle>
        </SheetHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-4">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="perfil">Perfil</TabsTrigger>
            <TabsTrigger value="historico">Respostas</TabsTrigger>
            <TabsTrigger value="compras">Compras</TabsTrigger>
          </TabsList>

          <ScrollArea className="h-[calc(100vh-180px)] pr-4 mt-4">
            {/* TAB: Perfil */}
            <TabsContent value="perfil" className="space-y-6 mt-0">
              {/* Profile Card - Info Display */}
              <section className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Informações</h3>
                  {!isEditing && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setIsEditing(true)}
                      className="text-secondary hover:text-secondary/80"
                    >
                      Editar Contato
                    </Button>
                  )}
                </div>

                <div className="bg-muted/30 rounded-lg p-5 space-y-4 border border-border/50">
                  {/* Header with name and status badge */}
                  <div className="flex items-start justify-between gap-3">
                    {isEditing ? (
                      <div className="flex-1 space-y-2">
                        <Label className="text-xs text-muted-foreground">Nome</Label>
                        <Input
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          placeholder="Nome completo"
                        />
                      </div>
                    ) : (
                      <span className="text-xl font-bold text-primary">{lead.full_name || "Sem nome"}</span>
                    )}
                    <Badge className={`${statusColors[lead.status || "Novo"]} shrink-0`}>{lead.status || "Novo"}</Badge>
                  </div>

                  <Separator />

                  {/* Contact info */}
                  <div className="space-y-3">
                    {isEditing ? (
                      <>
                        <div className="space-y-2">
                          <Label className="text-xs text-muted-foreground flex items-center gap-2">
                            <Mail className="h-3 w-3" /> Email
                          </Label>
                          <Input
                            type="email"
                            value={editEmail}
                            onChange={(e) => setEditEmail(e.target.value)}
                            placeholder="email@exemplo.com"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-xs text-muted-foreground flex items-center gap-2">
                            <Phone className="h-3 w-3" /> Telefone
                          </Label>
                          <Input
                            type="tel"
                            value={editPhone}
                            onChange={(e) => setEditPhone(e.target.value)}
                            placeholder="(11) 99999-9999"
                          />
                        </div>
                      </>
                    ) : (
                      <>
                        {lead.email && (
                          <div className="flex items-center gap-3 text-sm">
                            <Mail className="h-4 w-4 text-muted-foreground" />
                            <a href={`mailto:${lead.email}`} className="hover:underline text-foreground">
                              {lead.email}
                            </a>
                          </div>
                        )}
                        {lead.phone && (
                          <div className="flex items-center gap-3 text-sm">
                            <Phone className="h-4 w-4 text-muted-foreground" />
                            <a
                              href={`https://wa.me/55${lead.phone.replace(/\D/g, "")}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="hover:underline text-green-600 font-medium"
                            >
                              {lead.phone}
                            </a>
                          </div>
                        )}
                      </>
                    )}
                  </div>

                  {isEditing && (
                    <div className="flex gap-2 pt-2">
                      <Button variant="outline" size="sm" onClick={handleCancelEdit} className="flex-1">
                        Cancelar
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => updateLead.mutate()}
                        disabled={updateLead.isPending}
                        className="flex-1 bg-secondary hover:bg-secondary/90"
                      >
                        {updateLead.isPending ? "Salvando..." : "Salvar"}
                      </Button>
                    </div>
                  )}
                </div>
              </section>

              {/* Additional Info Card */}
              <section className="space-y-4">
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Detalhes</h3>
                <div className="bg-muted/30 rounded-lg p-5 space-y-4 border border-border/50">
                  {/* LTV Display - Static, highlighted */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-full bg-green-100">
                        <DollarSign className="h-4 w-4 text-green-600" />
                      </div>
                      <span className="text-sm text-muted-foreground">LTV (Lifetime Value)</span>
                    </div>
                    <span className="text-lg font-bold text-green-600">
                      R$ {(calculatedLtv || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                    </span>
                  </div>

                  <Separator />

                  {/* NOVO: Faturamento (Baseado no Company Revenue) */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-full bg-blue-100">
                        <TrendingUp className="h-4 w-4 text-blue-600" />
                      </div>
                      <span className="text-sm text-muted-foreground">Faturamento</span>
                    </div>
                    <span className="text-sm font-medium text-foreground">{getRevenueLabel(lead.company_revenue)}</span>
                  </div>

                  <Separator />

                  {/* Registration date */}
                  <div className="flex items-center gap-3 text-sm">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">Cadastrado em</span>
                    <span className="text-foreground font-medium ml-auto">
                      {lead.created_at
                        ? format(new Date(lead.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })
                        : "-"}
                    </span>
                  </div>

                  {/* Region from phone DDD */}
                  {(() => {
                    const regionInfo = getRegionByPhone(lead.phone);
                    if (!regionInfo) return null;
                    return (
                      <>
                        <Separator />
                        <div className="flex items-center gap-3 text-sm">
                          <MapPin className="h-4 w-4 text-muted-foreground" />
                          <span className="text-muted-foreground">Região</span>
                          <div className="ml-auto flex items-center gap-2">
                            <Badge className={getRegionColor(regionInfo.region)}>
                              {regionInfo.isInternational ? "🌍 Internacional" : `${regionInfo.state}`}
                            </Badge>
                            {!regionInfo.isInternational && (
                              <span className="text-xs text-muted-foreground">
                                {regionInfo.region}
                              </span>
                            )}
                          </div>
                        </div>
                      </>
                    );
                  })()}

                  {/* Origin */}
                  {lead.origin && (
                    <>
                      <Separator />
                      <div className="flex items-center gap-3 text-sm">
                        <Package className="h-4 w-4 text-muted-foreground" />
                        <span className="text-muted-foreground">Origem</span>
                        <span className="text-foreground font-medium ml-auto">{lead.origin}</span>
                      </div>
                    </>
                  )}
                </div>
              </section>
            </TabsContent>

            {/* TAB: Histórico de Respostas */}
            <TabsContent value="historico" className="space-y-4 mt-0">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Histórico de Respostas
              </h3>

              {loadingSubmissions ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : submissions && submissions.length > 0 ? (
                <div className="space-y-4">
                  {submissions.map((submission) => (
                    <div
                      key={submission.id}
                      className="bg-muted/30 rounded-lg p-4 space-y-3 border-l-4 border-secondary"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="text-xs text-muted-foreground">
                          {submission.submitted_at
                            ? format(new Date(submission.submitted_at), "dd/MM/yyyy 'às' HH:mm", {
                                locale: ptBR,
                              })
                            : "Data não disponível"}
                        </div>
                        {submission.product?.name && (
                          <Badge variant="outline" className="text-xs bg-secondary/10 text-secondary border-secondary/30">
                            {submission.product.name}
                          </Badge>
                        )}
                      </div>
                      <div className="space-y-2">
                        {Object.entries(submission.answers as Record<string, unknown>).map(([key, value]) => (
                          <div key={key} className="text-sm">
                            <span className="font-medium text-foreground">{formatAnswerKey(key)}:</span>{" "}
                            <span className="text-muted-foreground">{formatAnswerValue(key, value)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <FileText className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">Nenhuma submissão de formulário encontrada.</p>
                </div>
              )}
            </TabsContent>

            {/* TAB: Histórico de Compras */}
            <TabsContent value="compras" className="space-y-4 mt-0">
              {/* LTV Summary */}
              <div className="bg-gradient-to-r from-secondary/10 to-secondary/5 rounded-lg p-4 border border-secondary/20">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">LTV Total</p>
                    <p className="text-2xl font-bold text-primary">
                      R$ {calculatedLtv.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                    </p>
                  </div>
                  <DollarSign className="h-10 w-10 text-secondary opacity-50" />
                </div>
              </div>

              {/* Register Sale Button */}
              <Dialog open={saleDialogOpen} onOpenChange={setSaleDialogOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" className="w-full border-dashed border-2">
                    <Plus className="h-4 w-4 mr-2" />
                    Registrar Venda Manual
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Registrar Venda Manual</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label>Produto</Label>
                      <Select value={selectedProductId} onValueChange={handleProductSelect}>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione um produto" />
                        </SelectTrigger>
                        <SelectContent>
                          {products?.map((product) => (
                            <SelectItem key={product.id} value={product.id}>
                              {product.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Data da Venda</Label>
                      <Input type="date" value={saleDate} onChange={(e) => setSaleDate(e.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <Label>Valor (R$)</Label>
                      <Input
                        type="number"
                        value={saleValue}
                        onChange={(e) => setSaleValue(e.target.value)}
                        placeholder="0.00"
                        min="0"
                        step="0.01"
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <DialogClose asChild>
                      <Button variant="outline">Cancelar</Button>
                    </DialogClose>
                    <Button
                      onClick={() => createSale.mutate()}
                      disabled={createSale.isPending || !selectedProductId || !saleValue}
                      className="bg-secondary hover:bg-secondary/90"
                    >
                      {createSale.isPending ? "Salvando..." : "Registrar Venda"}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>

              {/* Sales List */}
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-2">
                  <ShoppingBag className="h-4 w-4" />
                  Histórico de Compras
                </h3>

                {loadingSales ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : sales && sales.length > 0 ? (
                  <div className="space-y-3">
                    {sales.map((sale) => (
                      <div
                        key={sale.id}
                        className="bg-muted/30 rounded-lg p-4 flex items-center justify-between border-l-4 border-green-500"
                      >
                        <div className="flex-1">
                          <div className="flex items-center gap-3">
                            <div className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded">
                              {sale.transaction_date ? format(new Date(sale.transaction_date), "dd/MM/yyyy") : "-"}
                            </div>
                            <span className="font-semibold text-foreground">
                              {sale.products?.name || sale.product_name || "Produto"}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-lg font-bold text-green-600">
                            R$ {sale.amount.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                          </span>
                          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                            Pago
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <Package className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">Nenhuma compra registrada.</p>
                    <p className="text-xs mt-1">Use o botão acima para registrar vendas manuais.</p>
                  </div>
                )}
              </div>
            </TabsContent>
          </ScrollArea>
        </Tabs>
      </SheetContent>
    </Sheet>
  );
}
