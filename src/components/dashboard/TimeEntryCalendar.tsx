import { useState, useEffect } from "react";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { format, startOfMonth, endOfMonth } from "date-fns";
import { pt } from "date-fns/locale";
import TimeEntryDialog from "./TimeEntryDialog";

interface TimeEntryCalendarProps {
  userId: string;
}

const TimeEntryCalendar = ({ userId }: TimeEntryCalendarProps) => {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [timeEntries, setTimeEntries] = useState<any[]>([]);
  const [holidays, setHolidays] = useState<Date[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);

  useEffect(() => {
    if (selectedDate) {
      fetchTimeEntries();
      fetchHolidays();
    }
  }, [selectedDate, userId]);

  const fetchTimeEntries = async () => {
    if (!selectedDate) return;

    const start = startOfMonth(selectedDate);
    const end = endOfMonth(selectedDate);

    try {
      const { data, error } = await supabase
        .from("time_entries")
        .select("*")
        .eq("user_id", userId)
        .gte("entry_date", format(start, "yyyy-MM-dd"))
        .lte("entry_date", format(end, "yyyy-MM-dd"));

      if (error) throw error;
      setTimeEntries(data || []);
    } catch (error) {
      console.error("Error fetching time entries:", error);
    }
  };

  const fetchHolidays = async () => {
    try {
      const { data, error } = await supabase
        .from("holidays")
        .select("holiday_date");

      if (error) throw error;
      const holidayDates = data.map((h) => new Date(h.holiday_date));
      setHolidays(holidayDates);
    } catch (error) {
      console.error("Error fetching holidays:", error);
    }
  };

  const handleDateSelect = (date: Date | undefined) => {
    setSelectedDate(date);
    if (date) {
      setDialogOpen(true);
    }
  };

  const hasEntryForDate = (date: Date) => {
    return timeEntries.some(
      (entry) => entry.entry_date === format(date, "yyyy-MM-dd")
    );
  };

  const isHoliday = (date: Date) => {
    return holidays.some(
      (holiday) => format(holiday, "yyyy-MM-dd") === format(date, "yyyy-MM-dd")
    );
  };

  const modifiers = {
    hasEntry: (date: Date) => hasEntryForDate(date),
    holiday: (date: Date) => isHoliday(date),
  };

  const modifiersStyles = {
    hasEntry: {
      backgroundColor: "hsl(var(--primary))",
      color: "white",
      fontWeight: "bold",
    },
    holiday: {
      backgroundColor: "hsl(var(--secondary))",
      color: "hsl(var(--secondary-foreground))",
    },
  };

  return (
    <>
      <Card className="shadow-card">
        <CardHeader>
          <CardTitle>Calendário Mensal</CardTitle>
        </CardHeader>
        <CardContent>
          <Calendar
            mode="single"
            selected={selectedDate}
            onSelect={handleDateSelect}
            locale={pt}
            modifiers={modifiers}
            modifiersStyles={modifiersStyles}
            className="rounded-md border w-full"
          />
          <div className="mt-4 space-y-2 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-primary"></div>
              <span>Dias com registo</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-secondary"></div>
              <span>Feriados</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {selectedDate && (
        <TimeEntryDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          date={selectedDate}
          userId={userId}
          onSaved={fetchTimeEntries}
        />
      )}
    </>
  );
};

export default TimeEntryCalendar;
