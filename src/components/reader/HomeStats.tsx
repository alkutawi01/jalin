import CountUp from "./CountUp";
import type { StatItem } from "../../lib/reader/site-stats";

/** The band of per-category counts under the home page hero. One component, used by the home page and by /mula, so there is one version. */
export default function HomeStats({ stats, ground }: { stats: StatItem[]; ground?: string }) {
  if (stats.length === 0) return null;
  return (
    <section className="home-stats" data-ground={ground} aria-label="Isi Jalin mengikut kategori">
      <div className="site-shell">
        <ul className="home-stats-list">
          {stats.map((item, index) => (
            <li key={item.key} className="home-stat">
              <a href={item.href}>
                <span className="home-stat-value"><CountUp value={item.count} delayMs={index * 120} /></span>
                <span className="home-stat-label">{item.label}</span>
              </a>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
