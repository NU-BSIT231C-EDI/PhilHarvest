import { useLocation } from "wouter";
import { ShoppingCart, Building2, ArrowRight, CheckCircle, Leaf, Store } from "lucide-react";
import { Button } from "@/components/ui/button";

const smallFeatures = [
  "Browse fresh produce marketplace",
  "Order in small quantities",
  "Apply discount coupons",
  "Real-time order tracking",
  "Multiple payment options (GCash, COD, Bank)",
];

const contractFeatures = [
  "Long-term supply contracts",
  "Bulk pricing negotiations",
  "Scheduled recurring deliveries",
  "EDI-enabled invoice processing",
  "Dedicated account management",
  "Digital contract signing",
];

function setBusinessType(type: "small" | "contract" | "seller") {
  localStorage.setItem("businessType", type);
}

export default function SelectType() {
  const [, navigate] = useLocation();

  function handleSelect(type: "small" | "contract" | "seller", action: "register" | "login") {
    setBusinessType(type);
    const path = action === "register" ? `/register?type=${type}` : `/login?type=${type}`;
    navigate(path);
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/5 flex flex-col">
      {/* Header */}
      <div className="flex items-center px-6 py-4 border-b border-border bg-background/80 backdrop-blur sticky top-0 z-10">
        <button
          onClick={() => navigate("/")}
          className="flex items-center gap-2 font-bold text-xl text-foreground hover:text-primary transition-colors"
        >
          <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
            <Leaf className="w-5 h-5 text-primary-foreground" />
          </div>
          PhilHarvest
        </button>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center px-4 py-12">
        {/* Heading */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 bg-primary/10 text-primary text-sm font-semibold px-4 py-1.5 rounded-full border border-primary/20 mb-4">
            Step 1 of 2 — Choose Your Account Type
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-foreground">
            How would you like to use PhilHarvest?
          </h1>
          <p className="mt-3 text-muted-foreground text-base max-w-xl mx-auto">
            Select the option that best matches your buying needs. This determines your dashboard, features, and purchasing flow.
          </p>
        </div>

        {/* Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-3xl">

          {/* Small Business Customer */}
          <div className="bg-card border-2 border-border hover:border-blue-400 rounded-2xl p-8 flex flex-col gap-5 transition-all duration-200 hover:shadow-xl group">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-blue-50 flex items-center justify-center border border-blue-100 group-hover:bg-blue-100 transition-colors shrink-0">
                <ShoppingCart className="w-7 h-7 text-blue-600" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-foreground">Small Business Customer</h2>
                <p className="text-sm text-muted-foreground">For individuals & small businesses buying fresh produce</p>
              </div>
            </div>

            <ul className="space-y-2.5">
              {smallFeatures.map((f) => (
                <li key={f} className="flex items-start gap-2.5 text-sm text-foreground/80">
                  <CheckCircle className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
                  {f}
                </li>
              ))}
            </ul>

            <div className="mt-auto space-y-2.5">
              <Button
                className="w-full gap-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold"
                onClick={() => handleSelect("small", "register")}
                data-testid="button-select-small-register"
              >
                Get Started <ArrowRight className="w-4 h-4" />
              </Button>
              <Button
                variant="outline"
                className="w-full border-blue-200 text-blue-700 hover:bg-blue-50 font-medium"
                onClick={() => handleSelect("small", "login")}
                data-testid="button-select-small-login"
              >
                I already have an account — Sign In
              </Button>
            </div>
          </div>

          {/* Big Business / Contract */}
          <div className="bg-card border-2 border-border hover:border-purple-400 rounded-2xl p-8 flex flex-col gap-5 transition-all duration-200 hover:shadow-xl group relative overflow-hidden">
            <div className="absolute top-4 right-4">
              <span className="bg-purple-100 text-purple-700 text-xs font-bold px-2.5 py-1 rounded-full border border-purple-200">
                Enterprise
              </span>
            </div>

            <div className="flex items-center gap-4 pr-16">
              <div className="w-14 h-14 rounded-2xl bg-purple-50 flex items-center justify-center border border-purple-100 group-hover:bg-purple-100 transition-colors shrink-0">
                <Building2 className="w-7 h-7 text-purple-600" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-foreground">Big Business Customer</h2>
                <p className="text-sm text-muted-foreground">For large businesses, restaurants & enterprises buying in bulk</p>
              </div>
            </div>

            <ul className="space-y-2.5">
              {contractFeatures.map((f) => (
                <li key={f} className="flex items-start gap-2.5 text-sm text-foreground/80">
                  <CheckCircle className="w-4 h-4 text-purple-500 shrink-0 mt-0.5" />
                  {f}
                </li>
              ))}
            </ul>

            <div className="mt-auto space-y-2.5">
              <Button
                className="w-full gap-2 bg-purple-600 hover:bg-purple-700 text-white font-semibold"
                onClick={() => handleSelect("contract", "register")}
                data-testid="button-select-contract-register"
              >
                Apply for Contract Access <ArrowRight className="w-4 h-4" />
              </Button>
              <Button
                variant="outline"
                className="w-full border-purple-200 text-purple-700 hover:bg-purple-50 font-medium"
                onClick={() => handleSelect("contract", "login")}
                data-testid="button-select-contract-login"
              >
                I already have an account — Sign In
              </Button>
            </div>
          </div>
        </div>

        {/* Seller / Admin links */}
        <div className="mt-8 flex flex-col sm:flex-row items-center gap-4 text-sm text-muted-foreground">
          <button
            onClick={() => handleSelect("seller", "login")}
            className="flex items-center gap-1.5 text-primary font-semibold hover:underline"
            data-testid="button-seller-login"
          >
            <Store className="w-4 h-4" />
            Seller / Farmer — Sign In here
          </button>
          <span className="hidden sm:inline text-border">|</span>
          <button
            onClick={() => handleSelect("seller", "register")}
            className="text-primary font-semibold hover:underline"
            data-testid="button-seller-register"
          >
            Register as a Seller / Farmer
          </button>
        </div>
      </div>
    </div>
  );
}
