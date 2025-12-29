import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { db } from '@/lib/db';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-10-16',
});

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;

export async function POST(request: NextRequest) {
  const body = await request.text();
  const signature = request.headers.get('stripe-signature');

  if (!signature) {
    return NextResponse.json({ error: 'No signature' }, { status: 400 });
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (err: any) {
    console.error('⚠️  Webhook signature verification failed:', err.message);
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  console.log('✅ Stripe webhook received:', event.type);

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        
        const userId = parseInt(session.metadata?.userId || '0');
        const planId = session.metadata?.planId;

        if (!userId || !planId) {
          console.error('Missing metadata in checkout session');
          break;
        }

        const plan = await db.plan.findUnique({ where: { id: planId } });
        if (!plan) {
          console.error('Plan not found:', planId);
          break;
        }

        // Atualizar usuário com novo plano e limites
        await db.user.update({
          where: { id: userId },
          data: {
            stripeCustomerId: session.customer as string,
            plan: plan.name,
            maxCampaigns: plan.maxCampaigns,
            maxVariations: plan.maxVariations,
            maxClicks: plan.maxClicks,
            maxDomains: plan.maxDomains,
          }
        });

        // Criar registro de assinatura
        if (session.subscription) {
          await db.subscription.create({
            data: {
              userId,
              planId: plan.id,
              stripeSubscriptionId: session.subscription as string,
              stripeCustomerId: session.customer as string,
              stripePriceId: session.line_items?.data[0]?.price?.id || '',
              status: 'active',
              interval: session.line_items?.data[0]?.price?.recurring?.interval || 'month',
            }
          });
        }

        console.log('✅ User upgraded to plan:', plan.name);
        break;
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription;
        
        await db.subscription.updateMany({
          where: { stripeSubscriptionId: subscription.id },
          data: {
            status: subscription.status,
            stripeCurrentPeriodEnd: new Date(subscription.current_period_end * 1000),
          }
        });

        console.log('✅ Subscription updated:', subscription.id);
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        
        // Atualizar status da assinatura
        await db.subscription.updateMany({
          where: { stripeSubscriptionId: subscription.id },
          data: {
            status: 'canceled',
            canceledAt: new Date(),
          }
        });

        // Downgrade usuário para plano free
        const user = await db.user.findFirst({
          where: { stripeCustomerId: subscription.customer as string }
        });

        if (user) {
          await db.user.update({
            where: { id: user.id },
            data: {
              plan: 'free',
              maxCampaigns: 2,
              maxVariations: 2,
              maxClicks: 1000,
              maxDomains: 0,
            }
          });
        }

        console.log('✅ Subscription canceled, user downgraded to free');
        break;
      }

      case 'invoice.payment_succeeded': {
        const invoice = event.data.object as Stripe.Invoice;
        
        await db.subscription.updateMany({
          where: { stripeSubscriptionId: invoice.subscription as string },
          data: {
            status: 'active',
          }
        });

        console.log('✅ Payment succeeded for subscription');
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice;
        
        await db.subscription.updateMany({
          where: { stripeSubscriptionId: invoice.subscription as string },
          data: {
            status: 'past_due',
          }
        });

        console.log('⚠️  Payment failed for subscription');
        break;
      }

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return NextResponse.json({ received: true });
  } catch (error: any) {
    console.error('Error processing webhook:', error);
    return NextResponse.json(
      { error: 'Webhook processing failed' },
      { status: 500 }
    );
  }
}
