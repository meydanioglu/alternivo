export interface Analytics {
  days: number;
  views: number;
  visitors: number;
  viewsToday: number;
  visitorsToday: number;
  activeNow: number;
  daily: { date: string; views: number; visitors: number }[];
  topPages: { key: string; count: number }[];
  topReferrers: { key: string; count: number }[];
  devices: { key: string; count: number }[];
  recent: { path: string; referrerHost: string | null; device: string; signedIn: boolean; at: string }[];
  from: string;
  to: string;
  grain: "day" | "week" | "month";
  campaigns: { key: string; count: number }[] | null;
}

export interface Growth {
  from: string;
  to: string;
  makerFunnel: { key: string; label: string; count: number }[];
  plans: {
    planKey: string;
    created: number;
    termsAccepted: number;
    paid: number;
    failed: number;
    abandoned: number;
    refunded: number;
    revenueMinor: number;
    currency: string;
  }[];
  failureReasons: { key: string; count: number }[];
  submissionSources: { key: string; count: number }[];
  recentSubmissions: { submissionId: string; name: string; status: string; createdAt: string; source: string; landingPath: string | null }[];
  pricingWithoutCheckout: number;
  checkoutWithoutPayment: number;
}

export interface Dashboard {
  publishedApplications: number;
  draftApplications: number;
  pendingSubmissions: number;
  pendingAlternatives: number;
  openReports: number;
  reviews: number;
}

const DEVICE: Record<string, string> = { desktop: "Masaüstü", mobile: "Mobil", tablet: "Tablet" };
export const deviceLabel = (d: string) => DEVICE[d] ?? d;
