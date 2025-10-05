/// <reference types="https://esm.sh/@supabase/supabase-js@2.38.0" />
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface SendTimesheetEmailRequest {
  timesheetId: string;
  userEmail: string;
  userName: string;
  month: number;
  year: number;
  totalHours: number;
  totalOvertime: number;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { timesheetId, userEmail, userName, month, year, totalHours, totalOvertime }: SendTimesheetEmailRequest = await req.json();

    // Format month name in Portuguese
    const monthNames = [
      "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
      "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
    ];
    const monthName = monthNames[month - 1];

    // Send email using Resend API
    const emailResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: "Mapa Apressado <onboarding@resend.dev>",
        to: ["rh@mapaapressado.pt"],
        subject: `Folha de Ponto - ${userName} - ${monthName} ${year}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h1 style="color: #1a56db;">Folha de Ponto Submetida</h1>
            
            <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h2 style="margin-top: 0;">Detalhes do Funcionário</h2>
              <p><strong>Nome:</strong> ${userName}</p>
              <p><strong>Email:</strong> ${userEmail}</p>
              <p><strong>Período:</strong> ${monthName} ${year}</p>
            </div>

            <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h2 style="margin-top: 0;">Resumo de Horas</h2>
              <p><strong>Total de Horas:</strong> ${totalHours.toFixed(2)}h</p>
              <p><strong>Horas Extras:</strong> ${totalOvertime.toFixed(2)}h</p>
            </div>

            <p>Para visualizar a folha de ponto completa, aceda ao painel de administração.</p>

            <hr style="border: 1px solid #e5e7eb; margin: 30px 0;">
            
            <p style="color: #6b7280; font-size: 14px;">
              Esta folha de ponto foi submetida através do Sistema de Ponto Mapa Apressado.
            </p>
          </div>
        `,
      }),
    });

    if (!emailResponse.ok) {
      const error = await emailResponse.text();
      throw new Error(`Failed to send email: ${error}`);
    }

    const emailData = await emailResponse.json();
    console.log("Email sent successfully:", emailData);

    // Update timesheet status using Supabase service role
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    
    const updateResponse = await fetch(`${supabaseUrl}/rest/v1/timesheets?id=eq.${timesheetId}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        "apikey": supabaseServiceKey,
        "Authorization": `Bearer ${supabaseServiceKey}`,
        "Prefer": "return=minimal",
      },
      body: JSON.stringify({
        status: "submitted",
        submitted_at: new Date().toISOString(),
      }),
    });

    if (!updateResponse.ok) {
      console.error("Failed to update timesheet status");
    }

    return new Response(JSON.stringify(emailData), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });
  } catch (error: any) {
    console.error("Error in send-timesheet-email function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
