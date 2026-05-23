import { Switch, Route, Router as WouterRouter, Redirect } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import { CartProvider } from "@/contexts/CartContext";
import { WishlistProvider } from "@/contexts/WishlistContext";
import { SellerProductsProvider } from "@/contexts/SellerProductsContext";
import { useAuthStore } from "@/store/auth";

// Public Pages
import Home from "@/pages/public/Home";
import SelectType from "@/pages/public/SelectType";
import Marketplace from "@/pages/public/Marketplace";
import ProductDetail from "@/pages/public/ProductDetail";
import About from "@/pages/public/About";
import Contact from "@/pages/public/Contact";
import Login from "@/pages/public/Login";
import Register from "@/pages/public/Register";
import ForgotPassword from "@/pages/public/ForgotPassword";

// Customer Pages
import CustomerDashboard from "@/pages/customer/Dashboard";
import CustomerBrowse from "@/pages/customer/Browse";
import CustomerCart from "@/pages/customer/Cart";
import Checkout from "@/pages/customer/Checkout";
import CustomerOrders from "@/pages/customer/Orders";
import OrderTracking from "@/pages/customer/OrderTracking";
import Wishlist from "@/pages/customer/Wishlist";
import CustomerReviews from "@/pages/customer/Reviews";
import CustomerNotifications from "@/pages/customer/Notifications";
import CustomerProfile from "@/pages/customer/Profile";

// Contract (Big Business) Pages
import ContractDashboard from "@/pages/contract/Dashboard";
import ActiveContracts from "@/pages/contract/ActiveContracts";
import ContractRequest from "@/pages/contract/ContractRequest";
import ContractDetail from "@/pages/contract/ContractDetail";
import ContractRenewal from "@/pages/contract/ContractRenewal";
import ContractTracking from "@/pages/contract/Tracking";
import ContractNotifications from "@/pages/contract/Notifications";
import ContractProfile from "@/pages/contract/Profile";
import ContractDeliveryHistory from "@/pages/contract/DeliveryHistory";

// Seller Pages
import SellerDashboard from "@/pages/seller/Dashboard";
import SellerProducts from "@/pages/seller/Products";
import ProductForm from "@/pages/seller/ProductForm";
import Inventory from "@/pages/seller/Inventory";
import SellerOrders from "@/pages/seller/Orders";
import SellerReports from "@/pages/seller/Reports";
import Messages from "@/pages/seller/Messages";
import Shipments from "@/pages/seller/Shipments";
import SellerReviewsPage from "@/pages/seller/ReviewsPage";
import SellerProfile from "@/pages/seller/Profile";
import SellerContractManagement from "@/pages/seller/ContractManagement";
import IncomingContractRequests from "@/pages/seller/IncomingContractRequests";
import SellerActiveContracts from "@/pages/seller/ActiveContracts";
import SellerContractDetail from "@/pages/seller/SellerContractDetail";
import ContractInventoryTracking from "@/pages/seller/ContractInventoryTracking";
import SupplyPlanning from "@/pages/seller/SupplyPlanning";
import EDIAutomation from "@/pages/seller/EDIAutomation";


// Admin Pages
import AdminDashboard from "@/pages/admin/Dashboard";
import AdminUsers from "@/pages/admin/Users";
import AdminProducts from "@/pages/admin/Products";
import AdminOrders from "@/pages/admin/Orders";
import AdminLogistics from "@/pages/admin/Logistics";
import AdminReports from "@/pages/admin/Reports";
import ContentManagement from "@/pages/admin/Content";
import SystemSettings from "@/pages/admin/Settings";
import AdminContractMonitoring from "@/pages/admin/ContractMonitoring";
import AdminContractDetail from "@/pages/admin/ContractDetail";
import AdminDeliveryManagement from "@/pages/admin/DeliveryManagement";
import AdminShipmentTracking from "@/pages/admin/ShipmentTracking";
import AdminDriverMonitoring from "@/pages/admin/DriverMonitoring";
import AdminRouteManagement from "@/pages/admin/RouteManagement";
import AdminProofOfDelivery from "@/pages/admin/ProofOfDelivery";
import AdminDeliveryHistory from "@/pages/admin/AdminDeliveryHistory";
import EdiDashboard from "@/pages/admin/EdiDashboard";
import EdiTransactions from "@/pages/admin/EdiTransactions";
import EdiCompanies from "@/pages/admin/EdiCompanies";
import EdiOutbound from "@/pages/admin/EdiOutbound";
import AdminOnboarding from "@/pages/admin/Onboarding";

const queryClient = new QueryClient();

