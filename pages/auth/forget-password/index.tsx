import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AlertCircle, Lock, Mail } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';
import type { NextPageWithLayout } from '@/types/next-page.types';

const ForgetPasswordPage: NextPageWithLayout = () => {
    const [email, setEmail] = useState('');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        console.log('Forgot Password attempt:', { email });
    };

    return (
        <div className="p-8">
            <div className="mb-8 text-center">
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-orange-100">
                    <Lock className="h-8 w-8 text-orange-600" />
                </div>
                <h1 className="mb-2 text-xl font-semibold text-gray-800">Forgot Password</h1>
                <p className="text-sm text-gray-600">Enter your email to receive a password reset link</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-2">
                    <Label htmlFor="resetEmail" className="text-sm font-medium text-gray-700">
                        Email Address
                    </Label>
                    <div className="relative">
                        <Mail className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 transform text-gray-400" />
                        <Input
                            id="resetEmail"
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="border-gray-300 pl-10 focus:border-blue-500 focus:ring-blue-500"
                            placeholder="Enter your email address"
                            required
                        />
                    </div>
                </div>

                <div className="rounded-md border border-blue-200 bg-blue-50 p-4">
                    <div className="flex items-start">
                        <AlertCircle className="mt-0.5 mr-3 h-5 w-5 flex-shrink-0 text-blue-600" />
                        <div className="text-sm text-blue-800">
                            <p className="mb-1 font-medium">Password Reset Instructions</p>
                            <p>
                                We&apos;ll send you an email with a link to reset your password. The link will expire in
                                24 hours for security.
                            </p>
                        </div>
                    </div>
                </div>

                <div className="space-y-3">
                    <Button
                        asChild
                        type="submit"
                        className="w-full bg-orange-600 py-2.5 font-medium text-white hover:bg-orange-700"
                    >
                        <Link href="/reset-password">Send Reset Link</Link>
                    </Button>
                    <Button
                        asChild
                        type="button"
                        variant="outline"
                        className="w-full border-gray-300 bg-transparent text-gray-700 hover:bg-gray-50"
                    >
                        <Link href="/login">Back to Sign In</Link>
                    </Button>
                </div>
            </form>

            <div className="mt-6 border-t border-gray-200 pt-6 text-center">
                <p className="text-xs text-gray-500">
                    Remember your password?{' '}
                    <Button asChild variant="link" className="text-blue-600 hover:text-blue-800 hover:underline">
                        <Link href="/login">Sign in here</Link>
                    </Button>
                </p>
            </div>
        </div>
    );
};

ForgetPasswordPage.layoutType = 'auth';

export default ForgetPasswordPage;
