import { useEffect, useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { 
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription 
} from "@/components/ui/sheet";
import { 
  CheckCircle2, FileText, Calendar, Loader2, Paperclip, ExternalLink, X, Pencil, Trash2
} from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Checkbox } from "@/components/ui/checkbox";
import { format } from "date-fns";
import { toast } from "sonner";

interface CrmCustomerSheetProps {
  journeyId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type Quarter = 'Q1' | 'Q2' | 'Q3' | 'Q4';

interface ChecklistItem {
  id: string;
  quarter: Quarter;
  title: string;
  status: string;
  completed_at: string | null;
  order_index: number | null;
  attachment_url: string | null;
  observations: string | null;
}

interface ChecklistTemplate {
  id: string;
  quarter: Quarter;
  title: string;
  order_index: number;
}

const quarterLabels: Record<Quarter, string> = {
  Q1: "Onboarding & Fundamentos",
  Q2: "Execução Assistida",
  Q3: "Consolidação & Escala",
  Q4: "Validação & Renovação",
};

export function CrmCustomerSheet({ journeyId, open, onOpenChange }: CrmCustomerSheetProps) {
  const queryClient = useQueryClient();
  const [activeQuarter, setActiveQuarter] = useState<string>("Q1");
  const [isPopulating, setIsPopulating] = useState(false);
  const [uploadingItemId, setUploadingItemId] = useState<string | null>(null);
  const [editingObsItemId, setEditingObsItemId] = useState<string | null>(null);
  const [obsText, setObsText] = useState<string>("");
  const populatedJourneys = useRef<Set<string>>(new Set());
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Busca dados da jornada
  const { data: journey } = useQuery({
    queryKey: ["crm-journey-detail", journeyId],
    queryFn: async () => {
      if (!journeyId) return null;
      const { data, error } = await (supabase as any)
        .from("crm_journeys")
        .select("*, leads(full_name, email, company_revenue)")
        .eq("id", journeyId)
        .single();
      if (error) throw error;
      return data as {
        id: string;
        current_quarter: Quarter;
        start_date: string | null;
        leads: { full_name: string; email: string; company_revenue: number | null };
      };
    },
    enabled: !!journeyId && open,
  });

  // Busca os checklist items da jornada
  const { data: checklistItems, isLoading: loadingItems } = useQuery({
    queryKey: ["crm-checklist", journeyId],
    queryFn: async () => {
      if (!journeyId) return [];
      const { data, error } = await (supabase as any)
        .from("crm_checklist_items")
        .select("*")
        .eq("journey_id", journeyId)
        .order("order_index", { ascending: true })
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data as ChecklistItem[];
    },
    enabled: !!journeyId && open,
  });

  // Busca os templates do CRM (configurados em Configurações)
  const { data: templates } = useQuery({
    queryKey: ["crm-checklist-templates"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("crm_checklist_templates")
        .select("*")
        .order("quarter", { ascending: true })
        .order("order_index", { ascending: true });
      if (error) throw error;
      return data as ChecklistTemplate[];
    },
    enabled: open,
  });

  // Popula os items baseados nos templates se não existirem
  useEffect(() => {
    const populateChecklist = async () => {
      // Guards para evitar execução duplicada
      if (!journeyId || !templates || templates.length === 0 || loadingItems || isPopulating) return;
      if (checklistItems && checklistItems.length > 0) return; // Já tem items
      if (populatedJourneys.current.has(journeyId)) return; // Já foi populado nesta sessão

      // Marca como "em processo" antes de iniciar
      populatedJourneys.current.add(journeyId);
      setIsPopulating(true);
      
      try {
        const itemsToInsert = templates.map(template => ({
          journey_id: journeyId,
          quarter: template.quarter,
          title: template.title,
          status: 'todo',
          order_index: template.order_index,
        }));

        const { error } = await (supabase as any)
          .from("crm_checklist_items")
          .insert(itemsToInsert);

        if (error) throw error;
        
        queryClient.invalidateQueries({ queryKey: ["crm-checklist", journeyId] });
        toast.success("Checklist criado com base nos templates!");
      } catch (error: any) {
        console.error("Erro ao popular checklist:", error);
        // Remove do set para permitir retry
        populatedJourneys.current.delete(journeyId);
        toast.error("Erro ao criar checklist");
      } finally {
        setIsPopulating(false);
      }
    };

    populateChecklist();
  }, [journeyId, templates, checklistItems, loadingItems, isPopulating, queryClient]);

  useEffect(() => {
    if (journey?.current_quarter) {
      setActiveQuarter(journey.current_quarter);
    }
  }, [journey]);

  const toggleItem = useMutation({
    mutationFn: async ({ id, currentStatus }: { id: string; currentStatus: string }) => {
      const newStatus = currentStatus === 'todo' ? 'done' : 'todo';
      const completedAt = newStatus === 'done' ? new Date().toISOString() : null;
      
      const { error } = await (supabase as any)
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

  // Função para verificar se é item de upload de contrato
  const isContractUploadItem = (title: string) => 
    title.toLowerCase().includes("upload do contrato") || 
    title.toLowerCase().includes("upload contrato");

  // Mutation para upload de arquivo
  const uploadAttachment = useMutation({
    mutationFn: async ({ itemId, file }: { itemId: string; file: File }) => {
      const fileExt = file.name.split('.').pop();
      const fileName = `${journeyId}/${itemId}-${Date.now()}.${fileExt}`;
      
      // Upload para o Storage
      const { error: uploadError } = await supabase.storage
        .from('crm-attachments')
        .upload(fileName, file);
      
      if (uploadError) throw uploadError;

      // Pega URL pública
      const { data: { publicUrl } } = supabase.storage
        .from('crm-attachments')
        .getPublicUrl(fileName);

      // Atualiza o item com a URL
      const { error: updateError } = await (supabase as any)
        .from("crm_checklist_items")
        .update({ attachment_url: publicUrl })
        .eq("id", itemId);
      
      if (updateError) throw updateError;
      
      return publicUrl;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["crm-checklist"] });
      toast.success("Contrato anexado com sucesso!");
      setUploadingItemId(null);
    },
    onError: (error: any) => {
      console.error("Erro ao anexar:", error);
      toast.error("Erro ao anexar arquivo");
      setUploadingItemId(null);
    },
  });

  // Remove anexo
  const removeAttachment = useMutation({
    mutationFn: async (itemId: string) => {
      const { error } = await (supabase as any)
        .from("crm_checklist_items")
        .update({ attachment_url: null })
        .eq("id", itemId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["crm-checklist"] });
      toast.success("Anexo removido!");
    },
  });

  // Mutation para salvar observação
  const saveObservation = useMutation({
    mutationFn: async ({ itemId, observations }: { itemId: string; observations: string }) => {
      const { error } = await (supabase as any)
        .from("crm_checklist_items")
        .update({ observations: observations || null })
        .eq("id", itemId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["crm-checklist"] });
      setEditingObsItemId(null);
      setObsText("");
      toast.success("Observação salva!");
    },
    onError: () => {
      toast.error("Erro ao salvar observação");
    },
  });

