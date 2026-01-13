import { useState, useEffect } from "react";
import { DollarSign, Users, Clock, TrendingUp, Package, Loader2, CheckSquare } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import { format, parseISO, startOfMonth } from "date-fns";
import { ptBR } from "date-fns/locale";

// Types
interface DealWithRelations {
  id: string;
  value: number | null;
  status: string | null;
  created_at: string | null;
  lead_id: string | null;
  product_id: string | null;
  leads: { full_name: string | null } | null;
  products: { name: string } | null;
}

interface MissionWithOwner {
  id: string;
  mission: string;
  deadline: string | null;
  status: string | null;
  owner_id: string | null;
  team_members: { name: string } | null;
}

interface DashboardData {
  totalRevenue: number;
  inNegotiation: number;
  totalLeads: number;
  pendingMissions: number;
  monthlyRevenue: { month: string; value: number }[];
  salesByProduct: { name: string; value: number }[];
  recentWonDeals: DealWithRelations[];
  upcomingMissions: MissionWithOwner[];
}

const BRAND_COLORS = {
  gold: "#A47428",
  goldLight: "#C99A4B",
  navy: "#112232",
  navyLight: "#1E3A50",
};

const PIE_COLORS = [BRAND_COLORS.gold, BRAND_COLORS.navy, BRAND_COLORS.goldLight, BRAND_COLORS.navyLight, "#6B7280"];

