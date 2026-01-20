import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";
import { ArrowRight, ArrowLeft, Loader2, Check } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import type { Json } from "@/integrations/supabase/types";

interface FormHighTicketProps {
  product: {
    id: string;
    name: string;
    create_deal?: boolean;
    pipeline_id?: string | null;
  };
}

interface FormData {
  nome: string;
  email: string;
  whatsapp: string;
  empresa: string;
  cargo: string;
  nicho: string;
  volumeObras: string;
  faturamento: string;
}

const totalSteps = 5;

export default function FormHighTicket({ product }: FormHighTicketProps) {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(0);
  const [formData, setFormData] = useState<FormData>({
    nome: "",
    email: "",
    whatsapp: "",
    empresa: "",
    cargo: "",
    nicho: "",
    volumeObras: "",
    faturamento: "",
  });

  const formatWhatsApp = (value: string) => {
    const numbers = value.replace(/\D/g, "");
    if (numbers.length <= 2) return numbers;
    if (numbers.length <= 7) return `(${numbers.slice(0, 2)}) ${numbers.slice(2)}`;
    if (numbers.length <= 11) return `(${numbers.slice(0, 2)}) ${numbers.slice(2, 7)}-${numbers.slice(7)}`;
    return `(${numbers.slice(0, 2)}) ${numbers.slice(2, 7)}-${numbers.slice(7, 11)}`;
  };

  const handleInputChange = (field: keyof FormData, value: string) => {
    if (field === "whatsapp") {
      value = formatWhatsApp(value);
    }
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  // Map faturamento string to numeric value for company_revenue
  // Returns null if not answered, so we don't overwrite with default value
  const mapFaturamentoToNumber = (faturamento: string): number | null => {
    if (!faturamento) return null;
    const mapping: Record<string, number> = {
      "<500k": 0,
      "500k-1M": 500000,
      "1M-5M": 1000000,
      "5M-10M": 5000000,
      "10M-50M": 10000000,
      "+50M": 50000000,
    };
    return mapping[faturamento] ?? null;
  };

  const submitMutation = useMutation({
    mutationFn: async () => {
      // Check if lead already exists by email
      const { data: existingLead } = await supabase
        .from("leads")
        .select("id")
        .eq("email", formData.email)
        .single();

      let leadId: string;
      const companyRevenue = mapFaturamentoToNumber(formData.faturamento);

      if (existingLead) {
        leadId = existingLead.id;
        // Update lead info - only include company_revenue if answered
        const updateData: Record<string, unknown> = {
          full_name: formData.nome,
          phone: formData.whatsapp,
        };
        if (companyRevenue !== null) {
          updateData.company_revenue = companyRevenue;
        }
        await supabase
          .from("leads")
          .update(updateData)
          .eq("id", leadId);
      } else {
        // Create new lead - only include company_revenue if answered
        const insertData: Record<string, unknown> = {
          email: formData.email,
          full_name: formData.nome,
          phone: formData.whatsapp,
          origin: product.name,
          status: "Novo",
        };
        if (companyRevenue !== null) {
          insertData.company_revenue = companyRevenue;
        }
        const { data: newLead, error: leadError } = await supabase
          .from("leads")
          .insert(insertData)
          .select()
          .single();

        if (leadError) throw leadError;
        leadId = newLead.id;
      }

      // Save form submission
      const { error: submissionError } = await supabase
        .from("form_submissions")
        .insert([{
          lead_id: leadId,
          product_id: product.id,
          answers: JSON.parse(JSON.stringify(formData)) as Json,
        }]);

      if (submissionError) throw submissionError;

      // Conditional: Create deal only if product.create_deal is true and pipeline is configured
      if (product.create_deal && product.pipeline_id) {
        // Get first stage of the configured pipeline (lowest order_index)
        const { data: stages } = await supabase
          .from("pipeline_stages")
          .select("id")
          .eq("pipeline_id", product.pipeline_id)
          .order("order_index", { ascending: true })
          .limit(1);

        if (stages && stages.length > 0) {
          await supabase.from("deals").insert({
            lead_id: leadId,
            product_id: product.id,
            pipeline_id: product.pipeline_id,
            stage_id: stages[0].id,
            status: "open",
            priority: "Medium",
          });
        }
      }

      return leadId;
    },
    onSuccess: () => {
      navigate(`/p/${product.name.toLowerCase().replace(/\s+/g, "-")}/obrigado`, { 
        state: { productName: product.name } 
      });
      // Since thank you page might not exist, just show the last step
      setCurrentStep(totalSteps);
    },
    onError: (error) => {
      console.error("Error submitting form:", error);
      toast.error("Erro ao enviar formulário. Tente novamente.");
    },
  });

  const canProceed = () => {
    switch (currentStep) {
      case 0:
        return formData.nome.length >= 2;
      case 1:
        return formData.email.includes("@") && formData.whatsapp.length >= 14;
      case 2:
        return formData.empresa.length >= 2 && formData.cargo.length >= 2;
      case 3:
        return formData.nicho && formData.volumeObras;
      case 4:
        return formData.faturamento;
      default:
        return true;
    }
  };

  const nextStep = () => {
    if (currentStep < totalSteps - 1) {
      setCurrentStep((prev) => prev + 1);
    } else {
      submitMutation.mutate();
    }
  };

  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep((prev) => prev - 1);
    }
  };

  const progress = ((currentStep + 1) / totalSteps) * 100;

  // Thank you screen
  if (currentStep === totalSteps) {
    return (
      <div className="min-h-screen bg-primary flex items-center justify-center px-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center max-w-lg"
        >
          <div className="w-20 h-20 bg-secondary rounded-full flex items-center justify-center mx-auto mb-6">
            <Check className="h-10 w-10 text-secondary-foreground" />
          </div>
          <h1 className="text-3xl md:text-4xl font-bold text-white mb-4">
            Aplicação Enviada!
          </h1>
          <p className="text-white/70 text-lg mb-8">
            Obrigado pelo seu interesse em {product.name}. Nossa equipe entrará em contato em breve.
          </p>
          <Button
            onClick={() => navigate("/")}
            variant="outline"
            className="border-secondary text-secondary hover:bg-secondary hover:text-secondary-foreground"
          >
            Voltar ao Início
          </Button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-primary flex flex-col">
      {/* Progress Bar */}
      <div className="h-1 bg-white/10 w-full">
        <motion.div
          className="h-full bg-secondary"
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.3 }}
        />
      </div>

      {/* Main Content */}
      <div className="flex-1 flex items-center justify-center px-4 py-8">
        <div className="w-full max-w-xl">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentStep}
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -50 }}
              transition={{ duration: 0.3 }}
              className="space-y-8"
            >
              {/* Step 0: Nome */}
              {currentStep === 0 && (
                <div className="space-y-6">
                  <div className="text-center mb-8">
                    <p className="text-secondary text-sm font-medium mb-2">PASSO 1 DE {totalSteps}</p>
                    <h1 className="text-3xl md:text-4xl font-bold text-white">
                      Qual é o seu nome?
                    </h1>
                  </div>
                  <div className="space-y-4">
                    <Input
                      type="text"
                      name="name"
                      autoComplete="name"
                      placeholder="Digite seu nome completo"
                      value={formData.nome}
                      onChange={(e) => handleInputChange("nome", e.target.value)}
                      className="h-14 text-lg bg-white/10 border-white/20 text-white placeholder:text-white/50 focus-visible:ring-secondary"
                    />
                  </div>
                </div>
              )}

              {/* Step 1: Email e WhatsApp */}
              {currentStep === 1 && (
                <div className="space-y-6">
                  <div className="text-center mb-8">
                    <p className="text-secondary text-sm font-medium mb-2">PASSO 2 DE {totalSteps}</p>
                    <h1 className="text-3xl md:text-4xl font-bold text-white">
                      Como podemos te contatar?
                    </h1>
                  </div>
                  <div className="space-y-4">
                    <div>
                      <Label className="text-white/70 text-sm">E-mail</Label>
                      <Input
                        type="email"
                        name="email"
                        autoComplete="email"
                        placeholder="seu@email.com"
                        value={formData.email}
                        onChange={(e) => handleInputChange("email", e.target.value)}
                        className="h-14 text-lg bg-white/10 border-white/20 text-white placeholder:text-white/50 focus-visible:ring-secondary"
                      />
                    </div>
                    <div>
                      <Label className="text-white/70 text-sm">WhatsApp</Label>
                      <Input
                        type="tel"
                        name="tel"
                        autoComplete="tel"
                        placeholder="(00) 00000-0000"
                        value={formData.whatsapp}
                        onChange={(e) => handleInputChange("whatsapp", e.target.value)}
                        className="h-14 text-lg bg-white/10 border-white/20 text-white placeholder:text-white/50 focus-visible:ring-secondary"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Step 2: Empresa e Cargo */}
              {currentStep === 2 && (
                <div className="space-y-6">
                  <div className="text-center mb-8">
                    <p className="text-secondary text-sm font-medium mb-2">PASSO 3 DE {totalSteps}</p>
                    <h1 className="text-3xl md:text-4xl font-bold text-white">
                      Sobre sua empresa
                    </h1>
                  </div>
                  <div className="space-y-4">
                    <div>
                      <Label className="text-white/70 text-sm">Nome da Empresa/Construtora</Label>
                      <Input
                        type="text"
                        name="organization"
                        autoComplete="organization"
                        placeholder="Digite o nome da empresa"
                        value={formData.empresa}
                        onChange={(e) => handleInputChange("empresa", e.target.value)}
                        className="h-14 text-lg bg-white/10 border-white/20 text-white placeholder:text-white/50 focus-visible:ring-secondary"
                      />
                    </div>
                    <div>
                      <Label className="text-white/70 text-sm">Seu Cargo</Label>
                      <Input
                        type="text"
                        name="organization-title"
                        autoComplete="organization-title"
                        placeholder="Ex: Diretor, Sócio, Engenheiro"
                        value={formData.cargo}
                        onChange={(e) => handleInputChange("cargo", e.target.value)}
                        className="h-14 text-lg bg-white/10 border-white/20 text-white placeholder:text-white/50 focus-visible:ring-secondary"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Step 3: Qualificação - Nicho e Volume */}
              {currentStep === 3 && (
                <div className="space-y-6">
                  <div className="text-center mb-8">
                    <p className="text-secondary text-sm font-medium mb-2">PASSO 4 DE {totalSteps}</p>
                    <h1 className="text-3xl md:text-4xl font-bold text-white">
                      Qual seu nicho de atuação?
                    </h1>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    {["Residencial", "Comercial", "Reformas", "Incorporação"].map((option) => (
                      <RadioCard
                        key={option}
                        label={option}
                        selected={formData.nicho === option}
                        onClick={() => handleInputChange("nicho", option)}
                      />
                    ))}
                  </div>
                  
                  <div className="pt-6">
                    <p className="text-white text-lg font-medium mb-4 text-center">
                      Qual seu volume de obras atual?
                    </p>
                    <div className="grid grid-cols-2 gap-3">
                      {[
                        { value: "0", label: "Nenhuma" },
                        { value: "1-3", label: "1 a 3 obras" },
                        { value: "4-10", label: "4 a 10 obras" },
                        { value: "+10", label: "Mais de 10" },
                      ].map((option) => (
                        <RadioCard
                          key={option.value}
                          label={option.label}
                          selected={formData.volumeObras === option.value}
                          onClick={() => handleInputChange("volumeObras", option.value)}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Step 4: Faturamento */}
              {currentStep === 4 && (
                <div className="space-y-6">
                  <div className="text-center mb-8">
                    <p className="text-secondary text-sm font-medium mb-2">PASSO 5 DE {totalSteps}</p>
                    <h1 className="text-3xl md:text-4xl font-bold text-white">
                      Qual seu faturamento anual?
                    </h1>
                  </div>
                  <div className="space-y-3">
                    {[
                      { value: "<500k", label: "Até R$ 500 mil" },
                      { value: "500k-1M", label: "Entre R$ 500 mil e R$ 1 mi" },
                      { value: "1M-5M", label: "Entre R$ 1 mi e R$ 5 mi" },
                      { value: "5M-10M", label: "Entre R$ 5 mi e R$ 10 mi" },
                      { value: "10M-50M", label: "Entre R$ 10 mi e R$ 50 mi" },
                      { value: "+50M", label: "Acima de R$ 50 mi" },
                    ].map((option) => (
                      <RadioCard
                        key={option.value}
                        label={option.label}
                        selected={formData.faturamento === option.value}
                        onClick={() => handleInputChange("faturamento", option.value)}
                        fullWidth
                      />
                    ))}
                  </div>
                </div>
              )}
            </motion.div>
          </AnimatePresence>

          {/* Navigation Buttons */}
          <div className="flex items-center justify-between mt-12">
            <Button
              variant="ghost"
              onClick={prevStep}
              disabled={currentStep === 0}
              className="text-white/70 hover:text-white hover:bg-white/10"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Voltar
            </Button>

            <Button
              onClick={nextStep}
              disabled={!canProceed() || submitMutation.isPending}
              className="bg-secondary hover:bg-secondary/90 text-secondary-foreground px-8"
            >
              {submitMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : currentStep === totalSteps - 1 ? (
                "Enviar Aplicação"
              ) : (
                <>
                  Continuar
                  <ArrowRight className="h-4 w-4 ml-2" />
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

function RadioCard({
  label,
  selected,
  onClick,
  fullWidth = false,
}: {
  label: string;
  selected: boolean;
  onClick: () => void;
  fullWidth?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`
        ${fullWidth ? "w-full" : ""} 
        p-4 rounded-lg border-2 transition-all duration-200 text-left
        ${
          selected
            ? "border-secondary bg-secondary/20 text-white"
            : "border-white/20 bg-white/5 text-white/80 hover:border-secondary/50 hover:bg-white/10"
        }
      `}
    >
      <span className="font-medium">{label}</span>
    </button>
  );
}
