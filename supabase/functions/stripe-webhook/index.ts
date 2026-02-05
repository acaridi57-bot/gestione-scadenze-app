import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, stripe-signature",
};

// Price ID mapping - only monthly plan
const PRICE_TO_PLAN: Record<string, string> = {
  "price_1StOD7EiPZqCo6ZjE6oAiJBM": "monthly",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!stripeKey || !webhookSecret || !supabaseUrl || !supabaseServiceKey) {
      console.error("Missing required environment variables");
      return new Response(JSON.stringify({ error: "Server configuration error" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const stripe = new Stripe(stripeKey, { apiVersion: "2023-10-16" });
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const body = await req.text();
    const signature = req.headers.get("stripe-signature");

    if (!signature) {
      console.error("No stripe signature found");
      return new Response(JSON.stringify({ error: "No signature" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let event: Stripe.Event;
    try {
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
    } catch (err) {
      console.error("Webhook signature verification failed:", err);
      return new Response(JSON.stringify({ error: "Invalid signature" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`Processing webhook event: ${event.type}`);

    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const customerId = session.customer as string;
        const subscriptionId = session.subscription as string;
        const userId = session.metadata?.user_id;

        console.log(`Checkout completed for user: ${userId}, customer: ${customerId}`);

        // Default to monthly (only plan available)
        let planType = "monthly";
        if (subscriptionId) {
          try {
            const subscription = await stripe.subscriptions.retrieve(subscriptionId);
            const priceId = subscription.items.data[0]?.price?.id;
            if (priceId && PRICE_TO_PLAN[priceId]) {
              planType = PRICE_TO_PLAN[priceId];
            }
            console.log(`Detected plan type: ${planType} from price: ${priceId}`);
          } catch (subErr) {
            console.error("Error fetching subscription:", subErr);
          }
        }

        if (userId) {
          const { error } = await supabase
            .from("profiles")
            .update({
              stripe_customer_id: customerId,
              subscription_status: "active",
              subscription_plan: planType,
            })
            .eq("id", userId);

          if (error) {
            console.error("Error updating profile:", error);
          } else {
            console.log(`Profile updated: subscription_status=active, subscription_plan=${planType}`);
          }
        }
        break;
      }

      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription;
        const customerId = subscription.customer as string;
        const status = subscription.status;

        console.log(`Subscription updated for customer: ${customerId}, status: ${status}`);

        // Determine plan type from price
        const priceId = subscription.items.data[0]?.price?.id;
        const planType = priceId && PRICE_TO_PLAN[priceId] ? PRICE_TO_PLAN[priceId] : "monthly";

        const { data: profile } = await supabase
          .from("profiles")
          .select("id")
          .eq("stripe_customer_id", customerId)
          .single();

        if (profile) {
          const newStatus = status === "active" || status === "trialing" ? "active" : "inactive";
          const { error } = await supabase
            .from("profiles")
            .update({
              subscription_status: newStatus,
              subscription_plan: planType,
            })
            .eq("id", profile.id);

          if (error) {
            console.error("Error updating subscription:", error);
          } else {
            console.log(`Subscription status updated to ${newStatus}, plan: ${planType}`);
          }
        }
        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        const customerId = subscription.customer as string;

        console.log(`Subscription deleted for customer: ${customerId}`);

        const { data: profile } = await supabase
          .from("profiles")
          .select("id")
          .eq("stripe_customer_id", customerId)
          .single();

        if (profile) {
          const { error } = await supabase
            .from("profiles")
            .update({
              subscription_status: "inactive",
              subscription_plan: null,
            })
            .eq("id", profile.id);

          if (error) {
            console.error("Error canceling subscription:", error);
          } else {
            console.log("Subscription canceled successfully");
          }
        }
        break;
      }

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Webhook error:", error);
    return new Response(JSON.stringify({ error: "Webhook processing failed" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
