import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { User } from "@supabase/supabase-js";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { LogOut, Users, FileText, Download } from "lucide-react";
import logo from "@/assets/mapa-logo.png";
import { format } from "date-fns";
import { pt } from "date-fns/locale";

const Admin = () => {
  const [user, setUser] = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [timesheets, setTimesheets] = useState<any[]>([]);
  const navigate = useNavigate();

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setUser(session?.user ?? null);
        if (!session?.user) {
          navigate("/auth");
        }
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (!session?.user) {
        navigate("/auth");
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  useEffect(() => {
    if (user) {
      checkAdminStatus();
    }
  }, [user]);

  const checkAdminStatus = async () => {
    try {
      const { data, error } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user?.id)
        .eq("role", "admin")
        .maybeSingle();

      if (error) throw error;

      if (!data) {
        toast.error("Acesso negado. Apenas administradores podem aceder a esta página.");
        navigate("/");
        return;
      }

      setIsAdmin(true);
      fetchTimesheets();
    } catch (error: any) {
      console.error("Error checking admin status:", error);
      toast.error("Erro ao verificar permissões");
      navigate("/");
    } finally {
      setLoading(false);
    }
  };

  const fetchTimesheets = async () => {
    try {
      const { data, error } = await supabase
        .from("timesheets")
        .select(`
          *,
          profiles:user_id (
            full_name,
            employee_number
          )
        `)
        .order("year", { ascending: false })
        .order("month", { ascending: false });

      if (error) throw error;
      setTimesheets(data || []);
    } catch (error: any) {
      console.error("Error fetching timesheets:", error);
      toast.error("Erro ao carregar folhas de ponto");
    }
  };

  const handleSignOut = async () => {
    try {
      await supabase.auth.signOut();
      toast.success("Sessão terminada");
      navigate("/auth");
    } catch (error: any) {
      toast.error("Erro ao terminar sessão");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">A carregar...</p>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card shadow-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <img src={logo} alt="Mapa Apressado" className="h-12 w-auto" />
              <div>
                <h1 className="text-xl font-bold text-foreground">Painel de Administração</h1>
                <p className="text-sm text-muted-foreground">Gestão de Folhas de Ponto</p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => navigate("/")} className="gap-2">
                <Users className="h-4 w-4" />
                Dashboard
              </Button>
              <Button variant="outline" onClick={handleSignOut} className="gap-2">
                <LogOut className="h-4 w-4" />
                Sair
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Todas as Folhas de Ponto Submetidas
            </CardTitle>
          </CardHeader>
          <CardContent>
            {timesheets.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                Nenhuma folha de ponto submetida ainda
              </div>
            ) : (
              <div className="space-y-4">
                {timesheets.map((timesheet) => (
                  <div
                    key={timesheet.id}
                    className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex-1">
                      <div className="font-semibold text-foreground">
                        {timesheet.profiles?.full_name || "Utilizador"}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        Funcionário: {timesheet.profiles?.employee_number || "N/A"}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        Período: {format(new Date(timesheet.year, timesheet.month - 1), "MMMM yyyy", { locale: pt })}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        Total: {timesheet.total_hours?.toFixed(2)}h | Horas Extras: {timesheet.total_overtime?.toFixed(2)}h
                      </div>
                      {timesheet.submitted_at && (
                        <div className="text-xs text-muted-foreground mt-1">
                          Submetido em: {format(new Date(timesheet.submitted_at), "dd/MM/yyyy HH:mm", { locale: pt })}
                        </div>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="gap-2"
                        disabled={!timesheet.pdf_url}
                      >
                        <Download className="h-4 w-4" />
                        Download PDF
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default Admin;
