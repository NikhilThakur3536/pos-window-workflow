import { NextPage } from 'next';

export type LayoutType = 'dashboard' | 'auth' | undefined;

export type NextPageWithLayout<P = object, IP = P> = NextPage<P, IP> & {
    layoutType?: LayoutType;
};
