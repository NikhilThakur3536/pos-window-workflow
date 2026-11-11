import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Lock, Mail, User } from 'lucide-react';
import Link from 'next/link';
import type React from 'react';
import { useState } from 'react';
import type { NextPageWithLayout } from '@/types/next-page.types';

const SignUpPage: NextPageWithLayout = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        console.log(`Signup attempt:`, { email, password, firstName, lastName });
    };

    return (
        <div className="p-8">
            <div className="mb-8 text-center">
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
                    <User className="h-8 w-8 text-green-600" />
                </div>
                <h1 className="mb-2 text-xl font-semibold text-gray-800">Create Account</h1>
                <p className="text-sm text-gray-600">Fill in your information to get started</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <Label htmlFor="firstName" className="text-sm font-medium text-gray-700">
                            First Name
                        </Label>
                        <Input
                            id="firstName"
                            type="text"
                            value={firstName}
                            onChange={(e) => setFirstName(e.target.value)}
                            className="border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                            placeholder="John"
                            required
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="lastName" className="text-sm font-medium text-gray-700">
                            Last Name
                        </Label>
                        <Input
                            id="lastName"
                            type="text"
                            value={lastName}
                            onChange={(e) => setLastName(e.target.value)}
                            className="border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                            placeholder="Doe"
                            required
                        />
                    </div>
                </div>

                <div className="space-y-2">
                    <Label htmlFor="signupEmail" className="text-sm font-medium text-gray-700">
                        Email Address
                    </Label>
                    <div className="relative">
                        <Mail className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 transform text-gray-400" />
                        <Input
                            id="signupEmail"
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="border-gray-300 pl-10 focus:border-blue-500 focus:ring-blue-500"
                            placeholder="john.doe@example.com"
                            required
                        />
                    </div>
                </div>

                <div className="space-y-2">
                    <Label htmlFor="signupPassword" className="text-sm font-medium text-gray-700">
                        Password
                    </Label>
                    <div className="relative">
                        <Lock className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 transform text-gray-400" />
                        <Input
                            id="signupPassword"
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="border-gray-300 pl-10 focus:border-blue-500 focus:ring-blue-500"
                            placeholder="Create a strong password"
                            required
                        />
                    </div>
                </div>

                <div className="space-y-2">
                    <Label htmlFor="confirmPassword" className="text-sm font-medium text-gray-700">
                        Confirm Password
                    </Label>
                    <div className="relative">
                        <Lock className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 transform text-gray-400" />
                        <Input
                            id="confirmPassword"
                            type="password"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            className="border-gray-300 pl-10 focus:border-blue-500 focus:ring-blue-500"
                            placeholder="Confirm your password"
                            required
                        />
                    </div>
                </div>

                <div className="flex items-center space-x-2">
                    <Checkbox id="terms" required />
                    <Label htmlFor="terms" className="text-sm text-gray-600">
                        I agree to the{' '}
                        <button type="button" className="text-blue-600 hover:text-blue-800 hover:underline">
                            Terms of Service
                        </button>{' '}
                        and{' '}
                        <button type="button" className="text-blue-600 hover:text-blue-800 hover:underline">
                            Privacy Policy
                        </button>
                    </Label>
                </div>

                <div className="space-y-3">
                    <Button
                        type="submit"
                        className="w-full bg-green-600 py-2.5 font-medium text-white hover:bg-green-700"
                    >
                        Create Account
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
        </div>
    );
};

SignUpPage.layoutType = 'auth';

export default SignUpPage;
