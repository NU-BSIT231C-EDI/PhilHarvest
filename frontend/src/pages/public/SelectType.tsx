import { useLocation } from "wouter";
import { ShoppingCart, Building2, Leaf, Store, ShieldCheck, CheckCircle, ArrowRight } from "lucide-react";

type AccountType = "small" | "contract" | "seller" | "admin";

interface CardDef {
  type: AccountType;
  icon: React.ElementType;
  label: string;
  tagline: string;
  description: string;
  features: string[];
  accentBg: string;
  accentIcon: string;
  accentBorder: string;
  accentCheck: string;
  accentBtn: string;
  badge?: string;
}

const cards: CardDef[] = [
  {
    type: "small",
    icon: ShoppingCart,
    label: "Small Business Customer",
    tagline: "Retail / ingredients / low volume",
    description: "Standard ecommerce shopping experience",
    features: [
      "Browse the fresh produce marketplace",
      "Cart, coupons & order tracking",
      "Multiple payment options",
      "PWD / Senior Citizen TAPAT discount",
    ],
    accentBg: "bg-blue-50 group-hover:bg-blue-100",
    accentIcon: "text-blue-600",
    accentBorder: "hover:border-blue-400",
    accentCheck: "text-blue-500",
    accentBtn: "bg-blue-600 hover:bg-blue-700 text-white",
  },
  {
    type: "contract",
    icon: Building2,
    label: "Big Business Customer",
    tagline: "Bulk purchasing / long-term supply contracts",
    description: "Contract-based supply system",
    features: [
      "Long-term supply contracts",
      "Bulk pricing negotiations",
      "Scheduled recurring deliveries",
      "EDI-enabled invoice processing",
    ],
    accentBg: "bg-violet-50 group-hover:bg-violet-100",
    accentIcon: "text-violet-600",
    accentBorder: "hover:border-violet-400",
    accentCheck: "text-violet-500",
    accentBtn: "bg-violet-600 hover:bg-violet-700 text-white",
    badge: "Enterprise",
  },
  {
    type: "seller",
    icon: Store,
    label: "Seller / Supplier",
    tagline: "Farmers and produce suppliers",
    description: "Manage products & orders",
    features: [
      "List and manage products",
      "Receive & fulfill orders",
      "Supply planning tools",
      "EDI transaction automation",
    ],
    accentBg: "bg-emerald-50 group-hover:bg-emerald-100",
    accentIcon: "text-emerald-600",
    accentBorder: "hover:border-emerald-400",
    accentCheck: "text-emerald-500",
    accentBtn: "bg-emerald-600 hover:bg-emerald-700 text-white",
  },
  {
    type: "admin",
    icon: ShieldCheck,
    label: "Admin",
    tagline: "Platform administrators only",
    description: "Full platform management",
    features: [
      "Full platform management",
      "User & seller oversight",
      "EDI monitoring & controls",
      "Reports & system settings",
    ],
    accentBg: "bg-slate-100 group-hover:bg-slate-200",
    accentIcon: "text-slate-700",
    accentBorder: "hover:border-slate-400",
    accentCheck: "text-slate-500",
    accentBtn: "bg-slate-700 hover:bg-slate-800 text-white",
    badge: "Restricted",
  },
];

export default function SelectType() {
  const [, navigate] = useLocation();

  function handleSelect(type: AccountType) {
    navigate(`/login?type=${type}`);
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/5 flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-background/80 backdrop-blur border-b border-border">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <button
            onClick={() => navigate("/")}
            className="flex items-center gap-2 font-bold text-xl text-foreground hover:text-primary transition-colors"
          >
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
              <Leaf className="w-5 h-5 text-primary-foreground" />
            </div>
            PhilHarvest
          </button>
          <p className="text-xs text-muted-foreground hidden sm:block">
            Already have an account?{" "}
            <button onClick={() => navigate("/login")} className="text-primary font-medium hover:underline">
              Sign in
            </button>
          </p>
        </div>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center px-4 py-14">
        {/* Heading */}
        <div className="text-center mb-12 max-w-2xl">
          <span className="inline-flex items-center gap-1.5 bg-primary/10 text-primary text-xs font-semibold px-3 py-1 rounded-full border border-primary/20 mb-4">
            Get started — choose your account type
          </span>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-foreground leading-tight">
            How will you use PhilHarvest?
          </h1>
          <p className="mt-3 text-muted-foreground text-base">
            Select the option that best describes you. Your account type determines your dashboard, features, and purchasing flow.
          </p>
        </div>

        {/* 2×2 Card Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 w-full max-w-4xl">
          {cards.map((card) => {
            const Icon = card.icon;
            return (
              <button
                key={card.type}
                onClick={() => handleSelect(card.type)}
                data-testid={`card-type-${card.type}`}
                className={`group text-left bg-card border-2 border-border ${card.accentBorder} rounded-2xl p-7 flex flex-col gap-5 transition-all duration-200 hover:shadow-xl hover:-translate-y-0.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary relative overflow-hidden`}
              >
                {card.badge && (
                  <span className="absolute top-4 right-4 text-[11px] font-bold px-2 py-0.5 rounded-full bg-muted text-muted-foreground border border-border">
                    {card.badge}
                  </span>
                )}

                {/* Icon + title */}
                <div className="flex items-start gap-4 pr-10">
                  <div className={`w-12 h-12 rounded-xl ${card.accentBg} flex items-center justify-center shrink-0 transition-colors`}>
                    <Icon className={`w-6 h-6 ${card.accentIcon}`} />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-foreground leading-snug">{card.label}</h2>
                    <p className="text-xs text-muted-foreground mt-0.5">{card.tagline}</p>
                  </div>
                </div>

                {/* Feature list */}
                <ul className="space-y-2 flex-1">
                  {card.features.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-sm text-foreground/80">
                      <CheckCircle className={`w-4 h-4 ${card.accentCheck} shrink-0 mt-0.5`} />
                      {f}
                    </li>
                  ))}
                </ul>

                {/* CTA */}
                <div className={`w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl font-semibold text-sm ${card.accentBtn} transition-colors`}>
                  Login or Sign Up
                  <ArrowRight className="w-4 h-4" />
                </div>
              </button>
            );
          })}
        </div>

        <p className="mt-10 text-xs text-muted-foreground">
          Need help?{" "}
          <button onClick={() => navigate("/contact")} className="text-primary hover:underline">
            Contact support
          </button>
        </p>
      </main>
    </div>
  );
}
