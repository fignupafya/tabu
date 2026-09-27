import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Lets phones on the same Wi-Fi use the dev server via the computer's LAN IP (e.g. http://192.168.1.20:3000).
  allowedDevOrigins: ['192.168.*.*', '10.*.*.*', '172.*.*.*'],
};

export default nextConfig;
