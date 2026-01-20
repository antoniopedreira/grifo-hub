import { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DollarSign, CreditCard, Handshake } from "lucide-react";
import type { Deal } from "./types";

interface NegotiationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  deal: Deal | null;
  targetStageId: string | null;
  onSuccess: () => void;
  onCancel?: () => void;
}

const paymentMethods = [
  { value: "pix", label: "PIX" },
  { value: "cartao_credito", label: "Cartão de Crédito" },
  { value: "cartao_debito", label: "Cartão de Débito" },
  { value: "boleto", label: "Boleto Bancário" },
  { value: "transferencia", label: "Transferência Bancária" },
  { value: "dinheiro", label: "Dinheiro" },
  { value: "parcelado", label: "Parcelado" },
  { value: "outro", label: "Outro" },
];

export function NegotiationDialog({
  open,
  onOpenChange,
  deal,
  targetStageId,
  onSuccess,
  onCancel,
}: NegotiationDialogProps) {
  const queryClient = useQueryClient();
  const [proposalValue, setProposalValue] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  // Reset form quando o modal abre
  useEffect(() => {
    if (open && deal) {
      // Se o deal já tem valor, pré-preenche
      setProposalValue(deal.value?.toString() || deal.product?.price?.toString() || "");
      setPaymentMethod((deal as any).payment_method || "");
    }
  }, [open, deal]);

  const handleSave = async () => {
    if (!deal || !targetStageId) return;

    const value = parseFloat(proposalValue);
    if (isNaN(value) || value <= 0) {
      toast.error("Informe um valor válido para a proposta");
      return;
    }

    if (!paymentMethod) {
      toast.error("Selecione o meio de pagamento");
      return;
    }

    setIsSaving(true);

    try {
      const { error } = await supabase
        .from("deals")
        .update({
          value: value,
          payment_method: paymentMethod,
          stage_id: targetStageId,
        })
        .eq("id", deal.id);

      if (error) throw error;

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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Handshake className="h-5 w-5 text-secondary" />
            Em Negociação
          </DialogTitle>
          <DialogDescription>
            Defina o valor da proposta e o meio de pagamento para {leadName}
            {productName && ` - ${productName}`}.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Valor da Proposta */}
          <div className="space-y-2">
            <Label htmlFor="proposal-value" className="flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-muted-foreground" />
              Valor da Proposta (R$)
            </Label>
            <Input
              id="proposal-value"
              type="number"
              placeholder="0,00"
              value={proposalValue}
              onChange={(e) => setProposalValue(e.target.value)}
              className="text-lg font-semibold"
              step="0.01"
              min="0"
            />
          </div>

          {/* Meio de Pagamento */}
          <div className="space-y-2">
            <Label htmlFor="payment-method" className="flex items-center gap-2">
              <CreditCard className="h-4 w-4 text-muted-foreground" />
              Meio de Pagamento
            </Label>
            <Select value={paymentMethod} onValueChange={setPaymentMethod}>
              <SelectTrigger id="payment-method">
                <SelectValue placeholder="Selecione o meio de pagamento" />
              </SelectTrigger>
              <SelectContent>
                {paymentMethods.map((method) => (
                  <SelectItem key={method.value} value={method.value}>
                    {method.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleCancel}>
            Cancelar
          </Button>
          <Button 
            onClick={handleSave} 
            disabled={isSaving || !proposalValue || !paymentMethod}
            className="bg-secondary hover:bg-secondary/90"
          >
            {isSaving ? "Salvando..." : "Confirmar Proposta"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
