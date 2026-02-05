import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      console.error("Missing or invalid Authorization header");
      return new Response(JSON.stringify({ error: "Unauthorized", details: "Token di autenticazione mancante" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");
    const stripeSecretKey = Deno.env.get("STRIPE_SECRET_KEY");
    
    if (!supabaseUrl || !supabaseAnonKey) {
      console.error("Missing Supabase configuration");
      return new Response(JSON.stringify({ error: "Configuration error", details: "Configurazione Supabase mancante" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    
    if (!stripeSecretKey) {
      console.error("Missing Stripe secret key");
      return new Response(JSON.stringify({ error: "Configuration error", details: "Chiave Stripe mancante" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    });

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError) {
      console.error("Auth error:", userError.message);
      return new Response(JSON.stringify({ error: "Auth error", details: userError.message }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    
    if (!user) {
      console.error("No user found");
      return new Response(JSON.stringify({ error: "Unauthorized", details: "Utente non trovato" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userId = user.id;
    const userEmail = user.email;
    console.log(`Processing checkout for user: ${userId}`);

    const stripe = new Stripe(stripeSecretKey, {
      apiVersion: "2023-10-16",
    });

    // Get or create Stripe customer
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("stripe_customer_id")
      .eq("id", userId)
      .maybeSingle();
    
    if (profileError) {
      console.error("Profile fetch error:", profileError.message);
    }

    let customerId = profile?.stripe_customer_id;

    if (!customerId) {
      console.log("Creating new Stripe customer...");
      try {
        const customer = await stripe.customers.create({
          email: userEmail,
          metadata: { supabase_user_id: userId },
        });
        customerId = customer.id;
        console.log(`Created Stripe customer: ${customerId}`);

        // Use service role to update profile
        const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
        if (serviceRoleKey) {
          const serviceClient = createClient(supabaseUrl, serviceRoleKey);
          await serviceClient
            .from("profiles")
            .update({ stripe_customer_id: customerId })
            .eq("id", userId);
        }
      } catch (stripeError: unknown) {
        const errMsg = stripeError instanceof Error ? stripeError.message : "Unknown Stripe error";
        console.error("Stripe customer creation error:", errMsg);
        return new Response(JSON.stringify({ error: "Stripe error", details: `Errore creazione cliente: ${errMsg}` }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // Parse request body for priceId
    let priceId = "price_1StOD7EiPZqCo6ZjE6oAiJBM"; // Default monthly
    try {
      const body = await req.json();
      if (body.priceId) {
        priceId = body.priceId;
      }
    } catch {
      console.log("No body or invalid JSON, using default price");
    }
    
    console.log(`Using price ID: ${priceId}`);

    // Determine base URL for redirects
    const origin = req.headers.get("origin") || "https://zenith-finances-27.lovable.app";
    console.log(`Redirect origin: ${origin}`);

    // Create Stripe checkout session
    try {
      const session = await stripe.checkout.sessions.create({
        customer: customerId,
        mode: "subscription",
        line_items: [
          {
            price: priceId,
            quantity: 1,
          },
        ],
        success_url: `${origin}/#/app?upgrade=success`,
        cancel_url: `${origin}/#/app?upgrade=cancel`,
      });

      console.log(`Checkout session created: ${session.id}`);
      
      return new Response(JSON.stringify({ url: session.url }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    } catch (checkoutError: unknown) {
      const errMsg = checkoutError instanceof Error ? checkoutError.message : "Unknown checkout error";
      console.error("Stripe checkout error:", errMsg);
      return new Response(JSON.stringify({ error: "Checkout error", details: `Errore checkout: ${errMsg}` }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("Unexpected error:", errorMessage);
    return new Response(JSON.stringify({ error: "Server error", details: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
