import type {NextConfig} from 'next';
const path = require('path'); // This line is required for the fix

const nextConfig: NextConfig = {
  output: 'export',

  // This is the critical line that fixes the Tauri build error.
  outputFileTracingRoot: path.join(__dirname, './'),

  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  
};

export default nextConfig;