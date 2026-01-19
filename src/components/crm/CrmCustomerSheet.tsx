import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { 
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription 
} from "@/components/ui/sheet";
import { 
  CheckCircle2, Upload, FileText, Calendar, Lock, ArrowDown 
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Checkbox } from "@/components/ui/checkbox";
import { format } from "date-fns";
import { Separator } from "@/components/ui/separator";

interface CrmCustomerSheetProps {
  journeyId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface ChecklistItem {
  id: string;
  quarter: 'Q1' | 'Q2' | 'Q3' | 'Q4';
  title: string;
  status: 'todo' | 'done';
  completed_at: string | null;
  order_index: number;
}

export function CrmCustomerSheet({ journeyId, open, onOpenChange }: CrmCustomerSheetProps) {
  const queryClient = useQueryClient();
  const [activeQuarter, setActiveQuarter] = useState<string>("Q1");

  const { data: journey } = useQuery({
    queryKey: ["crm-journey-detail", journeyId],
    queryFn: async () => {
      if (!journeyId) return null;
      const { data, error } = await supabase
        .from("crm_journeys")
        .select("*, leads(full_name, email, company_revenue)")
        .eq("id", journeyId)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!journeyId && open,
  });

  const { data: checklistItems } = useQuery({
    queryKey: ["crm-checklist", journeyId],
    queryFn: async () => {
      if (!journeyId) return [];
      const { data, error } = await supabase
        .from("crm_checklist_items")
        .select("*")
        .eq("journey_id", journeyId)
        .order("order_index", { ascending: true }) // Ordena pela sequência correta
        .order("created_at", { ascending: true }); // Fallback
      if (error) throw error;
      return data as ChecklistItem[];
    },
    enabled: !!journeyId && open,
  });

  useEffect(() => {
    if (journey?.current_quarter) {
      setActiveQuarter(journey.current_quarter);
    }
  }, [journey]);

  const toggleItem = useMutation({
    mutationFn: async ({ id, currentStatus }: { id: string; currentStatus: 'todo' | 'done' }) => {
      const newStatus = currentStatus === 'todo' ? 'done' : 'todo';
      const completedAt = newStatus === 'done' ? new Date().toISOString() : null;
      
      const { error } = await supabase
        .from("crm_checklist_items")
        .update({ status: newStatus, completed_at: completedAt })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["crm-checklist"] });
      queryClient.invalidateQueries({ queryKey: ["crm-journeys"] });
    },
  });

  const quarters = ['Q1', 'Q2', 'Q3', 'Q4'];

  if (!journey) return null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-xl flex flex-col h-full bg-white">
        <SheetHeader className="pb-4 border-b">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <SheetTitle className="text-xl text-primary">{journey.leads?.full_name}</SheetTitle>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Calendar className="h-3 w-3" />
                Início: {journey.start_date ? format(new Date(journey.start_date), "dd/MM/yyyy") : "-"}
              </div>
            </div>
            <Badge variant="outline" className="text-base px-3 py-1 bg-secondary/10 text-secondary border-secondary/20">
              {journey.current_quarter}
            </Badge>
          </div>
          <SheetDescription>
            Siga a linha do tempo de entregas.
          </SheetDescription>
        </SheetHeader>

