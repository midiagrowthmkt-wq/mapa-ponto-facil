import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { format, startOfMonth, endOfMonth } from "date-fns";
import { pt } from "date-fns/locale";
import { FileText, Clock, TrendingUp, Calendar as CalendarIcon } from "lucide-react";

interface MonthlyStatsProps {
  userId: string;
}

const MonthlyStats = ({ userId }: MonthlyStatsProps) => {
  const [currentMonth] = useState(new Date());
  const [stats, setStats] = useState({
    totalHours: 0,
    totalOvertime: 0,
    daysWorked: 0,
  });

  useEffect(() => {
    fetchMonthlyStats();
  }, [userId, currentMonth]);

  const fetchMonthlyStats = async () => {
    const start = startOfMonth(currentMonth);
    const end = endOfMonth(currentMonth);

    try {
      const { data, error } = await supabase
        .from("time_entries")
        .select("total_hours, overtime_hours")
        .eq("user_id", userId)
        .gte("entry_date", format(start, "yyyy-MM-dd"))
        .lte("entry_date", format(end, "yyyy-MM-dd"));

      if (error) throw error;

      const totalHours = data.reduce((sum, entry) => sum + (entry.total_hours || 0), 0);
      const totalOvertime = data.reduce((sum, entry) => sum + (entry.overtime_hours || 0), 0);
      const daysWorked = data.filter((entry) => entry.total_hours && entry.total_hours > 0).length;

      setStats({
        totalHours,
        totalOvertime,
        daysWorked,
      });
    } catch (error) {
      console.error("Error fetching stats:", error);
    }
  };

  return (
    <div className="space-y-4">
      <Card className="shadow-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CalendarIcon className="h-5 w-5" />
            Resumo Mensal
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            {format(currentMonth, "MMMM 'de' yyyy", { locale: pt })}
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-primary" />
                <span className="text-sm font-medium">Total de Horas</span>
              </div>
              <span className="text-lg font-bold text-primary">
                {stats.totalHours.toFixed(2)}h
              </span>
            </div>

            <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-accent" />
                <span className="text-sm font-medium">Horas Extras</span>
              </div>
              <span className="text-lg font-bold text-accent">
                {stats.totalOvertime.toFixed(2)}h
              </span>
            </div>

            <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
              <div className="flex items-center gap-2">
                <CalendarIcon className="h-4 w-4 text-foreground" />
                <span className="text-sm font-medium">Dias Trabalhados</span>
              </div>
              <span className="text-lg font-bold">
                {stats.daysWorked}
              </span>
            </div>
          </div>

          <Button className="w-full gap-2" variant="default">
            <FileText className="h-4 w-4" />
            Gerar Folha de Ponto PDF
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default MonthlyStats;
