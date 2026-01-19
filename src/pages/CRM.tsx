import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  LayoutDashboard,
  AlertTriangle,
  CheckCircle2,
  AlertOctagon,
  MoreHorizontal,
  Calendar,
  User,
  ArrowRight,
  Loader2,
  FileCheck,
  Info,
  ListTodo
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CrmCustomerSheet } from "@/components/crm/CrmCustomerSheet";

// Tipos
type Quarter = 'Q1' | 'Q2' | 'Q3' | 'Q4';
type HealthStatus = 'active' | 'warning' | 'risk';

interface CrmCustomer {
  id: string;
  lead_id: string;
  current_quarter: Quarter;
  health_status: HealthStatus;
  cx_owner: string | null;
  start_date: string | null;
  leads: {
    full_name: string;
    company_revenue: number | null;
  };
}

interface ChecklistTemplate {
  id: string;
  quarter: Quarter;
  title: string;
}

const quarters: { id: Quarter; label: string; description: string }[] = [
  { id: 'Q1', label: 'Q1: Onboarding', description: 'Fundamentos & Setup' },
  { id: 'Q2', label: 'Q2: Execução', description: 'Acompanhamento Assistido' },
  { id: 'Q3', label: 'Q3: Consolidação', description: 'Escala & Otimização' },
  { id: 'Q4', label: 'Q4: Validação', description: 'Renovação & Futuro' },
];

const healthConfig = {
  active: { color: "bg-green-100 text-green-700 border-green-200 hover:bg-green-200", icon: CheckCircle2, label: "Ativo" },
  warning: { color: "bg-yellow-100 text-yellow-700 border-yellow-200 hover:bg-yellow-200", icon: AlertTriangle, label: "Atenção" },
  risk: { color: "bg-red-100 text-red-700 border-red-200 hover:bg-red-200", icon: AlertOctagon, label: "Risco" },
};

