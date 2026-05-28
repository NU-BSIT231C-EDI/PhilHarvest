import Navbar from "@/components/shared/Navbar";
import Footer from "@/components/shared/Footer";
import RoleSwitcher from "@/components/shared/RoleSwitcher";

interface PublicLayoutProps {
  children: React.ReactNode;
}

export default function PublicLayout({ children }: PublicLayoutProps) {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />
      <main className="flex-1">{children}</main>
      <Footer />
      <RoleSwitcher />
    </div>
  );
}
