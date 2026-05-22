import { createClient } from "@/server/lib/supabase/server";
import { supabaseAdmin } from "@/server/lib/supabase";
import { redirect } from "next/navigation";
import { DollarSign, Gift, Activity, PieChart } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function AdminDashboardPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const ALLOWED_ADMIN_EMAILS = ["saccoagustin@hotmail.com"];
  
  if (!user.email || !ALLOWED_ADMIN_EMAILS.includes(user.email)) {
    redirect("/dashboard");
  }

  // Fetch stats directly using supabaseAdmin to bypass RLS policies
  const { data: transactions, error } = await supabaseAdmin.from("credit_transactions").select("*");

  if (error) {
    console.error("Failed to fetch transactions for admin:", error);
    return <div>Error loading admin dashboard.</div>;
  }

  // Aggregate stats
  let totalWelcomeCredits = 0;
  let totalPurchasedCredits = 0;
  let totalUsageCredits = 0;
  let totalBaseCostUsd = 0;

  transactions.forEach((tx) => {
    if (tx.transaction_type === "welcome_bonus") {
      totalWelcomeCredits += tx.amount;
    } else if (tx.transaction_type === "purchase") {
      totalPurchasedCredits += tx.amount;
    } else if (tx.transaction_type === "usage") {
      // Usage amounts are negative
      totalUsageCredits += Math.abs(tx.amount);
      if (tx.base_cost) {
        totalBaseCostUsd += Number(tx.base_cost);
      }
    }
  });

  // Convert USD cost into "Credit Equivalent Cost" for margin calculation
  // Base config expects 1 USD = 10,000 Credits currently
  const usageCostInCreditsEquivalent = totalBaseCostUsd * 10000;
  const inferredMarginPercent =
    usageCostInCreditsEquivalent > 0
      ? ((totalUsageCredits - usageCostInCreditsEquivalent) / usageCostInCreditsEquivalent) * 100
      : 0;

  return (
    <div className="container mx-auto p-8 max-w-6xl">
      <div className="mb-8">
        <h1 className="text-3xl font-heading font-bold text-gray-900">Admin Dashboard</h1>
        <p className="text-gray-500">Overview of credit economics and usage</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
        <StatCard
          title="Free Credits Given"
          value={totalWelcomeCredits.toLocaleString()}
          subtitle="via Welcome Bonus"
          icon={<Gift className="w-5 h-5 text-purple-500" />}
        />
        <StatCard
          title="Credits Purchased"
          value={totalPurchasedCredits.toLocaleString()}
          subtitle="via Stripe"
          icon={<DollarSign className="w-5 h-5 text-green-500" />}
        />
        <StatCard
          title="Credits Consumed"
          value={totalUsageCredits.toLocaleString(undefined, { maximumFractionDigits: 0 })}
          subtitle="via AI Inference"
          icon={<Activity className="w-5 h-5 text-blue-500" />}
        />
        <StatCard
          title="Inferred Margin"
          value={`~${inferredMarginPercent.toFixed(1)}%`}
          subtitle="Profit on AI Usage"
          icon={<PieChart className="w-5 h-5 text-sky-500" />}
        />
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
        <h2 className="text-xl font-bold mb-6 border-b pb-4">Economics Breakdown</h2>
        <div className="space-y-6 text-sm text-gray-700">
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-gray-50 p-4 rounded-xl">
              <p className="font-semibold text-gray-900 mb-2">The Credit Multiplier</p>
              <p>
                Currently, <strong>1 USD = 10,000 Credits</strong>. When users buy packages, they receive bonuses
                on top of this base rate (e.g., $10 buys 120,000 credits, representing a 20% bonus).
              </p>
            </div>
            <div className="bg-gray-50 p-4 rounded-xl">
              <p className="font-semibold text-gray-900 mb-2">How Inference is Charged</p>
              <p>
                When a user asks a question, we calculate the raw Google Gemini API cost in USD (e.g. $0.002).
                We then apply a <strong>50% multiplier</strong> to get an inflated USD cost ($0.003). 
                Finally, we convert that back to credits ($0.003 * 10,000 = 30 credits deducted).
              </p>
            </div>
            <div className="col-span-2 bg-blue-50 p-4 rounded-xl border border-blue-100 mt-2">
              <p className="font-semibold text-blue-900 mb-2">The Real Margin</p>
              <p className="text-blue-800">
                Because of the massive token-level economics, even if you offer a "40% bonus" on large credit packages
                (like $25 for 350,000 credits), the actual raw cost to you (paid to Google) per credit is a tiny fraction of a cent. 
                <br /><br />
                Total RAW Google Cost for all inference so far: <strong>${totalBaseCostUsd.toFixed(5)}</strong>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ title, value, subtitle, icon }: { title: string; value: string; subtitle: string; icon: React.ReactNode }) {
  return (
    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col justify-between hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-medium text-gray-500">{title}</h3>
        <div className="p-2 bg-gray-50 rounded-lg">{icon}</div>
      </div>
      <div>
        <p className="text-3xl font-heading font-bold text-gray-900">{value}</p>
        <p className="text-xs text-gray-400 mt-1">{subtitle}</p>
      </div>
    </div>
  );
}
