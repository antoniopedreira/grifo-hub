import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Mail, Phone, Calendar, DollarSign, FileText, Loader2, ShoppingBag, Plus, Package } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  created_at: string | null;
}

interface FormSubmission {
  id: string;
  answers: Record<string, unknown>;
  submitted_at: string | null;
  product_id: string | null;
}

interface Sale {
  id: string;
  amount: number;
  transaction_date: string | null;
  product_name: string | null;
  origin: string;
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

export function LeadDetailSheet({ lead, open, onOpenChange }: LeadDetailSheetProps) {
  const queryClient = useQueryClient();
  const [editStatus, setEditStatus] = useState(lead?.status || "Novo");
  const [editLtv, setEditLtv] = useState(lead?.ltv?.toString() || "0");
  const [activeTab, setActiveTab] = useState("perfil");

  // Manual sale form state
  const [saleDialogOpen, setSaleDialogOpen] = useState(false);
  const [selectedProductId, setSelectedProductId] = useState("");
  const [saleDate, setSaleDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [saleValue, setSaleValue] = useState("");

  useEffect(() => {
    if (lead) {
      setEditStatus(lead.status || "Novo");
      setEditLtv(lead.ltv?.toString() || "0");
    }
  }, [lead]);

  // Fetch form submissions
  const { data: submissions, isLoading: loadingSubmissions } = useQuery({
    queryKey: ["lead-submissions", lead?.id],
    queryFn: async () => {
      if (!lead?.id) return [];
      const { data, error } = await supabase
        .from("form_submissions")
        .select("*")
        .eq("lead_id", lead.id)
        .order("submitted_at", { ascending: false });
      if (error) throw error;
      return data as FormSubmission[];
    },
    enabled: !!lead?.id && open,
  });

  // Fetch sales for this lead
  const { data: sales, isLoading: loadingSales } = useQuery({
    queryKey: ["lead-sales", lead?.id],
    queryFn: async () => {
      if (!lead?.id) return [];
      const { data, error } = await supabase
        .from("sales")
        .select("*")
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

  const updateLead = useMutation({
    mutationFn: async () => {
      if (!lead?.id) return;
      const { error } = await supabase
        .from("leads")
        .update({
          status: editStatus,
          ltv: parseFloat(editLtv) || 0,
        })
        .eq("id", lead.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["leads"] });
      toast.success("Lead atualizado!");
    },
    onError: (error) => {
      toast.error("Erro ao atualizar: " + error.message);
    },
  });

  // Create manual sale mutation
  const createSale = useMutation({
    mutationFn: async () => {
      if (!lead?.id || !selectedProductId) return;
      const selectedProduct = products?.find((p) => p.id === selectedProductId);
      const { error } = await supabase.from("sales").insert({
        lead_id: lead.id,
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
              {/* Profile Section */}
              <section className="space-y-4">
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                  Perfil
                </h3>
                <div className="bg-muted/30 rounded-lg p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-lg font-semibold text-foreground">
                      {lead.full_name || "Sem nome"}
                    </span>
                    <Badge className={statusColors[lead.status || "Novo"]}>
                      {lead.status || "Novo"}
                    </Badge>
                  </div>

                  {lead.email && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Mail className="h-4 w-4" />
                      <a href={`mailto:${lead.email}`} className="hover:underline">
                        {lead.email}
                      </a>
                    </div>
                  )}

                  {lead.phone && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Phone className="h-4 w-4" />
                      <a
                        href={`https://wa.me/55${lead.phone.replace(/\D/g, "")}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="hover:underline text-green-600"
                      >
                        {lead.phone}
                      </a>
                    </div>
                  )}

                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Calendar className="h-4 w-4" />
                    <span>
                      Cadastrado em{" "}
                      {lead.created_at
                        ? format(new Date(lead.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })
                        : "-"}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <DollarSign className="h-4 w-4" />
                    <span>
                      LTV: R$ {(lead.ltv || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                    </span>
                  </div>

                  {lead.origin && (
                    <div className="text-sm text-muted-foreground">
                      <span className="font-medium">Origem:</span> {lead.origin}
                    </div>
                  )}
                </div>
              </section>

              <Separator />

              {/* Edit Section */}
              <section className="space-y-4">
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                  Editar
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Status</Label>
                    <Select value={editStatus} onValueChange={setEditStatus}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Novo">Novo</SelectItem>
                        <SelectItem value="Cliente">Cliente</SelectItem>
                        <SelectItem value="Arquivado">Arquivado</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>LTV (R$)</Label>
                    <Input
                      type="number"
                      value={editLtv}
                      onChange={(e) => setEditLtv(e.target.value)}
                      min="0"
                      step="0.01"
                    />
                  </div>
                </div>
                <Button
                  onClick={() => updateLead.mutate()}
                  disabled={updateLead.isPending}
                  className="w-full bg-secondary hover:bg-secondary/90"
                >
                  {updateLead.isPending ? "Salvando..." : "Salvar Alterações"}
                </Button>
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
                      <div className="text-xs text-muted-foreground">
                        {submission.submitted_at
                          ? format(new Date(submission.submitted_at), "dd/MM/yyyy 'às' HH:mm", {
                              locale: ptBR,
                            })
                          : "Data não disponível"}
                      </div>
                      <div className="space-y-2">
                        {Object.entries(submission.answers as Record<string, unknown>).map(
                          ([key, value]) => (
                            <div key={key} className="text-sm">
                              <span className="font-medium text-foreground">
                                {formatAnswerKey(key)}:
                              </span>{" "}
                              <span className="text-muted-foreground">
                                {String(value) || "-"}
                              </span>
                            </div>
                          )
                        )}
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
                      <Input
                        type="date"
                        value={saleDate}
                        onChange={(e) => setSaleDate(e.target.value)}
                      />
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
                              {sale.transaction_date
                                ? format(new Date(sale.transaction_date), "dd/MM/yyyy")
                                : "-"}
                            </div>
                            <span className="font-semibold text-foreground">
                              {sale.product_name || "Produto"}
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