export default function CRM() {
  const queryClient = useQueryClient();
  const [selectedJourneyId, setSelectedJourneyId] = useState<string | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);

  // 1. Busca os clientes do CRM
  const { data: journeys, isLoading: loadingJourneys } = useQuery({
    queryKey: ["crm-journeys"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("crm_journeys")
        .select(`
          *,
          leads (
            full_name,
            company_revenue
          )
        `)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as CrmCustomer[];
    },
  });

  // 2. Busca os Templates de Checklist para exibir no cabeçalho das colunas
  const { data: checklistTemplates } = useQuery({
    queryKey: ["crm-checklist-templates-board"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("crm_checklist_templates")
        .select("*")
        .order("created_at", { ascending: true });
      
      if (error) throw error;
      return data as ChecklistTemplate[];
    }
  });

  // 3. Movimentação com Trava de Segurança
  const moveQuarter = useMutation({
    mutationFn: async ({ id, currentQuarter, targetQuarter }: { id: string; currentQuarter: Quarter; targetQuarter: Quarter }) => {
      
      // Validação: Só permite avançar se checklists estiverem completos
      if (targetQuarter > currentQuarter) {
        const { data: pendingItems, error: checkError } = await (supabase as any)
          .from("crm_checklist_items")
          .select("title")
          .eq("journey_id", id)
          .eq("quarter", currentQuarter)
          .neq("status", "done");

        if (checkError) throw checkError;

        if (pendingItems && pendingItems.length > 0) {
          throw new Error(`Existem ${pendingItems.length} pendências em ${currentQuarter}. Conclua os checklists antes de avançar.`);
        }
      }

      const { error } = await (supabase as any)
        .from("crm_journeys")
        .update({ current_quarter: targetQuarter })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["crm-journeys"] });
      toast.success("Cliente avançou de fase com sucesso!");
    },
    onError: (error: any) => {
      toast.error("Movimentação bloqueada", { description: error.message });
    },
  });

  // 4. Atualizar Saúde
  const updateHealth = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: HealthStatus }) => {
      const { error } = await (supabase as any)
        .from("crm_journeys")
        .update({ health_status: status })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["crm-journeys"] });
      toast.success("Status de saúde atualizado!");
    },
  });

  const handleCardClick = (id: string) => {
    setSelectedJourneyId(id);
    setSheetOpen(true);
  };

  const getNextQuarter = (current: Quarter): Quarter | null => {
    const idx = quarters.findIndex(q => q.id === current);
    return idx >= 0 && idx < quarters.length - 1 ? quarters[idx + 1].id : null;
  };

  return (
    <div className="space-y-6 h-[calc(100vh-100px)] flex flex-col">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <LayoutDashboard className="h-8 w-8 text-secondary" />
          <h1 className="text-3xl font-bold text-primary">CRM Onboarding</h1>
        </div>
      </div>

      {loadingJourneys ? (
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="flex-1 overflow-x-auto pb-4">
          <div className="flex gap-4 min-w-[1200px] h-full">
            {quarters.map((quarter) => {
              const customersInQuarter = journeys?.filter((j) => j.current_quarter === quarter.id) || [];
              const stages = checklistTemplates?.filter((t) => t.quarter === quarter.id) || [];

              return (
                <div key={quarter.id} className="flex-1 min-w-[300px] flex flex-col bg-muted/20 rounded-xl border border-border/60">
                  {/* Header da Coluna */}
                  <div className="p-4 border-b border-border/60 bg-white rounded-t-xl sticky top-0 z-10 shadow-sm">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <h3 className="font-bold text-lg text-primary">{quarter.label}</h3>
                        
                        {/* HoverCard com os itens esperados da fase */}
                        <HoverCard>
                          <HoverCardTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-5 w-5 text-muted-foreground hover:text-primary">
                              <Info className="h-4 w-4" />
                            </Button>
                          </HoverCardTrigger>
                          <HoverCardContent className="w-80 p-4">
                            <div className="space-y-3">
                              <div className="flex items-center gap-2 border-b pb-2">
                                <ListTodo className="h-4 w-4 text-secondary" />
                                <h4 className="font-semibold text-sm">Entregas do Trimestre</h4>
                              </div>
                              {stages.length > 0 ? (
                                <ul className="space-y-2">
                                  {stages.map((stage) => (
                                    <li key={stage.id} className="text-xs flex items-start gap-2">
                                      <div className="h-1.5 w-1.5 rounded-full bg-secondary mt-1.5 shrink-0" />
                                      <span className="text-muted-foreground">{stage.title}</span>
                                    </li>
                                  ))}
                                </ul>
                              ) : (
                                <p className="text-xs text-muted-foreground italic">Nenhum item configurado.</p>
                              )}
                            </div>
                          </HoverCardContent>
                        </HoverCard>
                      </div>
                      <Badge variant="secondary" className="rounded-full bg-secondary/10 text-secondary">
                        {customersInQuarter.length}
                      </Badge>
                    </div>
                    
                    {/* Resumo rápido dos itens no header */}
                    <div className="space-y-1">
                      {stages.slice(0, 2).map(stage => (
                        <div key={stage.id} className="flex items-center gap-1.5">
                          <div className="h-1 w-1 rounded-full bg-muted-foreground/40" />
                          <p className="text-[10px] text-muted-foreground line-clamp-1">{stage.title}</p>
                        </div>
                      ))}
                      {stages.length > 2 && (
                        <p className="text-[10px] text-muted-foreground/60 pl-2.5">+ {stages.length - 2} itens...</p>
                      )}
                    </div>
                  </div>

                  {/* Cards dos Clientes */}
                  <ScrollArea className="flex-1 p-3">
                    <div className="space-y-3">
                      {customersInQuarter.map((journey) => {
                        const HealthIcon = healthConfig[journey.health_status].icon;
                        const nextQ = getNextQuarter(journey.current_quarter);
                        
                        return (
                          <Card 
                            key={journey.id} 
                            className="group relative border-l-4 border-l-secondary cursor-pointer hover:shadow-md transition-all bg-white"
                            onClick={() => handleCardClick(journey.id)}
                          >
                            <CardHeader className="p-4 pb-2">
                              <div className="flex justify-between items-start">
                                <div className="space-y-1.5 flex-1 pr-2">
                                  <CardTitle className="text-base font-bold leading-tight text-slate-800 line-clamp-1">
                                    {journey.leads?.full_name || "Cliente sem nome"}
                                  </CardTitle>
                                  <div className="flex items-center gap-2">
                                    <Badge 
                                      variant="outline" 
                                      className={`${healthConfig[journey.health_status].color} gap-1 text-[10px] h-5 px-2 border`}
                                      onClick={(e) => e.stopPropagation()}
                                    >
                                      <HealthIcon className="h-3 w-3" />
                                      {healthConfig[journey.health_status].label}
                                    </Badge>
                                  </div>
                                </div>
                                
                                <div onClick={(e) => e.stopPropagation()}>
                                  <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                      <Button variant="ghost" className="h-7 w-7 p-0 hover:bg-muted -mr-2 -mt-2">
                                        <MoreHorizontal className="h-4 w-4 text-muted-foreground" />
                                      </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end" className="w-48">
                                      <DropdownMenuLabel>Ações</DropdownMenuLabel>
                                      <DropdownMenuItem onClick={() => handleCardClick(journey.id)}>
                                        <FileCheck className="mr-2 h-4 w-4" /> Ver Checklist
                                      </DropdownMenuItem>
                                      <DropdownMenuSeparator />
                                      <DropdownMenuLabel>Mover Fase</DropdownMenuLabel>
                                      {quarters.map((q) => (
                                        <DropdownMenuItem 
                                          key={q.id}
                                          disabled={q.id === journey.current_quarter}
                                          onClick={() => moveQuarter.mutate({ 
                                            id: journey.id, 
                                            currentQuarter: journey.current_quarter,
                                            targetQuarter: q.id 
                                          })}
                                        >
                                          {q.label}
                                        </DropdownMenuItem>
                                      ))}
                                      <DropdownMenuSeparator />
                                      <DropdownMenuLabel>Saúde</DropdownMenuLabel>
                                      <DropdownMenuItem onClick={() => updateHealth.mutate({ id: journey.id, status: 'active' })}>
                                        Ativo
                                      </DropdownMenuItem>
                                      <DropdownMenuItem onClick={() => updateHealth.mutate({ id: journey.id, status: 'warning' })}>
                                        Atenção
                                      </DropdownMenuItem>
                                      <DropdownMenuItem onClick={() => updateHealth.mutate({ id: journey.id, status: 'risk' })}>
                                        Risco
                                      </DropdownMenuItem>
                                    </DropdownMenuContent>
                                  </DropdownMenu>
                                </div>
                              </div>
                            </CardHeader>
                            
                            <CardContent className="p-4 pt-2 pb-0">
                              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                <User className="h-3 w-3" />
                                {journey.cx_owner || "Sem CX definido"}
                              </div>
                            </CardContent>

                            <CardFooter className="p-4 pt-3 text-xs text-muted-foreground flex justify-between items-center border-t mt-3 bg-muted/10">
                              <span className="flex items-center gap-1">
                                <Calendar className="h-3 w-3" /> 
                                {journey.start_date ? format(new Date(journey.start_date), "dd/MM", { locale: ptBR }) : "-"}
                              </span>
                              
                              {/* Botão de Avançar Rápido */}
                              {nextQ && (
                                <Button 
                                  variant="ghost" 
                                  size="icon" 
                                  className="h-6 w-6 hover:bg-green-100 hover:text-green-700 transition-colors"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    moveQuarter.mutate({ 
                                      id: journey.id, 
                                      currentQuarter: journey.current_quarter,
                                      targetQuarter: nextQ 
                                    });
                                  }}
                                  title={`Avançar para ${nextQ}`}
                                >
                                  <ArrowRight className="h-3 w-3" />
                                </Button>
                              )}
                            </CardFooter>
                          </Card>
                        );
                      })}
                      
                      {customersInQuarter.length === 0 && (
                        <div className="flex flex-col items-center justify-center py-10 text-muted-foreground/40 border-2 border-dashed border-border/40 rounded-lg">
                          <LayoutDashboard className="h-8 w-8 mb-2 opacity-20" />
                          <span className="text-sm font-medium">Vazio</span>
                        </div>
                      )}
                    </div>
                  </ScrollArea>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <CrmCustomerSheet 
        journeyId={selectedJourneyId} 
        open={sheetOpen} 
        onOpenChange={setSheetOpen} 
      />
    </div>
  );
}
