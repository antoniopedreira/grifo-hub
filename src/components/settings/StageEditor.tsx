import { GripVertical, Trash2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export interface Stage {
  id?: string;
  name: string;
  order_index: number;
  type?: "default" | "meeting" | "won" | "lost"; // Adicionado o tipo
}

interface StageEditorProps {
  stages: Stage[];
  onChange: (stages: Stage[]) => void;
}

export function StageEditor({ stages, onChange }: StageEditorProps) {
  const handleAddStage = () => {
    const newStage: Stage = {
      name: "",
      order_index: stages.length,
      type: "default",
    };
    onChange([...stages, newStage]);
  };

  const handleRemoveStage = (index: number) => {
    const newStages = stages.filter((_, i) => i !== index);
    onChange(newStages.map((s, i) => ({ ...s, order_index: i })));
  };

  const handleChange = (index: number, field: keyof Stage, value: any) => {
    const newStages = [...stages];
    newStages[index] = { ...newStages[index], [field]: value };
    onChange(newStages);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium">Etapas do Funil</h3>
        <Button type="button" variant="outline" size="sm" onClick={handleAddStage}>
          <Plus className="h-4 w-4 mr-2" />
          Adicionar Etapa
        </Button>
      </div>

      <div className="space-y-2">
        {stages.map((stage, index) => (
          <div key={index} className="flex items-center gap-2 p-2 bg-muted/40 rounded-md border group">
            <GripVertical className="h-4 w-4 text-muted-foreground cursor-move" />

            <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-2">
              <Input
                value={stage.name}
                onChange={(e) => handleChange(index, "name", e.target.value)}
                placeholder="Nome da etapa"
                className="h-8"
              />

              {/* Novo Seletor de Tipo */}
              <Select value={stage.type || "default"} onValueChange={(val) => handleChange(index, "type", val)}>
                <SelectTrigger className="h-8 bg-background">
                  <SelectValue placeholder="Tipo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="default">Padrão</SelectItem>
                  <SelectItem value="meeting">📅 Agendamento</SelectItem>
                  <SelectItem value="won">🏆 Ganho</SelectItem>
                  <SelectItem value="lost">❌ Perdido</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-muted-foreground hover:text-destructive"
              onClick={() => handleRemoveStage(index)}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        ))}
      </div>

      {stages.length === 0 && (
        <p className="text-sm text-muted-foreground text-center py-4 border border-dashed rounded-md">
          Nenhuma etapa definida.
        </p>
      )}
    </div>
  );
}
