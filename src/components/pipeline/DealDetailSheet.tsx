import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
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
  Calendar,
  XCircle,
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
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import type { Deal } from "./types";
import { DealComments } from "./DealComments";
import { WhatsAppChat } from "./WhatsAppChat";
import { FormAnswersPanel } from "./FormAnswersPanel";

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

  // Update deal product mutation with optimistic updates
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
      return { productId, product: selectedProduct };
    },
    onMutate: async ({ dealId, productId }) => {
      await queryClient.cancelQueries({ queryKey: ["deals"] });
      const previousDeals = queryClient.getQueryData(["deals"]);
      const selectedProduct = products.find((p) => p.id === productId);

      queryClient.setQueryData(["deals"], (old: any) => {
        if (!old || !Array.isArray(old)) return old;
        return old.map((d: any) =>
          d.id === dealId
            ? { ...d, product_id: productId, product: selectedProduct || null, value: selectedProduct?.price ?? null }
            : d
        );
      });

      return { previousDeals };
    },
    onError: (_, __, context) => {
      if (context?.previousDeals) {
        queryClient.setQueryData(["deals"], context.previousDeals);
      }
      toast({
        title: "Erro ao atualizar",
        description: "Não foi possível atualizar o produto.",
        variant: "destructive",
      });
    },
    onSuccess: () => {
      toast({
        title: "Produto atualizado",
        description: "O produto do deal foi atualizado com sucesso.",
      });
      setIsEditingProduct(false);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["deals"] });
    },
  });

  // Update deal priority mutation with optimistic updates
  const updatePriorityMutation = useMutation({
    mutationFn: async ({ dealId, priority }: { dealId: string; priority: string }) => {
      const { error } = await supabase.from("deals").update({ priority }).eq("id", dealId);
      if (error) throw error;
    },
    onMutate: async ({ dealId, priority }) => {
      await queryClient.cancelQueries({ queryKey: ["deals"] });
      const previousDeals = queryClient.getQueryData(["deals"]);

      queryClient.setQueryData(["deals"], (old: any) => {
        if (!old || !Array.isArray(old)) return old;
        return old.map((d: any) =>
          d.id === dealId ? { ...d, priority } : d
        );
      });

      return { previousDeals };
    },
    onError: (_, __, context) => {
      if (context?.previousDeals) {
        queryClient.setQueryData(["deals"], context.previousDeals);
      }
      toast({
        title: "Erro ao atualizar",
        description: "Não foi possível atualizar a prioridade.",
        variant: "destructive",
      });
    },
    onSuccess: () => {
      toast({
        title: "Prioridade atualizada",
        description: "A prioridade do deal foi atualizada com sucesso.",
      });
      setIsEditingPriority(false);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["deals"] });
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

  // Update lead contact mutation with optimistic updates
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
    onMutate: async ({ leadId, email, phone, socialMedia }) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: ["deals"] });
      await queryClient.cancelQueries({ queryKey: ["leads"] });

      // Snapshot previous values
      const previousDeals = queryClient.getQueryData(["deals"]);
      const previousLeads = queryClient.getQueryData(["leads"]);

      // Optimistically update deals cache
      queryClient.setQueryData(["deals"], (old: any) => {
        if (!old || !Array.isArray(old)) return old;
        return old.map((d: any) =>
          d.lead_id === leadId
            ? { ...d, lead: { ...d.lead, email: email || null, phone: phone || null, social_media: socialMedia || null } }
            : d
        );
      });

      // Optimistically update leads cache
      queryClient.setQueryData(["leads"], (old: any) => {
        if (!old || !Array.isArray(old)) return old;
        return old.map((l: any) =>
          l.id === leadId
            ? { ...l, email: email || null, phone: phone || null, social_media: socialMedia || null }
            : l
        );
      });

      return { previousDeals, previousLeads };
    },
    onError: (error, _, context) => {
      // Rollback on error
      if (context?.previousDeals) {
        queryClient.setQueryData(["deals"], context.previousDeals);
      }
      if (context?.previousLeads) {
        queryClient.setQueryData(["leads"], context.previousLeads);
      }
      toast({
        title: "Erro ao atualizar",
        description: "Não foi possível atualizar os dados de contato.",
        variant: "destructive",
      });
    },
    onSuccess: () => {
      toast({
        title: "Contato atualizado",
        description: "Os dados de contato foram atualizados com sucesso.",
      });
      setIsEditingContact(false);
    },
    onSettled: () => {
      // Always refetch to ensure consistency
      queryClient.invalidateQueries({ queryKey: ["deals"] });
      queryClient.invalidateQueries({ queryKey: ["leads"] });
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

  const renderSalesHistory = () => {
    if (salesHistory.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
          <ShoppingBag className="h-12 w-12 mb-3 opacity-30" />
          <p className="text-sm font-medium">Nenhuma compra registrada</p>
          <p className="text-xs mt-1">O lead ainda não realizou nenhuma compra.</p>
        </div>
      );
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
      <SheetContent className="w-full sm:max-w-lg p-0 flex flex-col">
        {/* Header */}
        <SheetHeader className="px-6 pt-6 pb-4 border-b bg-gradient-to-br from-background to-muted/30">
          <div className="flex items-start gap-3">
            <div className="w-12 h-12 rounded-full bg-secondary/10 flex items-center justify-center shrink-0">
              <User className="h-6 w-6 text-secondary" />
            </div>
            <div className="flex-1 min-w-0">
              <SheetTitle className="text-lg font-bold text-primary truncate">
                {lead?.full_name || "Lead desconhecido"}
              </SheetTitle>
              <div className="flex items-center gap-2 mt-1">
                <Badge variant="outline" className={priorityConfig.className}>
                  {priorityConfig.label}
                </Badge>
                <span className="text-xl font-bold text-secondary">{formattedValue}</span>
              </div>
            </div>
          </div>
        </SheetHeader>

        {/* Tabs Content */}
        <Tabs defaultValue="whatsapp" className="flex-1 flex flex-col overflow-hidden">
          <TabsList className="grid w-full grid-cols-4 px-4 py-2 h-auto gap-1 bg-transparent">
            <TabsTrigger 
              value="whatsapp" 
              className="data-[state=active]:bg-green-100 data-[state=active]:text-green-700 gap-1.5 py-2"
            >
              <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
              </svg>
              <span className="hidden sm:inline">Chat</span>
            </TabsTrigger>
            <TabsTrigger 
              value="respostas" 
              className="data-[state=active]:bg-secondary/10 data-[state=active]:text-secondary gap-1.5 py-2"
            >
              <FileText className="h-4 w-4" />
              <span className="hidden sm:inline">Respostas</span>
            </TabsTrigger>
            <TabsTrigger 
              value="dados" 
              className="data-[state=active]:bg-primary/10 data-[state=active]:text-primary gap-1.5 py-2"
            >
              <User className="h-4 w-4" />
              <span className="hidden sm:inline">Dados</span>
            </TabsTrigger>
            <TabsTrigger 
              value="notas" 
              className="data-[state=active]:bg-muted gap-1.5 py-2"
            >
              <MessageSquare className="h-4 w-4" />
              <span className="hidden sm:inline">Notas</span>
            </TabsTrigger>
          </TabsList>

          {/* Tab: WhatsApp */}
          <TabsContent value="whatsapp" className="flex-1 overflow-hidden mt-0 px-4 pb-4">
            <WhatsAppChat
              dealId={deal.id}
              leadId={deal.lead_id || null}
              phone={lead?.phone || null}
              leadName={lead?.full_name}
            />
          </TabsContent>

          {/* Tab: Respostas do Formulário */}
          <TabsContent value="respostas" className="flex-1 overflow-hidden mt-0 px-4 pb-4">
            <div className="h-full">
              <div className="flex items-center gap-2 mb-3">
                <FileText className="h-4 w-4 text-secondary" />
                <h4 className="font-semibold text-primary">Respostas do Formulário</h4>
              </div>
              <FormAnswersPanel 
                leadId={deal.lead_id || null} 
                productId={deal.product_id || null} 
              />
            </div>
          </TabsContent>

          {/* Tab: Dados */}
          <TabsContent value="dados" className="flex-1 overflow-hidden mt-0">
            <ScrollArea className="h-full">
              <div className="space-y-5 px-4 pb-4">
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
                    <div className="space-y-3 p-3 rounded-lg border bg-muted/30">
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
                          placeholder="Rede Social"
                          value={editSocialMedia}
                          onChange={(e) => setEditSocialMedia(e.target.value)}
                          className="flex-1"
                        />
                      </div>
                      <div className="flex items-center gap-2 justify-end pt-1">
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
                    <div className="space-y-2 text-sm p-3 rounded-lg bg-muted/30">
                      <div className="flex items-center gap-2">
                        <Mail className="h-4 w-4 text-muted-foreground" />
                        <span className="truncate">{lead?.email || "—"}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Phone className="h-4 w-4 text-muted-foreground" />
                        <span>{lead?.phone || "—"}</span>
                        {whatsappLink && (
                          <a 
                            href={whatsappLink} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="inline-flex items-center justify-center h-6 w-6 rounded-md text-green-600 hover:text-green-700 hover:bg-green-50"
                          >
                            <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4">
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
                    <p className="text-sm p-3 rounded-lg bg-muted/30">{product?.name || "Sem produto associado"}</p>
                  )}
                </div>

                <Separator />

                {/* Value & Priority Row */}
                <div className="grid grid-cols-2 gap-4">
                  {/* Deal Value */}
                  <div className="space-y-2">
                    <h4 className="font-semibold text-primary flex items-center gap-2 text-sm">
                      <DollarSign className="h-4 w-4" />
                      Valor
                    </h4>
                    <p className="text-xl font-bold text-secondary">{formattedValue}</p>
                  </div>

                  {/* Priority */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <h4 className="font-semibold text-primary flex items-center gap-2 text-sm">
                        <Flag className="h-4 w-4" />
                        Prioridade
                      </h4>
                      {!isEditingPriority && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={handleStartEditPriority}
                          className="h-6 px-1.5 text-muted-foreground hover:text-foreground"
                        >
                          <Pencil className="h-3 w-3" />
                        </Button>
                      )}
                    </div>

                    {isEditingPriority ? (
                      <div className="flex items-center gap-1">
                        <Select value={selectedPriority} onValueChange={setSelectedPriority}>
                          <SelectTrigger className="flex-1 h-8 text-xs">
                            <SelectValue />
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
                          className="h-7 w-7 text-green-600"
                        >
                          <Check className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={handleCancelEditPriority}
                          className="h-7 w-7"
                        >
                          <X className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    ) : (
                      <Badge className={`${priorityConfig.className} font-semibold`}>
                        {priorityConfig.label}
                      </Badge>
                    )}
                  </div>
                </div>

                {/* Loss Reason - only show if deal has a loss_reason */}
                {deal.loss_reason && (
                  <>
                    <Separator />
                    <div className="space-y-2">
                      <h4 className="font-semibold text-destructive flex items-center gap-2">
                        <XCircle className="h-4 w-4" />
                        Motivo da Perda
                      </h4>
                      <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20">
                        <p className="text-sm text-destructive font-medium">{deal.loss_reason}</p>
                      </div>
                    </div>
                  </>
                )}

                <Separator />

                {/* Sales History */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="font-semibold text-primary flex items-center gap-2">
                      <ShoppingBag className="h-4 w-4" />
                      Compras
                    </h4>
                    {salesHistory.length > 0 && (
                      <div className="flex items-center gap-1">
                        <TrendingUp className="h-3.5 w-3.5 text-green-600" />
                        <span className="text-sm font-semibold text-green-600">{formattedLtv}</span>
                      </div>
                    )}
                  </div>
                  {renderSalesHistory()}
                </div>

                {/* Delete Button */}
                <div className="pt-4">
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
                          Esta ação removerá apenas o deal do pipeline. O lead e todas as vendas associadas serão mantidos no sistema.
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
              </div>
            </ScrollArea>
          </TabsContent>

          {/* Tab: Notas/Comentários */}
          <TabsContent value="notas" className="flex-1 overflow-hidden mt-0 px-4 pb-4">
            <DealComments dealId={deal.id} />
          </TabsContent>
        </Tabs>
      </SheetContent>
    </Sheet>
  );
}