function Router() {
  const { role } = useAuthStore();
  return (
    <Switch>
      {/* Auth guards — must come before specific routes */}
      {role !== "admin" && <Route path="/admin/:rest*"><Redirect to="/login" /></Route>}
      {role !== "seller" && role !== "admin" && <Route path="/seller/:rest*"><Redirect to="/login" /></Route>}
      {role !== "customer" && role !== "admin" && <Route path="/customer/:rest*"><Redirect to="/login" /></Route>}
      {role !== "contract" && role !== "admin" && <Route path="/contract/:rest*"><Redirect to="/login" /></Route>}

      {/* Public Routes */}
      <Route path="/" component={Home} />
      <Route path="/select-type" component={SelectType} />
      <Route path="/marketplace" component={Marketplace} />
      <Route path="/marketplace/:id" component={ProductDetail} />
      <Route path="/about" component={About} />
      <Route path="/contact" component={Contact} />
      <Route path="/login" component={Login} />
      <Route path="/register" component={Register} />
      <Route path="/forgot-password" component={ForgotPassword} />

      {/* Customer Routes */}
      <Route path="/customer/dashboard" component={CustomerDashboard} />
      <Route path="/customer/browse" component={CustomerBrowse} />
      <Route path="/customer/cart" component={CustomerCart} />
      <Route path="/customer/checkout" component={Checkout} />
      <Route path="/customer/orders" component={CustomerOrders} />
      <Route path="/customer/orders/:id" component={OrderTracking} />
      <Route path="/customer/wishlist" component={Wishlist} />
      <Route path="/customer/reviews" component={CustomerReviews} />
      <Route path="/customer/notifications" component={CustomerNotifications} />
      <Route path="/customer/profile" component={CustomerProfile} />

      {/* Contract (Big Business) Routes */}
      <Route path="/contract/dashboard" component={ContractDashboard} />
      <Route path="/contract/contracts" component={ActiveContracts} />
      <Route path="/contract/contracts/new" component={ContractRequest} />
      <Route path="/contract/contracts/:id" component={ContractDetail} />
      <Route path="/contract/renewals" component={ContractRenewal} />
      <Route path="/contract/tracking" component={ContractTracking} />
      <Route path="/contract/history" component={ContractDeliveryHistory} />
      <Route path="/contract/notifications" component={ContractNotifications} />
      <Route path="/contract/profile" component={ContractProfile} />

      {/* Seller Routes */}
      <Route path="/seller/dashboard" component={SellerDashboard} />
      <Route path="/seller/products" component={SellerProducts} />
      <Route path="/seller/products/new" component={ProductForm} />
      <Route path="/seller/products/:id/edit" component={ProductForm} />
      <Route path="/seller/inventory" component={Inventory} />
      <Route path="/seller/orders" component={SellerOrders} />
      <Route path="/seller/reports" component={SellerReports} />
      <Route path="/seller/messages" component={Messages} />
      <Route path="/seller/shipments" component={Shipments} />
      <Route path="/seller/reviews" component={SellerReviewsPage} />
      <Route path="/seller/profile" component={SellerProfile} />
      <Route path="/seller/contracts/incoming" component={IncomingContractRequests} />
      <Route path="/seller/contracts/active" component={SellerActiveContracts} />
      <Route path="/seller/contracts/inventory" component={ContractInventoryTracking} />
      <Route path="/seller/contracts/:id" component={SellerContractDetail} />
      <Route path="/seller/contracts" component={SellerContractManagement} />
      <Route path="/seller/contract-inventory" component={ContractInventoryTracking} />
      <Route path="/seller/supply-planning" component={SupplyPlanning} />
      <Route path="/seller/edi" component={EDIAutomation} />


      {/* Admin Routes */}
      <Route path="/admin/dashboard" component={AdminDashboard} />
      <Route path="/admin/users" component={AdminUsers} />
      <Route path="/admin/products" component={AdminProducts} />
      <Route path="/admin/orders" component={AdminOrders} />
      <Route path="/admin/logistics" component={AdminLogistics} />
      <Route path="/admin/reports" component={AdminReports} />
      <Route path="/admin/content" component={ContentManagement} />
      <Route path="/admin/settings" component={SystemSettings} />
      <Route path="/admin/contracts/:id" component={AdminContractDetail} />
      <Route path="/admin/contracts" component={AdminContractMonitoring} />
      <Route path="/admin/deliveries" component={AdminDeliveryManagement} />
      <Route path="/admin/tracking" component={AdminShipmentTracking} />
      <Route path="/admin/drivers" component={AdminDriverMonitoring} />
      <Route path="/admin/routes" component={AdminRouteManagement} />
      <Route path="/admin/pod" component={AdminProofOfDelivery} />
      <Route path="/admin/delivery-history" component={AdminDeliveryHistory} />
      <Route path="/admin/edi/dashboard" component={EdiDashboard} />
      <Route path="/admin/edi/transactions" component={EdiTransactions} />
      <Route path="/admin/edi/companies" component={EdiCompanies} />
      <Route path="/admin/onboarding" component={AdminOnboarding} />
      <Route path="/admin/edi/outbound" component={EdiOutbound} />

      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <CartProvider>
          <WishlistProvider>
            <SellerProductsProvider>
              <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
                <Router />
              </WouterRouter>
              <Toaster />
            </SellerProductsProvider>
          </WishlistProvider>
        </CartProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
