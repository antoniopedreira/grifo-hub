import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { DollarSign, Calendar, Trophy } from "lucide-react";
import confetti from "canvas-confetti";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import type { Deal } from "./types";

interface CloseSaleDialogProps {
  deal: Deal | null;
  targetStageId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCancel: () => void;
  onSuccess: () => void;
}

export function CloseSaleDialog({
  deal,
  targetStageId,
  open,
  onOpenChange,
  onCancel,
  onSuccess,
}: CloseSaleDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [finalValue, setFinalValue] = useState("");
  const [saleDate, setSaleDate] = useState(
    new Date().toISOString().split("T")[0]
  );

  // Close sale mutation
  const closeSale = useMutation({
    mutationFn: async () => {
      if (!deal) throw new Error("Deal não encontrado");

      const amount = parseFloat(finalValue.replace(",", "."));
      if (isNaN(amount) || amount <= 0) {
        throw new Error("Valor inválido");
      }

      // Update deal status and stage
      const { error: dealError } = await supabase
        .from("deals")
        .update({
          status: "won",
          stage_id: targetStageId,
        })
        .eq("id", deal.id);

      if (dealError) throw dealError;

      // Insert sale record
      const { error: saleError } = await supabase.from("sales").insert({
        lead_id: deal.lead_id,
        product_name: deal.product?.name || null,
        amount,
        origin: "crm_manual",
        transaction_date: saleDate,
      });

      if (saleError) throw saleError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["deals"] });
      queryClient.invalidateQueries({ queryKey: ["sales"] });

      // Fire confetti! 🎉
      confetti({
        particleCount: 150,
        spread: 80,
        origin: { y: 0.6 },
        colors: ["#A47428", "#112232", "#E1D8CF"],
      });

      toast({
        title: "🎉 Venda Registrada!",
        description: "Parabéns pela conquista!",
      });

      setFinalValue("");
      setSaleDate(new Date().toISOString().split("T")[0]);
      onSuccess();
    },
    onError: (error) => {
      toast({
        title: "Erro ao registrar venda",
        description: error.message || "Não foi possível concluir a operação.",
        variant: "destructive",
      });
    },
  });

  const handleCancel = () => {
    setFinalValue("");
    setSaleDate(new Date().toISOString().split("T")[0]);
    onCancel();
  };

  // Pre-fill with deal value
  const handleOpenChange = (isOpen: boolean) => {
    if (isOpen && deal?.value) {
      setFinalValue(deal.value.toString().replace(".", ","));
    }
    onOpenChange(isOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-primary flex items-center gap-2">
            <Trophy className="h-5 w-5 text-secondary" />
            Fechar Venda
          </DialogTitle>
          <DialogDescription>
            Confirme os dados para registrar a venda de{" "}
            <strong>{deal?.lead?.full_name || "Lead"}</strong>.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Final Value */}
          <div className="space-y-2">
            <Label className="text-primary font-medium flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              Valor Final Negociado (R$)
            </Label>
            <Input
              type="text"
              placeholder="0,00"
              value={finalValue}
              onChange={(e) => setFinalValue(e.target.value)}
              className="text-lg font-semibold"
            />
          </div>

          {/* Sale Date */}
          <div className="space-y-2">
            <Label className="text-primary font-medium flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Data da Venda
            </Label>
            <Input
              type="date"
              value={saleDate}
              onChange={(e) => setSaleDate(e.target.value)}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleCancel}>
            Cancelar
          </Button>
          <Button
            onClick={() => closeSale.mutate()}
            disabled={!finalValue || closeSale.isPending}
            className="bg-green-600 hover:bg-green-700 text-white"
          >
            {closeSale.isPending ? "Registrando..." : "Confirmar Venda"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
