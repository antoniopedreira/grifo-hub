import { useState, useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { DollarSign, Calendar, Trophy, Package } from "lucide-react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  const [selectedProductId, setSelectedProductId] = useState<string>("");

  // Fetch products list
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
  });

  // Pre-select product when deal changes
  useEffect(() => {
    if (deal?.product_id) {
      setSelectedProductId(deal.product_id);
    } else {
      setSelectedProductId("");
    }
  }, [deal]);

  // Close sale mutation using convert_deal_to_sale function
  const closeSale = useMutation({
    mutationFn: async () => {
      if (!deal) throw new Error("Deal não encontrado");
      if (!selectedProductId) throw new Error("Selecione um produto");

      const amount = parseFloat(finalValue.replace(",", "."));
      if (isNaN(amount) || amount <= 0) {
        throw new Error("Valor inválido");
      }

      // Call the database function
      const { data, error } = await supabase.rpc("convert_deal_to_sale", {
        p_deal_id: deal.id,
        p_product_id: selectedProductId,
        p_amount: amount,
      });

      if (error) throw error;
      
      const result = data as { success: boolean; error?: string };
      if (!result.success) {
        throw new Error(result.error || "Erro ao converter deal");
      }

      return result;
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
      setSelectedProductId("");
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
    setSelectedProductId("");
    onCancel();
  };

  // Pre-fill with deal value
  const handleOpenChange = (isOpen: boolean) => {
    if (isOpen && deal) {
      if (deal.value) {
        setFinalValue(deal.value.toString().replace(".", ","));
      }
      if (deal.product_id) {
        setSelectedProductId(deal.product_id);
      }
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
          {/* Product Selection */}
          <div className="space-y-2">
            <Label className="text-primary font-medium flex items-center gap-2">
              <Package className="h-4 w-4" />
              Produto Vendido
            </Label>
            <Select
              value={selectedProductId}
              onValueChange={setSelectedProductId}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione o produto..." />
              </SelectTrigger>
              <SelectContent>
                {products.map((product) => (
                  <SelectItem key={product.id} value={product.id}>
                    {product.name}
                    {product.price && (
                      <span className="text-muted-foreground ml-2">
                        — R$ {Number(product.price).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                      </span>
                    )}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {deal?.product && (
              <p className="text-xs text-muted-foreground">
                Produto original do card: <strong>{deal.product.name}</strong>
              </p>
            )}
          </div>

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
            disabled={!finalValue || !selectedProductId || closeSale.isPending}
            className="bg-green-600 hover:bg-green-700 text-white"
          >
            {closeSale.isPending ? "Registrando..." : "Confirmar Venda"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
