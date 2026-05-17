"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/client/components/ui/dialog";
import { Button } from "@/client/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/client/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/client/components/ui/table";
import { useCredits, useCreditTransactions, useCreateCheckoutSession } from "@/client/hooks/use-credits";
import { Loader2, Check, Sparkles, ExternalLink, History } from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { Typography } from "@/client/components/ui/typography";
import { Badge } from "@/client/components/ui/badge";
import { cn } from "@/client/utils";

interface CreditsModalContextType {
  openModal: () => void;
  closeModal: () => void;
  isOpen: boolean;
}

const CreditsModalContext = createContext<CreditsModalContextType | undefined>(undefined);

export function useCreditsModal() {
  const context = useContext(CreditsModalContext);
  if (context === undefined) {
    throw new Error("useCreditsModal must be used within a CreditsModalProvider");
  }
  return context;
}

// Credit package definitions matching backend
const CREDIT_PACKAGES = [
  { 
    id: "starter" as const, 
    credits: 500, 
    price: 5, 
    label: "Starter", 
    badge: undefined, 
    bonus: undefined 
  },
  {
    id: "basic" as const,
    credits: 1000,
    price: 10,
    label: "Basic",
    badge: undefined,
    bonus: undefined,
  },
  {
    id: "popular" as const,
    credits: 2500,
    price: 20,
    label: "Popular",
    badge: "Best Value" as const,
    bonus: "25% Bonus" as const,
  },
  { 
    id: "pro" as const, 
    credits: 6000, 
    price: 50, 
    label: "Pro", 
    badge: undefined, 
    bonus: "20% Bonus" as const 
  },
  { 
    id: "enterprise" as const, 
    credits: 15000, 
    price: 100, 
    label: "Enterprise", 
    badge: "Pro Choice" as const, 
    bonus: "50% Bonus" as const 
  },
];

