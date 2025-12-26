/** @type {import('next').NextConfig} */
const nextConfig = {
  // Bu ayar, Next.js'in bu paketi özellikle işlemesini sağlar
  transpilePackages: ['react-map-gl', 'mapbox-gl'],
  // Azure Static Web Apps için standalone output
  output: process.env.NODE_ENV === 'production' ? 'standalone' : undefined,
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || 'http://13.53.168.27:5000',
  },
};

export default nextConfig;

