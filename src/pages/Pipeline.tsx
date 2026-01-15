import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { DragDropContext, DropResult } from "@hello-pangea/dnd";
import { Plus, LayoutGrid, Search } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { KanbanColumn } from "@/components/pipeline/KanbanColumn";
import { NewDealDialog } from "@/components/pipeline/NewDealDialog";
import { ScheduleMeetingDialog } from "@/components/pipeline/ScheduleMeetingDialog";
import { CloseSaleDialog } from "@/components/pipeline/CloseSaleDialog";
import { toast } from "sonner";
import type { Deal, Pipeline as PipelineType, PipelineStage } from "@/components/pipeline/types";

export default function Pipeline() {
  const queryClient = useQueryClient();
  const [selectedPipelineId, setSelectedPipelineId] = useState<string>("");
  const [isNewDealOpen, setIsNewDealOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  // Estados para controlar os Modais de Ação
  const [meetingDialog, setMeetingDialog] = useState<{
    open: boolean;
    deal: Deal | null;
    targetStageId: string | null;
  }>({
    open: false,
    deal: null,
    targetStageId: null,
  });
  const [closeDialog, setCloseDialog] = useState<{ open: boolean; deal: Deal | null; targetStageId: string | null }>({
    open: false,
    deal: null,
    targetStageId: null,
  });

  // 1. Busca Pipelines
  const { data: pipelines = [] } = useQuery({
    queryKey: ["pipelines"],
    queryFn: async () => {
      const { data, error } = await supabase.from("pipelines").select("*").order("name");
      if (error) throw error;
      return data as PipelineType[];
    },
  });

  useEffect(() => {
    if (pipelines.length > 0 && !selectedPipelineId) {
      setSelectedPipelineId(pipelines[0].id);
    }
  }, [pipelines, selectedPipelineId]);

  // 2. Busca Etapas
  const { data: stages = [] } = useQuery({
    queryKey: ["pipeline_stages", selectedPipelineId],
    queryFn: async () => {
      if (!selectedPipelineId) return [];
      const { data, error } = await supabase
        .from("pipeline_stages")
        .select("*")
        .eq("pipeline_id", selectedPipelineId)
        .order("order_index");
      if (error) throw error;
      return data as PipelineStage[];
    },
    enabled: !!selectedPipelineId,
  });

  // 3. Busca Deals
  const { data: deals = [] } = useQuery({
    queryKey: ["deals", selectedPipelineId],
    queryFn: async () => {
      if (!selectedPipelineId) return [];

      const { data, error } = await supabase.from("deals").select("*").order("order_index");

      if (error) throw error;

      // Filtro no front para garantir consistência
      const validStageIds = stages.map((s) => s.id);
      const filteredDeals = (data as any[]).filter((d) => validStageIds.includes(d.stage_id));

      return filteredDeals as Deal[];
    },
    enabled: !!selectedPipelineId && stages.length > 0,
  });

  // Mutation para mover o card
  const moveDealMutation = useMutation({
    mutationFn: async ({ dealId, stageId, orderIndex }: { dealId: string; stageId: string; orderIndex: number }) => {
      const { error } = await supabase
        .from("deals")
        .update({ stage_id: stageId, order_index: orderIndex })
        .eq("id", dealId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["deals"] });
      toast.success("Card movido!");
    },
    onError: () => toast.error("Erro ao mover card"), // CORRIGIDO: Removido ponto e vírgula
  });

  const handleDragEnd = (result: DropResult) => {
    const { destination, source, draggableId } = result;

    if (!destination) return;
    if (destination.droppableId === source.droppableId && destination.index === source.index) return;

    const deal = deals.find((d) => d.id === draggableId);
    if (!deal) return;

    const targetStageId = destination.droppableId;
    const targetStage = stages.find((s) => s.id === targetStageId);

    // Lógica de Interceptação: Agendamento
    if (targetStage?.type === "meeting" && source.droppableId !== targetStageId) {
      setMeetingDialog({ open: true, deal, targetStageId });
      return;
    }

    // Lógica de Interceptação: Ganho
    if (targetStage?.type === "won" && source.droppableId !== targetStageId) {
      setCloseDialog({ open: true, deal, targetStageId });
      return;
    }

    // Movimento Padrão
    moveDealMutation.mutate({
      dealId: draggableId,
      stageId: targetStageId,
      orderIndex: destination.index,
    });
  };

  const handleMeetingSuccess = () => {
    if (meetingDialog.deal && meetingDialog.targetStageId) {
      moveDealMutation.mutate({
        dealId: meetingDialog.deal.id,
        stageId: meetingDialog.targetStageId,
        orderIndex: 0,
      });
    }
    setMeetingDialog({ open: false, deal: null, targetStageId: null });
  };

  const handleCloseSuccess = () => {
    if (closeDialog.deal && closeDialog.targetStageId) {
      moveDealMutation.mutate({
        dealId: closeDialog.deal.id,
        stageId: closeDialog.targetStageId,
        orderIndex: 0,
      });
    }
    setCloseDialog({ open: false, deal: null, targetStageId: null });
  };

  const filteredDeals = deals.filter((deal) => deal.title?.toLowerCase().includes(searchTerm.toLowerCase()));

  return (
    <div className="h-[calc(100vh-2rem)] flex flex-col space-y-4 p-8 pt-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <LayoutGrid className="h-6 w-6 text-primary" />
          <h2 className="text-3xl font-bold tracking-tight">Pipeline de Vendas</h2>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-64">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar oportunidade..."
              className="pl-8"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <Select value={selectedPipelineId} onValueChange={setSelectedPipelineId}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Selecione o funil" />
            </SelectTrigger>
            <SelectContent>
              {pipelines.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button onClick={() => setIsNewDealOpen(true)}>
            <Plus className="mr-2 h-4 w-4" /> Novo Deal
          </Button>
        </div>
      </div>

      <DragDropContext onDragEnd={handleDragEnd}>
        <div className="flex-1 overflow-x-auto pb-4">
          <div className="flex h-full gap-4 min-w-max">
            {stages.map((stage) => {
              const stageDeals = filteredDeals
                .filter((d) => d.stage_id === stage.id)
                .sort((a, b) => (a.order_index || 0) - (b.order_index || 0));

              return (
                <KanbanColumn
                  key={stage.id}
                  stage={stage}
                  deals={stageDeals}
                  totalValue={stageDeals.reduce((acc, curr) => acc + Number(curr.value), 0)}
                />
              );
            })}
          </div>
        </div>
      </DragDropContext>

      <NewDealDialog
        open={isNewDealOpen}
        onOpenChange={setIsNewDealOpen}
        pipelineId={selectedPipelineId}
        firstStageId={stages[0]?.id}
      />

      {meetingDialog.deal && (
        <ScheduleMeetingDialog
          open={meetingDialog.open}
          onOpenChange={(open) => !open && setMeetingDialog((prev) => ({ ...prev, open: false }))}
          dealId={meetingDialog.deal.id}
          dealTitle={meetingDialog.deal.title}
          currentDate={null}
          onSuccess={handleMeetingSuccess}
        />
      )}

      {closeDialog.deal && (
        <CloseSaleDialog
          open={closeDialog.open}
          onOpenChange={(open) => !open && setCloseDialog((prev) => ({ ...prev, open: false }))}
          deal={closeDialog.deal}
          targetStageId={closeDialog.targetStageId}
          onCancel={() => setCloseDialog((prev) => ({ ...prev, open: false }))}
          onSuccess={handleCloseSuccess}
        />
      )}
    </div>
  );
}
