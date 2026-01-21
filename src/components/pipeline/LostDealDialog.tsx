import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { XCircle } from "lucide-react";
import type { Deal } from "./types";

interface LostDealDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  deal: Deal | null;
  targetStageId: string | null;
  onSuccess: () => void;
  onCancel?: () => void;
}

const lossReasons = [
  { value: "preco", label: "Preço muito alto", emoji: "💰" },
  { value: "concorrente", label: "Escolheu concorrente", emoji: "🏃" },
  { value: "timing", label: "Timing inadequado", emoji: "⏰" },
  { value: "sem_budget", label: "Sem orçamento", emoji: "🚫" },
  { value: "sem_necessidade", label: "Sem necessidade no momento", emoji: "🤷" },
  { value: "sem_resposta", label: "Não respondeu / Sumiu", emoji: "👻" },
  { value: "desistiu", label: "Desistiu da compra", emoji: "🔙" },
  { value: "outro", label: "Outro motivo", emoji: "📝" },
];

export function LostDealDialog({
  open,
  onOpenChange,
  deal,
  targetStageId,
  onSuccess,
  onCancel,
}: LostDealDialogProps) {
  const queryClient = useQueryClient();
  const [selectedReason, setSelectedReason] = useState<string>("");
  const [customReason, setCustomReason] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    if (!deal || !targetStageId) return;

    if (!selectedReason) {
      toast.error("Selecione o motivo da perda");
      return;
    }

    const finalReason = selectedReason === "outro" 
      ? customReason || "Outro motivo"
      : lossReasons.find(r => r.value === selectedReason)?.label || selectedReason;

    setIsSaving(true);

    try {
      const { error } = await supabase
        .from("deals")
        .update({
          status: "lost",
          loss_reason: finalReason,
          stage_id: targetStageId,
        })
        .eq("id", deal.id);

      if (error) throw error;

      // Registra nota automática no deal
      const reasonEmoji = lossReasons.find(r => r.value === selectedReason)?.emoji || "❌";
      const noteContent = `${reasonEmoji} Negócio perdido: ${finalReason}`;
      
      await supabase.from("deal_comments").insert({
        deal_id: deal.id,
        content: noteContent,
      });

      queryClient.invalidateQueries({ queryKey: ["deals"] });
      toast.success("Negócio marcado como perdido");
      
      // Reset state
      setSelectedReason("");
      setCustomReason("");
      onSuccess();
    } catch (error) {
      console.error("Erro ao registrar perda:", error);
      toast.error("Erro ao registrar perda");
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setSelectedReason("");
    setCustomReason("");
    onOpenChange(false);
    onCancel?.();
  };

  const leadName = deal?.lead?.full_name || "Cliente";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <XCircle className="h-5 w-5 text-destructive" />
            Registrar Perda
          </DialogTitle>
          <DialogDescription>
            Por que o negócio com <strong>{leadName}</strong> não foi fechado?
            Isso nos ajuda a melhorar o processo de vendas.
          </DialogDescription>
        </DialogHeader>

        <div className="py-4 space-y-4">
          <Label className="text-sm font-medium">Motivo da Perda</Label>
          
          <RadioGroup
            value={selectedReason}
            onValueChange={setSelectedReason}
            className="grid grid-cols-2 gap-2"
          >
            {lossReasons.map((reason) => (
              <div key={reason.value}>
                <RadioGroupItem
                  value={reason.value}
                  id={reason.value}
                  className="peer sr-only"
                />
                <Label
                  htmlFor={reason.value}
                  className="flex items-center gap-2 rounded-lg border-2 border-muted bg-popover p-3 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-destructive peer-data-[state=checked]:bg-destructive/5 cursor-pointer transition-all text-sm"
                >
                  <span>{reason.emoji}</span>
                  <span>{reason.label}</span>
                </Label>
              </div>
            ))}
          </RadioGroup>

          {/* Campo de texto para "Outro" */}
          {selectedReason === "outro" && (
            <div className="space-y-2 animate-in fade-in slide-in-from-top-2 duration-200">
              <Label htmlFor="custom-reason">Descreva o motivo</Label>
              <Textarea
                id="custom-reason"
                value={customReason}
                onChange={(e) => setCustomReason(e.target.value)}
                placeholder="Detalhe o motivo da perda..."
                rows={3}
              />
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleCancel}>
            Cancelar
          </Button>
          <Button
            onClick={handleSave}
            disabled={isSaving || !selectedReason || (selectedReason === "outro" && !customReason.trim())}
            variant="destructive"
          >
            {isSaving ? "Salvando..." : "Confirmar Perda"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
