import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { MessageCircle, Mail, Phone, User, Package, DollarSign, FileText, Trash2, Pencil, Check, X, ShoppingBag, TrendingUp, Flag } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import type { Deal } from "./types";

interface DealDetailSheetProps {
  deal: Deal | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
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

const priorityOptions = [
  { value: "High", label: "Alta", className: "bg-red-50 text-red-600 border-red-200" },
  { value: "Medium", label: "Média", className: "bg-amber-50 text-amber-600 border-amber-200" },
  { value: "Low", label: "Baixa", className: "bg-emerald-50 text-emerald-600 border-emerald-200" },
];

export function DealDetailSheet({ deal, open, onOpenChange }: DealDetailSheetProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isEditingProduct, setIsEditingProduct] = useState(false);
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);
  const [isEditingPriority, setIsEditingPriority] = useState(false);
  const [selectedPriority, setSelectedPriority] = useState<string>("Medium");

  // Fetch products for the selector
  const { data: products = [] } = useQuery({
    queryKey: ["products-active"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("id, name, price")
        .eq("active", true)
        .order("name");
      if (error) throw error;
      return data;
    },
    enabled: open,
  });

  // Fetch form submission for this lead/product
  const { data: formSubmission } = useQuery({
    queryKey: ["form-submission", deal?.lead_id, deal?.product_id],
    queryFn: async () => {
      if (!deal?.lead_id) return null;
      
      const { data, error } = await supabase
        .from("form_submissions")
        .select("*")
        .eq("lead_id", deal.lead_id)
        .maybeSingle();
      
      if (error) throw error;
      return data;
    },
    enabled: open && !!deal?.lead_id,
  });

  // Fetch sales history for this lead
  const { data: salesHistory = [] } = useQuery({
    queryKey: ["lead-sales-pipeline", deal?.lead_id],
    queryFn: async () => {
      if (!deal?.lead_id) return [];
      
      const { data, error } = await supabase
        .from("sales")
        .select("*, products(name)")
        .eq("lead_id", deal.lead_id)
        .order("transaction_date", { ascending: false });
      
      if (error) throw error;
      return data as Sale[];
    },
    enabled: open && !!deal?.lead_id,
  });

  // Update deal product mutation
  const updateProductMutation = useMutation({
    mutationFn: async ({ dealId, productId }: { dealId: string; productId: string | null }) => {
      const selectedProduct = products.find((p) => p.id === productId);
      const { error } = await supabase
        .from("deals")
        .update({
          product_id: productId,
          value: selectedProduct?.price ?? null,
        })
        .eq("id", dealId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({
        title: "Produto atualizado",
        description: "O produto do deal foi atualizado com sucesso.",
      });
      queryClient.invalidateQueries({ queryKey: ["deals"] });
      setIsEditingProduct(false);
    },
    onError: () => {
      toast({
        title: "Erro ao atualizar",
        description: "Não foi possível atualizar o produto.",
        variant: "destructive",
      });
    },
  });

  // Update deal priority mutation
  const updatePriorityMutation = useMutation({
    mutationFn: async ({ dealId, priority }: { dealId: string; priority: string }) => {
      const { error } = await supabase
        .from("deals")
        .update({ priority })
        .eq("id", dealId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({
        title: "Prioridade atualizada",
        description: "A prioridade do deal foi atualizada com sucesso.",
      });
      queryClient.invalidateQueries({ queryKey: ["deals"] });
      setIsEditingPriority(false);
    },
    onError: () => {
      toast({
        title: "Erro ao atualizar",
        description: "Não foi possível atualizar a prioridade.",
        variant: "destructive",
      });
    },
  });

  // Delete deal mutation
  const deleteDealMutation = useMutation({
    mutationFn: async (dealId: string) => {
      const { error } = await supabase.from("deals").delete().eq("id", dealId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({
        title: "Deal excluído",
        description: "O deal foi removido com sucesso. Lead e vendas foram preservados.",
      });
      queryClient.invalidateQueries({ queryKey: ["deals"] });
      onOpenChange(false);
    },
    onError: () => {
      toast({
        title: "Erro ao excluir",
        description: "Não foi possível excluir o deal. Tente novamente.",
        variant: "destructive",
      });
    },
  });

  const handleStartEditProduct = () => {
    setSelectedProductId(deal?.product_id ?? null);
    setIsEditingProduct(true);
  };

  const handleSaveProduct = () => {
    if (!deal) return;
    updateProductMutation.mutate({ dealId: deal.id, productId: selectedProductId });
  };

  const handleCancelEditProduct = () => {
    setIsEditingProduct(false);
    setSelectedProductId(null);
  };

  const handleStartEditPriority = () => {
    setSelectedPriority(deal?.priority || "Medium");
    setIsEditingPriority(true);
  };

  const handleSavePriority = () => {
    if (!deal) return;
    updatePriorityMutation.mutate({ dealId: deal.id, priority: selectedPriority });
  };

  const handleCancelEditPriority = () => {
    setIsEditingPriority(false);
    setSelectedPriority("Medium");
  };

  if (!deal) return null;

  const lead = deal.lead;
  const product = deal.product;

  const formattedValue = deal.value
    ? new Intl.NumberFormat("pt-BR", {
        style: "currency",
        currency: "BRL",
      }).format(deal.value)
    : "—";

  // Calculate LTV from sales history
  const totalLtv = salesHistory.reduce((acc, sale) => acc + Number(sale.amount || 0), 0);
  const formattedLtv = new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(totalLtv);

  // Format phone for WhatsApp link
  const whatsappLink = lead?.phone
    ? `https://wa.me/55${lead.phone.replace(/\D/g, "")}`
    : null;

  const currentPriority = deal.priority || "Medium";
  const priorityConfig = priorityOptions.find((p) => p.value === currentPriority) || priorityOptions[1];

  // Parse answers JSON
  const renderAnswers = () => {
    if (!formSubmission?.answers) {
      return (
        <p className="text-muted-foreground text-center py-8">
          Nenhuma aplicação encontrada para este lead.
        </p>
      );
    }

    const answers = formSubmission.answers as Record<string, string | number | boolean>;
    
    return (
      <div className="space-y-4">
        {Object.entries(answers).map(([question, answer], index) => (
          <div key={index} className="space-y-1">
            <p className="font-semibold text-primary text-sm">{question}</p>
            <p className="text-muted-foreground bg-muted/50 rounded-md px-3 py-2">
              {String(answer)}
            </p>
          </div>
        ))}
      </div>
    );
  };

  const renderSalesHistory = () => {
    if (salesHistory.length === 0) {
      return (
        <p className="text-muted-foreground text-center py-8">
          Nenhuma compra registrada para este lead.
        </p>
      );
    }

    return (
      <div className="space-y-3">
        {salesHistory.map((sale) => (
          <div
            key={sale.id}
            className="flex items-center justify-between p-3 rounded-lg bg-muted/50 border"
          >
            <div className="flex-1">
              <p className="font-medium text-sm">
                {sale.products?.name || sale.product_name || "Produto"}
              </p>
              <p className="text-xs text-muted-foreground">
                {sale.transaction_date
                  ? format(new Date(sale.transaction_date), "dd/MM/yyyy", { locale: ptBR })
                  : "Data não informada"}
              </p>
            </div>
            <div className="text-right">
              <p className="font-semibold text-green-600">
                {new Intl.NumberFormat("pt-BR", {
                  style: "currency",
                  currency: "BRL",
                }).format(sale.amount)}
              </p>
              <Badge variant="outline" className="text-xs">
                {sale.origin === "crm_manual" ? "Manual" : "Auto"}
              </Badge>
            </div>
          </div>
        ))}
      </div>
    );
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="text-primary flex items-center gap-2">
            <User className="h-5 w-5" />
            {lead?.full_name || "Lead desconhecido"}
          </SheetTitle>
        </SheetHeader>

        <Tabs defaultValue="dados" className="mt-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="dados">Dados</TabsTrigger>
            <TabsTrigger value="compras">Compras</TabsTrigger>
            <TabsTrigger value="aplicacao">Aplicação</TabsTrigger>
          </TabsList>

          {/* Tab: Dados */}
          <TabsContent value="dados" className="space-y-6 mt-4">
            {/* Contact Info */}
            <div className="space-y-3">
              <h4 className="font-semibold text-primary flex items-center gap-2">
                <Mail className="h-4 w-4" />
                Contato
              </h4>
              
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <span>{lead?.email || "—"}</span>
                </div>
                
                <div className="flex items-center gap-2">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <span>{lead?.phone || "—"}</span>
                  {whatsappLink && (
                    <Button
                      variant="ghost"
                      size="sm"
                      asChild
                      className="h-6 px-2 text-green-600 hover:text-green-700 hover:bg-green-50"
                    >
                      <a href={whatsappLink} target="_blank" rel="noopener noreferrer">
                        <MessageCircle className="h-4 w-4" />
                      </a>
                    </Button>
                  )}
                </div>
              </div>
            </div>

            <Separator />

            {/* Product Info */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="font-semibold text-primary flex items-center gap-2">
                  <Package className="h-4 w-4" />
                  Produto
                </h4>
                {!isEditingProduct && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleStartEditProduct}
                    className="h-7 px-2 text-muted-foreground hover:text-foreground"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                )}
              </div>
              
              {isEditingProduct ? (
                <div className="flex items-center gap-2">
                  <Select
                    value={selectedProductId ?? "none"}
                    onValueChange={(value) => setSelectedProductId(value === "none" ? null : value)}
                  >
                    <SelectTrigger className="flex-1">
                      <SelectValue placeholder="Selecione um produto" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Sem produto</SelectItem>
                      {products.map((p) => (
                        <SelectItem key={p.id} value={p.id}>
                          {p.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={handleSaveProduct}
                    disabled={updateProductMutation.isPending}
                    className="h-8 w-8 text-green-600 hover:text-green-700 hover:bg-green-50"
                  >
                    <Check className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={handleCancelEditProduct}
                    className="h-8 w-8 text-muted-foreground hover:text-foreground"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <p className="text-sm">{product?.name || "Sem produto associado"}</p>
              )}
            </div>

            <Separator />

            {/* Deal Value */}
            <div className="space-y-3">
              <h4 className="font-semibold text-primary flex items-center gap-2">
                <DollarSign className="h-4 w-4" />
                Valor Estimado
              </h4>
              <p className="text-2xl font-bold text-secondary">{formattedValue}</p>
            </div>

            <Separator />

            {/* Priority */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="font-semibold text-primary flex items-center gap-2">
                  <Flag className="h-4 w-4" />
                  Prioridade
                </h4>
                {!isEditingPriority && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleStartEditPriority}
                    className="h-7 px-2 text-muted-foreground hover:text-foreground"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                )}
              </div>
              
              {isEditingPriority ? (
                <div className="flex items-center gap-2">
                  <Select
                    value={selectedPriority}
                    onValueChange={setSelectedPriority}
                  >
                    <SelectTrigger className="flex-1">
                      <SelectValue placeholder="Selecione a prioridade" />
                    </SelectTrigger>
                    <SelectContent>
                      {priorityOptions.map((p) => (
                        <SelectItem key={p.value} value={p.value}>
                          {p.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={handleSavePriority}
                    disabled={updatePriorityMutation.isPending}
                    className="h-8 w-8 text-green-600 hover:text-green-700 hover:bg-green-50"
                  >
                    <Check className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={handleCancelEditPriority}
                    className="h-8 w-8 text-muted-foreground hover:text-foreground"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <span className={`inline-flex items-center rounded-lg border px-3 py-1.5 text-sm font-semibold ${priorityConfig.className}`}>
                  {priorityConfig.label}
                </span>
              )}
            </div>

            <Separator />

            {/* Status */}
            <div className="space-y-3">
              <h4 className="font-semibold text-primary">Status</h4>
              <span className="capitalize">{deal.status || "open"}</span>
            </div>
          </TabsContent>

          {/* Tab: Compras */}
          <TabsContent value="compras" className="mt-4">
            <div className="space-y-4">
              {/* LTV Summary */}
              <div className="p-4 rounded-lg bg-green-50 border border-green-200">
                <div className="flex items-center gap-2 mb-1">
                  <TrendingUp className="h-4 w-4 text-green-600" />
                  <span className="text-sm font-medium text-green-700">LTV Total</span>
                </div>
                <p className="text-2xl font-bold text-green-600">{formattedLtv}</p>
              </div>

              <h4 className="font-semibold text-primary flex items-center gap-2">
                <ShoppingBag className="h-4 w-4" />
                Histórico de Compras
              </h4>
              {renderSalesHistory()}
            </div>
          </TabsContent>

          {/* Tab: Aplicação */}
          <TabsContent value="aplicacao" className="mt-4">
            <div className="space-y-4">
              <h4 className="font-semibold text-primary flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Respostas do Formulário
              </h4>
              {renderAnswers()}
            </div>
          </TabsContent>
        </Tabs>

        {/* Delete Deal Button */}
        <div className="mt-8 pt-6 border-t">
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                variant="outline"
                className="w-full text-destructive hover:text-destructive hover:bg-destructive/10 border-destructive/30"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Excluir Deal
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Excluir este deal?</AlertDialogTitle>
                <AlertDialogDescription>
                  Esta ação removerá apenas o deal do pipeline. O lead e todas as vendas 
                  associadas serão mantidos no sistema.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction
                  onClick={() => deleteDealMutation.mutate(deal.id)}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  Excluir
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </SheetContent>
    </Sheet>
  );
}
