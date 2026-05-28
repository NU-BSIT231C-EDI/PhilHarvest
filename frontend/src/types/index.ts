export interface Category {
  id: string;
  name: string;
  icon: string;
  productCount: number;
}

export interface Seller {
  id: string;
  name: string;
  farmName: string;
  region: string;
  province: string;
  avatar: string;
  rating: number;
  totalSales: number;
  joinedDate: string;
  description: string;
  phone: string;
  email: string;
  verified: boolean;
}

export interface Product {
  id: string;
  name: string;
  category: string;
  description: string;
  price: number;
  unit: string;
  stock: number;
  sellerId: string;
  sellerName: string;
  sellerRegion: string;
  images: string[];
  rating: number;
  reviewCount: number;
  status: "active" | "inactive" | "pending";
  featured: boolean;
  createdAt: string;
}

export interface CartItem {
  productId: string;
  productName: string;
  price: number;
  unit: string;
  quantity: number;
  sellerName: string;
  image: string;
}

export interface OrderItem {
  id: string;
  productId: string;
  productName: string;
  productCode: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  lineTotal: number;
}

export type OrderStatus =
  | "pending"
  | "processing"
  | "confirmed"
  | "shipped"
  | "out_for_delivery"
  | "delivered"
  | "cancelled";

export interface Order {
  id: string;
  poNumber: string;
  customerId: string;
  customerName: string;
  sellerId: string;
  sellerName: string;
  items: OrderItem[];
  totalAmount: number;
  status: OrderStatus;
  paymentMethod: string;
  paymentStatus: "pending" | "paid" | "failed";
  shippingAddress: string;
  orderDate: string;
  deliveryDate?: string;
  trackingNumber?: string;
  notes?: string;
}

export type DriverStatus = "available" | "on_route" | "off_duty";

export interface Driver {
  id: string;
  name: string;
  phone: string;
  vehicle: string;
  plateNumber: string;
  status: DriverStatus;
  deliveriesToday: number;
  totalDeliveries: number;
  rating: number;
  region: string;
}

export interface Route {
  id: string;
  name: string;
  origin: string;
  destination: string;
  distanceKm: number;
  estimatedHours: number;
  status: "active" | "inactive";
  assignedDrivers: number;
}

export type ShipmentStatus =
  | "pending"
  | "picked_up"
  | "in_transit"
  | "delivered"
  | "failed";

export interface Shipment {
  id: string;
  orderId: string;
  trackingNumber: string;
  sellerId: string;
  sellerName: string;
  customerId: string;
  customerName: string;
  driverId?: string;
  driverName?: string;
  driverPhone?: string;
  origin: string;
  destination: string;
  status: ShipmentStatus;
  pickupDate?: string;
  deliveryDate?: string;
  estimatedDelivery?: string;
  weight: number;
  notes?: string;
  proofOfDeliveryImage?: string;
  timeline?: ShipmentEvent[];
}

export interface ShipmentEvent {
  timestamp: string;
  status: string;
  location: string;
  note?: string;
}

export type UserRole = "customer" | "contract" | "seller" | "logistics" | "admin";

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  avatar: string;
  phone?: string;
  address?: string;
  region?: string;
  status: "active" | "suspended" | "pending";
  joinedDate: string;
  verified: boolean;
  companyName?: string;
}

export interface Review {
  id: string;
  productId: string;
  productName: string;
  customerId: string;
  customerName: string;
  customerAvatar: string;
  rating: number;
  comment: string;
  createdAt: string;
}

export interface Notification {
  id: string;
  userId: string;
  type: "order" | "delivery" | "message" | "system" | "review" | "contract" | "edi";
  title: string;
  message: string;
  read: boolean;
  createdAt: string;
  link?: string;
}

export interface WishlistItem {
  productId: string;
  productName: string;
  price: number;
  unit: string;
  image: string;
  sellerName: string;
  addedAt: string;
}

export interface Banner {
  id: string;
  title: string;
  subtitle: string;
  imageUrl: string;
  link: string;
  active: boolean;
  order: number;
}

export interface Announcement {
  id: string;
  title: string;
  content: string;
  type: "info" | "warning" | "success";
  active: boolean;
  createdAt: string;
}

export interface SystemSettings {
  platformName: string;
  platformEmail: string;
  platformPhone: string;
  commissionRate: number;
  maintenanceMode: boolean;
  allowNewRegistrations: boolean;
  requireSellerVerification: boolean;
}

export type ContractStatus =
  | "draft"
  | "pending"
  | "negotiating"
  | "approved"
  | "active"
  | "expired"
  | "rejected";

export interface ContractDeliverySchedule {
  month: string;
  quantity: number;
  unit: string;
  status: "pending" | "fulfilled" | "partial" | "missed";
}

export interface Contract {
  id: string;
  contractNumber: string;
  customerId: string;
  customerName: string;
  companyName: string;
  sellerId: string;
  sellerName: string;
  products: { productId: string; productName: string; quantity: number; unit: string; unitPrice: number }[];
  totalContractValue: number;
  startDate: string;
  endDate: string;
  duration: number;
  deliverySchedule: ContractDeliverySchedule[];
  paymentTerms: string;
  status: ContractStatus;
  additionalNotes?: string;
  deliveryCompletionPercent: number;
  paymentStatus: "current" | "overdue" | "pending";
  createdAt: string;
  updatedAt: string;
  eSignatureImage?: string;
  approvedAt?: string;
  negotiationNotes?: string;
}

export type EDIType = "810" | "856" | "204";
export type EDIStatus = "sent" | "received" | "pending" | "failed" | "acknowledged";

export interface EDITransaction {
  id: string;
  ediType: EDIType;
  transactionNumber: string;
  senderId: string;
  senderName: string;
  receiverId: string;
  receiverName: string;
  status: EDIStatus;
  amount?: number;
  referenceId: string;
  referenceType: "order" | "shipment" | "contract";
  createdAt: string;
  processedAt?: string;
  payload?: Record<string, unknown>;
  description: string;
}

export interface InventoryForecast {
  productId: string;
  productName: string;
  currentStock: number;
  projectedDemand: number;
  reorderPoint: number;
  forecastedShortage: boolean;
  recommendedOrder: number;
  unit: string;
}

export interface Coupon {
  code: string;
  discount: number;
  type: "percent" | "fixed";
  minOrder: number;
  description: string;
  expiresAt: string;
  active: boolean;
}
