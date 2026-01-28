import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { DragDropContext, DropResult } from "@hello-pangea/dnd";
import { Plus, Search, GitBranch, AlertCircle, MoreHorizontal, Trash2, Filter, DollarSign } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { KanbanColumn } from "@/components/pipeline/KanbanColumn";
import { NewDealDialog } from "@/components/pipeline/NewDealDialog";
import { ScheduleMeetingDialog } from "@/components/pipeline/ScheduleMeetingDialog";
import { ScheduleFollowupDialog } from "@/components/pipeline/ScheduleFollowupDialog";
import { CloseSaleDialog } from "@/components/pipeline/CloseSaleDialog";
import { NegotiationDialog } from "@/components/pipeline/NegotiationDialog";
import { LostDealDialog } from "@/components/pipeline/LostDealDialog";
import { DealDetailSheet } from "@/components/pipeline/DealDetailSheet";
import { toast } from "sonner";
import type { Deal, Pipeline as PipelineType, PipelineStage } from "@/components/pipeline/types";
import { Card, CardContent } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export default function Pipeline() {
  const queryClient = useQueryClient();
  const [selectedPipelineId, setSelectedPipelineId] = useState<string>("");
  const [isNewDealOpen, setIsNewDealOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  // Filtro inicia com -1 para representar "Todos" (qualquer valor >= -1)
  const [minRevenueFilter, setMinRevenueFilter] = useState<string>("-1");

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
  const [negotiationDialog, setNegotiationDialog] = useState<{
    open: boolean;
    deal: Deal | null;
    targetStageId: string | null;
  }>({
    open: false,
    deal: null,
    targetStageId: null,
  });
  const [lostDialog, setLostDialog] = useState<{ open: boolean; deal: Deal | null; targetStageId: string | null }>({
    open: false,
    deal: null,
    targetStageId: null,
  });
  const [followupDialog, setFollowupDialog] = useState<{
    open: boolean;
    deal: Deal | null;
    targetStageId: string | null;
  }>({
    open: false,
    deal: null,
    targetStageId: null,
  });
  const [detailSheet, setDetailSheet] = useState<{ open: boolean; deal: Deal | null }>({
    open: false,
    deal: null,
  });
  const [deleteAllDealsDialogOpen, setDeleteAllDealsDialogOpen] = useState(false);

  // 1. Busca Pipelines
  const { data: pipelines = [], isLoading: isLoadingPipelines } = useQuery({
    queryKey: ["pipelines"],
    queryFn: async () => {
      const { data, error } = await supabase.from("pipelines").select("*").eq("archived", false).order("name");
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

  // 3. Busca Deals com o campo company_revenue
  const { data: deals = [] } = useQuery({
    queryKey: ["deals", selectedPipelineId],
    queryFn: async () => {
      if (!selectedPipelineId) return [];

      const { data, error } = await supabase
        .from("deals")
        .select(
          `
          *,
          lead:leads(id, full_name, email, phone, ltv, company_revenue),
          product:products(id, name, price),
          meeting_owner:team_members(id, name)
        `,
        )
        .order("order_index");

      if (error) throw error;

      const validStageIds = stages.map((s) => s.id);
      const filteredDeals = (data as any[]).filter((d) => validStageIds.includes(d.stage_id));

      return filteredDeals as Deal[];
    },
    enabled: !!selectedPipelineId && stages.length > 0,
  });

  // Mutation para mover o card
  const moveDealMutation = useMutation({
    mutationFn: async ({
      updates,
      clearLossReason,
      dealId,
    }: {
      updates: Array<{ id: string; stage_id: string; order_index: number }>;
      clearLossReason?: boolean;
      dealId?: string;
    }) => {
      await Promise.all(
        updates.map((update) => {
          const updateData: { stage_id: string; order_index: number; loss_reason?: null } = {
            stage_id: update.stage_id,
            order_index: update.order_index,
          };
          if (clearLossReason && update.id === dealId) {
            updateData.loss_reason = null;
          }
          return supabase.from("deals").update(updateData).eq("id", update.id);
        }),
      );
    },
    onMutate: async ({ updates }) => {
      await queryClient.cancelQueries({ queryKey: ["deals", selectedPipelineId] });
      const previousDeals = queryClient.getQueryData<Deal[]>(["deals", selectedPipelineId]);
      queryClient.setQueryData<Deal[]>(["deals", selectedPipelineId], (oldDeals) => {
        if (!oldDeals) return oldDeals;
        return oldDeals.map((deal) => {
          const update = updates.find((u) => u.id === deal.id);
          if (update) {
            return { ...deal, stage_id: update.stage_id, order_index: update.order_index };
          }
          return deal;
        });
      });
      return { previousDeals };
    },
    onError: (_error, _variables, context) => {
      if (context?.previousDeals) {
        queryClient.setQueryData(["deals", selectedPipelineId], context.previousDeals);
      }
      toast.error("Erro ao mover card");
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["deals", selectedPipelineId] });
    },
  });

  // Mutation para excluir todos os deals
  const deleteAllDealsMutation = useMutation({
    mutationFn: async () => {
      if (!selectedPipelineId || stages.length === 0) return;
      const stageIds = stages.map((s) => s.id);
      const { error } = await supabase.from("deals").delete().in("stage_id", stageIds);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["deals", selectedPipelineId] });
      toast.success("Todos os negócios foram excluídos");
      setDeleteAllDealsDialogOpen(false);
    },
    onError: () => {
      toast.error("Erro ao excluir negócios");
    },
  });

  const handleDragEnd = (result: DropResult) => {
    const { destination, source, draggableId } = result;
    if (!destination) return;
    if (destination.droppableId === source.droppableId && destination.index === source.index) return;

    const deal = deals.find((d) => d.id === draggableId);
    if (!deal) return;

    const targetStageId = destination.droppableId;
    const targetStage = stages.find((s) => s.id === targetStageId);
    const targetStageIndex = stages.findIndex((s) => s.id === targetStageId);
    const isFirstStage = targetStageIndex === 0;

    // Lógicas de Interceptação (Agendamento, Negociação, etc.)
    if (targetStage?.type === "meeting" && source.droppableId !== targetStageId) {
      setMeetingDialog({ open: true, deal, targetStageId });
      return;
    }
    if (targetStage?.type === "negotiation" && source.droppableId !== targetStageId) {
      setNegotiationDialog({ open: true, deal, targetStageId });
      return;
    }
    if (targetStage?.type === "won" && source.droppableId !== targetStageId) {
      setCloseDialog({ open: true, deal, targetStageId });
      return;
    }
    if (targetStage?.type === "lost" && source.droppableId !== targetStageId) {
      setLostDialog({ open: true, deal, targetStageId });
      return;
    }
    if (targetStage?.type === "followup" && source.droppableId !== targetStageId) {
      setFollowupDialog({ open: true, deal, targetStageId });
      return;
    }

    const sourceStage = stages.find((s) => s.id === source.droppableId);
    const isLeavingLostStage = sourceStage?.type === "lost" && targetStage?.type !== "lost";

    if (isFirstStage && source.droppableId !== targetStageId) {
      moveDealMutation.mutate({
        updates: [{ id: draggableId, stage_id: targetStageId, order_index: 0 }],
        clearLossReason: isLeavingLostStage,
        dealId: draggableId,
      });
      return;
    }

    const targetStageDeals = deals
      .filter((d) => d.stage_id === targetStageId && d.id !== draggableId)
      .sort((a, b) => (b.order_index || 0) - (a.order_index || 0));

    const newOrderedDeals = [...targetStageDeals];
    newOrderedDeals.splice(destination.index, 0, deal);

    const updates = newOrderedDeals.map((d, idx) => ({
      id: d.id,
      stage_id: targetStageId,
      order_index: newOrderedDeals.length - idx,
    }));

    moveDealMutation.mutate({
      updates,
      clearLossReason: isLeavingLostStage,
      dealId: draggableId,
    });
  };

  const handleMeetingSuccess = () => {
    if (meetingDialog.deal && meetingDialog.targetStageId) {
      moveDealMutation.mutate({
        updates: [{ id: meetingDialog.deal.id, stage_id: meetingDialog.targetStageId, order_index: 0 }],
        dealId: meetingDialog.deal.id,
      });
    }
    setMeetingDialog({ open: false, deal: null, targetStageId: null });
  };

  const handleCloseSuccess = () => {
    if (closeDialog.deal && closeDialog.targetStageId) {
      moveDealMutation.mutate({
        updates: [{ id: closeDialog.deal.id, stage_id: closeDialog.targetStageId, order_index: 0 }],
        dealId: closeDialog.deal.id,
      });
    }
    setCloseDialog({ open: false, deal: null, targetStageId: null });
  };

  const handleNegotiationSuccess = () => {
    setNegotiationDialog({ open: false, deal: null, targetStageId: null });
  };

  const handleLostSuccess = () => {
    setLostDialog({ open: false, deal: null, targetStageId: null });
  };

  const handleFollowupSuccess = () => {
    if (followupDialog.deal && followupDialog.targetStageId) {
      moveDealMutation.mutate({
        updates: [{ id: followupDialog.deal.id, stage_id: followupDialog.targetStageId, order_index: 0 }],
        dealId: followupDialog.deal.id,
      });
    }
    setFollowupDialog({ open: false, deal: null, targetStageId: null });
  };

  // --- LÓGICA DE FILTRAGEM ATUALIZADA ---
  const filteredDeals = deals.filter((deal) => {
    const leadName = deal.lead?.full_name?.toLowerCase() || "";
    const productName = deal.product?.name?.toLowerCase() || "";
    const leadPhone = deal.lead?.phone?.replace(/\D/g, "") || "";
    const search = searchTerm.toLowerCase().replace(/\D/g, "");
    const searchRaw = searchTerm.toLowerCase();

    // Filtro de Texto
    const isPhoneSearch = /^\d+$/.test(search) && search.length >= 2;
    const matchesPhone = isPhoneSearch && leadPhone.endsWith(search);
    const matchesSearch = leadName.includes(searchRaw) || productName.includes(searchRaw) || matchesPhone;

    // Filtro de Faturamento (Lógica >=)
    // Se o deal não tem company_revenue, assumimos 0 para fins de comparação
    const dealRevenue = deal.lead?.company_revenue ?? 0;
    const minRevenue = Number(minRevenueFilter);
    const matchesRevenue = dealRevenue >= minRevenue;

    return matchesSearch && matchesRevenue;
  });

  const selectedPipeline = pipelines.find((p) => p.id === selectedPipelineId);

  return (
    <div className="h-[calc(100vh-2rem)] flex flex-col p-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <GitBranch className="h-7 w-7 text-secondary" />
          <h1 className="text-2xl font-bold tracking-tight text-primary">Pipeline de Vendas</h1>
        </div>

        <div className="flex items-center gap-3">
          <Select value={selectedPipelineId} onValueChange={setSelectedPipelineId}>
            <SelectTrigger className="w-[180px] bg-card text-foreground">
              <SelectValue placeholder="Selecionar pipeline" />
            </SelectTrigger>
            <SelectContent className="min-w-[--radix-select-trigger-width] bg-card">
              {pipelines.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button
            onClick={() => setIsNewDealOpen(true)}
            disabled={!selectedPipelineId}
            className="bg-secondary hover:bg-secondary/90 text-secondary-foreground gap-2"
          >
            <Plus className="h-4 w-4" />
            Novo Negócio
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-9 w-9">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                onClick={() => setDeleteAllDealsDialogOpen(true)}
                disabled={!selectedPipelineId || deals.length === 0}
                className="text-destructive focus:text-destructive"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Excluir todos os negócios
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Empty State - No pipelines */}
      {!isLoadingPipelines && pipelines.length === 0 && (
        <Card className="flex-1">
          <CardContent className="flex flex-col items-center justify-center h-full py-20">
            <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
              <GitBranch className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold text-primary mb-2">Nenhum pipeline encontrado</h3>
            <p className="text-muted-foreground text-center max-w-md mb-4">
              Crie seu primeiro pipeline de vendas em Configurações → Pipelines.
            </p>
            <Button variant="outline" onClick={() => (window.location.href = "/configuracoes")}>
              Ir para Configurações
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Empty State - No pipeline selected */}
      {!isLoadingPipelines && pipelines.length > 0 && !selectedPipelineId && (
        <Card className="flex-1">
          <CardContent className="flex flex-col items-center justify-center h-full py-20">
            <div className="w-16 h-16 rounded-full bg-amber-50 flex items-center justify-center mb-4 animate-pulse">
              <AlertCircle className="h-8 w-8 text-secondary" />
            </div>
            <h3 className="text-lg font-semibold text-primary mb-2">Selecione um pipeline</h3>
            <p className="text-muted-foreground text-center max-w-md">
              Escolha um pipeline no seletor acima para visualizar.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Kanban Board */}
      {selectedPipelineId && stages.length > 0 && (
        <>
          {/* Barra de Filtros */}
          <div className="mb-4 flex flex-col md:flex-row gap-4">
            {/* Busca Textual */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por lead, produto ou telefone..."
                className="pl-9 bg-card text-foreground w-full"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            {/* Filtro de Faturamento (UI/UX Melhorada) */}
            <Select value={minRevenueFilter} onValueChange={setMinRevenueFilter}>
              <SelectTrigger className="w-full md:w-[240px] bg-card text-foreground border-input">
                <div className="flex items-center gap-2 text-sm">
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                  <span>{minRevenueFilter === "-1" ? "Faturamento: Todos" : "Faturamento Mínimo"}</span>
                </div>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="-1">
                  <span className="font-medium">Todos os Faturamentos</span>
                </SelectItem>
                <SelectItem value="0">
                  Acima de <span className="font-bold">R$ 0</span> (Todos c/ Receita)
                </SelectItem>
                <SelectItem value="500000">
                  Acima de <span className="font-bold">R$ 500k</span>
                </SelectItem>
                <SelectItem value="1000000">
                  Acima de <span className="font-bold">R$ 1 Milhão</span>
                </SelectItem>
                <SelectItem value="5000000">
                  Acima de <span className="font-bold">R$ 5 Milhões</span>
                </SelectItem>
                <SelectItem value="10000000">
                  Acima de <span className="font-bold">R$ 10 Milhões</span>
                </SelectItem>
                <SelectItem value="50000000">
                  Acima de <span className="font-bold">R$ 50 Milhões</span>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <DragDropContext onDragEnd={handleDragEnd}>
            <div className="flex-1 overflow-x-auto pb-4">
              <div className="flex gap-4 h-full">
                {stages.map((stage, stageIndex) => {
                  const isFirstStage = stageIndex === 0;
                  const stageDeals = filteredDeals
                    .filter((d) => d.stage_id === stage.id)
                    .sort((a, b) =>
                      isFirstStage
                        ? new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
                        : (b.order_index || 0) - (a.order_index || 0),
                    );

                  return (
                    <KanbanColumn
                      key={stage.id}
                      stage={stage}
                      deals={stageDeals}
                      totalValue={stageDeals.reduce((acc, curr) => acc + Number(curr.value), 0)}
                      onDealClick={(deal) => setDetailSheet({ open: true, deal })}
                    />
                  );
                })}
              </div>
            </div>
          </DragDropContext>
        </>
      )}

      {selectedPipelineId && stages.length === 0 && (
        <Card className="flex-1">
          <CardContent className="flex flex-col items-center justify-center h-full py-20">
            <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
              <GitBranch className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold text-primary mb-2">Pipeline sem etapas</h3>
            <p className="text-muted-foreground text-center max-w-md mb-4">Configure as etapas em Configurações.</p>
            <Button variant="outline" onClick={() => (window.location.href = "/configuracoes")}>
              Configurar Etapas
            </Button>
          </CardContent>
        </Card>
      )}

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
          leadName={meetingDialog.deal.lead?.full_name || undefined}
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

      {negotiationDialog.deal && (
        <NegotiationDialog
          open={negotiationDialog.open}
          onOpenChange={(open) => !open && setNegotiationDialog((prev) => ({ ...prev, open: false }))}
          deal={negotiationDialog.deal}
          targetStageId={negotiationDialog.targetStageId}
          onCancel={() => setNegotiationDialog((prev) => ({ ...prev, open: false }))}
          onSuccess={handleNegotiationSuccess}
        />
      )}

      {lostDialog.deal && (
        <LostDealDialog
          open={lostDialog.open}
          onOpenChange={(open) => !open && setLostDialog((prev) => ({ ...prev, open: false }))}
          deal={lostDialog.deal}
          targetStageId={lostDialog.targetStageId}
          onCancel={() => setLostDialog((prev) => ({ ...prev, open: false }))}
          onSuccess={handleLostSuccess}
        />
      )}

      {followupDialog.deal && (
        <ScheduleFollowupDialog
          open={followupDialog.open}
          onOpenChange={(open) => !open && setFollowupDialog((prev) => ({ ...prev, open: false }))}
          dealId={followupDialog.deal.id}
          dealTitle={followupDialog.deal.title}
          leadName={followupDialog.deal.lead?.full_name || undefined}
          currentDate={null}
          onSuccess={handleFollowupSuccess}
        />
      )}

      <DealDetailSheet
        deal={detailSheet.deal}
        open={detailSheet.open}
        onOpenChange={(open) => setDetailSheet((prev) => ({ ...prev, open }))}
      />

      <AlertDialog open={deleteAllDealsDialogOpen} onOpenChange={setDeleteAllDealsDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir todos os negócios?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação irá remover permanentemente {deals.length} negócio(s).
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteAllDealsMutation.mutate()}
              className="bg-destructive hover:bg-destructive/90"
            >
              Excluir Todos
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
