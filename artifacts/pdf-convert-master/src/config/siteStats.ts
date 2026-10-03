export type StatGroup = "home" | "about" | "learn" | "support" | "performance";
export interface SiteStat {
  group: StatGroup;
  label: string;
  value: string;
  verified: boolean;
}

// TODO: Supply evidence and an approved value before enabling any statistic.
export const siteStats: SiteStat[] = [
  { group: "home", label: "Active Users", value: "", verified: false },
  { group: "home", label: "Files Processed", value: "", verified: false },
  { group: "home", label: "Uptime", value: "", verified: false },
  { group: "home", label: "Support Availability", value: "", verified: false },
  { group: "about", label: "Files Processed", value: "", verified: false },
  { group: "about", label: "Countries Served", value: "", verified: false },
  { group: "learn", label: "Users Served", value: "", verified: false },
  { group: "learn", label: "PDF Tools", value: "", verified: false },
  { group: "learn", label: "Uptime", value: "", verified: false },
  { group: "learn", label: "Security", value: "", verified: false },
  { group: "support", label: "Response Time", value: "", verified: false },
  { group: "support", label: "Satisfaction Rate", value: "", verified: false },
  { group: "support", label: "Resolution Rate", value: "", verified: false },
  { group: "support", label: "Articles Available", value: "", verified: false },
  { group: "performance", label: "API Response Time", value: "", verified: false },
  { group: "performance", label: "Uptime", value: "", verified: false },
  { group: "performance", label: "Conversion Success Rate", value: "", verified: false },
  { group: "performance", label: "Active Users", value: "", verified: false },
];

export const getVerifiedStats = (group: StatGroup) =>
  siteStats.filter((stat) => stat.group === group && stat.verified === true);