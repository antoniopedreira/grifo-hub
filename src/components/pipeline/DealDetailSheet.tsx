import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  MessageCircle,
  Mail,
  Phone,
  User,
  Package,
  DollarSign,
  FileText,
  Trash2,
  Pencil,
  Check,
  X,
  ShoppingBag,
  TrendingUp,
  Flag,
  MessageSquare,
  Globe,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
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
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import type { Deal } from "./types";
import { DealComments } from "./DealComments";

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
  
  // Contact editing state
  const [isEditingContact, setIsEditingContact] = useState(false);
  const [editEmail, setEditEmail] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editSocialMedia, setEditSocialMedia] = useState("");

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
      const { error } = await supabase.from("deals").update({ priority }).eq("id", dealId);
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

  // Update lead contact mutation
  const updateContactMutation = useMutation({
    mutationFn: async ({ leadId, email, phone, socialMedia }: { leadId: string; email: string; phone: string; socialMedia: string }) => {
      const { error } = await supabase
        .from("leads")
        .update({
          email: email || null,
          phone: phone || null,
          social_media: socialMedia || null,
        })
        .eq("id", leadId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({
        title: "Contato atualizado",
        description: "Os dados de contato foram atualizados com sucesso.",
      });
      queryClient.invalidateQueries({ queryKey: ["deals"] });
      setIsEditingContact(false);
    },
    onError: () => {
      toast({
        title: "Erro ao atualizar",
        description: "Não foi possível atualizar os dados de contato.",
        variant: "destructive",
      });
    },
  });

  const handleStartEditContact = () => {
    setEditEmail(deal?.lead?.email || "");
    setEditPhone(deal?.lead?.phone || "");
    setEditSocialMedia((deal?.lead as any)?.social_media || "");
    setIsEditingContact(true);
  };

  const handleSaveContact = () => {
    if (!deal?.lead_id) return;
    updateContactMutation.mutate({
      leadId: deal.lead_id,
      email: editEmail,
      phone: editPhone,
      socialMedia: editSocialMedia,
    });
  };

  const handleCancelEditContact = () => {
    setIsEditingContact(false);
    setEditEmail("");
    setEditPhone("");
    setEditSocialMedia("");
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
  const whatsappLink = lead?.phone ? `https://wa.me/55${lead.phone.replace(/\D/g, "")}` : null;

  const currentPriority = deal.priority || "Medium";
  const priorityConfig = priorityOptions.find((p) => p.value === currentPriority) || priorityOptions[1];

  // Parse answers JSON
  const renderAnswers = () => {
    if (!formSubmission?.answers) {
      return <p className="text-muted-foreground text-center py-8">Nenhuma aplicação encontrada para este lead.</p>;
    }

    const answers = formSubmission.answers as Record<string, string | number | boolean>;

    return (
      <div className="space-y-4">
        {Object.entries(answers).map(([question, answer], index) => (
          <div key={index} className="space-y-1">
            <p className="font-semibold text-primary text-sm">{question}</p>
            <p className="text-muted-foreground bg-muted/50 rounded-md px-3 py-2">{String(answer)}</p>
          </div>
        ))}
      </div>
    );
  };

  const renderSalesHistory = () => {
    if (salesHistory.length === 0) {
      return <p className="text-muted-foreground text-center py-8">Nenhuma compra registrada para este lead.</p>;
    }

    return (
      <div className="space-y-3">
        {salesHistory.map((sale) => (
          <div key={sale.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50 border">
            <div className="flex-1">
              <p className="font-medium text-sm">{sale.products?.name || sale.product_name || "Produto"}</p>
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
          {/* Atualizado para 4 colunas para acomodar Comentários */}
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="dados">Dados</TabsTrigger>
            <TabsTrigger value="comentarios" className="flex items-center gap-1">
              <MessageSquare className="h-3 w-3 sm:hidden" />
              <span className="hidden sm:inline">Comentários</span>
              <span className="sm:hidden">Chat</span>
            </TabsTrigger>
            <TabsTrigger value="compras">Compras</TabsTrigger>
            <TabsTrigger value="aplicacao">Aplicação</TabsTrigger>
          </TabsList>

          {/* Tab: Dados */}
          <TabsContent value="dados" className="space-y-6 mt-4">
            {/* Contact Info */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="font-semibold text-primary flex items-center gap-2">
                  <Mail className="h-4 w-4" />
                  Contato
                </h4>
                {!isEditingContact && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleStartEditContact}
                    className="h-7 px-2 text-muted-foreground hover:text-foreground"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                )}
              </div>

              {isEditingContact ? (
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4 text-muted-foreground shrink-0" />
                    <Input
                      type="email"
                      placeholder="Email"
                      value={editEmail}
                      onChange={(e) => setEditEmail(e.target.value)}
                      className="flex-1"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <Phone className="h-4 w-4 text-muted-foreground shrink-0" />
                    <Input
                      type="tel"
                      placeholder="Telefone"
                      value={editPhone}
                      onChange={(e) => setEditPhone(e.target.value)}
                      className="flex-1"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <Globe className="h-4 w-4 text-muted-foreground shrink-0" />
                    <Input
                      placeholder="Rede Social (Instagram, LinkedIn...)"
                      value={editSocialMedia}
                      onChange={(e) => setEditSocialMedia(e.target.value)}
                      className="flex-1"
                    />
                  </div>
                  <div className="flex items-center gap-2 justify-end">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={handleSaveContact}
                      disabled={updateContactMutation.isPending}
                      className="h-8 w-8 text-green-600 hover:text-green-700 hover:bg-green-50"
                    >
                      <Check className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={handleCancelEditContact}
                      className="h-8 w-8 text-muted-foreground hover:text-foreground"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <span>{lead?.email || "—"}</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <span>{lead?.phone || "—"}</span>
                    {whatsappLink && (
                      <a 
                        href={whatsappLink} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="inline-flex items-center justify-center h-6 w-6 rounded-md text-green-600 hover:text-green-700 hover:bg-green-50 transition-colors"
                      >
                        <svg 
                          viewBox="0 0 24 24" 
                          fill="currentColor" 
                          className="h-4 w-4"
                        >
                          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                        </svg>
                      </a>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <Globe className="h-4 w-4 text-muted-foreground" />
                    <span>{(lead as any)?.social_media || "—"}</span>
                  </div>
                </div>
              )}
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
                  <Select value={selectedPriority} onValueChange={setSelectedPriority}>
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
                <span
                  className={`inline-flex items-center rounded-lg border px-3 py-1.5 text-sm font-semibold ${priorityConfig.className}`}
                >
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

          {/* Tab: Comentários (NOVA) */}
          <TabsContent value="comentarios" className="mt-4">
            <DealComments dealId={deal.id} />
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
                  Esta ação removerá apenas o deal do pipeline. O lead e todas as vendas associadas serão mantidos no
                  sistema.
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
