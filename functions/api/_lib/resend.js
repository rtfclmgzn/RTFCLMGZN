// Minimal Resend client -- one function, no SDK, matches the site's zero-dependency style.

export async function sendEmail(env, { to, subject, html, text }) {
  const key = env.RESEND_API_KEY;
  if (!key) return { ok: false, error: "resend-not-configured" };
  const upstream = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { authorization: `Bearer ${key}`, "content-type": "application/json" },
    body: JSON.stringify({ from: "RTFCLMGZN <sign-in@rtfclmgzn.com>", to, subject, html, text })
  });
  if (!upstream.ok) {
    const detail = await upstream.text().catch(() => "");
    return { ok: false, error: "upstream", status: upstream.status, detail: detail.slice(0, 300) };
  }
  return { ok: true };
}

export function magicLinkEmail(verifyUrl) {
  const text =
    "Sign in to RTFCLMGZN\n\n" +
    "Click to sign in (or finish creating your account):\n" + verifyUrl + "\n\n" +
    "This link expires in 15 minutes and works once.\n\n" +
    "If you didn't request this, you can ignore this email -- no account was created.";
  const html = `
    <div style="font-family:Georgia,'Times New Roman',serif;max-width:480px;margin:0 auto;color:#1a1a1a">
      <h1 style="font-size:20px;letter-spacing:.02em">Sign in to RTFCLMGZN</h1>
      <p style="font-family:system-ui,sans-serif;font-size:15px;line-height:1.6">Click below to sign in (or finish creating your account).</p>
      <p style="margin:24px 0">
        <a href="${verifyUrl}" style="background:#8b7cf7;color:#fff;padding:12px 20px;border-radius:8px;text-decoration:none;font-family:system-ui,sans-serif;font-size:15px">Sign in to RTFCLMGZN</a>
      </p>
      <p style="font-family:system-ui,sans-serif;font-size:13px;color:#666;line-height:1.6">This link expires in 15 minutes and works once.<br>If you didn't request this, you can ignore this email -- no account was created.</p>
    </div>`;
  return { subject: "Sign in to RTFCLMGZN", html, text };
}
