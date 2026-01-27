import { useState, useRef, useEffect } from "react";
import {
  ArrowRight,
  ArrowLeft,
  Check,
  Loader2,
  User,
  Phone,
  Mail,
  CalendarCheck,
  UserPlus,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { CountryCodeSelect } from "@/components/ui/country-code-select";

// --- CORES DA MARCA ---
// Principal (Fundo): #112232
// Secundária (Dourado): #A47428
// Terciária (Texto Claro): #E1D8CF

interface FormGrifoTalkProps {
  productId?: string;
  onSubmitSuccess?: () => void;
}

type StepData = {
  full_name: string;
  email: string;
  phone: string;
  countryCode: string;
  confirmation: string; // "sim" | "nao"
  guest_name: string;
  guest_phone: string;
  guestCountryCode: string;
};

const INITIAL_DATA: StepData = {
  full_name: "",
  email: "",
  phone: "",
  countryCode: "+55",
  confirmation: "",
  guest_name: "",
  guest_phone: "",
  guestCountryCode: "+55",
};

export default function FormGrifoTalk({ productId, onSubmitSuccess }: FormGrifoTalkProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [formData, setFormData] = useState<StepData>(INITIAL_DATA);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setTimeout(() => {
      if (inputRef.current) inputRef.current.focus();
    }, 300);
  }, [currentStep]);

  // Steps: 0=nome, 1=email, 2=phone, 3=confirmacao, 4=convidado (se sim), 5=sucesso
  const getTotalSteps = () => {
    if (formData.confirmation === "sim") return 5;
    return 4;
  };

  const progress = ((currentStep + 1) / (getTotalSteps() + 1)) * 100;

  const handleNext = () => {
    if (!validateStep()) return;
    setCurrentStep((prev) => prev + 1);
  };

  const handleBack = () => {
    setCurrentStep((prev) => prev - 1);
  };

  const handleChange = (field: keyof StepData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleConfirmationSelect = (value: string) => {
    handleChange("confirmation", value);
    setTimeout(() => {
      if (value === "sim") {
        setCurrentStep(4); // Vai para convidado
      } else {
        handleSubmit(value);
      }
    }, 250);
  };

  const validateStep = () => {
    if (currentStep === 0 && formData.full_name.length < 3) {
      toast.error("Por favor, digite seu nome completo.");
      return false;
    }
    if (currentStep === 1 && !formData.email.includes("@")) {
      toast.error("Email inválido.");
      return false;
    }
    if (currentStep === 2 && formData.phone.replace(/\D/g, "").length < 10) {
      toast.error("Telefone inválido.");
      return false;
    }
    if (currentStep === 4) {
      if (formData.guest_name.length < 3) {
        toast.error("Por favor, digite o nome do convidado.");
        return false;
      }
      if (formData.guest_phone.replace(/\D/g, "").length < 10) {
        toast.error("Telefone do convidado inválido.");
        return false;
      }
    }
    return true;
  };

  const handleSubmit = async (confirmationValue?: string) => {
    if (isSubmitting) return;

    // Valida dados do convidado se confirmou presença
    if (formData.confirmation === "sim" && currentStep === 4) {
      if (!validateStep()) return;
    }

    setIsSubmitting(true);
    try {
      const finalData = { ...formData };
      if (confirmationValue) {
        finalData.confirmation = confirmationValue;
      }

      const fullPhone = `${finalData.countryCode}${finalData.phone.replace(/\D/g, "")}`;

      // Fetch product's lead_origin setting
      let leadOrigin: string | null = "Grifo Talks";
      if (productId) {
        const { data: productConfig } = await supabase
          .from("products")
          .select("lead_origin, name")
          .eq("id", productId)
          .single();
        leadOrigin = productConfig?.lead_origin || productConfig?.name || "Grifo Talks";
      }

      // 1. Criar ou atualizar Lead principal
      const { data: existingLead } = await supabase
        .from("leads")
        .select("id")
        .eq("email", finalData.email)
        .single();

      let lead: { id: string };

      if (existingLead) {
        await supabase
          .from("leads")
          .update({
            full_name: finalData.full_name,
            phone: fullPhone,
          })
          .eq("id", existingLead.id);
        lead = existingLead;
      } else {
        const { data: newLead, error: leadError } = await supabase
          .from("leads")
          .insert({
            full_name: finalData.full_name,
            email: finalData.email,
            phone: fullPhone,
            status: "Novo",
            origin: leadOrigin,
          })
          .select()
          .single();
        if (leadError) throw leadError;
        lead = newLead;
      }

      // 2. Se confirmou presença e tem convidado, criar lead do convidado
      if (finalData.confirmation === "sim" && finalData.guest_name && finalData.guest_phone) {
        const guestFullPhone = `${finalData.guestCountryCode}${finalData.guest_phone.replace(/\D/g, "")}`;
        
        // Verifica se convidado já existe pelo telefone
        const { data: existingGuest } = await supabase
          .from("leads")
          .select("id")
          .eq("phone", guestFullPhone)
          .single();

        if (!existingGuest) {
          await supabase.from("leads").insert({
            full_name: finalData.guest_name,
            phone: guestFullPhone,
            status: "Novo",
            origin: `${leadOrigin} (Convidado de ${finalData.full_name})`,
          });
        }
      }

      // 3. Salvar respostas completas
      const { error: subError } = await supabase.from("form_submissions").insert({
        lead_id: lead.id,
        product_id: productId,
        answers: {
          confirmation: finalData.confirmation === "sim" ? "Confirmou presença" : "Não poderá comparecer",
          guest_name: finalData.guest_name || null,
          guest_phone: finalData.guest_phone
            ? `${finalData.guestCountryCode}${finalData.guest_phone.replace(/\D/g, "")}`
            : null,
        },
      });

      if (subError) throw subError;

      toast.success("Confirmação enviada com sucesso!");
      if (onSubmitSuccess) onSubmitSuccess();

      // Tela de sucesso
      setCurrentStep(finalData.confirmation === "sim" ? 5 : 4);
    } catch (error) {
      console.error(error);
      toast.error("Erro ao enviar. Tente novamente.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      if ([0, 1, 2].includes(currentStep)) {
        handleNext();
      } else if (currentStep === 4 && formData.confirmation === "sim") {
        handleSubmit();
      }
    }
  };

  const isSuccessScreen =
    (formData.confirmation === "sim" && currentStep === 5) ||
    (formData.confirmation === "nao" && currentStep === 4);

  const showNavigation = !isSuccessScreen && currentStep <= 4;
  const showContinueButton = [0, 1, 2].includes(currentStep);
  const showSubmitButton = currentStep === 4 && formData.confirmation === "sim";

  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center bg-[#112232] text-[#E1D8CF] font-sans relative overflow-hidden p-4">
      {/* PROGRESS BAR */}
      <div className="absolute top-0 left-0 w-full h-2 bg-[#112232] z-50">
        <div className="h-full bg-[#A47428] transition-all duration-500 ease-out" style={{ width: `${progress}%` }} />
      </div>

      <div className="w-full max-w-2xl z-10 flex flex-col items-center">
        {/* HEADER LOGO */}
        <div className="mb-8 md:mb-12 transition-opacity duration-500">
          <img
            src="https://naroalxhbrvmosbqzhrb.supabase.co/storage/v1/object/public/photos-wallpapers/LOGO_GRIFO_6-removebg-preview.png"
            alt="Grifo Logo"
            className="h-16 md:h-24 w-auto object-contain drop-shadow-2xl"
          />
        </div>

        {/* INTRO TEXT - só na primeira tela */}
        {currentStep === 0 && (
          <div className="text-center mb-8 animate-in fade-in duration-500">
            <h1 className="text-3xl md:text-4xl font-bold text-white mb-3">
              Você está convidado(a) para o Grifo Talks.
            </h1>
            <p className="text-[#E1D8CF]/70 text-lg">
              Por favor, confirme sua presença preenchendo os dados a seguir.
            </p>
          </div>
        )}

        {/* CONTENT AREA */}
        <div className="w-full relative min-h-[400px]">
          {/* STEP 0: NOME */}
          {currentStep === 0 && (
            <QuestionCard
              icon={<User className="text-[#A47428]" size={32} />}
              number={1}
              question="Qual é o seu nome completo?"
            >
              <InputLine
                ref={inputRef}
                name="name"
                autoComplete="name"
                value={formData.full_name}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleChange("full_name", e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Digite seu nome..."
              />
            </QuestionCard>
          )}

          {/* STEP 1: EMAIL */}
          {currentStep === 1 && (
            <QuestionCard
              icon={<Mail className="text-[#A47428]" size={32} />}
              number={2}
              question="E-mail para confirmação e informações do evento"
            >
              <InputLine
                ref={inputRef}
                name="email"
                autoComplete="email"
                value={formData.email}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleChange("email", e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="seu@email.com"
                type="email"
              />
            </QuestionCard>
          )}

          {/* STEP 2: TELEFONE */}
          {currentStep === 2 && (
            <QuestionCard
              icon={<Phone className="text-[#A47428]" size={32} />}
              number={3}
              question="Telefone (WhatsApp)"
            >
              <div className="flex items-end gap-3">
                <CountryCodeSelect
                  value={formData.countryCode}
                  onChange={(dialCode) => handleChange("countryCode", dialCode)}
                  variant="dark"
                  className="flex-shrink-0"
                />
                <div className="flex-1">
                  <InputLine
                    ref={inputRef}
                    name="tel"
                    autoComplete="tel-national"
                    value={formData.phone}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                      let val = e.target.value.replace(/^\+\d{1,3}\s?/, "");
                      handleChange("phone", val);
                    }}
                    onKeyDown={handleKeyDown}
                    placeholder="(00) 00000-0000"
                    type="tel"
                  />
                </div>
              </div>
            </QuestionCard>
          )}

          {/* STEP 3: CONFIRMAÇÃO */}
          {currentStep === 3 && (
            <QuestionCard
              icon={<CalendarCheck className="text-[#A47428]" size={32} />}
              number={4}
              question="Você confirma sua presença no Grifo Talks?"
            >
              <div className="grid grid-cols-1 gap-3 mt-4">
                <OptionButton
                  label="Sim, estarei presente"
                  selected={formData.confirmation === "sim"}
                  onClick={() => handleConfirmationSelect("sim")}
                  icon={<Check className="w-5 h-5" />}
                />
                <OptionButton
                  label="Não poderei comparecer"
                  selected={formData.confirmation === "nao"}
                  onClick={() => handleConfirmationSelect("nao")}
                />
              </div>
              {isSubmitting && (
                <div className="mt-4 flex items-center justify-center text-[#A47428]">
                  <Loader2 className="animate-spin mr-2" /> Enviando...
                </div>
              )}
            </QuestionCard>
          )}

          {/* STEP 4: CONVIDADO (só se confirmou presença) */}
          {currentStep === 4 && formData.confirmation === "sim" && (
            <QuestionCard
              icon={<UserPlus className="text-[#A47428]" size={32} />}
              number={5}
              question="Dados do seu convidado"
              subtext="Caso queira levar um convidado, informe os dados abaixo."
            >
              <div className="space-y-6">
                <div>
                  <label className="block text-[#E1D8CF]/60 text-sm mb-2">Nome do convidado</label>
                  <InputLine
                    ref={inputRef}
                    name="guest-name"
                    autoComplete="off"
                    value={formData.guest_name}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleChange("guest_name", e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Nome completo do convidado"
                  />
                </div>
                <div>
                  <label className="block text-[#E1D8CF]/60 text-sm mb-2">Telefone do convidado</label>
                  <div className="flex items-end gap-3">
                    <CountryCodeSelect
                      value={formData.guestCountryCode}
                      onChange={(dialCode) => handleChange("guestCountryCode", dialCode)}
                      variant="dark"
                      className="flex-shrink-0"
                    />
                    <div className="flex-1">
                      <InputLine
                        name="guest-tel"
                        autoComplete="off"
                        value={formData.guest_phone}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                          let val = e.target.value.replace(/^\+\d{1,3}\s?/, "");
                          handleChange("guest_phone", val);
                        }}
                        onKeyDown={handleKeyDown}
                        placeholder="(00) 00000-0000"
                        type="tel"
                      />
                    </div>
                  </div>
                </div>
              </div>
              {isSubmitting && (
                <div className="mt-4 flex items-center justify-center text-[#A47428]">
                  <Loader2 className="animate-spin mr-2" /> Enviando...
                </div>
              )}
            </QuestionCard>
          )}

          {/* TELA DE SUCESSO */}
          {isSuccessScreen && (
            <div className="flex flex-col items-center justify-center animate-in fade-in duration-700 text-center mt-10">
              <div className="w-20 h-20 rounded-full bg-[#A47428] flex items-center justify-center mb-6 shadow-[0_0_30px_rgba(164,116,40,0.4)]">
                <Check className="text-white w-10 h-10" />
              </div>
              {formData.confirmation === "sim" ? (
                <>
                  <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">Obrigado por confirmar sua presença.</h2>
                  <p className="text-[#E1D8CF]/80 text-lg max-w-md">
                    Estamos preparando uma experiência especial para você no Grifo Talks.
                  </p>
                </>
              ) : (
                <>
                  <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">Agradecemos sua resposta.</h2>
                  <p className="text-[#E1D8CF]/80 text-lg max-w-md">
                    Sentiremos sua falta no Grifo Talks. Esperamos vê-lo em uma próxima oportunidade!
                  </p>
                </>
              )}
            </div>
          )}
        </div>

        {/* NAVIGATION CONTROLS */}
        {showNavigation && (
          <div className="fixed bottom-0 left-0 w-full p-6 bg-[#112232] md:bg-transparent md:static flex items-center justify-between max-w-2xl mt-8">
            {currentStep > 0 && (
              <button
                onClick={handleBack}
                disabled={isSubmitting}
                className="flex items-center text-[#E1D8CF]/60 hover:text-[#A47428] transition-colors font-medium text-sm md:text-base disabled:opacity-50"
              >
                <ArrowLeft className="mr-2 w-4 h-4" /> Voltar
              </button>
            )}

            {showContinueButton && (
              <button
                onClick={handleNext}
                className="flex items-center bg-[#A47428] hover:bg-[#8a6120] text-white px-6 py-3 rounded-lg font-bold transition-all ml-auto shadow-lg shadow-[#A47428]/20"
              >
                Continuar <ArrowRight className="ml-2 w-4 h-4" />
              </button>
            )}

            {showSubmitButton && (
              <button
                onClick={() => handleSubmit()}
                disabled={isSubmitting}
                className="flex items-center bg-[#A47428] hover:bg-[#8a6120] text-white px-6 py-3 rounded-lg font-bold transition-all ml-auto shadow-lg shadow-[#A47428]/20 disabled:opacity-50"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="animate-spin mr-2 w-4 h-4" /> Enviando...
                  </>
                ) : (
                  <>
                    Confirmar <Check className="ml-2 w-4 h-4" />
                  </>
                )}
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

      <h2 className="text-2xl md:text-3xl font-bold text-white mb-3 leading-tight">{question}</h2>

      {subtext && <p className="text-[#E1D8CF]/60 text-lg mb-8">{subtext}</p>}

      <div className="w-full">{children}</div>
    </div>
  );
}

const InputLine = ({ value, onChange, placeholder, type = "text", onKeyDown, ref, autoComplete = "on", name }: {
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  placeholder: string;
  type?: string;
  onKeyDown?: (e: React.KeyboardEvent) => void;
  ref?: React.Ref<HTMLInputElement>;
  autoComplete?: string;
  name?: string;
}) => (
  <div className="relative w-full">
    <style>
      {`
        input:-webkit-autofill,
        input:-webkit-autofill:hover, 
        input:-webkit-autofill:focus, 
        input:-webkit-autofill:active{
            -webkit-box-shadow: 0 0 0 30px #112232 inset !important;
            -webkit-text-fill-color: #E1D8CF !important;
            transition: background-color 5000s ease-in-out 0s;
        }
      `}
    </style>
    <input
      ref={ref}
      type={type}
      name={name}
      value={value}
      onChange={onChange}
      onKeyDown={onKeyDown}
      placeholder={placeholder}
      spellCheck="false"
      autoComplete={autoComplete}
      className="w-full bg-transparent border-0 border-b-2 border-[#E1D8CF]/20 text-[#E1D8CF] text-2xl md:text-3xl py-4 focus:ring-0 focus:outline-none focus:border-[#A47428] transition-all placeholder:text-[#E1D8CF]/30 appearance-none rounded-none"
    />
  </div>
);

const OptionButton = ({ label, selected, onClick, icon }: {
  label: string;
  selected: boolean;
  onClick: () => void;
  icon?: React.ReactNode;
}) => (
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
    {selected && icon ? icon : selected ? <Check className="w-5 h-5" /> : null}
    {!selected && <div className="w-5 h-5 rounded-full border border-[#E1D8CF]/40 group-hover:border-[#A47428]" />}
  </button>
);
