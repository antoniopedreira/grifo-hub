import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Mail, Phone, Calendar, DollarSign, FileText, Loader2 } from "lucide-react";
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

  useEffect(() => {
    if (lead) {
      setEditStatus(lead.status || "Novo");
      setEditLtv(lead.ltv?.toString() || "0");
    }
  }, [lead]);

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

  if (!lead) return null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg">
        <SheetHeader>
          <SheetTitle className="text-primary">Detalhes do Lead</SheetTitle>
        </SheetHeader>

        <ScrollArea className="h-[calc(100vh-100px)] pr-4">
          <div className="space-y-6 py-6">
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
                className="w-full bg-[#A47428] hover:bg-[#8a6222]"
              >
                {updateLead.isPending ? "Salvando..." : "Salvar Alterações"}
              </Button>
            </section>

            <Separator />

            {/* Form Submissions History */}
            <section className="space-y-4">
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
                      className="bg-muted/30 rounded-lg p-4 space-y-3 border-l-4 border-[#A47428]"
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
            </section>
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
