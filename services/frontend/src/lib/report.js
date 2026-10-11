// Opens the full HTML report (built by the `reports` microservice from a
// report envelope) in a new tab. Shared by the classic flow and the chat
// view so both "Generate report" buttons behave identically.
//
// The tab is opened synchronously, before the fetch, so browsers don't
// treat it as an unsolicited popup — call this directly from a click
// handler, not after an await.
export function openReportInNewTab(report, reportsUrl) {
  const reportWindow = window.open('', '_blank');
  if (reportWindow) {
    reportWindow.document.write('<p style="font:14px sans-serif;padding:2rem">Building report&hellip;</p>');
  }

  return fetch(`${reportsUrl}/report.bxm`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(report)
  })
    .then((res) => {
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res.text();
    })
    .then((html) => {
      if (reportWindow) {
        reportWindow.document.open();
        reportWindow.document.write(html);
        reportWindow.document.close();
      } else {
        // Popup blocked even for the synchronous open (some strict settings
        // do this) - fall back to a download-free same-tab view.
        const blob = new Blob([html], { type: 'text/html' });
        window.location.href = URL.createObjectURL(blob);
      }
    })
    .catch((err) => {
      if (reportWindow) reportWindow.close();
      throw err;
    });
}
