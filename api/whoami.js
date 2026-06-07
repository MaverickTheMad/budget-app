// =====================================================================
// Grove · /api/whoami  (Vercel serverless function)
// Cloudflare Access injects the authenticated user's email as a request
// header. A static SPA can't read request headers, so this thin proxy
// returns it. No secret involved — it's read-only identity.
//
// Single file, no catch-all routing (NEW-APP-BUILD-SPEC §6: plain
// Vite+Vercel does not interpret Next-style [...path] catch-alls).
// =====================================================================

export default function handler(req, res) {
  // Cloudflare Access sets this once the request has passed the policy.
  const email =
    req.headers['cf-access-authenticated-user-email'] ||
    req.headers['Cf-Access-Authenticated-User-Email'] ||
    null

  res.setHeader('Cache-Control', 'no-store')
  res.status(200).json({ email })
}
