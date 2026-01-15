import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Deal } from "./types";

interface CloseSaleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  deal: Deal;
  targetStageId?: string | null; // Adicionado
  onSuccess: () => void;
  onCancel?: () => void; // Adicionado
}

export function CloseSaleDialog({
  open,
  onOpenChange,
  deal,
  targetStageId,
  onSuccess,
  onCancel,
}: CloseSaleDialogProps) {
  const [value, setValue] = useState(deal.value?.toString() || "0");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSave = async () => {
    setLoading(true);
    try {
      // 1. Atualiza o Deal (Valor e Status)
      const { error } = await supabase
        .from("deals")
        .update({
          value: parseFloat(value),
          status: "won",
          // Se tiver targetStageId (veio do drag and drop), atualiza o stage
          ...(targetStageId ? { stage_id: targetStageId } : {}),
        })
        .eq("id", deal.id);

      if (error) throw error;

      // 2. Cria a Venda na Tabela de Vendas (Opcional, se tiver tabela sales)
      // ... (Lógica existente de criar venda)

      toast.success("Venda registrada com sucesso! 🚀");
      onSuccess();
      onOpenChange(false);
    } catch (error) {
      console.error(error);
      toast.error("Erro ao fechar venda");
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    if (onCancel) onCancel();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Fechar Venda</DialogTitle>
          <DialogDescription>Parabéns! Confirme os detalhes finais para registrar a vitória.</DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label>Valor Final (R$)</Label>
            <Input type="number" value={value} onChange={(e) => setValue(e.target.value)} />
          </div>
          <div className="grid gap-2">
            <Label>Observações (Opcional)</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Algum detalhe importante sobre o fechamento?"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleCancel}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={loading} className="bg-green-600 hover:bg-green-700">
            {loading ? "Registrando..." : "Confirmar Venda! 🏆"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
