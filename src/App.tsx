import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { AppLayout } from "@/components/layout/AppLayout";
import Login from "@/pages/Login";
import Register from "@/pages/Register";
import Dashboard from "@/pages/Dashboard";
import Leads from "@/pages/Leads";
import Pipeline from "@/pages/Pipeline";
import Produtos from "@/pages/Produtos";
import Marketing from "@/pages/Marketing";
import Templates from "@/pages/Templates";
import Configuracoes from "@/pages/Configuracoes";
import Agenda from "@/pages/Agenda";
import CRM from "@/pages/CRM";
import NotFound from "@/pages/NotFound";
import PublicPageRenderer from "@/pages/PublicPageRenderer";
import NpsPageRenderer from "@/pages/NpsPageRenderer";
import ThankYouPage from "@/pages/ThankYouPage";

const queryClient = new QueryClient();

const App = () => (
  <ThemeProvider attribute="class" defaultTheme="dark" forcedTheme="dark" enableSystem={false}>
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            {/* Public page routes */}
            <Route path="/p/:slug" element={<PublicPageRenderer />} />
            <Route path="/nps/:slug" element={<NpsPageRenderer />} />
            <Route path="/obrigado/:slug" element={<ThankYouPage />} />
            
            {/* Auth routes */}
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            
            {/* Protected routes with layout */}
            <Route element={<ProtectedRoute />}>
              <Route element={<AppLayout />}>
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/leads" element={<Leads />} />
                <Route path="/pipeline" element={<Pipeline />} />
                <Route path="/produtos" element={<Produtos />} />
                <Route path="/marketing" element={<Marketing />} />
                <Route path="/templates" element={<Templates />} />
                <Route path="/configuracoes" element={<Configuracoes />} />
                <Route path="/agenda" element={<Agenda />} />
                <Route path="/crm" element={<CRM />} />
              </Route>
            </Route>
            
            {/* Redirect root to dashboard */}
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            
            {/* Catch-all */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  </ThemeProvider>
);

export default App;
