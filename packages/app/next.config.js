/** @type {import('next').NextConfig} */
// eslint-disable-next-line @typescript-eslint/no-var-requires
const withPWA = require("next-pwa");

const nextConfig = {
  pwa: {
    dest: "public/",
    disable: process.env.NODE_ENV === "development",
  },
  // reactStrictMode: true, // this is removed for better demo
  swcMinify: true,
  experimental: {
    externalDir: true,
  },
};

module.exports = withPWA(nextConfig);
