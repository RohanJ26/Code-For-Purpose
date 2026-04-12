/** @type {import('next').NextConfig} */
const isDev = process.env.NODE_ENV === 'development'
const backendBase =
  process.env.API_PYTHON_URL ||
  process.env.BACKEND_PROXY_URL ||
  (isDev && process.env.DISABLE_API_PROXY !== '1' ? 'http://127.0.0.1:8000' : '')

const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  async rewrites() {
    if (!backendBase) return []
    const backendOrigin = String(backendBase).replace(/\/$/, '')
    return [
      {
        source: '/api/:path*',
        destination: `${backendOrigin}/:path*`,
      },
    ]
  },
}

export default nextConfig
