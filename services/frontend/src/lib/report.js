import { CORE_URL } from './config.js';

// Opens an archived report in a new tab. core renders it server-side
// (api/report-view.bxm reads the archive and asks the reports service over
// the internal network), so this is a plain link navigation: no
// cross-origin POST, no preflight, no request body for a browser or an
// extension to drop. The old browser-side POST to reports/report.bxm
// intermittently arrived empty (400) in Brave on Windows.
export function reportUrl(reportId) {
  return `${CORE_URL}/api/report-view.bxm?id=${encodeURIComponent(reportId)}`;
}

export function openReport(reportId) {
  window.open(reportUrl(reportId), '_blank', 'noopener');
}
