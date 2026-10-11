import Icon from './Icon.jsx';
import ReportList, { useReports } from './ReportList.jsx';

// Always-visible right column with every archived report (desktop only —
// under bp-lg it's hidden and the History drawer's Reports tab covers it).
export default function ReportsRail({ refreshKey }) {
  const { reports, status, error } = useReports(refreshKey);

  return (
    <aside className="rx-rail" aria-label="Report history">
      <div className="rx-rail-head">
        <span className="rx-rail-title">
          <Icon name="file" size={16} />
          Reports
        </span>
        {status === 'idle' ? <span className="rx-rail-count">{reports.length}</span> : null}
      </div>
      <div className="rx-rail-list rx-scroll">
        <ReportList reports={reports} status={status} error={error} />
      </div>
    </aside>
  );
}
