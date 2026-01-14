import { useState, useMemo } from "react";
import { GitBranch, Plus, Loader2 } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { DragDropContext, DropResult } from "@hello-pangea/dnd";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { KanbanColumn } from "@/components/pipeline/KanbanColumn";
import { DealDetailSheet } from "@/components/pipeline/DealDetailSheet";
import { NewDealDialog } from "@/components/pipeline/NewDealDialog";
import { CloseSaleDialog } from "@/components/pipeline/CloseSaleDialog";
import type { Deal, Stage, Pipeline, KanbanColumn as KanbanColumnType } from "@/components/pipeline/types";

export default function PipelinePage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [selectedPipelineId, setSelectedPipelineId] = useState<string>("");
  const [selectedDeal, setSelectedDeal] = useState<Deal | null>(null);
  const [detailSheetOpen, setDetailSheetOpen] = useState(false);
  const [newDealDialogOpen, setNewDealDialogOpen] = useState(false);
  const [closeSaleDialogOpen, setCloseSaleDialogOpen] = useState(false);
  const [pendingWonDrop, setPendingWonDrop] = useState<{
    deal: Deal;
    targetStageId: string;
  } | null>(null);

  // Fetch pipelines
  const { data: pipelines, isLoading: loadingPipelines } = useQuery({
    queryKey: ["pipelines"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("pipelines")
        .select("*")
        .order("name");
      if (error) throw error;
      return data as Pipeline[];
    },
  });

  // Auto-select first pipeline
  const activePipelineId = selectedPipelineId || pipelines?.[0]?.id || "";

  // Fetch stages for selected pipeline
  const { data: stages } = useQuery({
    queryKey: ["pipeline-stages", activePipelineId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("pipeline_stages")
        .select("*")
        .eq("pipeline_id", activePipelineId)
        .order("order_index");
      if (error) throw error;
      return data as Stage[];
    },
    enabled: !!activePipelineId,
  });

  // Fetch deals for selected pipeline with lead and product info
  const { data: deals, isLoading: loadingDeals } = useQuery({
    queryKey: ["deals", activePipelineId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("deals")
        .select(`
          *,
          lead:leads(*),
          product:products(*)
        `)
        .eq("pipeline_id", activePipelineId)
        .neq("status", "won")
        .neq("status", "lost");
      if (error) throw error;
      return data as Deal[];
    },
    enabled: !!activePipelineId,
  });

  // Move deal mutation with Optimistic Updates
  const moveDeal = useMutation({
    mutationFn: async ({
      dealId,
      stageId,
    }: {
      dealId: string;
      stageId: string;
    }) => {
      const { error } = await supabase
        .from("deals")
        .update({ stage_id: stageId })
        .eq("id", dealId);
      if (error) throw error;
    },
    onMutate: async ({ dealId, stageId }) => {
      // Cancel any outgoing refetches to prevent overwriting optimistic update
      await queryClient.cancelQueries({ queryKey: ["deals", activePipelineId] });

      // Snapshot the previous value
      const previousDeals = queryClient.getQueryData<Deal[]>(["deals", activePipelineId]);

      // Optimistically update the cache - move card instantly
      queryClient.setQueryData<Deal[]>(["deals", activePipelineId], (old) =>
        old?.map((deal) =>
          deal.id === dealId ? { ...deal, stage_id: stageId } : deal
        )
      );

      // Return context with the snapshot for rollback
      return { previousDeals };
    },
    onError: (_err, _variables, context) => {
      // Rollback to previous state on error
      if (context?.previousDeals) {
        queryClient.setQueryData(["deals", activePipelineId], context.previousDeals);
      }
      toast({
        title: "Erro ao mover card",
        description: "Não foi possível atualizar o estágio.",
        variant: "destructive",
      });
    },
    onSettled: () => {
      // Silently refetch to ensure data consistency
      queryClient.invalidateQueries({ queryKey: ["deals", activePipelineId] });
    },
  });

  // Build kanban columns
  const columns: KanbanColumnType[] = useMemo(() => {
    if (!stages) return [];
    return stages.map((stage) => ({
      stage,
      deals: (deals || []).filter((deal) => deal.stage_id === stage.id),
    }));
  }, [stages, deals]);

  // Get first stage for new deals
  const firstStage = stages?.[0];

  // Check if stage is "Ganho" or "Won"
  const isWonStage = (stageName: string) => {
    const name = stageName.toLowerCase();
    return name === "ganho" || name === "won";
  };

  // Handle drag end
  const handleDragEnd = (result: DropResult) => {
    const { destination, source, draggableId } = result;

    // No destination
    if (!destination) return;

    // Same position
    if (
      destination.droppableId === source.droppableId &&
      destination.index === source.index
    ) {
      return;
    }

    const targetStage = stages?.find((s) => s.id === destination.droppableId);
    if (!targetStage) return;

    // Check if dropping on "Ganho" column
    if (isWonStage(targetStage.name)) {
      const deal = deals?.find((d) => d.id === draggableId);
      if (deal) {
        setPendingWonDrop({ deal, targetStageId: targetStage.id });
        setCloseSaleDialogOpen(true);
        return;
      }
    }

    // Regular move
    moveDeal.mutate({ dealId: draggableId, stageId: destination.droppableId });
  };

  // Handle deal click
  const handleDealClick = (deal: Deal) => {
    setSelectedDeal(deal);
    setDetailSheetOpen(true);
  };

  // Handle close sale success
  const handleCloseSaleSuccess = () => {
    setCloseSaleDialogOpen(false);
    setPendingWonDrop(null);
  };

  // Handle close sale cancel
  const handleCloseSaleCancel = () => {
    setCloseSaleDialogOpen(false);
    setPendingWonDrop(null);
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <GitBranch className="h-8 w-8 text-secondary" />
          <h1 className="text-3xl font-bold text-primary">Pipeline de Vendas</h1>
        </div>

        <div className="flex items-center gap-3">
          {/* Pipeline Selector */}
          <Select
            value={activePipelineId}
            onValueChange={setSelectedPipelineId}
          >
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Selecione um pipeline..." />
            </SelectTrigger>
            <SelectContent>
              {pipelines?.map((pipeline) => (
                <SelectItem key={pipeline.id} value={pipeline.id}>
                  {pipeline.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* New Deal Button */}
          <Button
            onClick={() => setNewDealDialogOpen(true)}
            disabled={!activePipelineId || !firstStage}
            className="gap-2 bg-secondary hover:bg-secondary/90 text-secondary-foreground"
          >
            <Plus className="h-4 w-4" />
            Novo Negócio
          </Button>
        </div>
      </div>

      {/* Kanban Board */}
      <div className="flex-1 overflow-x-auto rounded-lg bg-[#F8FAFC] p-4">
        {loadingPipelines || loadingDeals ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="h-8 w-8 animate-spin text-secondary" />
          </div>
        ) : !activePipelineId || columns.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <p className="text-muted-foreground">
              {!pipelines?.length
                ? "Nenhum pipeline encontrado. Crie um pipeline primeiro."
                : "Nenhum estágio configurado para este pipeline."}
            </p>
          </div>
        ) : (
          <DragDropContext onDragEnd={handleDragEnd}>
            <div className="flex gap-4 h-full">
              {columns.map((column) => (
                <KanbanColumn
                  key={column.stage.id}
                  column={column}
                  onDealClick={handleDealClick}
                />
              ))}
            </div>
          </DragDropContext>
        )}
      </div>

      {/* Deal Detail Sheet */}
      <DealDetailSheet
        deal={selectedDeal}
        open={detailSheetOpen}
        onOpenChange={setDetailSheetOpen}
      />

      {/* New Deal Dialog */}
      {activePipelineId && firstStage && (
        <NewDealDialog
          open={newDealDialogOpen}
          onOpenChange={setNewDealDialogOpen}
          pipelineId={activePipelineId}
          firstStageId={firstStage.id}
        />
      )}

      {/* Close Sale Dialog */}
      <CloseSaleDialog
        deal={pendingWonDrop?.deal || null}
        targetStageId={pendingWonDrop?.targetStageId || ""}
        open={closeSaleDialogOpen}
        onOpenChange={setCloseSaleDialogOpen}
        onCancel={handleCloseSaleCancel}
        onSuccess={handleCloseSaleSuccess}
      />
    </div>
  );
}
