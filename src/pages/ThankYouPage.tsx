import { useParams } from "react-router-dom";
import { motion } from "framer-motion";
import { Check } from "lucide-react";

export default function ThankYouPage() {
  const { slug } = useParams<{ slug: string }>();

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
          Obrigado!
        </h1>
        <p className="text-white/70 text-lg mb-8">
          Sua inscrição foi realizada com sucesso. Nossa equipe entrará em contato em breve.
        </p>
      </motion.div>
    </div>
  );
}
