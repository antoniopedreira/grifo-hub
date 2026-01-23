import { useState, useRef, useEffect } from "react";
import {
  ArrowRight,
  ArrowLeft,
  Check,
  Loader2,
  Star,
  MessageSquare,
  Lightbulb,
  Target,
  ThumbsUp,
  Sparkles,
  Zap,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { NpsTemplateProps } from "./types";

// --- CORES DA MARCA ---
// Principal (Fundo): #112232
// Secundária (Dourado): #A47428
// Terciária (Texto Claro): #E1D8CF

type StepData = {
  nps_score: number | null;
  relevance: string;
  presentation: string;
  applicability: string;
  experience: string;
  learning_highlight: string;
  improvement_suggestion: string;
};

const INITIAL_DATA: StepData = {
  nps_score: null,
  relevance: "",
  presentation: "",
  applicability: "",
  experience: "",
  learning_highlight: "",
  improvement_suggestion: "",
};

export default function NpsWebinarCultura({ form, productName }: NpsTemplateProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [formData, setFormData] = useState<StepData>(INITIAL_DATA);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    setTimeout(() => {
      if (inputRef.current) inputRef.current.focus();
    }, 300);
  }, [currentStep]);

  const totalSteps = 7;
  const progress = ((currentStep + 1) / (totalSteps + 1)) * 100;

  const handleNext = () => {
    if (!validateStep()) return;
    setCurrentStep((prev) => prev + 1);
  };

  const handleBack = () => {
    setCurrentStep((prev) => prev - 1);
  };

  const handleChange = (field: keyof StepData, value: string | number | null) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleScoreSelect = (value: number) => {
    handleChange("nps_score", value);
    setTimeout(() => {
      setCurrentStep((prev) => prev + 1);
    }, 250);
  };

  const handleSelectAndNext = (field: keyof StepData, value: string) => {
    handleChange(field, value);
    setTimeout(() => {
      setCurrentStep((prev) => prev + 1);
    }, 250);
  };

  const validateStep = () => {
    if (currentStep === 5 && formData.learning_highlight.trim().length < 3) {
      toast.error("Por favor, compartilhe o que foi mais valioso para você.");
      return false;
    }
    return true;
  };

  const handleSubmit = async () => {
    if (isSubmitting) return;

    setIsSubmitting(true);
    try {
      // Salvar resposta NPS principal
      const { error: npsError } = await supabase.from("nps_responses").insert({
        form_id: form.id,
        score: formData.nps_score,
        feedback: JSON.stringify({
          relevance: formData.relevance,
          presentation: formData.presentation,
          applicability: formData.applicability,
          experience: formData.experience,
          learning_highlight: formData.learning_highlight,
          improvement_suggestion: formData.improvement_suggestion,
        }),
      });

      if (npsError) throw npsError;

      toast.success("Resposta enviada com sucesso!");
      setCurrentStep(totalSteps + 1);
    } catch (error) {
      console.error(error);
      toast.error("Erro ao enviar. Tente novamente.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (currentStep === 5) {
        handleNext();
      } else if (currentStep === 6) {
        handleSubmit();
      }
    }
  };

  const getScoreColor = (value: number, isSelected: boolean) => {
    if (isSelected) {
      if (value <= 6) return "bg-red-500 border-red-500 text-white";
      if (value <= 8) return "bg-yellow-500 border-yellow-500 text-white";
      return "bg-green-500 border-green-500 text-white";
    }
    if (value <= 6) return "bg-red-500/20 border-red-500/50 text-red-400 hover:bg-red-500/30";
    if (value <= 8) return "bg-yellow-500/20 border-yellow-500/50 text-yellow-400 hover:bg-yellow-500/30";
    return "bg-green-500/20 border-green-500/50 text-green-400 hover:bg-green-500/30";
  };

  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center bg-[#112232] text-[#E1D8CF] font-sans relative overflow-hidden p-4">
      {/* PROGRESS BAR */}
      <div className="absolute top-0 left-0 w-full h-2 bg-[#112232] z-50">
        <div className="h-full bg-[#A47428] transition-all duration-500 ease-out" style={{ width: `${progress}%` }} />
      </div>

      <div className="w-full max-w-2xl z-10 flex flex-col items-center">
        {/* HEADER */}
        <div className="mb-8 md:mb-12 transition-opacity duration-500 text-center">
          <img
            src="https://naroalxhbrvmosbqzhrb.supabase.co/storage/v1/object/public/photos-wallpapers/LOGO_GRIFO_6-removebg-preview.png"
            alt="Grifo Logo"
            className="h-16 md:h-24 w-auto object-contain drop-shadow-2xl mx-auto mb-6"
          />
          {currentStep === 0 && (
            <div className="animate-in fade-in duration-500">
              <h1 className="text-xl md:text-2xl font-bold text-white mb-2">
                Pesquisa de Satisfação
              </h1>
              <p className="text-[#A47428] font-medium">
                {productName || "Cultura e Liderança de Alta Performance no Canteiro de Obra"}
              </p>
              <p className="text-[#E1D8CF]/60 mt-4 max-w-md mx-auto text-sm md:text-base">
                Sua opinião é importante pra gente porque é a partir dela que a gente ajusta, melhora e entrega conteúdo que resolve de verdade.
              </p>
            </div>
          )}
        </div>

        {/* CONTENT AREA */}
        <div className="w-full relative min-h-[400px]">
          {/* STEP 0: NPS SCORE */}
          {currentStep === 0 && (
            <QuestionCard
              icon={<Star className="text-[#A47428]" size={32} />}
              number={1}
              question="Em uma escala de 0 a 10, o quanto você indicaria este webinar para um colega que atua em obra ou liderança?"
              subtext="0 = não indicaria | 10 = indicaria com certeza"
            >
              <div className="grid grid-cols-11 gap-1 md:gap-2 mt-4">
                {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((value) => (
                  <button
                    key={value}
                    onClick={() => handleScoreSelect(value)}
                    className={cn(
                      "aspect-square rounded-lg border-2 flex items-center justify-center",
                      "text-sm md:text-lg font-bold transition-all duration-200 hover:scale-110",
                      getScoreColor(value, formData.nps_score === value)
                    )}
                  >
                    {value}
                  </button>
                ))}
              </div>
            </QuestionCard>
          )}

          {/* STEP 1: RELEVÂNCIA */}
          {currentStep === 1 && (
            <QuestionCard
              icon={<Target className="text-[#A47428]" size={32} />}
              number={2}
              question="O conteúdo apresentado foi relevante para a sua realidade?"
            >
              <div className="grid grid-cols-1 gap-3 mt-4">
                {[
                  "Muito relevante",
                  "Relevante",
                  "Neutro",
                  "Pouco relevante",
                  "Nada relevante",
                ].map((option) => (
                  <OptionButton
                    key={option}
                    label={option}
                    selected={formData.relevance === option}
                    onClick={() => handleSelectAndNext("relevance", option)}
                  />
                ))}
              </div>
            </QuestionCard>
          )}

          {/* STEP 2: APRESENTAÇÃO */}
          {currentStep === 2 && (
            <QuestionCard
              icon={<Zap className="text-[#A47428]" size={32} />}
              number={3}
              question="A forma como o conteúdo foi apresentado facilitou o entendimento e a aplicação prática?"
            >
              <div className="grid grid-cols-1 gap-3 mt-4">
                {[
                  "Sim, totalmente",
                  "Em grande parte",
                  "Parcialmente",
                  "Pouco",
                  "Não",
                ].map((option) => (
                  <OptionButton
                    key={option}
                    label={option}
                    selected={formData.presentation === option}
                    onClick={() => handleSelectAndNext("presentation", option)}
                  />
                ))}
              </div>
            </QuestionCard>
          )}

          {/* STEP 3: APLICABILIDADE */}
          {currentStep === 3 && (
            <QuestionCard
              icon={<Lightbulb className="text-[#A47428]" size={32} />}
              number={4}
              question="O quanto você sente que consegue aplicar o que foi apresentado no seu dia a dia?"
            >
              <div className="grid grid-cols-1 gap-3 mt-4">
                {[
                  "Consigo aplicar imediatamente",
                  "Consigo aplicar com pequenos ajustes",
                  "Consigo aplicar parcialmente",
                  "Ainda não consigo aplicar",
                ].map((option) => (
                  <OptionButton
                    key={option}
                    label={option}
                    selected={formData.applicability === option}
                    onClick={() => handleSelectAndNext("applicability", option)}
                  />
                ))}
              </div>
            </QuestionCard>
          )}

          {/* STEP 4: EXPERIÊNCIA GERAL */}
          {currentStep === 4 && (
            <QuestionCard
              icon={<ThumbsUp className="text-[#A47428]" size={32} />}
              number={5}
              question="Como você avalia sua experiência geral no webinar?"
            >
              <div className="grid grid-cols-1 gap-3 mt-4">
                {[
                  "Excelente",
                  "Boa",
                  "Regular",
                  "Ruim",
                ].map((option) => (
                  <OptionButton
                    key={option}
                    label={option}
                    selected={formData.experience === option}
                    onClick={() => handleSelectAndNext("experience", option)}
                  />
                ))}
              </div>
            </QuestionCard>
          )}

          {/* STEP 5: APRENDIZADO MAIS VALIOSO */}
          {currentStep === 5 && (
            <QuestionCard
              icon={<Sparkles className="text-[#A47428]" size={32} />}
              number={6}
              question="O que você acha que foi mais valioso de aprendizado nesse webinar?"
            >
              <TextAreaInput
                ref={inputRef}
                value={formData.learning_highlight}
                onChange={(e) => handleChange("learning_highlight", e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Compartilhe o que mais agregou valor para você..."
              />
            </QuestionCard>
          )}

          {/* STEP 6: SUGESTÃO DE MELHORIA */}
          {currentStep === 6 && (
            <QuestionCard
              icon={<MessageSquare className="text-[#A47428]" size={32} />}
              number={7}
              question="O que poderia tornar essa experiência ainda melhor para você?"
              subtext="(Opcional)"
            >
              <TextAreaInput
                ref={inputRef}
                value={formData.improvement_suggestion}
                onChange={(e) => handleChange("improvement_suggestion", e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Conte-nos suas sugestões de melhoria..."
              />

              <button
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="w-full mt-6 flex items-center justify-center bg-[#A47428] hover:bg-[#8a6120] text-white px-6 py-4 rounded-lg font-bold transition-all shadow-lg shadow-[#A47428]/20 disabled:opacity-50"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="animate-spin mr-2" /> Enviando...
                  </>
                ) : (
                  <>
                    Enviar Resposta <ArrowRight className="ml-2 w-4 h-4" />
                  </>
                )}
              </button>
            </QuestionCard>
          )}

          {/* TELA DE SUCESSO */}
          {currentStep > 6 && (
            <div className="flex flex-col items-center justify-center animate-in fade-in duration-700 text-center mt-10">
              <div className="w-20 h-20 rounded-full bg-[#A47428] flex items-center justify-center mb-6 shadow-[0_0_30px_rgba(164,116,40,0.4)]">
                <Check className="text-white w-10 h-10" />
              </div>
              <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">Obrigado!</h2>
              <p className="text-[#E1D8CF]/80 text-lg max-w-md">
                Sua opinião foi registrada com sucesso. Agradecemos por dedicar seu tempo para nos ajudar a melhorar!
              </p>
            </div>
          )}
        </div>

        {/* NAVIGATION CONTROLS */}
        {currentStep > 0 && currentStep <= 6 && (
          <div className="fixed bottom-0 left-0 w-full p-6 bg-[#112232] md:bg-transparent md:static flex items-center justify-between max-w-2xl mt-8">
            <button
              onClick={handleBack}
              disabled={isSubmitting}
              className="flex items-center text-[#E1D8CF]/60 hover:text-[#A47428] transition-colors font-medium text-sm md:text-base disabled:opacity-50"
            >
              <ArrowLeft className="mr-2 w-4 h-4" /> Voltar
            </button>

            {currentStep === 5 && (
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

// --- SUB-COMPONENTES ---

function QuestionCard({ children, icon, number, question, subtext }: {
  children: React.ReactNode;
  icon: React.ReactNode;
  number: number;
  question: string;
  subtext?: string;
}) {
  return (
    <div className="flex flex-col items-start w-full animate-in slide-in-from-right-8 duration-500 fade-in">
      <div className="flex items-center gap-3 mb-6">
        <span className="text-[#A47428] font-bold text-sm tracking-widest uppercase">Questão {number}</span>
      </div>

      <h2 className="text-xl md:text-2xl font-bold text-white mb-3 leading-tight">{question}</h2>

      {subtext && <p className="text-[#E1D8CF]/60 text-base mb-6">{subtext}</p>}

      <div className="w-full">{children}</div>
    </div>
  );
}

const TextAreaInput = ({ value, onChange, placeholder, onKeyDown, ref }: {
  value: string;
  onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  placeholder: string;
  onKeyDown: (e: React.KeyboardEvent) => void;
  ref?: React.Ref<HTMLTextAreaElement>;
}) => (
  <textarea
    ref={ref}
    value={value}
    onChange={onChange}
    onKeyDown={onKeyDown}
    placeholder={placeholder}
    rows={4}
    className="w-full bg-transparent border-2 border-[#E1D8CF]/20 text-[#E1D8CF] text-lg p-4 rounded-lg focus:ring-0 focus:outline-none focus:border-[#A47428] transition-all placeholder:text-[#E1D8CF]/30 resize-none"
  />
);

const OptionButton = ({ label, selected, onClick }: {
  label: string;
  selected: boolean;
  onClick: () => void;
}) => (
  <button
    onClick={onClick}
    className={cn(
      "w-full text-left p-4 md:p-5 rounded-lg border text-lg transition-all duration-200 flex items-center justify-between group",
      selected
        ? "bg-[#A47428] border-[#A47428] text-white shadow-lg shadow-[#A47428]/25"
        : "bg-transparent border-[#E1D8CF]/20 text-[#E1D8CF] hover:border-[#A47428] hover:bg-[#A47428]/10"
    )}
  >
    <span className="font-medium">{label}</span>
    {selected && <Check className="w-5 h-5" />}
    {!selected && <div className="w-5 h-5 rounded-full border border-[#E1D8CF]/40 group-hover:border-[#A47428]" />}
  </button>
);
