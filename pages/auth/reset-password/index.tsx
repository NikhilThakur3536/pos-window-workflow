import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Lock } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';
import type { NextPageWithLayout } from '@/types/next-page.types';

const ResetPasswordPage: NextPageWithLayout = () => {
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        console.log('Reset Password attempt:', { password, confirmPassword });
    };

    return (
        <div className="p-8">
            <div className="mb-8 text-center">
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-purple-100">
                    <Lock className="h-8 w-8 text-purple-600" />
                </div>
                <h1 className="mb-2 text-xl font-semibold text-gray-800">Reset Password</h1>
                <p className="text-sm text-gray-600">Enter your new password below</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-2">
                    <Label htmlFor="newPassword" className="text-sm font-medium text-gray-700">
                        New Password
                    </Label>
                    <div className="relative">
                        <Lock className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 transform text-gray-400" />
                        <Input
                            id="newPassword"
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="border-gray-300 pl-10 focus:border-blue-500 focus:ring-blue-500"
                            placeholder="Enter new password"
                            required
                        />
                    </div>
                </div>

                <div className="space-y-2">
                    <Label htmlFor="confirmNewPassword" className="text-sm font-medium text-gray-700">
                        Confirm New Password
                    </Label>
                    <div className="relative">
                        <Lock className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 transform text-gray-400" />
                        <Input
                            id="confirmNewPassword"
                            type="password"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            className="border-gray-300 pl-10 focus:border-blue-500 focus:ring-blue-500"
                            placeholder="Confirm new password"
                            required
                        />
                    </div>
                </div>

                <div className="rounded-md border border-gray-200 bg-gray-50 p-4">
                    <div className="text-sm text-gray-700">
                        <p className="mb-2 font-medium">Password Requirements:</p>
                        <ul className="space-y-1 text-xs">
                            <li>• At least 8 characters long</li>
                            <li>• Contains uppercase and lowercase letters</li>
                            <li>• Contains at least one number</li>
                            <li>• Contains at least one special character</li>
                        </ul>
                    </div>
                </div>

                <div className="space-y-3">
                    <Button
                        type="submit"
                        className="w-full bg-purple-600 py-2.5 font-medium text-white hover:bg-purple-700"
                    >
                        Update Password
                    </Button>

                    <Button
                        asChild
                        type="button"
                        variant="outline"
                        className="w-full border-gray-300 bg-transparent text-gray-700 hover:bg-gray-50"
                    >
                        <Link href="/forget-password">Cancel</Link>
                    </Button>
                </div>
            </form>
        </div>
    );
};

ResetPasswordPage.layoutType = 'auth';

export default ResetPasswordPage;
