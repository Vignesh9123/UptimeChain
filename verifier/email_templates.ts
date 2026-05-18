type IncidentDatetime = Date | string | number;

function escapeHtml(input: string) {
  return input
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function formatIncidentDatetime(value: IncidentDatetime) {
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);


  const iso = d.toISOString().replace("T", " ").replace("Z", " UTC");
  return iso;
}

/**
 * UptimeChain "website down" incident email HTML.
 * Designed for nodemailer `html` bodies (see `verifier/sendMail.ts`).
 */
export function websiteDownEmailTemplate(
  userName: string,
  websiteName: string,
  incidentDatetime: IncidentDatetime,
  downContinents?: string[]
) {
  const safeUserName = escapeHtml(userName?.trim() || "there");
  const safeWebsiteName = escapeHtml(websiteName?.trim() || "your website");
  const safeWhen = escapeHtml(formatIncidentDatetime(incidentDatetime));

  const preheader = `Incident detected: ${safeWebsiteName} appears to be down.`;

  let outageScopeMsg = "";
  if (Array.isArray(downContinents) && downContinents.length) {
    const continentString = downContinents
      .map(cont => escapeHtml(cont))
      .join(", ");
    outageScopeMsg = `
      <div style="font-size:14px;color:#eab308;font-weight:600;margin-bottom:14px;">
        Outage detected in: <span style="color:#fff1a8;">${continentString}</span>
      </div>
      <div style="font-size:13px;line-height:1.6;color:#a7b0c2;margin-bottom:14px;">
        UptimeChain monitoring detected the website is unreachable from the regions listed above. Other regions may still see normal operation, but action is recommended.
      </div>
    `;
  } else {
    outageScopeMsg = `
      <div style="font-size:14px;color:#eab308;font-weight:600;margin-bottom:14px;">
        Down globally: All monitored regions are reporting downtime.
      </div>
      <div style="font-size:13px;line-height:1.6;color:#a7b0c2;margin-bottom:14px;">
        UptimeChain monitoring detected an outage from all available regions.
      </div>
    `;
  }

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="x-apple-disable-message-reformatting" />
    <title>UptimeChain Alert: Website Down</title>
  </head>
  <body style="margin:0;padding:0;background:#0b1220;">
    <!-- Preheader (hidden) -->
    <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">
      ${preheader}
    </div>

    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:#0b1220;">
      <tr>
        <td align="center" style="padding:32px 16px;">
          <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="600" style="max-width:600px;width:100%;">
            <tr>
              <td style="font-family:Inter,ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial; color:#e6e9ef;">
                <div style="display:flex;align-items:center;gap:10px;margin-bottom:18px;">
                  <div style="width:12px;height:12px;border-radius:999px;background:#7c3aed;"></div>
                  <div style="font-size:16px;font-weight:700;letter-spacing:.2px;">UptimeChain</div>
                </div>

                <div style="background:#0f1a33;border:1px solid rgba(255,255,255,.08);border-radius:16px;padding:22px;">
                  <div style="font-size:13px;color:#a7b0c2;margin-bottom:8px;">Incident alert</div>
                  <div style="font-size:22px;line-height:1.25;font-weight:800;margin:0 0 12px 0;color:#ffffff;">
                    ${safeWebsiteName} may be down
                  </div>

                  ${outageScopeMsg}

                  <div style="font-size:14px;line-height:1.6;color:#d6dbe6;margin-bottom:14px;">
                    Hi ${safeUserName}, we detected a potential outage for <strong style="color:#ffffff;">${safeWebsiteName}</strong>.
                    Please review your website and hosting/provider status to restore service.
                  </div>

                  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin:14px 0 18px 0;">
                    <tr>
                      <td style="background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.08);border-radius:12px;padding:14px;">
                        <div style="font-size:12px;color:#a7b0c2;margin-bottom:6px;">Detected at</div>
                        <div style="font-size:14px;color:#ffffff;font-weight:700;">${safeWhen}</div>
                      </td>
                    </tr>
                  </table>

                  <div style="font-size:13px;line-height:1.6;color:#a7b0c2;margin-bottom:18px;">
                    If this is expected maintenance, you can ignore this email. Otherwise, we recommend checking DNS, SSL, origin health, and recent deploys.
                  </div>

                  <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                    <tr>
                      <td align="center" style="border-radius:12px;background:#7c3aed;">
                        <a href="http://localhost:5173/client" style="display:inline-block;padding:12px 16px;font-family:Inter,ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial;font-size:14px;color:#ffffff;text-decoration:none;font-weight:700;">
                          Review in UptimeChain
                        </a>
                      </td>
                    </tr>
                  </table>
                </div>

                <div style="margin-top:14px;font-size:12px;line-height:1.6;color:#7f8aa3;">
                  You’re receiving this alert because monitoring is enabled for this website in UptimeChain.
                </div>
                <div style="margin-top:8px;font-size:12px;line-height:1.6;color:#7f8aa3;">
                  © ${new Date().getFullYear()} UptimeChain
                </div>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}


