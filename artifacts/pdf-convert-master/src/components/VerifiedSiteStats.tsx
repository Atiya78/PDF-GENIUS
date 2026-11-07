import { getVerifiedStats, type StatGroup } from "@/config/siteStats";

export function VerifiedSiteStats({ group }: { group: StatGroup }) {
  const stats = getVerifiedStats(group);
  if (!stats.length) return null;
  return (
    <div className="grid grid-cols-2 gap-x-6 border-t border-[#e7e0d5] md:grid-cols-4">
      {stats.map((stat) => (
        <div key={stat.label} className="border-b border-[#efe8dd] py-5">
          <p className="edu-mono text-3xl font-semibold text-[#1c1917]">{stat.value}</p>
          <p className="mt-1 text-sm text-[#57534e]">{stat.label}</p>
        </div>
      ))}
    </div>
  );
}