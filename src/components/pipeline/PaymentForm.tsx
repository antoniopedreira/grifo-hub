import { useState, useEffect } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { DollarSign, CreditCard, Calendar, Layers } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";

export interface PaymentData {
  value: number;
  paymentMethod: string;
  paymentDate: Date;
  installments: number | null;
  isSplitPayment: boolean;
  cashValue: number | null;
  cardInstallments: number | null;
}

interface PaymentFormProps {
  initialValue?: number;
  initialPaymentMethod?: string;
  initialInstallments?: number | null;
  initialCashValue?: number | null;
  onChange: (data: PaymentData) => void;
}

const paymentMethods = [
  { value: "pix", label: "PIX", icon: "💸" },
  { value: "cartao_credito", label: "Cartão de Crédito", icon: "💳" },
  { value: "cartao_debito", label: "Cartão de Débito", icon: "💳" },
  { value: "boleto", label: "Boleto Bancário", icon: "📄" },
  { value: "transferencia", label: "Transferência Bancária", icon: "🏦" },
  { value: "dinheiro", label: "Dinheiro", icon: "💵" },
];

const installmentOptions = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];

export function PaymentForm({
  initialValue = 0,
  initialPaymentMethod = "",
  initialInstallments = null,
  initialCashValue = null,
  onChange,
}: PaymentFormProps) {
  const [value, setValue] = useState(initialValue.toString());
  const [paymentMethod, setPaymentMethod] = useState(initialPaymentMethod);
  const [paymentDate, setPaymentDate] = useState<Date>(new Date());
  const [installments, setInstallments] = useState<string>(initialInstallments?.toString() || "1");
  const [isSplitPayment, setIsSplitPayment] = useState(!!initialCashValue);
  const [cashValue, setCashValue] = useState(initialCashValue?.toString() || "");
  const [cardInstallments, setCardInstallments] = useState<string>("1");

  // Calculate derived values
  const totalValue = parseFloat(value) || 0;
  const cashAmount = parseFloat(cashValue) || 0;
  const cardAmount = isSplitPayment ? totalValue - cashAmount : 0;
  const installmentValue = isSplitPayment 
    ? cardAmount / (parseInt(cardInstallments) || 1)
    : totalValue / (parseInt(installments) || 1);

  // Notify parent of changes
  useEffect(() => {
    onChange({
      value: totalValue,
      paymentMethod: isSplitPayment ? "split" : paymentMethod,
      paymentDate,
      installments: paymentMethod === "cartao_credito" ? parseInt(installments) || 1 : null,
      isSplitPayment,
      cashValue: isSplitPayment ? cashAmount : null,
      cardInstallments: isSplitPayment ? parseInt(cardInstallments) || 1 : null,
    });
  }, [value, paymentMethod, paymentDate, installments, isSplitPayment, cashValue, cardInstallments]);

  const showInstallments = paymentMethod === "cartao_credito" && !isSplitPayment;

  return (
    <div className="space-y-4">
      {/* Valor Total */}
      <div className="space-y-2">
        <Label htmlFor="payment-value" className="flex items-center gap-2">
          <DollarSign className="h-4 w-4 text-muted-foreground" />
          Valor Total (R$)
        </Label>
        <Input
          id="payment-value"
          type="number"
          placeholder="0,00"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          className="text-lg font-semibold"
          step="0.01"
          min="0"
        />
      </div>

      {/* Toggle Pagamento Misto */}
      <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg border">
        <div className="flex items-center gap-2">
          <Layers className="h-4 w-4 text-muted-foreground" />
          <div>
            <Label htmlFor="split-payment" className="text-sm font-medium cursor-pointer">
              Pagamento Misto
            </Label>
            <p className="text-xs text-muted-foreground">Parte à vista + parcelas no cartão</p>
          </div>
        </div>
        <Switch
          id="split-payment"
          checked={isSplitPayment}
          onCheckedChange={setIsSplitPayment}
        />
      </div>

      {/* Pagamento Misto */}
      {isSplitPayment ? (
        <div className="space-y-4 p-4 bg-secondary/5 rounded-lg border border-secondary/20">
          <h4 className="text-sm font-semibold text-secondary flex items-center gap-2">
            💰 Divisão do Pagamento
          </h4>
          
          {/* Valor à Vista */}
          <div className="space-y-2">
            <Label htmlFor="cash-value" className="text-sm">
              Valor à Vista (PIX/Dinheiro/Débito)
            </Label>
            <Input
              id="cash-value"
              type="number"
              placeholder="0,00"
              value={cashValue}
              onChange={(e) => setCashValue(e.target.value)}
              step="0.01"
              min="0"
              max={totalValue}
            />
          </div>

          {/* Valor no Cartão */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-sm">Valor no Cartão de Crédito</Label>
              <span className="text-sm font-semibold text-secondary">
                {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(cardAmount)}
              </span>
            </div>
            
            <div className="flex items-center gap-3">
              <Select value={cardInstallments} onValueChange={setCardInstallments}>
                <SelectTrigger className="w-24">
                  <SelectValue placeholder="1x" />
                </SelectTrigger>
                <SelectContent>
                  {installmentOptions.map((num) => (
                    <SelectItem key={num} value={num.toString()}>
                      {num}x
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <span className="text-sm text-muted-foreground">
                de{" "}
                <span className="font-semibold text-foreground">
                  {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(
                    cardAmount / (parseInt(cardInstallments) || 1)
                  )}
                </span>
              </span>
            </div>
          </div>

          {/* Resumo */}
          <div className="pt-3 border-t border-secondary/20 space-y-1">
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">À vista:</span>
              <span>{new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(cashAmount)}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">Parcelado ({cardInstallments}x):</span>
              <span>{new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(cardAmount)}</span>
            </div>
            <div className="flex justify-between text-sm font-semibold pt-1">
              <span>Total:</span>
              <span className="text-green-600">
                {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(totalValue)}
              </span>
            </div>
          </div>
        </div>
      ) : (
        <>
          {/* Método de Pagamento Simples */}
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
                    <span className="flex items-center gap-2">
                      <span>{method.icon}</span>
                      <span>{method.label}</span>
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Parcelas (apenas para cartão de crédito) */}
          {showInstallments && (
            <div className="space-y-2 p-3 bg-blue-50 rounded-lg border border-blue-100">
              <Label htmlFor="installments" className="text-sm text-blue-800">
                Número de Parcelas
              </Label>
              <div className="flex items-center gap-3">
                <Select value={installments} onValueChange={setInstallments}>
                  <SelectTrigger className="w-24 bg-white">
                    <SelectValue placeholder="1x" />
                  </SelectTrigger>
                  <SelectContent>
                    {installmentOptions.map((num) => (
                      <SelectItem key={num} value={num.toString()}>
                        {num}x
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <span className="text-sm text-blue-700">
                  de{" "}
                  <span className="font-semibold">
                    {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(installmentValue)}
                  </span>
                </span>
              </div>
            </div>
          )}
        </>
      )}

      {/* Data do Pagamento */}
      <div className="space-y-2">
        <Label className="flex items-center gap-2">
          <Calendar className="h-4 w-4 text-muted-foreground" />
          Data do Pagamento
        </Label>
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className={cn(
                "w-full justify-start text-left font-normal",
                !paymentDate && "text-muted-foreground"
              )}
            >
              <Calendar className="mr-2 h-4 w-4" />
              {paymentDate ? format(paymentDate, "dd/MM/yyyy", { locale: ptBR }) : "Selecione a data"}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <CalendarComponent
              mode="single"
              selected={paymentDate}
              onSelect={(date) => date && setPaymentDate(date)}
              initialFocus
              locale={ptBR}
            />
          </PopoverContent>
        </Popover>
      </div>
    </div>
  );
}