export default function Dashboard() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<DashboardData>({
    totalRevenue: 0,
    inNegotiation: 0,
    totalLeads: 0,
    pendingMissions: 0,
    monthlyRevenue: [],
    salesByProduct: [],
    recentWonDeals: [],
    upcomingMissions: [],
  });

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        // Fetch all data in parallel
        const [
          { data: allDeals },
          { count: leadsCount },
          { count: pendingMissionsCount },
          { data: wonDealsWithRelations },
          { data: upcomingMissions },
          { data: products },
        ] = await Promise.all([
          supabase.from("deals").select("*"),
          supabase.from("leads").select("*", { count: "exact", head: true }),
          supabase
            .from("team_missions")
            .select("*", { count: "exact", head: true })
            .neq("status", "Concluído"),
          supabase
            .from("deals")
            .select("*, leads(full_name), products(name)")
            .eq("status", "won")
            .order("created_at", { ascending: false })
            .limit(5),
          supabase
            .from("team_missions")
            .select("*, team_members!team_missions_owner_id_fkey(name)")
            .neq("status", "Concluído")
            .not("deadline", "is", null)
            .order("deadline", { ascending: true })
            .limit(5),
          supabase.from("products").select("id, name"),
        ]);

        // Calculate KPIs
        const wonDeals = (allDeals || []).filter((d) => d.status === "won");
        const inNegotiationDeals = (allDeals || []).filter(
          (d) => d.status !== "won" && d.status !== "lost" && d.status !== "abandoned"
        );

        const totalRevenue = wonDeals.reduce((sum, d) => sum + (d.value || 0), 0);
        const inNegotiation = inNegotiationDeals.reduce((sum, d) => sum + (d.value || 0), 0);

        // Calculate monthly revenue (last 6 months)
        const monthlyMap = new Map<string, number>();
        wonDeals.forEach((deal) => {
          if (deal.created_at) {
            const monthKey = format(startOfMonth(parseISO(deal.created_at)), "yyyy-MM");
            monthlyMap.set(monthKey, (monthlyMap.get(monthKey) || 0) + (deal.value || 0));
          }
        });

        const sortedMonths = Array.from(monthlyMap.entries())
          .sort(([a], [b]) => a.localeCompare(b))
          .slice(-6)
          .map(([month, value]) => ({
            month: format(parseISO(`${month}-01`), "MMM", { locale: ptBR }),
            value,
          }));

        // Calculate sales by product
        const productMap = new Map<string, number>();
        const productNames = new Map<string, string>();
        (products || []).forEach((p) => productNames.set(p.id, p.name));

        wonDeals.forEach((deal) => {
          if (deal.product_id) {
            const productName = productNames.get(deal.product_id) || "Outros";
            productMap.set(productName, (productMap.get(productName) || 0) + (deal.value || 0));
          }
        });

        const salesByProduct = Array.from(productMap.entries())
          .map(([name, value]) => ({ name, value }))
          .sort((a, b) => b.value - a.value)
          .slice(0, 5);

        setData({
          totalRevenue,
          inNegotiation,
          totalLeads: leadsCount || 0,
          pendingMissions: pendingMissionsCount || 0,
          monthlyRevenue: sortedMonths,
          salesByProduct,
          recentWonDeals: (wonDealsWithRelations || []) as DealWithRelations[],
          upcomingMissions: (upcomingMissions || []) as MissionWithOwner[],
        });
      } catch (error) {
        console.error("Error fetching dashboard data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  const getInitials = (name: string | null) => {
    if (!name) return "?";
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-primary">Visão Geral</h1>
        <p className="text-muted-foreground mt-1">Bem-vindo ao Grifo Academy Hub</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Receita Confirmada
            </CardTitle>
            <DollarSign className="h-5 w-5 text-secondary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">
              {formatCurrency(data.totalRevenue)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Negócios ganhos</p>
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Pipeline Ativo
            </CardTitle>
            <TrendingUp className="h-5 w-5 text-secondary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">
              {formatCurrency(data.inNegotiation)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Deals em aberto</p>
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Leads Totais
            </CardTitle>
            <Users className="h-5 w-5 text-secondary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">{data.totalLeads}</div>
            <p className="text-xs text-muted-foreground mt-1">Na base de dados</p>
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Missões Pendentes
            </CardTitle>
            <CheckSquare className="h-5 w-5 text-secondary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">{data.pendingMissions}</div>
            <p className="text-xs text-muted-foreground mt-1">Aguardando conclusão</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Bar Chart - Monthly Revenue */}
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle className="text-primary">Receita Mensal</CardTitle>
            <CardDescription>Evolução dos negócios ganhos</CardDescription>
          </CardHeader>
          <CardContent>
            {data.monthlyRevenue.length > 0 ? (
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={data.monthlyRevenue}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="month" stroke="#64748b" fontSize={12} />
                  <YAxis
                    stroke="#64748b"
                    fontSize={12}
                    tickFormatter={(value) =>
                      `R$ ${(value / 1000).toFixed(0)}k`
                    }
                  />
                  <Tooltip
                    formatter={(value: number) => [formatCurrency(value), "Receita"]}
                    contentStyle={{
                      backgroundColor: "#fff",
                      border: "1px solid #e5e7eb",
                      borderRadius: "8px",
                    }}
                  />
                  <Bar dataKey="value" fill={BRAND_COLORS.gold} radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex flex-col items-center justify-center h-[280px] text-muted-foreground">
                <TrendingUp className="h-12 w-12 mb-2 opacity-30" />
                <p>Sem dados de receita ainda</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Pie Chart - Sales by Product */}
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle className="text-primary">Vendas por Produto</CardTitle>
            <CardDescription>Distribuição da receita</CardDescription>
          </CardHeader>
          <CardContent>
            {data.salesByProduct.length > 0 ? (
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie
                    data={data.salesByProduct}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={2}
                    dataKey="value"
                    nameKey="name"
                    label={({ name, percent }) =>
                      `${name}: ${(percent * 100).toFixed(0)}%`
                    }
                    labelLine={false}
                  >
                    {data.salesByProduct.map((_, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={PIE_COLORS[index % PIE_COLORS.length]}
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value: number) => [formatCurrency(value), "Receita"]}
                    contentStyle={{
                      backgroundColor: "#fff",
                      border: "1px solid #e5e7eb",
                      borderRadius: "8px",
                    }}
                  />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex flex-col items-center justify-center h-[280px] text-muted-foreground">
                <Package className="h-12 w-12 mb-2 opacity-30" />
                <p>Sem vendas por produto ainda</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent Lists Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Won Deals */}
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle className="text-primary flex items-center gap-2">
              <DollarSign className="h-5 w-5" />
              Últimos Negócios Ganhos
            </CardTitle>
          </CardHeader>
          <CardContent>
            {data.recentWonDeals.length > 0 ? (
              <div className="space-y-4">
                {data.recentWonDeals.map((deal) => (
                  <div
                    key={deal.id}
                    className="flex items-center justify-between py-2 border-b border-border last:border-0"
                  >
                    <div className="flex flex-col">
                      <span className="font-medium text-foreground">
                        {deal.leads?.full_name || "Lead sem nome"}
                      </span>
                      <span className="text-sm text-muted-foreground">
                        {deal.products?.name || "Produto não especificado"}
                      </span>
                    </div>
                    <span className="font-semibold text-green-600">
                      {formatCurrency(deal.value || 0)}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                <DollarSign className="h-12 w-12 mb-2 opacity-30" />
                <p>Nenhum negócio ganho ainda</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Upcoming Missions */}
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle className="text-primary flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Agenda: Próximas Entregas
            </CardTitle>
          </CardHeader>
          <CardContent>
            {data.upcomingMissions.length > 0 ? (
              <div className="space-y-4">
                {data.upcomingMissions.map((mission) => (
                  <div
                    key={mission.id}
                    className="flex items-center gap-3 py-2 border-b border-border last:border-0"
                  >
                    <Avatar className="h-8 w-8">
                      <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                        {getInitials(mission.team_members?.name || null)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-foreground truncate">
                        {mission.mission}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {mission.team_members?.name || "Sem responsável"}
                      </p>
                    </div>
                    <Badge
                      variant="outline"
                      className={
                        mission.deadline && new Date(mission.deadline) < new Date()
                          ? "border-red-500 text-red-500"
                          : "border-secondary text-secondary"
                      }
                    >
                      {mission.deadline
                        ? format(parseISO(mission.deadline), "dd/MM", { locale: ptBR })
                        : "Sem prazo"}
                    </Badge>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                <CheckSquare className="h-12 w-12 mb-2 opacity-30" />
                <p>Nenhuma missão pendente</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
