import type { NextConfig } from "next"

import os from "os";

const addresses: string[] = [];
const interfaces = os.networkInterfaces();
for (const name of Object.keys(interfaces)) {
  if (!interfaces[name]) continue;
  for (const netInterface of interfaces[name]) {
    const isIPv4 =
      netInterface.family === "IPv4" || (netInterface.family as unknown) === 4;
    if (isIPv4 && !netInterface.internal) {
      addresses.push(netInterface.address);
    }
  }
}

const localGateway = addresses[0];
console.log("DETECTED LOCAL IP ADDRESS:", localGateway);



const nextConfig: NextConfig = {
  experimental: {
    optimizePackageImports: ["lucide-react"],
    proxyTimeout: 400_000,
    serverActions: {
      allowedOrigins: localGateway ? [`${localGateway}:3000`] : [],
    },
  },
  //allowedDevOrigins: localGateway ? [localGateway, `${localGateway}:3000`] : [],

  async rewrites() {
    return [
      {
        // Matches any route starting with /api/ and proxies it to your FastAPI server
        source: "/api/:path*",
        destination: "http://127.0.0.1:8000/api/:path*",
      },
    ];
  },
};

export default nextConfig
