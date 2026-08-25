// supabase/functions/send-order-confirmation/index.ts
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY")!;
const FROM_EMAIL = Deno.env.get("FROM_EMAIL")!;
const APP_URL = Deno.env.get("APP_URL")!;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

serve(async (req) => {
  try {
    const payload = await req.json();
    const payment = payload.record; // ini row dari tabel payments yang baru berubah

    // Hanya kirim email kalau status payment jadi "paid"
    if (payment.status !== "paid") {
      return new Response(JSON.stringify({ skipped: true, reason: "not paid" }), { status: 200 });
    }

    // Ambil data order terkait (nama, email, invoice, total, tracking_token)
    const { data: order, error } = await supabase
      .from("orders")
      .select("*")
      .eq("id", payment.order_id)
      .single();

    if (error || !order) {
      return new Response(JSON.stringify({ error: "order not found" }), { status: 404 });
    }

    if (!order.customer_email) {
      return new Response(JSON.stringify({ skipped: true, reason: "no email" }), { status: 200 });
    }

    const trackingUrl = `${APP_URL}/track/${order.tracking_token}`;

    const emailHtml = `
      <div style="font-family: sans-serif; max-width: 480px; margin: auto;">
        <h2>Pesanan Kamu Berhasil! ☕</h2>
        <p>Halo ${order.customer_name},</p>
        <p>Terima kasih sudah memesan. Nomor invoice kamu:</p>
        <p style="font-size:18px; font-weight:bold;">${order.invoice_no}</p>
        <p>Total: <strong>Rp${Number(order.total).toLocaleString("id-ID")}</strong></p>
        <p>Pantau status pesanan kamu secara real-time di link berikut:</p>
        <a href="${trackingUrl}" style="display:inline-block; padding:10px 20px; background:#111; color:#fff; text-decoration:none; border-radius:6px;">
          Lacak Pesanan
        </a>
      </div>
    `;

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: FROM_EMAIL,
        to: order.customer_email,
        subject: `Pesanan ${order.invoice_no} Berhasil Dibuat`,
        html: emailHtml,
      }),
    });

    const result = await res.json();
    return new Response(JSON.stringify(result), {
      status: res.ok ? 200 : 500,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
});