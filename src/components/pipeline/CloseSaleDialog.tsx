import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Trophy } from "lucide-react";
import { PaymentForm, PaymentData } from "./PaymentForm";
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
  const [selectedProductId, setSelectedProductId] = useState<string | null>(deal.product_id || null);
  const [paymentData, setPaymentData] = useState<PaymentData | null>(null);
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);

  // Fetch active products
  const { data: products = [] } = useQuery({
    queryKey: ["products-active"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("id, name, price")
        .eq("active", true)
        .order("name");
      if (error) throw error;
      return data;
    },
    enabled: open,
  });

  // Reset state when dialog opens with new deal
  useEffect(() => {
    if (open) {
      setSelectedProductId(deal.product_id || null);
      setNotes("");
    }
  }, [open, deal]);

  // Get initial value from product or deal
  const getInitialValue = () => {
    if (selectedProductId && products.length > 0) {
      const selectedProduct = products.find((p) => p.id === selectedProductId);
      return selectedProduct?.price || deal.value || 0;
    }
    return deal.value || 0;
  };

  const handleSave = async () => {
    if (!paymentData) return;

    setLoading(true);
    const finalAmount = paymentData.value;
    const selectedProduct = products.find((p) => p.id === selectedProductId);

    try {
      // 1. Atualiza o Deal (Valor, Produto, Pagamento e Status para "won")
      const { error: dealError } = await supabase
        .from("deals")
        .update({
          value: finalAmount,
          status: "won",
          product_id: selectedProductId,
          payment_method: paymentData.paymentMethod,
          payment_date: paymentData.paymentDate.toISOString().split("T")[0],
          installments: paymentData.isSplitPayment
            ? paymentData.cardInstallments
            : paymentData.installments,
          cash_value: paymentData.cashValue,
          ...(targetStageId ? { stage_id: targetStageId } : {}),
        })
        .eq("id", deal.id);

      if (dealError) throw dealError;

      // 2. Cria o registro de Venda na tabela Sales
      const productId = selectedProductId || null;
      const productName = selectedProduct?.name || deal.product?.name || "Venda Consultiva";
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
        console.error("Erro ao criar registro de venda:", saleError);
        toast.error(
          "Negócio marcado como ganho, mas houve erro ao registrar a venda. Verifique o histórico financeiro.",
          { duration: 6000 }
        );
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
      <DialogContent className="sm:max-w-[520px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5 text-green-600" />
            Fechar Venda
          </DialogTitle>
          <DialogDescription>
            Parabéns! 🎉 Confirme os detalhes finais para registrar a vitória.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Produto */}
          <div className="space-y-2">
            <Label>Produto da Venda</Label>
            <Select
              value={selectedProductId || "none"}
              onValueChange={(val) => setSelectedProductId(val === "none" ? null : val)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione o produto" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Sem produto específico</SelectItem>
                {products.map((product) => (
                  <SelectItem key={product.id} value={product.id}>
                    {product.name} -{" "}
                    {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(
                      product.price || 0
                    )}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Payment Form */}
          {open && (
            <PaymentForm
              key={selectedProductId || "default"}
              initialValue={getInitialValue()}
              initialPaymentMethod={(deal as any)?.payment_method || ""}
              initialInstallments={(deal as any)?.installments}
              initialCashValue={(deal as any)?.cash_value}
              onChange={setPaymentData}
            />
          )}

          {/* Observações */}
          <div className="space-y-2">
            <Label>Observações (Opcional)</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Algum detalhe importante sobre o fechamento?"
              rows={2}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleCancel}>
            Cancelar
          </Button>
          <Button
            onClick={handleSave}
            disabled={loading || !paymentData?.value}
            className="bg-green-600 hover:bg-green-700"
          >
            {loading ? "Registrando..." : "Confirmar Venda! 🏆"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
