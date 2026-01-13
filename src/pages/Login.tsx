import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Eye, EyeOff, Mail, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const { signIn, user, loading } = useAuth();

  // Redirect if already logged in
  useEffect(() => {
    if (!loading && user) {
      navigate("/dashboard", { replace: true });
    }
  }, [user, loading, navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email || !password) {
      toast.error("Por favor, preencha todos os campos.");
      return;
    }

    setIsLoading(true);

    const { error } = await signIn(email, password);

    if (error) {
      let message = "Erro ao fazer login. Tente novamente.";
      
      if (error.message.includes("Invalid login credentials")) {
        message = "E-mail ou senha incorretos.";
      } else if (error.message.includes("Email not confirmed")) {
        message = "E-mail não confirmado. Verifique sua caixa de entrada.";
      }
      
      toast.error(message);
      setIsLoading(false);
      return;
    }

    toast.success("Login realizado com sucesso!");
    navigate("/dashboard", { replace: true });
  };

  // Don't render form if still loading or already logged in
  if (loading || user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/30">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4">
      <Card className="w-full max-w-md shadow-xl border-0">
        <CardHeader className="space-y-4 text-center pb-2">
          <div className="mx-auto w-16 h-16 rounded-xl bg-primary flex items-center justify-center">
            <span className="text-primary-foreground font-bold text-2xl">G</span>
          </div>
          <div>
            <CardTitle className="text-2xl font-bold text-primary">
              Grifo Academy Hub
            </CardTitle>
            <CardDescription className="text-muted-foreground mt-2">
              Faça login para acessar sua conta
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent className="pt-6">
          <form onSubmit={handleLogin} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-foreground">
                E-mail
              </Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  placeholder="seu@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-10"
                  disabled={isLoading}
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="password" className="text-foreground">
                Senha
              </Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-10 pr-10"
                  disabled={isLoading}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <Button
              type="submit"
              className="w-full h-11 bg-secondary hover:bg-secondary/90 text-secondary-foreground font-semibold"
              disabled={isLoading}
            >
              {isLoading ? "Entrando..." : "Entrar"}
            </Button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-muted-foreground">
              Ainda não tem conta?{" "}
              <button
                type="button"
                onClick={() => navigate("/register")}
                className="text-secondary hover:underline font-medium"
              >
                Cadastre-se
              </button>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
