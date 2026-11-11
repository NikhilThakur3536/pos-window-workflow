import React from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { UserDetails } from '@/api-queries/user';
import { useUserLogin } from '@/api-queries/auth';
import { useForm } from 'react-hook-form';
import { Loader2 } from 'lucide-react';
import { zodResolverCoerced as zodResolver } from '@/utils/zod-coerced';
import { LoginSchema, loginSchema } from '@/schema/auth';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input, PasswordInput } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';

interface DeleteConfirmationProps {
    open: boolean;
    onClose: () => void;
    onSuccess: (user: UserDetails) => void;
}

const SupervisorLogin = ({ open, onClose, onSuccess }: DeleteConfirmationProps) => {
    const userLogin = useUserLogin();

    const form = useForm<LoginSchema>({
        resolver: zodResolver(loginSchema),
        defaultValues: {
            staffNumber: undefined,
            password: '',
            domainId: process.env.NEXT_PUBLIC_DOMAIN_ID || '',
            ...(process.env.NEXT_PUBLIC_APP_TYPE ? { deviceType: process.env.NEXT_PUBLIC_APP_TYPE } : {}),
        },
    });

    const onSubmit = (values: LoginSchema) => {
        return userLogin.mutate(
            { ...values, posLogin: false },
            {
                onSuccess: (data) => {
                    const user = data.data.user;
                    onSuccess(user);
                },
                onError: (error) => {
                    // @ts-ignore
                    toast.error(error?.response?.data?.message || 'Internal Server Error!');
                },
            },
        );
    };

    return (
        <Dialog open={open} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader className="gap-0">
                    <DialogTitle>Supervisor authorisation</DialogTitle>
                    <DialogDescription className="text-xs">
                        Sign in with a supervisor account that is allowed to approve this action. This uses the normal
                        company login, so the same staff number and password apply.
                    </DialogDescription>
                </DialogHeader>

                <Separator />

                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                        <FormField
                            control={form.control}
                            name="staffNumber"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Staff Number</FormLabel>
                                    <FormControl>
                                        <Input
                                            type="number"
                                            placeholder="Enter staff number"
                                            value={field.value ?? ''}
                                            onChange={(event) =>
                                                field.onChange(
                                                    event.target.value === '' ? undefined : event.target.valueAsNumber,
                                                )
                                            }
                                        />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        {!process.env.NEXT_PUBLIC_DOMAIN_ID && (
                            <FormField
                                control={form.control}
                                name="domainId"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Domain ID</FormLabel>
                                        <FormControl>
                                            <Input placeholder="Enter domain ID" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        )}
                        <FormField
                            control={form.control}
                            name="password"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Password</FormLabel>
                                    <FormControl>
                                        <PasswordInput placeholder="Enter your password" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <Separator />

                        <Button
                            disabled={userLogin.isPending}
                            type="submit"
                            className="w-full bg-green-600 py-2.5 font-medium text-white hover:bg-green-700"
                        >
                            {userLogin.isPending && <Loader2 className="size-4 animate-spin" />}
                            Authorise
                        </Button>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
};

export default SupervisorLogin;
