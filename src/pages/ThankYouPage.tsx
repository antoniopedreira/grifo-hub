import { useParams } from "react-router-dom";
import { motion } from "framer-motion";
import { Check } from "lucide-react";

export default function ThankYouPage() {
  const { slug } = useParams<{ slug: string }>();

  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center bg-[#0A1C2F] text-[#E1D8CF] font-sans relative overflow-hidden p-4">
      <div className="w-full max-w-2xl z-10 flex flex-col items-center">
        {/* Logo */}
        <div className="mb-8 md:mb-12">
          <img
            src="https://naroalxhbrvmosbqzhrb.supabase.co/storage/v1/object/public/photos-wallpapers/LOGO_GRIFO_6-removebg-preview.png"
            alt="Grifo Logo"
            className="h-16 md:h-24 w-auto object-contain drop-shadow-2xl"
          />
        </div>

        {/* Success Content */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center max-w-lg"
        >
          <div className="w-20 h-20 bg-[#A47428] rounded-full flex items-center justify-center mx-auto mb-6 shadow-[0_0_30px_rgba(164,116,40,0.4)]">
            <Check className="h-10 w-10 text-white" />
          </div>
          <h1 className="text-3xl md:text-4xl font-bold text-white mb-4">
            Obrigado!
          </h1>
          <p className="text-[#E1D8CF]/70 text-lg mb-8">
            Sua inscrição foi realizada com sucesso. Nossa equipe entrará em contato em breve.
          </p>
        </motion.div>
      </div>
    </div>
  );
}
