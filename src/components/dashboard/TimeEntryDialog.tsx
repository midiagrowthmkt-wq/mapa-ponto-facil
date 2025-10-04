import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { format, isToday, isFuture } from "date-fns";
import { pt } from "date-fns/locale";
import { toast } from "sonner";

interface TimeEntryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  date: Date;
  userId: string;
  onSaved: () => void;
}

const TimeEntryDialog = ({ open, onOpenChange, date, userId, onSaved }: TimeEntryDialogProps) => {
  const [entryTime, setEntryTime] = useState("");
  const [lunchExitTime, setLunchExitTime] = useState("");
  const [lunchReturnTime, setLunchReturnTime] = useState("");
  const [exitTime, setExitTime] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [existingEntry, setExistingEntry] = useState<any>(null);

  useEffect(() => {
    if (open && date) {
      fetchExistingEntry();
    }
  }, [open, date, userId]);

  const fetchExistingEntry = async () => {
    try {
      const { data, error } = await supabase
        .from("time_entries")
        .select("*")
        .eq("user_id", userId)
        .eq("entry_date", format(date, "yyyy-MM-dd"))
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setExistingEntry(data);
        setEntryTime(data.entry_time || "");
        setLunchExitTime(data.lunch_exit_time || "");
        setLunchReturnTime(data.lunch_return_time || "");
        setExitTime(data.exit_time || "");
        setNotes(data.notes || "");
      } else {
        resetForm();
      }
    } catch (error) {
      console.error("Error fetching entry:", error);
    }
  };

  const resetForm = () => {
    setExistingEntry(null);
    setEntryTime("");
    setLunchExitTime("");
    setLunchReturnTime("");
    setExitTime("");
    setNotes("");
  };

  const calculateHours = (start: string, end: string, lunchExit?: string, lunchReturn?: string) => {
    if (!start || !end) return 0;

    const [startHour, startMin] = start.split(":").map(Number);
    const [endHour, endMin] = end.split(":").map(Number);

    let totalMinutes = (endHour * 60 + endMin) - (startHour * 60 + startMin);

    if (lunchExit && lunchReturn) {
      const [lunchExitHour, lunchExitMin] = lunchExit.split(":").map(Number);
      const [lunchReturnHour, lunchReturnMin] = lunchReturn.split(":").map(Number);
      const lunchMinutes = (lunchReturnHour * 60 + lunchReturnMin) - (lunchExitHour * 60 + lunchExitMin);
      totalMinutes -= lunchMinutes;
    }

    return totalMinutes / 60;
  };

  const handleSave = async () => {
    // Verificar se a data não é futura
    if (isFuture(date)) {
      toast.error("Não pode registar dias futuros");
      return;
    }

    // Verificar se a data não é hoje (apenas pode registar no dia)
    if (!isToday(date)) {
      toast.error("Só pode registar o ponto no dia atual");
      return;
    }

    setLoading(true);

    try {
      const totalHours = calculateHours(entryTime, exitTime, lunchExitTime, lunchReturnTime);
      
      // Fetch standard hours from company settings
      const { data: settings } = await supabase
        .from("company_settings")
        .select("standard_hours_per_day")
        .single();

      const standardHours = settings?.standard_hours_per_day || 8;
      const overtimeHours = Math.max(0, totalHours - standardHours);

      const entryData = {
        user_id: userId,
        entry_date: format(date, "yyyy-MM-dd"),
        entry_time: entryTime || null,
        lunch_exit_time: lunchExitTime || null,
        lunch_return_time: lunchReturnTime || null,
        exit_time: exitTime || null,
        total_hours: totalHours,
        overtime_hours: overtimeHours,
        notes: notes || null,
      };

      if (existingEntry) {
        const { error } = await supabase
          .from("time_entries")
          .update(entryData)
          .eq("id", existingEntry.id);

        if (error) throw error;
        toast.success("Registo atualizado com sucesso!");
      } else {
        const { error } = await supabase
          .from("time_entries")
          .insert(entryData);

        if (error) throw error;
        toast.success("Registo guardado com sucesso!");
      }

      onSaved();
      onOpenChange(false);
    } catch (error: any) {
      toast.error(error.message || "Erro ao guardar registo");
    } finally {
      setLoading(false);
    }
  };

  const canEdit = isToday(date);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>
            {canEdit ? "Registo de Ponto" : "Visualizar Registo"} - {format(date, "d 'de' MMMM 'de' yyyy", { locale: pt })}
          </DialogTitle>
          <DialogDescription>
            {canEdit ? "Registe as suas horas de trabalho" : "Apenas pode editar registos do dia atual"}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="entry">Entrada</Label>
              <Input
                id="entry"
                type="time"
                value={entryTime}
                onChange={(e) => setEntryTime(e.target.value)}
                disabled={!canEdit}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="exit">Saída</Label>
              <Input
                id="exit"
                type="time"
                value={exitTime}
                onChange={(e) => setExitTime(e.target.value)}
                disabled={!canEdit}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="lunch-exit">Saída Almoço</Label>
              <Input
                id="lunch-exit"
                type="time"
                value={lunchExitTime}
                onChange={(e) => setLunchExitTime(e.target.value)}
                disabled={!canEdit}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="lunch-return">Retorno Almoço</Label>
              <Input
                id="lunch-return"
                type="time"
                value={lunchReturnTime}
                onChange={(e) => setLunchReturnTime(e.target.value)}
                disabled={!canEdit}
              />
            </div>
          </div>

          {entryTime && exitTime && (
            <div className="p-3 bg-muted rounded-md">
              <p className="text-sm font-medium">
                Total de Horas:{" "}
                <span className="text-primary">
                  {calculateHours(entryTime, exitTime, lunchExitTime, lunchReturnTime).toFixed(2)}h
                </span>
              </p>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="notes">Observações (opcional)</Label>
            <Textarea
              id="notes"
              placeholder="Adicione observações se necessário..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              disabled={!canEdit}
            />
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {canEdit ? "Cancelar" : "Fechar"}
          </Button>
          {canEdit && (
            <Button onClick={handleSave} disabled={loading}>
              {loading ? "A guardar..." : "Guardar"}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default TimeEntryDialog;
