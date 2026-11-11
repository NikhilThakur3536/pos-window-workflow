import type { NextConfig } from 'next';

const isElectron = process.env.NEXT_PUBLIC_IS_ELECTRON_APP === 'true';

const nextConfig: NextConfig = {
    output: 'export',
    ...(isElectron && { trailingSlash: true }),
    images: {
        unoptimized: true,
    },
    compiler: {
        removeConsole: false,
    },
    eslint: {
        ignoreDuringBuilds: true,
    },
    typescript: {
        ignoreBuildErrors: true,
    },
};

export default nextConfig;
