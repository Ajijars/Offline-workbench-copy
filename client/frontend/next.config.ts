import type { NextConfig } from "next";

/**
 * Next.js config for CLIENT PC deployment.
 *
 * When running on a separate client machine, the server is at a LAN IP.
 * The SERVER_IP and protocol are read from environment variables set in .env.local
 */

const SERVER_IP = process.env.NEXT_PUBLIC_SERVER_IP || "192.168.1.100";
const SERVER_API_PORT = process.env.SERVER_API_PORT || "8000";
const API_BASE = process.env.NEXT_PUBLIC_API_BASE || `http://${SERVER_IP}:${SERVER_API_PORT}/api`;

// Determine protocol from API_BASE
const isHTTPS = API_BASE.startsWith("https://");
const serverOrigin = isHTTPS
  ? `https://${SERVER_IP}`
  : `http://${SERVER_IP}:${SERVER_API_PORT}`;

const nextConfig: NextConfig = {
  /**
   * Proxy all /api requests to the actual server.
   */
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: `${serverOrigin}/api/:path*`,
      },
    ];
  },

  /**
   * Security Headers added to every response
   */
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
          {
            key: "Content-Security-Policy",
            value: `
              default-src 'self';
              script-src 'self' 'unsafe-eval' 'unsafe-inline';
              style-src 'self' 'unsafe-inline';
              connect-src 'self' ${serverOrigin} ${isHTTPS ? `wss://${SERVER_IP}` : `ws://${SERVER_IP}:${SERVER_API_PORT}`};
              img-src 'self' data: blob: ${serverOrigin};
              font-src 'self';
            `
              .replace(/\s+/g, " ")
              .trim(),
          },
        ],
      },
    ];
  },
};

export default nextConfig;
