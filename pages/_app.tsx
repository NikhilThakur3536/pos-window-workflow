import Providers from '@/components/query-client';
import { ThemeProvider } from '@/components/theme-provider';
import { cn } from '@/lib/utils';
import '@/styles/globals.css';
import { NextPageWithLayout } from '@/types/next-page.types';
import type { AppProps } from 'next/app';
import { NuqsAdapter } from 'nuqs/adapters/next/app';
import { ComponentType } from 'react';
import { Toaster } from 'sonner';
import Head from 'next/head';

// Layouts
import AuthLayout from '@/components/custom-components/layouts/auth-layout';
import DashboardLayout from '@/components/custom-components/layouts/dashboard-layout';
import AppOfflineWrapper from '@/offline/app-offline-wrapper';
import AuthSessionExpiry from '@/components/custom-components/auth-session-expiry';

type AppPropsWithLayout = AppProps & {
    Component: NextPageWithLayout;
};

export default function MyApp({ Component, pageProps }: AppPropsWithLayout) {
    const layoutType = Component.layoutType;

    let Layout: ComponentType<{ children: React.ReactNode }> | React.FC<{ children: React.ReactNode }> | null = null;

    if (layoutType === 'dashboard') Layout = DashboardLayout;
    else if (layoutType === 'auth') Layout = AuthLayout;

    const deviceType = process.env.NEXT_PUBLIC_APP_TYPE;

    return (
        <NuqsAdapter>
            <ThemeProvider>
                <Providers>
                    <AuthSessionExpiry />
                    <AppOfflineWrapper>
                        <Head>
                            <title>{deviceType === 'WAREHOUSE-USER' ? 'DC' : 'Retail'} POS</title>
                        </Head>
                        <div className={cn('antialiased')}>
                            {Layout ? (
                                <Layout>
                                    <Component {...pageProps} />
                                </Layout>
                            ) : (
                                <Component {...pageProps} />
                            )}
                            <Toaster richColors closeButton />
                        </div>
                    </AppOfflineWrapper>
                </Providers>
            </ThemeProvider>
        </NuqsAdapter>
    );
}
