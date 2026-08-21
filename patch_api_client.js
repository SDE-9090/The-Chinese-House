const fs = require('fs');
let code = fs.readFileSync('frontend/src/lib/apiClient.ts', 'utf8');

// Add tenantFetch definition at the top, after API_URL definition
const tenantFetchCode = `
export function getTenantSlug(): string {
  if (typeof window !== "undefined") {
    const hostname = window.location.hostname;
    if (hostname !== "localhost" && hostname !== "127.0.0.1") {
      return hostname.split('.')[0];
    }
  }
  return "the-chinese-house"; // Fallback for local development
}

/** Wrapper around fetch that automatically attaches the tenant slug header */
async function tenantFetch(url: string, options: RequestInit = {}): Promise<Response> {
  const headers = new Headers(options.headers);
  headers.set("X-Tenant-Slug", getTenantSlug());
  return fetch(url, { ...options, headers });
}
`;

// Insert the code
code = code.replace(
  'function isApiMode(): boolean {',
  tenantFetchCode + '\nfunction isApiMode(): boolean {'
);

// Now we need to replace 'fetch(' with 'tenantFetch(' 
// But NOT in 'tenantFetch' itself, and we should check if 'authFetch' also needs it.
// Wait, authFetch calls 'fetch', so if authFetch calls 'tenantFetch', it works.
// Also 'refreshAccessToken' calls 'fetch', we should change it.
// Let's replace all occurrences of \sfetch( with \stenantFetch(
// And then fix the one in tenantFetch to be real fetch.

// Replace all global fetch calls except where it's property access or similar
code = code.replace(/\bawait fetch\(/g, 'await tenantFetch(');
code = code.replace(/\sfetch\(/g, ' tenantFetch(');
code = code.replace(/return fetch\(/g, 'return tenantFetch(');
code = code.replace(/return tenantFetch\(url, \{ \.\.\.options, headers \}\);/g, 'return fetch(url, { ...options, headers });');

fs.writeFileSync('frontend/src/lib/apiClient.ts', code);
console.log('Patched apiClient.ts');
