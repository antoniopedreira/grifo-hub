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
  targetStageId?: string | null;
  onSuccess: () => void;
  onCancel?: () => void;
}

export function CloseSaleDialog({
  open,
  onOpenChange,
  deal,
  targetStageId,
  onSuccess,
  onCancel,
}: CloseSaleDialogProps) {
  const queryClient = useQueryClient();
  const [value, setValue] = useState(deal.value?.toString() || "0");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSave = async () => {
    setLoading(true);
    const finalAmount = parseFloat(value) || 0;
    
    try {
      // 1. Atualiza o Deal (Valor e Status para "won")
      const { error: dealError } = await supabase
        .from("deals")
        .update({
          value: finalAmount,
          status: "won",
          ...(targetStageId ? { stage_id: targetStageId } : {}),
        })
        .eq("id", deal.id);

      if (dealError) throw dealError;

      // 2. Cria o registro de Venda na tabela Sales (Ação B - Nova)
      const productId = deal.product_id || null;
      const productName = deal.product?.name || "Venda Consultiva";
      const transactionId = `deal-${deal.id}`;

      const { error: saleError } = await supabase
        .from("sales")
        .insert({
          lead_id: deal.lead_id || null,
          product_id: productId,
          amount: finalAmount,
          product_name: productName,
          transaction_id: transactionId,
          origin: "crm_manual" as const,
        });

      if (saleError) {
        // Se falhar ao criar a venda, avisa o usuário (mas o deal já foi atualizado)
        console.error("Erro ao criar registro de venda:", saleError);
        toast.error(
          "Negócio marcado como ganho, mas houve erro ao registrar a venda. Verifique o histórico financeiro.",
          { duration: 6000 }
        );
        // Ainda considera sucesso parcial para fechar o dialog
        queryClient.invalidateQueries({ queryKey: ["deals"] });
        queryClient.invalidateQueries({ queryKey: ["sales"] });
        onSuccess();
        onOpenChange(false);
        return;
      }

      // Sucesso completo
      queryClient.invalidateQueries({ queryKey: ["deals"] });
      queryClient.invalidateQueries({ queryKey: ["sales"] });
      queryClient.invalidateQueries({ queryKey: ["lead-sales"] });
      
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
            <Label>Valor Final Negociado (R$)</Label>
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