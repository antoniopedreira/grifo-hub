import { useState, useEffect } from "react";
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
import { Handshake } from "lucide-react";
import { PaymentForm, PaymentData } from "./PaymentForm";
import type { Deal } from "./types";

interface NegotiationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  deal: Deal | null;
  targetStageId: string | null;
  onSuccess: () => void;
  onCancel?: () => void;
}

export function NegotiationDialog({
  open,
  onOpenChange,
  deal,
  targetStageId,
  onSuccess,
  onCancel,
}: NegotiationDialogProps) {
  const queryClient = useQueryClient();
  const [paymentData, setPaymentData] = useState<PaymentData | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    if (!deal || !targetStageId || !paymentData) return;

    if (paymentData.value <= 0) {
      toast.error("Informe um valor válido para a proposta");
      return;
    }

    if (!paymentData.paymentMethod) {
      toast.error("Selecione o meio de pagamento");
      return;
    }

    setIsSaving(true);

    try {
      const { error } = await supabase
        .from("deals")
        .update({
          value: paymentData.value,
          payment_method: paymentData.paymentMethod,
          payment_date: paymentData.paymentDate.toISOString().split("T")[0],
          installments: paymentData.isSplitPayment 
            ? paymentData.cardInstallments 
            : paymentData.installments,
          cash_value: paymentData.cashValue,
          stage_id: targetStageId,
        })
        .eq("id", deal.id);

      if (error) throw error;

      // Registra nota automática no deal
      const formattedValue = new Intl.NumberFormat("pt-BR", { 
        style: "currency", 
        currency: "BRL" 
      }).format(paymentData.value);
      const paymentMethodLabel = paymentData.paymentMethod === "pix" ? "PIX" 
        : paymentData.paymentMethod === "boleto" ? "Boleto" 
        : paymentData.paymentMethod === "cartao" ? "Cartão"
        : paymentData.paymentMethod === "split" ? "Split"
        : paymentData.paymentMethod;
      const noteContent = `💰 Proposta enviada: ${formattedValue} via ${paymentMethodLabel}`;
      
      await supabase.from("deal_comments").insert({
        deal_id: deal.id,
        content: noteContent,
      });

      queryClient.invalidateQueries({ queryKey: ["deals"] });
      toast.success("Proposta registrada com sucesso!");
      onSuccess();
    } catch (error) {
      console.error("Erro ao salvar proposta:", error);
      toast.error("Erro ao registrar proposta");
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    onOpenChange(false);
    onCancel?.();
  };

  const leadName = deal?.lead?.full_name || "Cliente";
  const productName = deal?.product?.name;
  const initialValue = deal?.value || deal?.product?.price || 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Handshake className="h-5 w-5 text-secondary" />
            Em Negociação
          </DialogTitle>
          <DialogDescription>
            Defina os termos da proposta para {leadName}
            {productName && ` - ${productName}`}.
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          {open && (
            <PaymentForm
              initialValue={initialValue}
              initialPaymentMethod={(deal as any)?.payment_method || ""}
              initialInstallments={(deal as any)?.installments}
              initialCashValue={(deal as any)?.cash_value}
              onChange={setPaymentData}
            />
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleCancel}>
            Cancelar
          </Button>
          <Button
            onClick={handleSave}
            disabled={isSaving || !paymentData?.value || (!paymentData?.paymentMethod && !paymentData?.isSplitPayment)}
            className="bg-secondary hover:bg-secondary/90"
          >
            {isSaving ? "Salvando..." : "Confirmar Proposta"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
