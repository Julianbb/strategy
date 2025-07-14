
const withPWA = require("next-pwa")({
  dest: "public",
  register: true,
  skipWaiting: true,
  sw: "custom-sw.js",
  disable: process.env.NODE_ENV === "development",
});

module.exports = withPWA({
  experimental: {
    ppr: true,
  },
  images: {
    remotePatterns: [
      {
        hostname: 'avatar.vercel.sh',
      },
      {
        hostname: 'i.pravatar.cc'
      },
      {
        hostname: 'github.com'
      }
    ],
  },
});