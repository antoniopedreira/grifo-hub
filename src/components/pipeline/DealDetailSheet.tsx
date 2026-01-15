import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { MessageCircle, Mail, Phone, User, Package, DollarSign, FileText, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
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
import { useToast } from "@/hooks/use-toast";
import type { Deal } from "./types";

interface DealDetailSheetProps {
  deal: Deal | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function DealDetailSheet({ deal, open, onOpenChange }: DealDetailSheetProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

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

  if (!deal) return null;

  const lead = deal.lead;
  const product = deal.product;

  const formattedValue = deal.value
    ? new Intl.NumberFormat("pt-BR", {
        style: "currency",
        currency: "BRL",
      }).format(deal.value)
    : "—";

  // Format phone for WhatsApp link
  const whatsappLink = lead?.phone
    ? `https://wa.me/55${lead.phone.replace(/\D/g, "")}`
    : null;

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
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="dados">Dados</TabsTrigger>
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
              <h4 className="font-semibold text-primary flex items-center gap-2">
                <Package className="h-4 w-4" />
                Produto
              </h4>
              <p className="text-sm">{product?.name || "Sem produto associado"}</p>
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

            {/* Status */}
            <div className="space-y-3">
              <h4 className="font-semibold text-primary">Status</h4>
              <div className="flex items-center gap-2">
                <span className="capitalize">{deal.status || "open"}</span>
                <span className="text-xs text-muted-foreground">
                  • Prioridade: {deal.priority || "Medium"}
                </span>
              </div>
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
