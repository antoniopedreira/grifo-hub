import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion"; // Se não tiver framer-motion, usaremos CSS simples, mas recomendo instalar. Fiz com CSS puro para garantir compatibilidade.
import { ArrowRight, ArrowLeft, Check, Loader2, Building2, User, Phone, Mail, Briefcase, HardHat } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

// --- CORES DA MARCA ---
// Principal (Fundo): #112232
// Secundária (Dourado): #A47428
// Terciária (Texto Claro): #E1D8CF

interface FormConstructionProps {
  productId?: string;
  onSubmitSuccess?: () => void;
}

type StepData = {
  full_name: string;
  phone: string;
  email: string;
  company_name: string;
  role: string;
  niche: string;
  challenge: string;
};

const INITIAL_DATA: StepData = {
  full_name: "",
  phone: "",
  email: "",
  company_name: "",
  role: "",
  niche: "",
  challenge: "",
};

export function FormConstruction({ productId, onSubmitSuccess }: FormConstructionProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [formData, setFormData] = useState<StepData>(INITIAL_DATA);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [direction, setDirection] = useState(1); // 1 = forward, -1 = back

  // Elemento de input para focar automaticamente
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement>(null);

  useEffect(() => {
    // Foca no input sempre que mudar o passo
    setTimeout(() => {
      if (inputRef.current) inputRef.current.focus();
    }, 300);
  }, [currentStep]);

  const totalSteps = 7; // 0 a 6
  const progress = ((currentStep + 1) / (totalSteps + 1)) * 100;

  const handleNext = () => {
    if (!validateStep()) return;
    setDirection(1);
    setCurrentStep((prev) => prev + 1);
  };

  const handleBack = () => {
    setDirection(-1);
    setCurrentStep((prev) => prev - 1);
  };

  const handleChange = (field: keyof StepData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSelectAndNext = (field: keyof StepData, value: string) => {
    handleChange(field, value);
    setTimeout(() => handleNext(), 250); // Pequeno delay para feedback visual
  };

  const validateStep = () => {
    const val = Object.values(formData)[currentStep];
    // Validação simples
    if (currentStep === 0 && formData.full_name.length < 3) {
      toast.error("Por favor, digite seu nome completo.");
      return false;
    }
    if (currentStep === 1 && formData.phone.length < 10) {
      toast.error("Telefone inválido.");
      return false;
    }
    if (currentStep === 2 && !formData.email.includes("@")) {
      toast.error("Email inválido.");
      return false;
    }
    if (currentStep === 3 && formData.company_name.length < 2) {
      toast.error("Nome da empresa é obrigatório.");
      return false;
    }
    return true;
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      // 1. Criar Lead
      const { data: lead, error: leadError } = await supabase
        .from("leads")
        .insert({
          full_name: formData.full_name,
          email: formData.email,
          phone: formData.phone,
          status: "Novo",
        })
        .select()
        .single();

      if (leadError) throw leadError;

      // 2. Salvar Respostas
      const { error: subError } = await supabase.from("form_submissions").insert({
        lead_id: lead.id,
        product_id: productId,
        answers: {
          role: formData.role,
          company: formData.company_name,
          niche: formData.niche,
          challenge: formData.challenge,
        },
      });

      if (subError) throw subError;

      toast.success("Aplicação enviada com sucesso! Entraremos em contato.");
      if (onSubmitSuccess) onSubmitSuccess();

      // Reiniciar ou Redirecionar
      setCurrentStep(totalSteps + 1); // Tela de sucesso final
    } catch (error) {
      console.error(error);
      toast.error("Erro ao enviar. Tente novamente.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      // Se não for textarea ou passo de seleção, avança
      if (currentStep !== 6 && currentStep !== 4 && currentStep !== 5) {
        handleNext();
      }
    }
  };

  // --- COMPONENTES DE UI ---

  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center bg-[#112232] text-[#E1D8CF] font-sans relative overflow-hidden p-4">
      {/* BACKGROUND DECORATION */}
      <div className="absolute top-0 left-0 w-full h-2 bg-[#112232] z-50">
        <div className="h-full bg-[#A47428] transition-all duration-500 ease-out" style={{ width: `${progress}%` }} />
      </div>

      <div className="w-full max-w-2xl z-10 flex flex-col items-center">
        {/* HEADER LOGO */}
        <div className="mb-12 transition-opacity duration-500">
          <img
            src="https://naroalxhbrvmosbqzhrb.supabase.co/storage/v1/object/public/photos-wallpapers/LOGO_GRIFO_6-removebg-preview.png"
            alt="Grifo Logo"
            className="h-20 md:h-24 w-auto object-contain drop-shadow-2xl"
          />
        </div>

        {/* CONTENT AREA */}
        <div className="w-full relative min-h-[400px]">
          {/* STEP 0: NOME */}
          {currentStep === 0 && (
            <QuestionCard
              icon={<User className="text-[#A47428]" size={32} />}
              number={1}
              question="Para começarmos, qual é o seu nome completo?"
              subtext="Queremos saber quem está falando conosco."
            >
              <InputLine
                ref={inputRef}
                value={formData.full_name}
                onChange={(e) => handleChange("full_name", e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Digite seu nome..."
              />
            </QuestionCard>
          )}

          {/* STEP 1: WHATSAPP */}
          {currentStep === 1 && (
            <QuestionCard
              icon={<Phone className="text-[#A47428]" size={32} />}
              number={2}
              question="Qual seu WhatsApp para contato?"
              subtext="Nossos especialistas entrarão em contato por aqui."
            >
              <InputLine
                ref={inputRef}
                value={formData.phone}
                onChange={(e) => handleChange("phone", e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="(00) 00000-0000"
                type="tel"
              />
            </QuestionCard>
          )}

          {/* STEP 2: EMAIL */}
          {currentStep === 2 && (
            <QuestionCard
              icon={<Mail className="text-[#A47428]" size={32} />}
              number={3}
              question="E o seu melhor e-mail corporativo?"
              subtext="Para envio de materiais e propostas oficiais."
            >
              <InputLine
                ref={inputRef}
                value={formData.email}
                onChange={(e) => handleChange("email", e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="seu@empresa.com.br"
                type="email"
              />
            </QuestionCard>
          )}

          {/* STEP 3: NOME DA EMPRESA */}
          {currentStep === 3 && (
            <QuestionCard
              icon={<Building2 className="text-[#A47428]" size={32} />}
              number={4}
              question="Qual o nome da sua Construtora ou Engenharia?"
              subtext="Identifique a empresa que você representa."
            >
              <InputLine
                ref={inputRef}
                value={formData.company_name}
                onChange={(e) => handleChange("company_name", e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Nome da empresa"
              />
            </QuestionCard>
          )}

          {/* STEP 4: CARGO */}
          {currentStep === 4 && (
            <QuestionCard
              icon={<Briefcase className="text-[#A47428]" size={32} />}
              number={5}
              question="Qual seu cargo atual na empresa?"
              subtext="Selecione a opção que melhor se adequa."
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-4">
                {[
                  "Sócio / Proprietário",
                  "Diretor de Obras",
                  "Engenheiro Chefe",
                  "Arquiteto Coordenador",
                  "Suprimentos / Compras",
                  "Outro",
                ].map((role) => (
                  <OptionButton
                    key={role}
                    label={role}
                    selected={formData.role === role}
                    onClick={() => handleSelectAndNext("role", role)}
                  />
                ))}
              </div>
            </QuestionCard>
          )}

          {/* STEP 5: NICHO */}
          {currentStep === 5 && (
            <QuestionCard
              icon={<HardHat className="text-[#A47428]" size={32} />}
              number={6}
              question="Qual a principal área de atuação?"
              subtext="Entender seu nicho nos ajuda a ser mais assertivos."
            >
              <div className="grid grid-cols-1 gap-3 mt-4">
                {[
                  "Incorporação Residencial (Prédios/Casas)",
                  "Obras Comerciais e Corporativas",
                  "Galpões e Obras Industriais",
                  "Reformas de Alto Padrão",
                  "Infraestrutura e Loteamentos",
                  "Obras Públicas / Licitações",
                ].map((niche) => (
                  <OptionButton
                    key={niche}
                    label={niche}
                    selected={formData.niche === niche}
                    onClick={() => handleSelectAndNext("niche", niche)}
                  />
                ))}
              </div>
            </QuestionCard>
          )}

          {/* STEP 6: DESAFIO (FINAL) */}
          {currentStep === 6 && (
            <QuestionCard
              icon={<ArrowRight className="text-[#A47428]" size={32} />}
              number={7}
              question="Qual o maior desafio da construtora hoje?"
              subtext="Descreva brevemente para prepararmos a reunião."
            >
              <textarea
                ref={inputRef as any}
                value={formData.challenge}
                onChange={(e) => handleChange("challenge", e.target.value)}
                placeholder="Ex: Controle de custos, prazo de entrega, gestão de compras..."
                className="w-full bg-transparent border-b-2 border-[#E1D8CF]/20 text-[#E1D8CF] text-xl md:text-2xl py-4 focus:outline-none focus:border-[#A47428] transition-colors resize-none h-32 placeholder:text-[#E1D8CF]/30"
              />
              <div className="mt-8">
                <ButtonPrimary onClick={handleSubmit} loading={isSubmitting}>
                  Finalizar Aplicação
                </ButtonPrimary>
              </div>
            </QuestionCard>
          )}

          {/* TELA DE SUCESSO */}
          {currentStep > 6 && (
            <div className="flex flex-col items-center justify-center animate-in fade-in duration-700 text-center">
              <div className="w-20 h-20 rounded-full bg-[#A47428] flex items-center justify-center mb-6 shadow-[0_0_30px_rgba(164,116,40,0.4)]">
                <Check className="text-white w-10 h-10" />
              </div>
              <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">Recebemos sua aplicação!</h2>
              <p className="text-[#E1D8CF]/80 text-lg max-w-md">
                Nossa equipe de especialistas irá analisar o perfil da {formData.company_name} e entrará em contato via
                WhatsApp em breve.
              </p>
            </div>
          )}
        </div>

        {/* NAVIGATION CONTROLS */}
        {currentStep <= 6 && (
          <div className="fixed bottom-0 left-0 w-full p-6 bg-[#112232] md:bg-transparent md:static flex items-center justify-between max-w-2xl mt-8">
            {currentStep > 0 && (
              <button
                onClick={handleBack}
                className="flex items-center text-[#E1D8CF]/60 hover:text-[#A47428] transition-colors font-medium text-sm md:text-base"
              >
                <ArrowLeft className="mr-2 w-4 h-4" /> Voltar
              </button>
            )}

            {/* O botão 'Continuar' só aparece nos passos de texto, nos de seleção é automático */}
            {currentStep !== 4 && currentStep !== 5 && currentStep !== 6 && (
              <button
                onClick={handleNext}
                className="flex items-center bg-[#A47428] hover:bg-[#8a6120] text-white px-6 py-3 rounded-lg font-bold transition-all ml-auto shadow-lg shadow-[#A47428]/20"
              >
                Continuar <ArrowRight className="ml-2 w-4 h-4" />
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// --- SUB-COMPONENTES PARA ORGANIZAÇÃO ---

function QuestionCard({ children, icon, number, question, subtext }: any) {
  return (
    <div className="flex flex-col items-start w-full animate-in slide-in-from-right-8 duration-500 fade-in">
      <div className="flex items-center gap-3 mb-6">
        <span className="text-[#A47428] font-bold text-sm tracking-widest uppercase">Questão {number}</span>
      </div>

      <h2 className="text-2xl md:text-4xl font-bold text-white mb-3 leading-tight">{question}</h2>

      {subtext && <p className="text-[#E1D8CF]/60 text-lg mb-8">{subtext}</p>}

      <div className="w-full">{children}</div>
    </div>
  );
}

const InputLine = ({ value, onChange, placeholder, type = "text", onKeyDown, ref }: any) => (
  <input
    ref={ref}
    type={type}
    value={value}
    onChange={onChange}
    onKeyDown={onKeyDown}
    placeholder={placeholder}
    className="w-full bg-transparent border-b-2 border-[#E1D8CF]/20 text-[#E1D8CF] text-2xl md:text-3xl py-4 focus:outline-none focus:border-[#A47428] transition-all placeholder:text-[#E1D8CF]/30"
  />
);

const OptionButton = ({ label, selected, onClick }: any) => (
  <button
    onClick={onClick}
    className={cn(
      "w-full text-left p-4 md:p-5 rounded-lg border text-lg transition-all duration-200 flex items-center justify-between group",
      selected
        ? "bg-[#A47428] border-[#A47428] text-white shadow-lg shadow-[#A47428]/25"
        : "bg-transparent border-[#E1D8CF]/20 text-[#E1D8CF] hover:border-[#A47428] hover:bg-[#A47428]/10",
    )}
  >
    <span className="font-medium">{label}</span>
    {selected && <Check className="w-5 h-5" />}
    {!selected && <div className="w-5 h-5 rounded-full border border-[#E1D8CF]/40 group-hover:border-[#A47428]" />}
  </button>
);

const ButtonPrimary = ({ children, onClick, loading }: any) => (
  <button
    onClick={onClick}
    disabled={loading}
    className="w-full bg-[#A47428] hover:bg-[#8a6120] text-white text-xl font-bold py-4 rounded-lg shadow-[0_4px_14px_0_rgba(164,116,40,0.39)] hover:shadow-[0_6px_20px_rgba(164,116,40,0.23)] transition-all flex items-center justify-center"
  >
    {loading ? <Loader2 className="animate-spin w-6 h-6" /> : children}
  </button>
);
