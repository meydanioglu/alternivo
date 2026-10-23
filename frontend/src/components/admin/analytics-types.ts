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
