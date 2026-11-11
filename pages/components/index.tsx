import { Button } from '@/components/ui/button';
import Link from 'next/link';

const links = [
    { label: 'Dashboard', href: '/' },
    { label: 'Maintenance', href: '/components/maintenance' },
    { label: 'List', href: '/components/list' },
    { label: 'Showcase', href: '/components/showcase' },
    { label: 'Form', href: '/components/form' },
    { label: 'Login', href: '/components/auth/login' },
    { label: 'Signup', href: '/components/auth/signup' },
    { label: 'Verification', href: '/components/auth/verification' },
    { label: 'Forget Password', href: '/components/auth/forget-password' },
    { label: 'Reset Password', href: '/components/auth/reset-password' },
];

export default function Home() {
    return (
        <div className="flex min-h-screen flex-col items-center justify-center gap-4">
            {links.map((link) => (
                <Button key={link.label} asChild className="w-40">
                    <Link href={link.href}>{link.label}</Link>
                </Button>
            ))}
        </div>
    );
}
