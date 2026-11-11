import { Button } from '@/components/ui/button';
import { CheckCircle } from 'lucide-react';
import Link from 'next/link';
import { useQueryState } from 'nuqs';
import type { NextPageWithLayout } from '@/types/next-page.types';

const VerificationPage: NextPageWithLayout = () => {
    const [email] = useQueryState('email', { defaultValue: '' });
    return (
        <div className="p-8">
            <div className="mb-8 text-center">
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
                    <CheckCircle className="h-8 w-8 text-green-600" />
                </div>
                <h1 className="mb-2 text-xl font-semibold text-gray-800">Check Your Email</h1>
                <p className="mb-4 text-sm text-gray-600">
                    We&apos;ve sent a verification link to <strong>{email}</strong>
                </p>
            </div>

            <div className="mb-6 rounded-md border border-green-200 bg-green-50 p-4">
                <div className="flex items-start">
                    <CheckCircle className="mt-0.5 mr-3 h-5 w-5 flex-shrink-0 text-green-600" />
                    <div className="text-sm text-green-800">
                        <p className="mb-1 font-medium">Email Sent Successfully</p>
                        <p>Please check your inbox and click the verification link to complete the process.</p>
                    </div>
                </div>
            </div>

            <div className="space-y-4">
                <div className="text-center text-sm text-gray-600">
                    <p>{"Didn't receive the email?"}</p>
                </div>

                <div className="space-y-3">
                    <Button
                        type="button"
                        variant="outline"
                        className="w-full border-gray-300 bg-transparent text-gray-700 hover:bg-gray-50"
                    >
                        Resend Email
                    </Button>
                    <Button
                        asChild
                        type="button"
                        className="w-full bg-blue-600 py-2.5 font-medium text-white hover:bg-blue-700"
                    >
                        <Link href="/login">Back to Sign In</Link>
                    </Button>
                </div>
            </div>

            <div className="mt-6 border-t border-gray-200 pt-6 text-center">
                <p className="text-xs text-gray-500">
                    Need help?{' '}
                    <button className="text-blue-600 hover:text-blue-800 hover:underline">Contact Support</button>
                </p>
            </div>
        </div>
    );
};

VerificationPage.layoutType = 'auth';

export default VerificationPage;
