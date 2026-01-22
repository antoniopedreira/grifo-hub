import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Plus, Trash2, Loader2, ListTodo, GripVertical } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { DragDropContext, Droppable, Draggable, DropResult } from "@hello-pangea/dnd";
import type { CrmQuarter, CrmChecklistTemplate } from "@/types/database";

type Quarter = CrmQuarter;

const quarters: { id: Quarter; label: string }[] = [
  { id: "Q1", label: "Q1: Onboarding" },
  { id: "Q2", label: "Q2: Execução" },
  { id: "Q3", label: "Q3: Consolidação" },
  { id: "Q4", label: "Q4: Validação" },
];

export function CrmSettings() {
  const queryClient = useQueryClient();
  const [newItems, setNewItems] = useState<Record<string, string>>({
    Q1: "",
    Q2: "",
    Q3: "",
    Q4: "",
  });

  // Busca os templates atuais
  const { data: templates, isLoading } = useQuery({
    queryKey: ["crm-checklist-templates"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("crm_checklist_templates")
        .select("*")
        .order("order_index", { ascending: true });

      if (error) throw error;
      return data as CrmChecklistTemplate[];
    },
  });

  // Adiciona novo item ao template
  const addItem = useMutation({
    mutationFn: async ({ quarter, title }: { quarter: Quarter; title: string }) => {
      // Get max order_index for this quarter
      const existingItems = templates?.filter(t => t.quarter === quarter) || [];
      const maxIndex = existingItems.reduce((max, item) => Math.max(max, item.order_index || 0), -1);
      
      const { error } = await supabase.from("crm_checklist_templates").insert({ 
        quarter, 
        title, 
        order_index: maxIndex + 1 
      });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["crm-checklist-templates"] });
      toast.success("Item adicionado ao modelo!");
      setNewItems({ Q1: "", Q2: "", Q3: "", Q4: "" }); // Limpa inputs
    },
    onError: (error: Error) => toast.error(error.message),
  });

  // Remove item do template
  const deleteItem = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("crm_checklist_templates").delete().eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["crm-checklist-templates"] });
      toast.success("Item removido!");
    },
    onError: (error: Error) => toast.error(error.message),
  });

  // Reordenar itens
  const reorderItems = useMutation({
    mutationFn: async (updates: { id: string; order_index: number }[]) => {
      const promises = updates.map(({ id, order_index }) =>
        supabase.from("crm_checklist_templates").update({ order_index }).eq("id", id)
      );
      await Promise.all(promises);
    },
    onError: (error: Error) => {
      toast.error("Erro ao reordenar: " + error.message);
      queryClient.invalidateQueries({ queryKey: ["crm-checklist-templates"] });
    },
  });

  const handleDragEnd = (result: DropResult) => {
    if (!result.destination || !templates) return;

    const quarterId = result.source.droppableId as Quarter;
    const quarterItems = templates.filter(t => t.quarter === quarterId);
    
    // Reorder the items array
    const reorderedItems = Array.from(quarterItems);
    const [movedItem] = reorderedItems.splice(result.source.index, 1);
    reorderedItems.splice(result.destination.index, 0, movedItem);

    // Create updates with new order_index values
    const updates = reorderedItems.map((item, index) => ({
      id: item.id,
      order_index: index,
    }));

    // Optimistic update
    const newTemplates = templates.map(t => {
      const update = updates.find(u => u.id === t.id);
      if (update) {
        return { ...t, order_index: update.order_index };
      }
      return t;
    });

    queryClient.setQueryData(["crm-checklist-templates"], newTemplates);
    reorderItems.mutate(updates);
  };

  const handleAddItem = (quarter: Quarter) => {
    if (!newItems[quarter]?.trim()) return;
    addItem.mutate({ quarter, title: newItems[quarter] });
  };

  if (isLoading) {
    return (
      <div className="flex justify-center p-8">
        <Loader2 className="animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2">
        <h2 className="text-xl font-bold flex items-center gap-2">
          <ListTodo className="h-6 w-6 text-primary" />
          Checklists do CRM
        </h2>
        <p className="text-muted-foreground text-sm">
          Defina os itens padrão que serão criados automaticamente para cada novo cliente em cada fase.
        </p>
      </div>

      <DragDropContext onDragEnd={handleDragEnd}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {quarters.map((q) => {
            const items = (templates?.filter((t) => t.quarter === q.id) || [])
              .sort((a, b) => (a.order_index || 0) - (b.order_index || 0));

            return (
              <Card key={q.id} className="border-l-4 border-l-primary/20">
                <CardHeader className="pb-3">
                  <div className="flex justify-between items-center">
                    <CardTitle className="text-base font-bold">{q.label}</CardTitle>
                    <Badge variant="secondary">{items.length} itens</Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Lista de Itens Existentes com Scroll */}
                  <ScrollArea className="h-[280px] pr-3">
                    <Droppable droppableId={q.id}>
                      {(provided) => (
                        <div
                          ref={provided.innerRef}
                          {...provided.droppableProps}
                          className="space-y-2 min-h-[40px]"
                        >
                          {items.map((item, index) => (
                            <Draggable key={item.id} draggableId={item.id} index={index}>
                              {(provided, snapshot) => (
                                <div
                                  ref={provided.innerRef}
                                  {...provided.draggableProps}
                                  className={`flex items-center justify-between group bg-muted/30 p-2 rounded-md border border-transparent hover:border-border hover:bg-muted/50 transition-colors ${
                                    snapshot.isDragging ? "shadow-lg border-primary/50 bg-card" : ""
                                  }`}
                                >
                                  <div className="flex items-center gap-2 flex-1 min-w-0">
                                    <div
                                      {...provided.dragHandleProps}
                                      className="cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground"
                                    >
                                      <GripVertical className="h-4 w-4" />
                                    </div>
                                    <span className="text-sm truncate">{item.title}</span>
                                  </div>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-6 w-6 opacity-0 group-hover:opacity-100 text-destructive hover:text-destructive hover:bg-destructive/10 flex-shrink-0"
                                    onClick={() => deleteItem.mutate(item.id)}
                                  >
                                    <Trash2 className="h-3 w-3" />
                                  </Button>
                                </div>
                              )}
                            </Draggable>
                          ))}
                          {provided.placeholder}
                          {items.length === 0 && (
                            <p className="text-xs text-muted-foreground italic text-center py-2">Nenhum item configurado.</p>
                          )}
                        </div>
                      )}
                    </Droppable>
                  </ScrollArea>

                  {/* Input para adicionar novo */}
                  <div className="flex gap-2 pt-2 border-t">
                    <Input
                      placeholder="Novo item..."
                      className="h-8 text-sm"
                      value={newItems[q.id]}
                      onChange={(e) => setNewItems((prev) => ({ ...prev, [q.id]: e.target.value }))}
                      onKeyDown={(e) => e.key === "Enter" && handleAddItem(q.id)}
                    />
                    <Button
                      size="sm"
                      className="h-8 w-8 p-0"
                      onClick={() => handleAddItem(q.id)}
                      disabled={addItem.isPending}
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </DragDropContext>
    </div>
  );
}
