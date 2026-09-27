// Shared types mirroring the backend admin API shapes (/api/v1/admin/*).

import type { PageContent, PageKind, PageTheme } from "./page-content";

export type { PageKind } from "./page-content";

export type PlatformRole = "USER" | "SALES" | "SUPPORT" | "ADMIN" | "SUPER_ADMIN";
export type CompanyRole = "OWNER" | "ADMIN" | "MEMBER";
export type PlanTier = "STARTER" | "PRO" | "MANAGED";
export type BillingInterval = "MONTHLY" | "YEARLY" | "ONE_TIME";
export type SubscriptionStatus = "TRIALING" | "ACTIVE" | "PAST_DUE" | "CANCELLED" | "PAUSED";
export type SubscriptionSource = "STRIPE" | "MANUAL" | "SYSTEM";
export type CardType = PageKind;
export type CardStatus = "UNASSIGNED" | "ACTIVE" | "DISABLED";

export interface Capabilities {
  seesAllCustomers: boolean;
  createsCustomers: boolean;
  managesAllCustomers: boolean;
  viewsUsers: boolean;
  managesUsers: boolean;
  managesPlans: boolean;
  assignsSalesReps: boolean;
  restoresDeleted: boolean;
  /** Shop orders: may claim orders and fulfil the ones they claimed (all staff). */
  managesOrders?: boolean;
  /** May take over orders claimed by someone else and change any order (ADMIN+). */
  overridesOrders?: boolean;
}

export interface StaffMe {
  user: { id: string; name: string; email: string; platformRole: PlatformRole };
  capabilities: Capabilities;
}

export interface Paged<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

export interface UserRef {
  id: string;
  name: string;
  email: string;
}

export interface PlanFeatures {
  analytics?: boolean;
  multiLocation?: boolean;
  maxLocations?: number | null;
  unlimitedDestinationChanges?: boolean;
  managed?: boolean;
  createPages?: boolean;
}

export interface Plan {
  id: string;
  tier: PlanTier;
  name: string;
  priceCents: number;
  interval: BillingInterval;
  stripePriceId: string | null;
  features: PlanFeatures;
  _count?: { subscriptions: number };
}

export interface Product {
  id: string;
  key: string;
  name: string;
  priceCents: number;
  /** Units left to sell. null = unlimited. */
  stock: number | null;
  active: boolean;
}

export interface Subscription {
  id: string;
  status: SubscriptionStatus;
  source: SubscriptionSource;
  interval: BillingInterval;
  currentPeriodStart: string;
  currentPeriodEnd: string;
  stripeSubscriptionId: string | null;
  plan: Plan;
}

export interface CustomerListItem {
  id: string;
  name: string;
  slug: string;
  logo: string | null;
  billingEmail: string | null;
  brandColor: string;
  salesRepId: string | null;
  deletedAt: string | null;
  createdAt: string;
  subscription: { status: SubscriptionStatus; plan: { tier: PlanTier; name: string } } | null;
  salesRep: UserRef | null;
  _count: { cards: number; members: number; locations?: number };
}

export interface Member {
  id: string;
  userId: string;
  role: CompanyRole;
  createdAt: string;
  user: UserRef & { avatarUrl: string | null };
}

export interface Invitation {
  id: string;
  email: string;
  role: CompanyRole;
  code: string;
  expiresAt: string;
  createdAt: string;
}

export interface Location {
  id: string;
  name: string;
  isDefault: boolean;
  address: string | null;
  city: string | null;
  postalCode: string | null;
  country: string;
}

export interface CustomerDetail {
  id: string;
  name: string;
  slug: string;
  logo: string | null;
  billingEmail: string | null;
  brandColor: string;
  salesRepId: string | null;
  deletedAt: string | null;
  createdAt: string;
  salesRep: UserRef | null;
  subscription: Subscription | null;
  settings: { analyticsEnabled: boolean; defaultLocale: string } | null;
  locations: Location[];
  members: Member[];
  invitations: Invitation[];
  _count: { cards: number; pages: number; locations: number };
  tapsLast30Days: number;
  canManage: boolean;
}

export interface CardRow {
  id: string;
  name: string;
  type: CardType;
  slug: string;
  uid: string | null;
  status: CardStatus;
  activePageId: string | null;
  locationId: string | null;
  createdAt: string;
  activePage: { id: string; name: string; kind: PageKind; slug: string; published: boolean } | null;
  location: { id: string; name: string } | null;
}

