import { Link } from "wouter";
import { Leaf, Phone, Mail, MapPin } from "lucide-react";
import { Separator } from "@/components/ui/separator";

export default function Footer() {
  return (
    <footer className="bg-foreground text-background/80 mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {/* Brand */}
          <div className="lg:col-span-1">
            <div className="flex items-center gap-2 font-bold text-xl text-background mb-3">
              <div className="w-8 h-8 bg-accent rounded-lg flex items-center justify-center">
                <Leaf className="w-5 h-5 text-accent-foreground" />
              </div>
              <span>PhilHarvest</span>
            </div>
            <p className="text-sm leading-relaxed text-background/60">
              Connecting Filipino farmers to markets across the Philippines. Fresh produce, fair prices, direct from the farm.
            </p>
            <div className="mt-4 space-y-2">
              <div className="flex items-center gap-2 text-sm text-background/60">
                <Phone className="w-4 h-4 shrink-0" />
                <span>(02) 8888-HARVEST</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-background/60">
                <Mail className="w-4 h-4 shrink-0" />
                <span>support@philharvest.ph</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-background/60">
                <MapPin className="w-4 h-4 shrink-0" />
                <span>Makati City, Metro Manila</span>
              </div>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="font-semibold text-background mb-3">Platform</h4>
            <ul className="space-y-2 text-sm">
              {[
                { label: "Marketplace", href: "/marketplace" },
                { label: "About Us", href: "/about" },
                { label: "Contact", href: "/contact" },
                { label: "Blog", href: "#blog" },
              ].map((link) => (
                <li key={link.label}>
                  <Link href={link.href} className="text-background/60 hover:text-background transition-colors">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* For Sellers */}
          <div>
            <h4 className="font-semibold text-background mb-3">For Sellers</h4>
            <ul className="space-y-2 text-sm">
              {[
                { label: "Sell on PhilHarvest", href: "/register" },
                { label: "Seller Dashboard", href: "/seller/dashboard" },
                { label: "Seller Guide", href: "#seller-guide" },
                { label: "Logistics Partners", href: "#logistics-partners" },
              ].map((link) => (
                <li key={link.label}>
                  <Link href={link.href} className="text-background/60 hover:text-background transition-colors">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Categories */}
          <div>
            <h4 className="font-semibold text-background mb-3">Categories</h4>
            <ul className="space-y-2 text-sm">
              {["Vegetables", "Fruits", "Root Crops", "Seedlings & Saplings", "Grains & Cereals"].map((cat) => (
                <li key={cat}>
                  <Link href={`/marketplace?category=${cat.toLowerCase()}`} className="text-background/60 hover:text-background transition-colors">
                    {cat}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <Separator className="my-8 bg-background/10" />

        <div className="flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-background/50">
          <p>© 2024 PhilHarvest Corporation. All rights reserved.</p>
          <div className="flex items-center gap-4">
            <Link href="/privacy" className="hover:text-background/80 transition-colors">Privacy Policy</Link>
            <Link href="/terms" className="hover:text-background/80 transition-colors">Terms of Service</Link>
            <Link href="/cookies" className="hover:text-background/80 transition-colors">Cookie Policy</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
