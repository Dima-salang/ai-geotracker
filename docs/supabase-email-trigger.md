# Sales Lead Email Dispatch via Supabase Webhooks & Resend

This guide provides the exact configuration and code required to automatically trigger email notifications when a new potential low-visibility lead is created in your database.

---

## 1. Supabase Edge Function (`supabase/functions/send-lead-email/index.ts`)

Create a new Supabase Edge Function by running `supabase functions new send-lead-email` in your terminal and replacing its contents with this TypeScript file:

```typescript
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

interface WebhookPayload {
  type: "INSERT" | "UPDATE" | "DELETE";
  table: string;
  schema: string;
  record: {
    id: string;
    business_id: string;
    team_id: string | null;
    visibility_score: number;
    status: string;
    created_at: string;
  };
  old_record: any;
}

serve(async (req) => {
  // CORS Preflight headers
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: { "Access-Control-Allow-Origin": "*" } });
  }

  try {
    if (!RESEND_API_KEY) {
      throw new Error("Missing RESEND_API_KEY environment variable in Supabase.");
    }

    const payload: WebhookPayload = await req.json();

    // We are only interested in new leads
    if (payload.type !== "INSERT" || payload.table !== "leads") {
      return new Response(JSON.stringify({ message: "Bypassed: Not a lead insertion." }), {
        headers: { "Content-Type": "application/json" },
        status: 200,
      });
    }

    const lead = payload.record;

    // 1. Connect to your database to pull agent/team contacts (using service_role key to bypass RLS)
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    
    // Import Supabase client dynamically inside Deno edge space
    const { createClient } = await import("https://esm.sh/@supabase/supabase-js@2");
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Fetch the target business details
    const { data: business, error: bizError } = await supabase
      .from("businesses")
      .select("name, domain, primary_city, primary_state")
      .eq("id", lead.business_id)
      .single();

    if (bizError || !business) {
      throw new Error(`Failed to retrieve business information: ${bizError?.message}`);
    }

    // If assigned to a team, fetch team emails
    let recipientEmails: string[] = [];
    let teamName = "Unassigned";

    if (lead.team_id) {
      // Get Team details
      const { data: team, error: teamError } = await supabase
        .from("teams")
        .select("name, leader_id")
        .eq("id", lead.team_id)
        .single();

      if (team) {
        teamName = team.name;
      }

      // Fetch emails of verified agents in that team
      const { data: agents } = await supabase
        .from("users")
        .select("email")
        .eq("team_id", lead.team_id)
        .eq("is_verified", true);

      if (agents) {
        recipientEmails = agents.map((a: any) => a.email);
      }

      // Fetch team leader email if configured
      if (team?.leader_id) {
        const { data: leader } = await supabase
          .from("users")
          .select("email")
          .eq("id", team.leader_id)
          .single();
        if (leader && !recipientEmails.includes(leader.email)) {
          recipientEmails.push(leader.email);
        }
      }
    }

    // Default fallback if no agents are found
    if (recipientEmails.length === 0) {
      recipientEmails = ["franchise-coordinator@iozera.com"]; 
    }

    // 2. Dispatch email via Resend API
    const emailBody = {
      from: "GeoTracker Core <alerts@iozera-tracker.com>",
      to: recipientEmails,
      subject: `[LEAD INCOMING] Deficit Score Alert: ${business.name}`,
      html: `
        <div style="font-family: monospace; background-color: #faf9f6; padding: 24px; border: 1px solid #111; color: #111;">
          <h2 style="font-family: sans-serif; border-bottom: 2px solid #111; padding-bottom: 8px; text-transform: uppercase;">
            ◆ Potential Low Visibility Lead ◆
          </h2>
          <p style="font-size: 13px;">A new business has scored below the visibility threshold and has been load-balanced to your team:</p>
          <table style="width: 100%; border-collapse: collapse; font-size: 12px; margin: 18px 0;">
            <tr style="border-bottom: 1px solid #eaeaea;">
              <td style="padding: 6px 0; font-weight: bold;">Business:</td>
              <td style="padding: 6px 0;">${business.name}</td>
            </tr>
            <tr style="border-bottom: 1px solid #eaeaea;">
              <td style="padding: 6px 0; font-weight: bold;">Domain:</td>
              <td style="padding: 6px 0;"><a href="https://${business.domain}" style="color: #0055ff;">${business.domain}</a></td>
            </tr>
            <tr style="border-bottom: 1px solid #eaeaea;">
              <td style="padding: 6px 0; font-weight: bold;">Location:</td>
              <td style="padding: 6px 0;">${business.primary_city}, ${business.primary_state || "US"}</td>
            </tr>
            <tr style="border-bottom: 1px solid #eaeaea;">
              <td style="padding: 6px 0; font-weight: bold;">Visibility Score:</td>
              <td style="padding: 6px 0; color: #f43f5e; font-weight: bold;">${lead.visibility_score}/100 (Deficit)</td>
            </tr>
            <tr style="border-bottom: 1px solid #eaeaea;">
              <td style="padding: 6px 0; font-weight: bold;">Franchise Team:</td>
              <td style="padding: 6px 0;">${teamName}</td>
            </tr>
          </table>
          <p style="font-size: 11px; margin-top: 24px; border-t: 1px solid #111; pt: 12px;">
            Please log in to your <a href="${req.headers.get("origin") || "https://iozera-tracker.com"}/dashboard" style="color: #0055ff; font-weight: bold;">Agent Workspace</a> to assign a sales agent.
          </p>
        </div>
      `,
    };

    const resendRes = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify(emailBody),
    });

    if (!resendRes.ok) {
      const errorText = await resendRes.text();
      throw new Error(`Resend API rejection: ${errorText}`);
    }

    return new Response(JSON.stringify({ status: "success", recipients: recipientEmails }), {
      headers: { "Content-Type": "application/json" },
      status: 200,
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      headers: { "Content-Type": "application/json" },
      status: 500,
    });
  }
});
```

---

## 2. Setting Up the Database Webhook (SQL migration)

Run this query in your Supabase SQL Editor to link your `leads` database insertions to the newly created Edge Function. This activates a real-time webhook using the underlying HTTP net client:

```sql
-- 1. Enable webhook capabilities if not already present
create schema if not exists supabase_functions;

-- 2. Create the Database Trigger to trigger our Webhook
create or replace trigger on_lead_inserted
  after insert on public.leads
  for each row
  execute function supabase_functions.http_request(
    'http://localhost:54321/functions/v1/send-lead-email', -- Replace with your hosted Edge Function endpoint
    'POST',
    '{"Content-Type":"application/json", "Authorization":"Bearer YOUR_ANON_OR_SERVICE_ROLE_KEY"}',
    '{}',
    '1000'
  );
```

> [!NOTE]
> On production Supabase hosts, you can bypass the manual SQL webhook code by going to your **Supabase Dashboard** -> **Integrations** / **Webhooks**, clicking **Create Webhook**, selecting `leads` table and event `INSERT`, then linking it directly to your Edge Function with the `RESEND_API_KEY` environment secret active.
