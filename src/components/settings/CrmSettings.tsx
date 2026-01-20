import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Plus, Trash2, Loader2, ListTodo } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
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
        .order("created_at", { ascending: true });

      if (error) throw error;
      return data as CrmChecklistTemplate[];
    },
  });

  // Adiciona novo item ao template
  const addItem = useMutation({
    mutationFn: async ({ quarter, title }: { quarter: Quarter; title: string }) => {
      const { error } = await supabase.from("crm_checklist_templates").insert({ quarter, title, order_index: 0 });

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

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {quarters.map((q) => {
          const items = templates?.filter((t) => t.quarter === q.id) || [];

          return (
            <Card key={q.id} className="border-l-4 border-l-primary/20">
              <CardHeader className="pb-3">
                <div className="flex justify-between items-center">
                  <CardTitle className="text-base font-bold">{q.label}</CardTitle>
                  <Badge variant="secondary">{items.length} itens</Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Lista de Itens Existentes */}
                <div className="space-y-2">
                  {items.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between group bg-muted/30 p-2 rounded-md border border-transparent hover:border-border hover:bg-muted/50 transition-all"
                    >
                      <span className="text-sm">{item.title}</span>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 opacity-0 group-hover:opacity-100 text-destructive hover:text-destructive hover:bg-destructive/10"
                        onClick={() => deleteItem.mutate(item.id)}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                  {items.length === 0 && (
                    <p className="text-xs text-muted-foreground italic text-center py-2">Nenhum item configurado.</p>
                  )}
                </div>

                {/* Input para adicionar novo */}
                <div className="flex gap-2 mt-4 pt-2 border-t">
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
    </div>
  );
}