        <ScrollArea className="flex-1 pr-4 -mr-4 mt-4">
          <div className="space-y-6 pb-10">
            <Accordion type="single" collapsible value={activeQuarter} onValueChange={setActiveQuarter}>
              {quarters.map((q) => {
                const items = checklistItems?.filter(i => i.quarter === q) || [];
                const total = items.length;
                const completed = items.filter(i => i.status === 'done').length;
                const progress = total > 0 ? Math.round((completed / total) * 100) : 0;
                const isCurrent = journey.current_quarter === q;

                return (
                  <AccordionItem key={q} value={q} className="border rounded-lg mb-4 px-4 bg-card shadow-sm">
                    <AccordionTrigger className="hover:no-underline py-4">
                      <div className="flex items-center gap-4 w-full">
                        <div className={`
                          flex items-center justify-center w-10 h-10 rounded-full font-bold text-sm shrink-0 transition-all
                          ${isCurrent ? "bg-primary text-primary-foreground shadow-md scale-110" : "bg-muted text-muted-foreground"}
                        `}>
                          {q}
                        </div>
                        <div className="flex-1 text-left min-w-0">
                          <p className="font-semibold text-sm truncate">
                            {q === 'Q1' && "Onboarding & Fundamentos"}
                            {q === 'Q2' && "Execução Assistida"}
                            {q === 'Q3' && "Consolidação & Escala"}
                            {q === 'Q4' && "Validação & Renovação"}
                          </p>
                          <div className="flex items-center gap-2 mt-1.5">
                            <div className="h-1.5 flex-1 bg-gray-100 rounded-full overflow-hidden">
                              <div 
                                className="h-full bg-green-500 transition-all duration-500 rounded-full" 
                                style={{ width: `${progress}%` }} 
                              />
                            </div>
                            <span className="text-[10px] font-medium text-muted-foreground w-8 text-right">{progress}%</span>
                          </div>
                        </div>
                      </div>
                    </AccordionTrigger>
                    
                    <AccordionContent className="pb-4 pl-4 pr-2">
                      {items.length === 0 ? (
                        <p className="text-sm text-muted-foreground italic bg-muted/30 p-3 rounded text-center">
                          Nenhum item configurado.
                        </p>
                      ) : (
                        <div className="relative pl-6 space-y-6 mt-2">
                          {/* Linha vertical conectora */}
                          <div className="absolute left-[11px] top-2 bottom-4 w-[2px] bg-muted/50" />

                          {items.map((item, index) => {
                            // Lógica de Bloqueio (Timeline)
                            // O item atual está bloqueado se o anterior existir E não estiver "done"
                            const previousItem = index > 0 ? items[index - 1] : null;
                            const isLocked = previousItem ? previousItem.status !== 'done' : false;
                            
                            // Se o item atual já estiver feito, ele não está bloqueado (permite desmarcar)
                            // Mas para marcar, precisa respeitar a ordem.
                            
                            return (
                              <div key={item.id} className={`relative flex items-start gap-4 group transition-all ${isLocked ? "opacity-50 grayscale" : "opacity-100"}`}>
                                
                                {/* Bolinha da Timeline */}
                                <div className={`
                                  absolute -left-[19px] top-1 w-3 h-3 rounded-full border-2 z-10 bg-white
                                  ${item.status === 'done' ? 'border-green-500 bg-green-500' : isLocked ? 'border-muted' : 'border-primary'}
                                `} />

                                <div className="mt-0.5">
                                  {isLocked ? (
                                    <Lock className="h-5 w-5 text-muted-foreground" />
                                  ) : (
                                    <Checkbox 
                                      id={item.id}
                                      checked={item.status === 'done'}
                                      onCheckedChange={() => toggleItem.mutate({ id: item.id, currentStatus: item.status })}
                                      className="data-[state=checked]:bg-green-600 data-[state=checked]:border-green-600"
                                    />
                                  )}
                                </div>

                                <div className="space-y-1 flex-1">
                                  <label 
                                    htmlFor={item.id}
                                    className={`text-sm font-medium leading-none block transition-colors
                                      ${item.status === 'done' ? 'text-muted-foreground line-through' : 'text-foreground'}
                                      ${isLocked ? 'cursor-not-allowed' : 'cursor-pointer'}
                                    `}
                                  >
                                    {item.title}
                                  </label>
                                  
                                  {item.completed_at && (
                                    <p className="text-[10px] text-green-600 flex items-center gap-1 font-medium animate-in fade-in slide-in-from-left-2">
                                      <CheckCircle2 className="h-3 w-3" />
                                      Concluído em {format(new Date(item.completed_at), "dd/MM 'às' HH:mm")}
                                    </p>
                                  )}

                                  {/* Ações (Upload/Obs) só aparecem se não estiver bloqueado */}
                                  {!isLocked && (
                                    <div className="flex items-center gap-2 mt-2">
                                      <Button variant="outline" size="sm" className="h-6 text-[10px] px-2 gap-1 bg-white hover:bg-slate-50">
                                        <Upload className="h-3 w-3" /> Anexar
                                      </Button>
                                      <Button variant="outline" size="sm" className="h-6 text-[10px] px-2 gap-1 bg-white hover:bg-slate-50">
                                        <FileText className="h-3 w-3" /> Obs
                                      </Button>
                                    </div>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </AccordionContent>
                  </AccordionItem>
                );
              })}
            </Accordion>
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
