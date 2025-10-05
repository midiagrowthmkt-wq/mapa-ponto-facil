import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { User } from "@supabase/supabase-js";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { LogOut, Calendar, FileText, Shield } from "lucide-react";
import logo from "@/assets/mapa-logo.png";
import TimeEntryCalendar from "@/components/dashboard/TimeEntryCalendar";
import MonthlyStats from "@/components/dashboard/MonthlyStats";
import MonthlyTimesheet from "@/components/dashboard/MonthlyTimesheet";

const Dashboard = () => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
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
      fetchProfile();
    }
  }, [user]);

  const fetchProfile = async () => {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user?.id)
        .single();

      if (error) throw error;
      setProfile(data);

      // Check if user is admin
      const { data: roleData } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user?.id)
        .eq("role", "admin")
        .maybeSingle();

      setIsAdmin(!!roleData);
    } catch (error: any) {
      console.error("Error fetching profile:", error);
    } finally {
      setLoading(false);
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

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card shadow-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <img src={logo} alt="Mapa Apressado" className="h-12 w-auto" />
              <div>
                <h1 className="text-xl font-bold text-foreground">Sistema de Ponto</h1>
                <p className="text-sm text-muted-foreground">
                  Bem-vindo, {profile?.full_name}
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              {isAdmin && (
                <Button variant="outline" onClick={() => navigate("/admin")} className="gap-2">
                  <Shield className="h-4 w-4" />
                  Admin
                </Button>
              )}
              <Button variant="outline" onClick={handleSignOut} className="gap-2">
                <LogOut className="h-4 w-4" />
                Sair
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <Tabs defaultValue="calendar" className="space-y-6">
          <TabsList className="grid w-full max-w-md mx-auto grid-cols-2">
            <TabsTrigger value="calendar" className="gap-2">
              <Calendar className="h-4 w-4" />
              Calendário
            </TabsTrigger>
            <TabsTrigger value="timesheet" className="gap-2">
              <FileText className="h-4 w-4" />
              Folha de Ponto
            </TabsTrigger>
          </TabsList>

          <TabsContent value="calendar" className="space-y-0">
            <div className="grid gap-6 md:grid-cols-[1fr_350px]">
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-2xl font-bold text-foreground">
                      Registo de Ponto
                    </h2>
                    <p className="text-muted-foreground">
                      Registe as suas horas de trabalho diárias
                    </p>
                  </div>
                </div>
                <TimeEntryCalendar userId={user?.id || ""} />
              </div>

              <div className="space-y-6">
                <MonthlyStats userId={user?.id || ""} />
              </div>
            </div>
          </TabsContent>

          <TabsContent value="timesheet" className="space-y-0">
            <div className="max-w-5xl mx-auto">
              <MonthlyTimesheet userId={user?.id || ""} currentMonth={new Date()} />
            </div>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default Dashboard;