export interface PageRow {
  id: string;
  name: string;
  kind: PageKind;
  slug: string;
  published: boolean;
  updatedAt: string;
  location: { id: string; name: string } | null;
  _count: { cards: number };
}

export interface DeletedPageRow {
  id: string;
  name: string;
  kind: PageKind;
  slug: string;
  deletedAt: string;
}

export interface PageDetail {
  id: string;
  companyId: string;
  name: string;
  kind: PageKind;
  slug: string;
  published: boolean;
  locationId: string | null;
  content: PageContent;
  theme: PageTheme;
  updatedAt: string;
}

export interface Overview {
  customers: number;
  cards: number;
  activeCards: number;
  tapsLast30Days: number;
  members: number;
  unassignedCustomers: number | null;
  plans: { tier: PlanTier; name: string; count: number }[];
  recentCustomers: CustomerListItem[];
}

export interface AdminUser {
  id: string;
  name: string;
  email: string;
  emailVerified: boolean;
  avatarUrl: string | null;
  platformRole: PlatformRole;
  deletedAt: string | null;
  createdAt: string;
  _count: { companyMembers: number; salesCustomers: number };
}

export interface AdminUserDetail extends Omit<AdminUser, "_count"> {
  companyMembers: {
    id: string;
    role: CompanyRole;
    deactivatedAt: string | null;
    company: { id: string; name: string; slug: string; deletedAt: string | null };
  }[];
  salesCustomers: { id: string; name: string; slug: string }[];
  _count: { passkeys: number; sessions: number };
}

export interface SalesRep extends UserRef {
  _count: { salesCustomers: number };
}

// ─── Shop orders ──────────────────────────────────────────────────────────────

export type OrderStatus =
  | "PENDING_PAYMENT"
  | "PAID"
  | "IN_PRODUCTION"
  | "SHIPPED"
  | "CANCELLED"
  | "EXPIRED";

export interface OrderItem {
  id: string;
  /** Product key, e.g. "business" | "review". */
  productKey: string;
  productName: string;
  quantity: number;
  unitPriceCents: number;
  lineTotalCents: number;
}

export interface ShippingAddress {
  line1: string;
  line2?: string | null;
  postalCode: string;
  city: string;
  country: string;
}

/** A shop order (`GET /admin/orders`). Money is in Rappen, prices include VAT. */
export interface AdminOrder {
  id: string;
  number: string;
  status: OrderStatus;
  email: string;
  customerName: string;
  /** Business name the customer typed at checkout. */
  companyName: string | null;
  /** Company the order is attached to, null until claimed. */
  companyId: string | null;
  companyNameInApp: string | null;
  totalCents: number;
  subtotalCents: number;
  discountCents: number;
  shippingCents: number;
  currency: string;
  createdAt: string;
  paidAt: string | null;
  shippedAt: string | null;
  items: OrderItem[];
  cardCount: number;
  /** Staff member who claimed the order and fulfils it. */
  handledBy: { id: string; name: string } | null;
  handledAt: string | null;
  // Not in the list contract, shown when the API sends them.
  phone?: string | null;
  locale?: string | null;
  shippingAddress?: ShippingAddress | null;
  trackingNumber?: string | null;
}

/**
 * The card design saved with an order item. Mirrors `CardConfig` from the
 * website editor (nfc-card-website/src/components/editor/types.ts). All fields
 * optional here since it is stored as free JSON.
 */
export interface OrderCardDesign {
  cardType?: "business" | "review";
  finish?: "silver" | "black";
  category?: string;
  layout?: "logo" | "text" | "list";
  headline?: string;
  logoText?: string;
  logoHint?: string;
  logoDataUrl?: string | null;
  logoName?: string | null;
  bodyText?: string;
  listTitle?: string;
  listItems?: string;
  headerColor?: string;
  headerTextColor?: string;
  bodyColor?: string;
  starColor?: string;
  accentColor?: string;
  font?: "sans" | "serif" | "rounded" | "display";
  headerShape?: "straight" | "wave" | "round" | "scallop";
  showStars?: boolean;
  showQr?: boolean;
  reviewUrl?: string;
  fullName?: string;
  jobTitle?: string;
  company?: string;
  phone?: string;
  email?: string;
  website?: string;
}

export interface AdminOrderDetail extends AdminOrder {
  /** Sales rep of the linked business, if any. */
  salesRep: { id: string; name: string } | null;
  items: (OrderItem & { design: OrderCardDesign | null })[];
  cards: { id: string; slug: string; name: string }[];
}