  // Mutation para excluir observação
  const deleteObservation = useMutation({
    mutationFn: async (itemId: string) => {
      const { error } = await (supabase as any)
        .from("crm_checklist_items")
        .update({ observations: null })
        .eq("id", itemId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["crm-checklist"] });
      toast.success("Observação excluída!");
    },
    onError: () => {
      toast.error("Erro ao excluir observação");
    },
  });

  const handleStartEditObs = (item: ChecklistItem) => {
    setEditingObsItemId(item.id);
    setObsText(item.observations || "");
  };

  const handleSaveObs = (itemId: string) => {
    saveObservation.mutate({ itemId, observations: obsText });
  };

  const handleCancelObs = () => {
    setEditingObsItemId(null);
    setObsText("");
  };

  const handleFileSelect = (itemId: string) => {
    setUploadingItemId(itemId);
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && uploadingItemId) {
      uploadAttachment.mutate({ itemId: uploadingItemId, file });
    }
    e.target.value = '';
  };

  const quarters: Quarter[] = ['Q1', 'Q2', 'Q3', 'Q4'];

  if (!journey) return null;

  const isLoading = loadingItems || isPopulating;

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

        {isLoading ? (
          <div className="flex-1 flex items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
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
                              {quarterLabels[q]}
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

                            {items.map((item) => {
                              return (
                                <div key={item.id} className="relative flex items-start gap-4 group transition-all">
                                  
                                  {/* Bolinha da Timeline */}
                                  <div className={`
                                    absolute -left-[19px] top-1 w-3 h-3 rounded-full border-2 z-10 bg-white
                                    ${item.status === 'done' ? 'border-green-500 bg-green-500' : 'border-primary'}
                                  `} />

                                  <div className="mt-0.5">
                                    <Checkbox 
                                      id={item.id}
                                      checked={item.status === 'done'}
                                      onCheckedChange={() => toggleItem.mutate({ id: item.id, currentStatus: item.status })}
                                      className="data-[state=checked]:bg-green-600 data-[state=checked]:border-green-600"
                                    />
                                  </div>

                                  <div className="space-y-1 flex-1">
                                    <label 
                                      htmlFor={item.id}
                                      className={`text-sm font-medium leading-none block transition-colors cursor-pointer
                                        ${item.status === 'done' ? 'text-muted-foreground line-through' : 'text-foreground'}
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

                                    {/* Botões Anexar e Obs na mesma linha */}
                                    <div className="flex items-center gap-2 mt-2 flex-wrap">
                                      {/* Anexar - só para "Upload do contrato" */}
                                      {isContractUploadItem(item.title) && (
                                        <Button 
                                          variant="outline" 
                                          size="sm" 
                                          className={`h-6 text-[10px] px-2 gap-1 relative ${
                                            item.attachment_url 
                                              ? 'bg-green-50 border-green-300 text-green-700 hover:bg-green-100' 
                                              : 'bg-white hover:bg-slate-50'
                                          }`}
                                          onClick={() => handleFileSelect(item.id)}
                                          disabled={uploadAttachment.isPending && uploadingItemId === item.id}
                                        >
                                          {uploadAttachment.isPending && uploadingItemId === item.id ? (
                                            <Loader2 className="h-3 w-3 animate-spin" />
                                          ) : (
                                            <Paperclip className="h-3 w-3" />
                                          )}
                                          Anexar
                                          {item.attachment_url && (
                                            <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-green-500 rounded-full border border-white" />
                                          )}
                                        </Button>
                                      )}

                                      {/* Link para ver anexo se existir */}
                                      {isContractUploadItem(item.title) && item.attachment_url && (
                                        <div className="flex items-center gap-1">
                                          <a 
                                            href={item.attachment_url} 
                                            target="_blank" 
                                            rel="noopener noreferrer"
                                            className="text-[10px] text-green-700 hover:underline flex items-center gap-1"
                                          >
                                            Ver <ExternalLink className="h-2.5 w-2.5" />
                                          </a>
                                          <Button
                                            variant="ghost"
                                            size="sm"
                                            className="h-5 w-5 p-0 text-red-500 hover:text-red-700 hover:bg-red-50"
                                            onClick={() => removeAttachment.mutate(item.id)}
                                          >
                                            <X className="h-3 w-3" />
                                          </Button>
                                        </div>
                                      )}

                                      {/* Botão Obs - sempre visível quando não está editando */}
                                      {editingObsItemId !== item.id && (
                                        <Button 
                                          variant="outline" 
                                          size="sm" 
                                          className={`h-6 text-[10px] px-2 gap-1 relative ${
                                            item.observations 
                                              ? 'bg-green-50 border-green-300 text-green-700 hover:bg-green-100' 
                                              : 'bg-white hover:bg-slate-50'
                                          }`}
                                          onClick={() => handleStartEditObs(item)}
                                        >
                                          <FileText className="h-3 w-3" /> Obs
                                          {item.observations && (
                                            <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-green-500 rounded-full border border-white" />
                                          )}
                                        </Button>
                                      )}
                                    </div>

                                    {/* Campo de edição/visualização de observação - só aparece ao clicar */}
                                    {editingObsItemId === item.id && (
                                      <div className="mt-2 space-y-2 bg-slate-50 border border-slate-200 rounded p-2">
                                        <Textarea 
                                          value={obsText}
                                          onChange={(e) => setObsText(e.target.value)}
                                          placeholder="Digite a observação..."
                                          className="text-xs min-h-[60px] resize-none bg-white"
                                          autoFocus
                                        />
                                        <div className="flex gap-2 items-center">
                                          <Button 
                                            size="sm" 
                                            className="h-6 text-[10px] px-3"
                                            onClick={() => handleSaveObs(item.id)}
                                            disabled={saveObservation.isPending}
                                          >
                                            {saveObservation.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : "Salvar"}
                                          </Button>
                                          <Button 
                                            variant="ghost" 
                                            size="sm" 
                                            className="h-6 text-[10px] px-3"
                                            onClick={handleCancelObs}
                                          >
                                            Cancelar
                                          </Button>
                                          {item.observations && (
                                            <Button
                                              variant="ghost"
                                              size="sm"
                                              className="h-6 text-[10px] px-2 text-red-500 hover:text-red-700 hover:bg-red-50 ml-auto"
                                              onClick={() => {
                                                deleteObservation.mutate(item.id);
                                                handleCancelObs();
                                              }}
                                            >
                                              <Trash2 className="h-3 w-3 mr-1" /> Excluir
                                            </Button>
                                          )}
                                        </div>
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
        )}

        {/* Input hidden para upload de arquivo */}
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
          className="hidden"
          onChange={handleFileChange}
        />
      </SheetContent>
    </Sheet>
  );
}
