import type {
  BillingInterval,
  CardStatus,
  CardType,
  CompanyRole,
  OrderStatus,
  PlatformRole,
  SubscriptionStatus,
} from "./types";

type Tone = "neutral" | "accent" | "positive" | "muted";

export const PLATFORM_ROLE_LABEL: Record<PlatformRole, string> = {
  USER: "Customer",
  SALES: "Sales",
  SUPPORT: "Support",
  ADMIN: "Admin",
  SUPER_ADMIN: "Super admin",
};

export const PLATFORM_ROLE_HINT: Record<PlatformRole, string> = {
  USER: "No console access.",
  SALES: "Manages only the customers assigned to them.",
  SUPPORT: "Sees every customer, cannot change anything.",
  ADMIN: "Manages every customer and user role.",
  SUPER_ADMIN: "Like admin, and edits plans and products and can grant super admin.",
};

export const PLATFORM_ROLE_TONE: Record<PlatformRole, Tone> = {
  USER: "muted",
  SALES: "positive",
  SUPPORT: "neutral",
  ADMIN: "accent",
  SUPER_ADMIN: "accent",
};

export const COMPANY_ROLE_LABEL: Record<CompanyRole, string> = {
  OWNER: "Owner",
  ADMIN: "Admin",
  MEMBER: "Member",
};

export const SUBSCRIPTION_STATUS_LABEL: Record<SubscriptionStatus, string> = {
  TRIALING: "Trial",
  ACTIVE: "Active",
  PAST_DUE: "Past due",
  CANCELLED: "Cancelled",
  PAUSED: "Paused",
};

export const SUBSCRIPTION_STATUS_TONE: Record<SubscriptionStatus, Tone> = {
  TRIALING: "accent",
  ACTIVE: "positive",
  PAST_DUE: "accent",
  CANCELLED: "muted",
  PAUSED: "muted",
};

export const INTERVAL_LABEL: Record<BillingInterval, string> = {
  MONTHLY: "per month",
  YEARLY: "per year",
  ONE_TIME: "one-time",
};

export const CARD_TYPE_LABEL: Record<CardType, string> = {
  REVIEW: "Google review",
  MENU: "Menu",
  LINKHUB: "Link hub",
  VCARD: "Contact card",
  WIFI: "WiFi",
};

export const CARD_STATUS_LABEL: Record<CardStatus, string> = {
  UNASSIGNED: "Unassigned",
  ACTIVE: "Active",
  DISABLED: "Disabled",
};

export const CARD_STATUS_TONE: Record<CardStatus, Tone> = {
  UNASSIGNED: "muted",
  ACTIVE: "positive",
  DISABLED: "neutral",
};

const dateFmt = new Intl.DateTimeFormat("de-CH", { day: "2-digit", month: "short", year: "numeric" });

export function formatDate(value: string | null | undefined): string {
  if (!value) return "";
  return dateFmt.format(new Date(value));
}

/** Period ends far in the future are stored as 9999-12-31: show them as open-ended. */
export function isOpenEnded(value: string | null | undefined): boolean {
  return !value || new Date(value).getUTCFullYear() >= 9999;
}

export function initials(name: string): string {
  return (
    name
      .split(" ")
      .map((p) => p[0])
      .filter(Boolean)
      .slice(0, 2)
      .join("")
      .toUpperCase() || "?"
  );
}

export function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
}

export const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3310";

export const ORDER_STATUS_LABEL: Record<OrderStatus, string> = {
  PENDING_PAYMENT: "Awaiting payment",
  PAID: "Paid",
  IN_PRODUCTION: "In production",
  SHIPPED: "Shipped",
  CANCELLED: "Cancelled",
  EXPIRED: "Expired",
};

export const ORDER_STATUS_TONE: Record<OrderStatus, Tone> = {
  PENDING_PAYMENT: "muted",
  PAID: "accent",
  IN_PRODUCTION: "neutral",
  SHIPPED: "positive",
  CANCELLED: "muted",
  EXPIRED: "muted",
};

/** Tap URL encoded on a card's NFC chip: /c/<company slug>/<card slug>. */
export function tapUrl(companySlug: string, slug: string): string {
  return `${APP_URL}/c/${companySlug}/${slug}`;
}
