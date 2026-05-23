import { Leaf, Heart, Globe, Award } from "lucide-react";
import PublicLayout from "@/layouts/PublicLayout";

const team = [
  { name: "Nichole Quimpan", role: "Lead Programmer", initials: "NQ", bio: "Contributes to platform development and ensures a seamless experience for farmers and buyers alike." },
  { name: "Avril Matanguihan", role: "Leader", initials: "AM", bio: "Leads the PhilHarvest team with a vision to connect Filipino farmers with buyers across the country." },
  { name: "Adhonyz Dagle", role: "Frontend Developer", initials: "AD", bio: "Supports the team in building and maintaining the PhilHarvest marketplace ecosystem." },
  { name: "Ayanna Lingahan", role: "Frontend Developer", initials: "AL", bio: "Helps drive community engagement and ensures the platform meets the needs of Filipino farmers." },
  { name: "Bea Dian", role: "Frontend Developer", initials: "DS", bio: "Dedicated to improving the user experience and expanding PhilHarvest's reach across the Philippines." },
  { name: "Iggy Quiobo", role: "Documentation", initials: "IQ", bio: "Works on platform operations and supports the team in delivering fresh produce from farm to table." },
];

export default function About() {
  return (
    <PublicLayout>
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-14">
        {/* Hero */}
        <div className="text-center mb-14">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/10 mb-4">
            <Leaf className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-4xl font-extrabold text-foreground">About PhilHarvest</h1>
          <p className="mt-4 text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            We believe every Filipino farmer deserves a fair market, and every Filipino family deserves access to fresh, affordable produce.
          </p>
        </div>

        {/* Story */}
        <div className="bg-card border border-card-border rounded-2xl p-8 mb-10">
          <h2 className="text-2xl font-bold text-foreground mb-4">Our Story</h2>
          <div className="space-y-4 text-muted-foreground leading-relaxed">
            <p>PhilHarvest was born in 2021 from a simple observation: while Philippine farms produce an abundance of fresh, high-quality agricultural products, too many farmers struggled to reach buyers beyond their local markets. Meanwhile, urban consumers had limited access to truly fresh produce.</p>
            <p>Our founders, a team of Filipino technologists and agricultural experts, set out to close this gap — building a platform that empowers farmers with direct market access while giving buyers transparency, quality, and convenience.</p>
            <p>Today, PhilHarvest connects over 2,400 farmers from Luzon, Visayas, and Mindanao with thousands of buyers across the Philippines, facilitating millions of pesos in transactions monthly.</p>
          </div>
        </div>

        {/* Values */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
          {[
            { icon: Heart, title: "Farmer First", desc: "Every decision we make starts with one question: is this good for Filipino farmers? We champion fair pricing, fast payment, and farmer education." },
            { icon: Globe, title: "Nationwide Reach", desc: "From the highlands of Benguet to the fields of Davao — we bridge the gap between regional farms and national markets." },
            { icon: Award, title: "Quality Commitment", desc: "Every seller on our platform is verified. Every product listed meets our freshness standards. Your satisfaction is guaranteed." },
            { icon: Leaf, title: "Sustainable Agriculture", desc: "We actively support and promote organic and sustainable farming practices, helping preserve the Philippines' rich agricultural heritage." },
          ].map((v) => (
            <div key={v.title} className="bg-card border border-card-border rounded-xl p-6">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center mb-3">
                <v.icon className="w-5 h-5 text-primary" />
              </div>
              <h3 className="font-bold text-foreground mb-2">{v.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{v.desc}</p>
            </div>
          ))}
        </div>

        {/* Stats */}
        <div className="bg-primary rounded-2xl p-8 mb-12">
          <h2 className="text-xl font-bold text-primary-foreground text-center mb-8">PhilHarvest by the Numbers</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
            {[
              { label: "Registered Farmers", value: "2,400+" },
              { label: "Products Listed", value: "1,200+" },
              { label: "Orders Fulfilled", value: "50,000+" },
              { label: "Regions Covered", value: "17" },
            ].map((s) => (
              <div key={s.label}>
                <p className="text-3xl font-extrabold text-primary-foreground">{s.value}</p>
                <p className="text-sm text-primary-foreground/70 mt-1">{s.label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Team */}
        <div>
          <h2 className="text-2xl font-bold text-foreground mb-6 text-center">Meet the Team</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {team.map((m) => (
              <div key={m.name} className="bg-card border border-card-border rounded-xl p-5 flex items-start gap-4">
                <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center text-sm font-bold text-primary shrink-0">
                  {m.initials}
                </div>
                <div>
                  <p className="font-bold text-foreground">{m.name}</p>
                  <p className="text-xs text-primary font-medium mb-1">{m.role}</p>
                  <p className="text-sm text-muted-foreground leading-relaxed">{m.bio}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </PublicLayout>
  );
}
