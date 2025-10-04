import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, getDay, addWeeks, startOfWeek, endOfWeek } from "date-fns";
import { pt } from "date-fns/locale";
import { FileText } from "lucide-react";

interface MonthlyTimesheetProps {
  userId: string;
  currentMonth: Date;
}

const MonthlyTimesheet = ({ userId, currentMonth }: MonthlyTimesheetProps) => {
  const [timeEntries, setTimeEntries] = useState<any[]>([]);
  const [profile, setProfile] = useState<any>(null);
  const [companySettings, setCompanySettings] = useState<any>(null);

  useEffect(() => {
    fetchData();
  }, [userId, currentMonth]);

  const fetchData = async () => {
    const start = startOfMonth(currentMonth);
    const end = endOfMonth(currentMonth);

    try {
      // Fetch time entries
      const { data: entries, error: entriesError } = await supabase
        .from("time_entries")
        .select("*")
        .eq("user_id", userId)
        .gte("entry_date", format(start, "yyyy-MM-dd"))
        .lte("entry_date", format(end, "yyyy-MM-dd"));

      if (entriesError) throw entriesError;
      setTimeEntries(entries || []);

      // Fetch profile
      const { data: profileData, error: profileError } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .single();

      if (profileError) throw profileError;
      setProfile(profileData);

      // Fetch company settings
      const { data: settings, error: settingsError } = await supabase
        .from("company_settings")
        .select("*")
        .single();

      if (settingsError) throw settingsError;
      setCompanySettings(settings);
    } catch (error) {
      console.error("Error fetching data:", error);
    }
  };

  const getWeeks = () => {
    const start = startOfMonth(currentMonth);
    const end = endOfMonth(currentMonth);
    const weeks: Date[][] = [];
    
    let weekStart = startOfWeek(start, { weekStartsOn: 1 });
    
    while (weekStart <= end) {
      const weekEnd = endOfWeek(weekStart, { weekStartsOn: 1 });
      const daysInWeek = eachDayOfInterval({ start: weekStart, end: weekEnd })
        .filter(day => day >= start && day <= end);
      
      if (daysInWeek.length > 0) {
        weeks.push(daysInWeek);
      }
      
      weekStart = addWeeks(weekStart, 1);
    }
    
    return weeks;
  };

  const getEntryForDate = (date: Date) => {
    return timeEntries.find(
      entry => entry.entry_date === format(date, "yyyy-MM-dd")
    );
  };

  const getWeekTotal = (days: Date[]) => {
    return days.reduce((total, day) => {
      const entry = getEntryForDate(day);
      return total + (entry?.total_hours || 0);
    }, 0);
  };

  const getTotalHours = () => {
    return timeEntries.reduce((sum, entry) => sum + (entry.total_hours || 0), 0);
  };

  const getTotalOvertime = () => {
    return timeEntries.reduce((sum, entry) => sum + (entry.overtime_hours || 0), 0);
  };

  const weekLabels = ["Primeira Semana", "Segunda Semana", "Terceira Semana", "Quarta Semana", "Quinta Semana"];
  const dayNames = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

  const weeks = getWeeks();

  return (
    <Card className="shadow-card">
      <CardHeader className="space-y-4">
        <div className="flex items-center gap-2">
          <FileText className="h-5 w-5 text-primary" />
          <CardTitle>Folha de Ponto</CardTitle>
        </div>
        <div className="space-y-2 text-sm">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <span className="font-semibold">Nome:</span> {profile?.full_name || ""}
            </div>
            <div>
              <span className="font-semibold">Empresa:</span> {companySettings?.company_name || ""}
            </div>
            <div>
              <span className="font-semibold">NIF:</span> {companySettings?.company_nif || ""}
            </div>
            <div>
              <span className="font-semibold">Mês/Ano:</span> {format(currentMonth, "MMMM/yyyy", { locale: pt })}
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {weeks.map((week, weekIndex) => (
            <div key={weekIndex} className="space-y-2">
              <h3 className="font-semibold text-sm text-primary">{weekLabels[weekIndex]}</h3>
              <div className="border rounded-lg overflow-hidden">
                <table className="w-full text-xs">
                  <thead className="bg-muted">
                    <tr>
                      <th className="p-2 text-left border-r">Data</th>
                      <th className="p-2 text-left border-r">Dia</th>
                      <th className="p-2 text-center border-r">Entrada</th>
                      <th className="p-2 text-center border-r">Saída Almoço</th>
                      <th className="p-2 text-center border-r">Retorno</th>
                      <th className="p-2 text-center border-r">Saída</th>
                      <th className="p-2 text-center">Total Horas</th>
                    </tr>
                  </thead>
                  <tbody>
                    {week.map((day) => {
                      const entry = getEntryForDate(day);
                      const dayOfWeek = getDay(day);
                      const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
                      
                      return (
                        <tr key={day.toISOString()} className={isWeekend ? "bg-muted/50" : ""}>
                          <td className="p-2 border-r border-t">{format(day, "dd/MM")}</td>
                          <td className="p-2 border-r border-t">{dayNames[dayOfWeek]}</td>
                          <td className="p-2 text-center border-r border-t">{entry?.entry_time || "-"}</td>
                          <td className="p-2 text-center border-r border-t">{entry?.lunch_exit_time || "-"}</td>
                          <td className="p-2 text-center border-r border-t">{entry?.lunch_return_time || "-"}</td>
                          <td className="p-2 text-center border-r border-t">{entry?.exit_time || "-"}</td>
                          <td className="p-2 text-center border-t font-medium">
                            {entry?.total_hours ? `${entry.total_hours.toFixed(2)}h` : "-"}
                          </td>
                        </tr>
                      );
                    })}
                    <tr className="bg-muted font-semibold">
                      <td colSpan={6} className="p-2 text-right border-t">Total Semanal:</td>
                      <td className="p-2 text-center border-t">{getWeekTotal(week).toFixed(2)}h</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          ))}
          
          <div className="border-t-2 pt-4 space-y-2">
            <div className="flex justify-between items-center p-3 bg-primary/10 rounded-lg">
              <span className="font-bold">Total Mensal:</span>
              <span className="font-bold text-lg text-primary">{getTotalHours().toFixed(2)}h</span>
            </div>
            <div className="flex justify-between items-center p-3 bg-accent/10 rounded-lg">
              <span className="font-bold">Horas Extras:</span>
              <span className="font-bold text-lg text-accent">{getTotalOvertime().toFixed(2)}h</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default MonthlyTimesheet;
