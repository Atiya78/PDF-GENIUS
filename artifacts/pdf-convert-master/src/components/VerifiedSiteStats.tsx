import { getVerifiedStats, type StatGroup } from "@/config/siteStats";

export function VerifiedSiteStats({ group }: { group: StatGroup }) {
  const stats = getVerifiedStats(group);
  if (!stats.length) return null;
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-6 py-6 text-center">
      {stats.map((stat) => (
        <div key={stat.label}>
          <p className="text-3xl font-bold">{stat.value}</p>
          <p className="text-sm mt-2">{stat.label}</p>
        </div>
      ))}
    </div>
  );
}