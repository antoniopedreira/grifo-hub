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

interface FormBasicProps {
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
}

const totalSteps = 2;

export default function FormBasic({ product }: FormBasicProps) {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(0);
  const [formData, setFormData] = useState<FormData>({
    nome: "",
    email: "",
    whatsapp: "",
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

  const submitMutation = useMutation({
    mutationFn: async () => {
      // Check if lead already exists by email
      const { data: existingLead } = await supabase
        .from("leads")
        .select("id")
        .eq("email", formData.email)
        .single();

      let leadId: string;

      if (existingLead) {
        leadId = existingLead.id;
        // Update lead info
        await supabase
          .from("leads")
          .update({
            full_name: formData.nome,
            phone: formData.whatsapp,
          })
          .eq("id", leadId);
      } else {
        // Create new lead
        const { data: newLead, error: leadError } = await supabase
          .from("leads")
          .insert({
            email: formData.email,
            full_name: formData.nome,
            phone: formData.whatsapp,
            origin: product.name,
            status: "Novo",
          })
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
            Cadastro Realizado!
          </h1>
          <p className="text-white/70 text-lg mb-8">
            Obrigado pelo seu interesse. Em breve você receberá mais informações.
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
                        placeholder="(00) 00000-0000"
                        value={formData.whatsapp}
                        onChange={(e) => handleInputChange("whatsapp", e.target.value)}
                        className="h-14 text-lg bg-white/10 border-white/20 text-white placeholder:text-white/50 focus-visible:ring-secondary"
                      />
                    </div>
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
                "Enviar Cadastro"
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