export function CreditsModalProvider({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("buy");
  const [selectedPackage, setSelectedPackage] = useState<string | null>(null);
  const router = useRouter();

  const { data: credits } = useCredits();
  const { data: transactions = [], isLoading: isLoadingTransactions } = useCreditTransactions(undefined, {
    enabled: isOpen,
  });
  const createCheckoutSession = useCreateCheckoutSession();

  const openModal = () => setIsOpen(true);
  const closeModal = () => setIsOpen(false);

  const handleBuyPackage = async (packageId: string) => {
    setSelectedPackage(packageId);
    try {
      const checkoutUrl = await createCheckoutSession.mutateAsync(packageId);
      // Redirect to Stripe Checkout
      window.location.href = checkoutUrl;
    } catch (error) {
      console.error("Failed to create checkout session:", error);
      toast.error("Failed to start checkout. Please try again.");
      setSelectedPackage(null);
    }
  };

  return (
    <CreditsModalContext.Provider value={{ openModal, closeModal, isOpen }}>
      {children}
      <React.Suspense fallback={null}>
        <CreditsPaymentHandler setIsOpen={setIsOpen} setActiveTab={setActiveTab} />
      </React.Suspense>
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="sm:max-w-[700px] p-0 overflow-hidden gap-0 bg-white rounded-[2rem] border border-gray-100 shadow-2xl">
          <DialogHeader className="p-8 pb-4">
            <Typography variant="h2">Lattice Credits</Typography>
            <Typography variant="muted" className="mt-1">Purchase credits to power your AI-enhanced PDFs.</Typography>
          </DialogHeader>
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <div className="px-6 border-b border-gray-200">
              <TabsList className="grid w-full grid-cols-2 bg-transparent h-auto p-0">
                <TabsTrigger
                  value="buy"
                  className="data-[state=active]:border-b-2 data-[state=active]:border-yellow-400 data-[state=active]:text-gray-900 data-[state=active]:shadow-none rounded-none px-4 py-3 bg-transparent text-gray-500 hover:text-gray-900 transition-colors"
                >
                  Buy Credits
                </TabsTrigger>
                <TabsTrigger
                  value="history"
                  className="data-[state=active]:border-b-2 data-[state=active]:border-yellow-400 data-[state=active]:text-gray-900 data-[state=active]:shadow-none rounded-none px-4 py-3 bg-transparent text-gray-500 hover:text-gray-900 transition-colors"
                >
                  History
                </TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="buy" className="p-0 mt-0">
              <div className="bg-gray-50/50 px-8 py-6 border-b border-gray-100 flex items-center justify-between">
                <div>
                  <Typography variant="tiny" className="font-black uppercase tracking-widest text-gray-400">Account Balance</Typography>
                  <div className="flex items-baseline gap-2 mt-1">
                    <Typography variant="h1" className="text-3xl">
                      {credits ? Math.floor(credits).toLocaleString() : "0"}
                    </Typography>
                    <Typography variant="small" className="font-bold text-gray-400 uppercase tracking-tight">Credits</Typography>
                  </div>
                </div>
                <div className="flex -space-x-1">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="w-6 h-6 rounded-full bg-yellow-400 border-2 border-white" />
                  ))}
                </div>
              </div>

              <div className="p-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {CREDIT_PACKAGES.map((pkg) => (
                    <button
                      key={pkg.id}
                      onClick={() => handleBuyPackage(pkg.id)}
                      disabled={createCheckoutSession.isPending}
                      className={`relative flex flex-col p-4 rounded-xl border-2 transition-all text-left cursor-pointer ${
                        pkg.badge
                          ? "border-yellow-400 bg-yellow-50/30 ring-1 ring-yellow-400/20"
                          : "border-gray-100 bg-white hover:border-yellow-200"
                      } hover:shadow-lg hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed group`}
                    >
                      {pkg.badge && (
                        <div className="absolute -top-2 left-2 px-2 py-0.5 bg-yellow-400 text-[9px] font-black uppercase tracking-tighter rounded-md shadow-sm">
                          {pkg.badge}
                        </div>
                      )}
                      <div className="flex-1 space-y-1">
                        <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider">{pkg.label}</h3>
                        <div className="flex items-baseline gap-1">
                          <span className="text-2xl font-black text-gray-900">${pkg.price}</span>
                          {pkg.bonus && <span className="text-[10px] font-bold text-yellow-600">{pkg.bonus}</span>}
                        </div>
                        <p className="text-[11px] text-gray-600 font-medium">
                          {pkg.credits.toLocaleString()} credits <br />
                        </p>
                      </div>

                      <div className="mt-4 flex items-center justify-between">
                        <div className="h-8 w-8 rounded-full bg-gray-900 flex items-center justify-center group-hover:bg-yellow-500 transition-colors">
                          {selectedPackage === pkg.id && createCheckoutSession.isPending ? (
                            <Loader2 className="h-4 w-4 animate-spin text-white" />
                          ) : (
                            <Check className="h-4 w-4 text-white" />
                          )}
                        </div>
                        <span className="text-[10px] font-bold text-gray-400 group-hover:text-gray-900 transition-colors">
                          Select →
                        </span>
                      </div>
                    </button>
                  ))}
                </div>

                <div className="mt-6 flex items-center justify-center gap-2 text-[10px] text-gray-400 bg-gray-50 py-2 rounded-lg border border-gray-100">
                  <span className="flex items-center gap-1">🔒 Stripe Secured</span>
                  <span className="w-1 h-1 rounded-full bg-gray-200" />
                  <span>Encrypted</span>
                  <span className="w-1 h-1 rounded-full bg-gray-200" />
                  <span>24/7 Support</span>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="history" className="p-6 mt-0">
              <div className="max-h-[400px] overflow-y-auto">
                {isLoadingTransactions ? (
                  <div className="flex justify-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                  </div>
                ) : transactions.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-muted-foreground space-y-2">
                    <span className="text-4xl">🧾</span>
                    <p>No transactions yet</p>
                  </div>
                ) : (
                  <div className="rounded-2xl border border-gray-100 overflow-hidden shadow-sm bg-white">
                    <Table>
                      <TableHeader className="bg-gray-50/50">
                        <TableRow className="hover:bg-transparent border-gray-100">
                          <TableHead className="py-4">
                            <Typography variant="tiny" className="font-black uppercase tracking-widest text-gray-400">Date</Typography>
                          </TableHead>
                          <TableHead className="py-4">
                            <Typography variant="tiny" className="font-black uppercase tracking-widest text-gray-400">Transaction</Typography>
                          </TableHead>
                          <TableHead className="py-4">
                            <Typography variant="tiny" className="font-black uppercase tracking-widest text-gray-400">Session</Typography>
                          </TableHead>
                          <TableHead className="text-right py-4">
                            <Typography variant="tiny" className="font-black uppercase tracking-widest text-gray-400">Amount</Typography>
                          </TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {transactions.map((tx) => (
                          <TableRow
                            key={tx.id}
                            className="hover:bg-yellow-50/30 transition-colors border-gray-100 last:border-0 group"
                          >
                            <TableCell className="py-4">
                              <Typography variant="small" className="text-gray-500 font-medium">
                                {new Date(tx.createdAt).toLocaleDateString()}
                              </Typography>
                            </TableCell>
                            <TableCell className="py-4">
                              <div className="flex flex-col gap-1">
                                <div className="flex items-center gap-2">
                                  <Badge 
                                    variant={tx.amount > 0 ? "success" : "secondary"}
                                    className="px-1.5 py-0 text-[9px] uppercase tracking-tighter"
                                  >
                                    {tx.transactionType.replace(/_/g, " ")}
                                  </Badge>
                                </div>
                                {tx.description && (
                                  <Typography 
                                    variant="tiny" 
                                    className="text-gray-400 line-clamp-1 max-w-[200px]"
                                    title={tx.description}
                                  >
                                    {tx.description}
                                  </Typography>
                                )}
                              </div>
                            </TableCell>
                            <TableCell className="py-4">
                              {tx.sessionId ? (
                                <Link
                                  href={`/session/${tx.sessionId}`}
                                  className="inline-flex items-center gap-1.5 text-xs font-bold text-gray-900 hover:text-brand-primary transition-colors group/link"
                                >
                                  View Session
                                  <ExternalLink className="w-3 h-3 text-gray-300 group-hover/link:text-brand-primary transition-colors" />
                                </Link>
                              ) : (
                                <Typography variant="tiny" className="text-gray-300">—</Typography>
                              )}
                            </TableCell>
                            <TableCell className="text-right py-4">
                              <Typography 
                                variant="small" 
                                className={cn(
                                  "font-black tracking-tight",
                                  tx.amount > 0 ? "text-green-600" : "text-gray-900"
                                )}
                              >
                                {tx.amount > 0 ? "+" : ""}
                                {tx.amount.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                              </Typography>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>
    </CreditsModalContext.Provider>
  );
}

function CreditsPaymentHandler({
  setIsOpen,
  setActiveTab,
}: {
  setIsOpen: (open: boolean) => void;
  setActiveTab: (tab: string) => void;
}) {
  const searchParams = useSearchParams();
  const router = useRouter();

  useEffect(() => {
    if (!searchParams) return;

    const paymentStatus = searchParams.get("payment");
    if (paymentStatus === "success") {
      toast.success("Payment successful! Your credits have been added.", { duration: 5000 });
      setActiveTab("history"); // Show transaction history
      setIsOpen(true);
      // Clear the URL param
      const newParams = new URLSearchParams(searchParams.toString());
      newParams.delete("payment");
      router.replace(window.location.pathname + (newParams.toString() ? `?${newParams.toString()}` : ""));
    } else if (paymentStatus === "cancelled") {
      toast.error("Payment was cancelled.", { duration: 4000 });
      // Clear the URL param
      const newParams = new URLSearchParams(searchParams.toString());
      newParams.delete("payment");
      router.replace(window.location.pathname + (newParams.toString() ? `?${newParams.toString()}` : ""));
    }
  }, [searchParams, router, setIsOpen, setActiveTab]);

  return null;
}
