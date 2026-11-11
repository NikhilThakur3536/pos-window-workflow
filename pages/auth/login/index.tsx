// import { UserLoginResponse, useUserLogin } from '@/api-queries/auth';
// import { useGetDomains } from '@/api-queries/auth/domains';
// import { Company } from '@/api-queries/company-details';
// import { CompanySelection } from '@/components/custom-components/layouts/company-selection';
// import { GetTerminalId } from '@/components/system-settings/terminal-id';
// import { Button } from '@/components/ui/button';
// import {
//     Dialog,
//     DialogContent,
//     DialogHeader,
//     DialogTitle,
//     DialogFooter,
// } from '@/components/ui/dialog';
// import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
// import { Input, PasswordInput } from '@/components/ui/input';
// import { AUTH_TOKEN_KEY } from '@/lib/constant';
// import { LoginSchema, loginSchema } from '@/schema/auth';
// import { useAuthUser } from '@/stores/auth-user.store';
// import type { NextPageWithLayout } from '@/types/next-page.types';
// import { zodResolver } from '@hookform/resolvers/zod';
// import { Loader2 } from 'lucide-react';
// // import Link from 'next/link';
// import { useRouter } from 'next/navigation';
// import { useEffect, useState } from 'react';
// import { useForm } from 'react-hook-form';
// import { toast } from 'sonner';
// import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

// const LoginPage: NextPageWithLayout = () => {
//     const domainId = process.env.NEXT_PUBLIC_DOMAIN_ID;
//     const domains = useGetDomains({}, !domainId)?.data?.data?.rows;

//     const authStore = useAuthUser();
//     const loginFn = useUserLogin();
//     const router = useRouter();

//     const [systemMode, setSystemMode] = useState<'online' | 'offline'>('online');
//     const [isSystemModeDialogOpen, setIsSystemModeDialogOpen] = useState(false);

//     useEffect(() => {
//         const savedMode = localStorage.getItem('systemMode') as 'online' | 'offline' | null;

//         if (savedMode === 'online' || savedMode === 'offline') {
//             setSystemMode(savedMode);
//         } else {
//             localStorage.setItem('systemMode', 'online');
//         }
//     }, []);

//     const handleSaveSystemMode = () => {
//         localStorage.setItem('systemMode', systemMode);
//         window.location.reload();
//         toast.success(`System mode changed to ${systemMode}`);
//         setIsSystemModeDialogOpen(false);
//     };

//     const form = useForm({
//         resolver: zodResolver(loginSchema),
//         defaultValues: {
//             // email: domainId ? 'onetouchuser1@gmail.com' : 'jon@yopmail.com',
//             staffNumber: undefined,
//             password: 'SecurePass@123',
//             domainId: domainId || '',
//             ...(process.env.NEXT_PUBLIC_APP_TYPE ? { deviceType: process.env.NEXT_PUBLIC_APP_TYPE } : {}),
//         },
//     });

//     const [loggedInData, setLoggedInData] = useState<UserLoginResponse | null>(null);

//     const onSubmit = (values: LoginSchema) => {
//         return loginFn.mutate(values, {
//             onSuccess: (data) => {
//                 const { user, token } = data.data;

//                 const isAdmin = user.companyUserGroups?.[0]?.group?.name?.toLowerCase() === 'admin';

//                 if (isAdmin) {
//                     setLoggedInData(data);
//                     setIsDialogOpen(true);
//                 } else {
//                     localStorage.setItem(AUTH_TOKEN_KEY, token);
//                     authStore.login(
//                         {
//                             ...user,
//                             token,
//                         },
//                         user.currency,
//                     );

//                     authStore.setCompany(user.company);
//                     router.push('/');
//                 }
//             },
//             onError: (error) => {
//                 // @ts-ignore
//                 toast.error(error?.response?.data?.message || 'Internal Server Error!');
//             },
//         });
//     };

//     const [isDialogOpen, setIsDialogOpen] = useState(false);

//     const handleSelectedCompany = (company: Company) => {
//         if (loggedInData) {
//             const { user, token } = loggedInData?.data;
//             localStorage.setItem(AUTH_TOKEN_KEY, token);
//             authStore.login(
//                 {
//                     ...user,
//                     token,
//                 },
//                 user.currency,
//             );

//             authStore.setCompany(company);
//             router.push('/');
//         }
//     };

//     const [showTerminalId, setShowTerminalId] = useState(false);

//     return (
//         <>
//             <div className="p-8">
//                 <div className="mb-4 border-b border-gray-200 pb-4">
//                     <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full">
//                         <img src={`/assets/images/onetouch-logo.jpg`} className="h-full w-full rounded-full" />
//                     </div>
//                 </div>

//                 <div className="mb-4 flex justify-end">
//                     <Button
//                         type="button"
//                         variant="outline"
//                         onClick={() => setIsSystemModeDialogOpen(true)}
//                     >
//                         System Mode : {systemMode}
//                     </Button>
//                 </div>

//                 <Form {...form}>
//                     <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
//                         {/* <FormField
//                             control={form.control}
//                             name="email"
//                             render={({ field }) => (
//                                 <FormItem>
//                                     <FormLabel>Email Address</FormLabel>
//                                     <FormControl>
//                                         <Input placeholder="Enter your email" {...field} />
//                                     </FormControl>
//                                     <FormMessage className="-mt-1 text-xs" />
//                                 </FormItem>
//                             )}
//                         /> */}
//                         <FormField
//                             control={form.control}
//                             name="staffNumber"
//                             render={({ field }) => (
//                                 <FormItem>
//                                     <FormLabel>Staff Number</FormLabel>
//                                     <FormControl>
//                                         <Input
//                                             type="number"
//                                             placeholder="Enter Staff Number"
//                                             value={field.value ?? ''}
//                                             onChange={(e) =>
//                                                 field.onChange(
//                                                     e.target.value === '' ? undefined : Number(e.target.valueAsNumber)
//                                                 )
//                                             }
//                                         />
//                                     </FormControl>
//                                     <FormMessage />
//                                 </FormItem>
//                             )}
//                         />

//                         <FormField
//                             control={form.control}
//                             name="password"
//                             render={({ field }) => (
//                                 <FormItem>
//                                     <FormLabel>Password</FormLabel>
//                                     <FormControl>
//                                         <PasswordInput placeholder="Enter your password" {...field} />
//                                     </FormControl>
//                                     <FormMessage className="-mt-1 text-xs" />
//                                 </FormItem>
//                             )}
//                         />

//                         {domainId ? null : (
//                             <FormField
//                                 control={form.control}
//                                 name="domainId"
//                                 render={({ field }) => (
//                                     <FormItem>
//                                         <FormLabel>Domain</FormLabel>
//                                         <Select onValueChange={field.onChange} defaultValue={field.value}>
//                                             <FormControl>
//                                                 <SelectTrigger>
//                                                     <SelectValue placeholder="Select Domain" />
//                                                 </SelectTrigger>
//                                             </FormControl>
//                                             <SelectContent>
//                                                 {domains?.map((option) => (
//                                                     <SelectItem key={option.id} value={option.id}>
//                                                         {option.domainName} ({option.email})
//                                                     </SelectItem>
//                                                 ))}
//                                             </SelectContent>
//                                         </Select>
//                                         <FormMessage className="-mt-1 text-xs" />
//                                     </FormItem>
//                                 )}
//                             />
//                         )}

//                         {/* <div className="flex items-center justify-between">
//                             <div className="flex items-center space-x-2"></div>
//                             <Button
//                                 asChild
//                                 variant="link"
//                                 type="button"
//                                 className="text-sm text-blue-600 hover:text-blue-800 hover:underline"
//                             >
//                                 <Link href="/forget-password">Forgot password?</Link>
//                             </Button>
//                         </div> */}

//                         <div className="space-y-3">
//                             <Button
//                                 type="submit"
//                                 className="w-full bg-blue-600 py-2.5 font-medium text-white hover:bg-blue-700"
//                             >
//                                 {loginFn.isPending && <Loader2 className="size-4 animate-spin" />}
//                                 Sign In
//                             </Button>
//                             <Button
//                                 type="button"
//                                 variant="outline"
//                                 className="w-full border-gray-300 bg-transparent text-gray-700 hover:bg-gray-50"
//                             >
//                                 Cancel
//                             </Button>
//                         </div>
//                     </form>
//                 </Form>

//                 <div className="mt-4 border-t border-gray-200 pt-4 text-center">
//                     <p className="text-xs text-gray-500">
//                         {'Register your terminal? '}
//                         <Button
//                             variant="link"
//                             className="text-blue-600 hover:text-blue-800 hover:underline"
//                             onClick={() => setShowTerminalId(true)}
//                         >
//                             Fetch Terminal ID
//                         </Button>
//                     </p>
//                 </div>
//             </div>

//             {showTerminalId && <GetTerminalId isOpen={showTerminalId} onClose={() => setShowTerminalId(false)} />}

//             {loggedInData && (
//                 <CompanySelection
//                     isOpen={isDialogOpen}
//                     onClose={() => setIsDialogOpen(false)}
//                     onSelectCompany={handleSelectedCompany}
//                     token={loggedInData?.data?.token}
//                 />
//             )}

//             {/* <Dialog open={isSystemModeDialogOpen} onOpenChange={setIsSystemModeDialogOpen}>
//                 <DialogContent>
//                     <DialogHeader>
//                         <DialogTitle>Select System Mode</DialogTitle>
//                     </DialogHeader>

//                     <div className="space-y-4 py-4">
//                         <Select
//                             value={systemMode}
//                             onValueChange={(value: 'online' | 'offline') => setSystemMode(value)}
//                         >
//                             <SelectTrigger>
//                                 <SelectValue placeholder="Select System Mode" />
//                             </SelectTrigger>

//                             <SelectContent>
//                                 <SelectItem value="online">Online</SelectItem>
//                                 <SelectItem value="offline">Offline</SelectItem>
//                             </SelectContent>
//                         </Select>
//                     </div>

//                     <DialogFooter>
//                         <Button
//                             variant="outline"
//                             onClick={() => setIsSystemModeDialogOpen(false)}
//                         >
//                             Cancel
//                         </Button>

//                         <Button onClick={handleSaveSystemMode}>
//                             Save
//                         </Button>
//                     </DialogFooter>
//                 </DialogContent>
//             </Dialog> */}
//         </>
//     );
// };

// LoginPage.layoutType = 'auth';

// export default LoginPage;
// import { UserLoginResponse, useUserLogin } from '@/api-queries/auth';
// import { useGetDomains } from '@/api-queries/auth/domains';
// import { Company } from '@/api-queries/company-details';
// import { getCompanyContextFn } from '@/api-queries/child-company-context';
// import { CompanySelection } from '@/components/custom-components/layouts/company-selection';
// import { GetTerminalId } from '@/components/system-settings/terminal-id';
// import { Button } from '@/components/ui/button';
// import {
//     Dialog,
//     DialogContent,
//     DialogHeader,
//     DialogTitle,
//     DialogFooter,
// } from '@/components/ui/dialog';
// import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
// import { Input, PasswordInput } from '@/components/ui/input';
// import { AUTH_TOKEN_KEY } from '@/lib/constant';
// import { LoginSchema, loginSchema } from '@/schema/auth';
// import { useAuthUser } from '@/stores/auth-user.store';
// import type { NextPageWithLayout } from '@/types/next-page.types';
// import { zodResolver } from '@hookform/resolvers/zod';
// import { clearDB } from '@/offline/db';
// import { Loader2 } from 'lucide-react';
// // import Link from 'next/link';
// import { useRouter } from 'next/navigation';
// import { useEffect, useState } from 'react';
// import { useForm } from 'react-hook-form';
// import { toast } from 'sonner';
// import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

// // Local storage key used to persist the fetched company context payload
// const COMPANY_CONTEXT_KEY = 'companyContext';

// const LoginPage: NextPageWithLayout = () => {
//     const domainId = process.env.NEXT_PUBLIC_DOMAIN_ID;
//     const domains = useGetDomains({}, !domainId)?.data?.data?.rows;

//     const authStore = useAuthUser();
//     const loginFn = useUserLogin();
//     const router = useRouter();

//     const [systemMode, setSystemMode] = useState<'online' | 'offline'>('online');
//     const [isSystemModeDialogOpen, setIsSystemModeDialogOpen] = useState(false);
//     useEffect(() => {
//         const savedMode = localStorage.getItem('systemMode') as 'online' | 'offline' | null;

//         if (savedMode === 'online' || savedMode === 'offline') {
//             setSystemMode(savedMode);
//         } else {
//             localStorage.setItem('systemMode', 'online');
//         }
//     }, []);

//     // const handleSaveSystemMode = () => {
//     //     localStorage.setItem('systemMode', systemMode);
//     //     window.location.reload();
//     //     toast.success(`System mode changed to ${systemMode}`);
//     //     setIsSystemModeDialogOpen(false);
//     // };
//     const handleSaveSystemMode = () => {
//     localStorage.setItem('systemMode', systemMode);
//     localStorage.removeItem(AUTH_TOKEN_KEY);
//     localStorage.removeItem(COMPANY_CONTEXT_KEY);
//     clearDB();

//     toast.success(`System mode changed to ${systemMode}`);
//     setIsSystemModeDialogOpen(false);

//     window.location.reload(); 
// };

//     const form = useForm({
//         resolver: zodResolver(loginSchema),
//         defaultValues: {
//             // email: domainId ? 'onetouchuser1@gmail.com' : 'jon@yopmail.com',
//             staffNumber: undefined,
//             password: 'SecurePass@123',
//             domainId: domainId || '',
//             ...(process.env.NEXT_PUBLIC_APP_TYPE ? { deviceType: process.env.NEXT_PUBLIC_APP_TYPE } : {}),
//         },
//     });

//     const [loggedInData, setLoggedInData] = useState<UserLoginResponse | null>(null);

//     // Helper: fetches the company context and persists it to localStorage.
//     // Wrapped in try/catch so a context-fetch failure never blocks the login redirect.
//     const fetchAndStoreCompanyContext = async (companyId?: string) => {
//         try {
//             const companyContextRes = await getCompanyContextFn(
//                 companyId ? { companyId } : undefined,
//             );

//             if (companyContextRes?.data) {
//                 localStorage.setItem(COMPANY_CONTEXT_KEY, JSON.stringify(companyContextRes.data));
//             }
//         } catch (error) {
//             // Non-fatal: log and continue, login flow should not be blocked by this
//             // eslint-disable-next-line no-console
//             console.error('Failed to fetch company context:', error);
//         }
//     };

//     const onSubmit = (values: LoginSchema) => {
//         return loginFn.mutate(values, {
//             onSuccess: async (data) => {
//                 const { user, token } = data.data;

//                 const isAdmin = user.companyUserGroups?.[0]?.group?.name?.toLowerCase() === 'admin';

//                 if (isAdmin) {
//                     setLoggedInData(data);
//                     setIsDialogOpen(true);
//                 } else {
//                     localStorage.setItem(AUTH_TOKEN_KEY, token);
//                     authStore.login(
//                         {
//                             ...user,
//                             token,
//                         },
//                         user.currency,
//                     );

//                     authStore.setCompany(user.company);

//                     // Fetch and persist company context after a fully successful login
//                     await fetchAndStoreCompanyContext(user.company?.id);

//                     router.push('/');
//                 }
//             },
//             onError: (error) => {
//                 // @ts-ignore
//                 toast.error(error?.response?.data?.message || 'Internal Server Error!');
//             },
//         });
//     };

//     const [isDialogOpen, setIsDialogOpen] = useState(false);

//     const handleSelectedCompany = async (company: Company) => {
//         if (loggedInData) {
//             const { user, token } = loggedInData?.data;
//             localStorage.setItem(AUTH_TOKEN_KEY, token);
//             authStore.login(
//                 {
//                     ...user,
//                     token,
//                 },
//                 user.currency,
//             );

//             authStore.setCompany(company);

//             // Fetch and persist company context after admin finalizes company selection
//             await fetchAndStoreCompanyContext(company?.id);

//             router.push('/');
//         }
//     };

//     const [showTerminalId, setShowTerminalId] = useState(false);

//     return (
//         <>
//             <div className="p-8">
//                 <div className="mb-4 border-b border-gray-200 pb-4">
//                     <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full">
//                         <img src={`/assets/images/onetouch-logo.jpg`} className="h-full w-full rounded-full" />
//                     </div>
//                 </div>

//                 <div className="mb-4 flex justify-end">
//                     <Button
//                         type="button"
//                         variant="outline"
//                         onClick={() => setIsSystemModeDialogOpen(true)}
//                     >
//                         System Mode : {systemMode}
//                     </Button>
//                 </div>

//                 <Form {...form}>
//                     <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
//                         {/* <FormField
//                             control={form.control}
//                             name="email"
//                             render={({ field }) => (
//                                 <FormItem>
//                                     <FormLabel>Email Address</FormLabel>
//                                     <FormControl>
//                                         <Input placeholder="Enter your email" {...field} />
//                                     </FormControl>
//                                     <FormMessage className="-mt-1 text-xs" />
//                                 </FormItem>
//                             )}
//                         /> */}
//                         <FormField
//                             control={form.control}
//                             name="staffNumber"
//                             render={({ field }) => (
//                                 <FormItem>
//                                     <FormLabel>Staff Number</FormLabel>
//                                     <FormControl>
//                                         <Input
//                                             type="number"
//                                             placeholder="Enter Staff Number"
//                                             value={field.value ?? ''}
//                                             onChange={(e) =>
//                                                 field.onChange(
//                                                     e.target.value === '' ? undefined : Number(e.target.valueAsNumber)
//                                                 )
//                                             }
//                                         />
//                                     </FormControl>
//                                     <FormMessage />
//                                 </FormItem>
//                             )}
//                         />

//                         <FormField
//                             control={form.control}
//                             name="password"
//                             render={({ field }) => (
//                                 <FormItem>
//                                     <FormLabel>Password</FormLabel>
//                                     <FormControl>
//                                         <PasswordInput placeholder="Enter your password" {...field} />
//                                     </FormControl>
//                                     <FormMessage className="-mt-1 text-xs" />
//                                 </FormItem>
//                             )}
//                         />

//                         {domainId ? null : (
//                             <FormField
//                                 control={form.control}
//                                 name="domainId"
//                                 render={({ field }) => (
//                                     <FormItem>
//                                         <FormLabel>Domain</FormLabel>
//                                         <Select onValueChange={field.onChange} defaultValue={field.value}>
//                                             <FormControl>
//                                                 <SelectTrigger>
//                                                     <SelectValue placeholder="Select Domain" />
//                                                 </SelectTrigger>
//                                             </FormControl>
//                                             <SelectContent>
//                                                 {domains?.map((option) => (
//                                                     <SelectItem key={option.id} value={option.id}>
//                                                         {option.domainName} ({option.email})
//                                                     </SelectItem>
//                                                 ))}
//                                             </SelectContent>
//                                         </Select>
//                                         <FormMessage className="-mt-1 text-xs" />
//                                     </FormItem>
//                                 )}
//                             />
//                         )}

//                         {/* <div className="flex items-center justify-between">
//                             <div className="flex items-center space-x-2"></div>
//                             <Button
//                                 asChild
//                                 variant="link"
//                                 type="button"
//                                 className="text-sm text-blue-600 hover:text-blue-800 hover:underline"
//                             >
//                                 <Link href="/forget-password">Forgot password?</Link>
//                             </Button>
//                         </div> */}

//                         <div className="space-y-3">
//                             <Button
//                                 type="submit"
//                                 className="w-full bg-blue-600 py-2.5 font-medium text-white hover:bg-blue-700"
//                             >
//                                 {loginFn.isPending && <Loader2 className="size-4 animate-spin" />}
//                                 Sign In
//                             </Button>
//                             <Button
//                                 type="button"
//                                 variant="outline"
//                                 className="w-full border-gray-300 bg-transparent text-gray-700 hover:bg-gray-50"
//                             >
//                                 Cancel
//                             </Button>
//                         </div>
//                     </form>
//                 </Form>

//                 <div className="mt-4 border-t border-gray-200 pt-4 text-center">
//                     <p className="text-xs text-gray-500">
//                         {'Register your terminal? '}
//                         <Button
//                             variant="link"
//                             className="text-blue-600 hover:text-blue-800 hover:underline"
//                             onClick={() => setShowTerminalId(true)}
//                         >
//                             Fetch Terminal ID
//                         </Button>
//                     </p>
//                 </div>
//             </div>

//             {showTerminalId && <GetTerminalId isOpen={showTerminalId} onClose={() => setShowTerminalId(false)} />}

//             {loggedInData && (
//                 <CompanySelection
//                     isOpen={isDialogOpen}
//                     onClose={() => setIsDialogOpen(false)}
//                     onSelectCompany={handleSelectedCompany}
//                     token={loggedInData?.data?.token}
//                 />
//             )}

//             <Dialog open={isSystemModeDialogOpen} onOpenChange={setIsSystemModeDialogOpen}>
//                 <DialogContent>
//                     <DialogHeader>
//                         <DialogTitle>Select System Mode</DialogTitle>
//                     </DialogHeader>

//                     <div className="space-y-4 py-4">
//                         <Select
//                             value={systemMode}
//                             onValueChange={(value: 'online' | 'offline') => setSystemMode(value)}
//                         >
//                             <SelectTrigger>
//                                 <SelectValue placeholder="Select System Mode" />
//                             </SelectTrigger>

//                             <SelectContent>
//                                 <SelectItem value="online">Online</SelectItem>
//                                 <SelectItem value="offline">Offline</SelectItem>
//                             </SelectContent>
//                         </Select>
//                     </div>

//                     <DialogFooter>
//                         <Button
//                             variant="outline"
//                             onClick={() => setIsSystemModeDialogOpen(false)}
//                         >
//                             Cancel
//                         </Button>

//                         <Button onClick={handleSaveSystemMode}>
//                             Save
//                         </Button>
//                     </DialogFooter>
//                 </DialogContent>
//             </Dialog>
//         </>
//     );
// };

// LoginPage.layoutType = 'auth';

// export default LoginPage;
import { UserLoginResponse, useUserLogin } from '@/api-queries/auth';
import { useGetDomains } from '@/api-queries/auth/domains';
import { Company } from '@/api-queries/company-details';
import { getCompanyContextFn } from '@/api-queries/child-company-context';
import { getActiveTillSession, isTillSessionActive } from '@/api-queries/till-session';
import { useTillSessionState } from '@/stores/till-session.store';
import { getConfiguredTerminalId, getOrCreateInstallationId } from '@/stores/terminal.store';
import { CompanySelection } from '@/components/custom-components/layouts/company-selection';
import { GetTerminalId } from '@/components/system-settings/terminal-id';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input, PasswordInput } from '@/components/ui/input';
import { AUTH_TOKEN_KEY } from '@/lib/constant';
import { LoginSchema, loginSchema } from '@/schema/auth';
import { useAuthUser } from '@/stores/auth-user.store';
import type { NextPageWithLayout } from '@/types/next-page.types';
import { zodResolverCoerced as zodResolver } from '@/utils/zod-coerced';
import { clearDB } from '@/offline/db';
import { Loader2 } from 'lucide-react';
// import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { getTerminalErrorMessage } from '@/utils/terminal-errors';

// Local storage key used to persist the fetched company context payload
const COMPANY_CONTEXT_KEY = 'companyContext';
const IS_ELECTRON_BUILD = process.env.NEXT_PUBLIC_IS_ELECTRON_APP === 'true';
const LOGIN_CLIENT_TYPE = IS_ELECTRON_BUILD
    ? 'DESKTOP'
    : process.env.NEXT_PUBLIC_CLIENT_TYPE === 'APP'
      ? 'APP'
      : 'WEB';

const LoginPage: NextPageWithLayout = () => {
    const domainId = process.env.NEXT_PUBLIC_DOMAIN_ID;
    const domains = useGetDomains({}, !domainId)?.data?.data?.rows;

    const authStore = useAuthUser();
    const loginFn = useUserLogin();
    const router = useRouter();

    const [systemMode, setSystemMode] = useState<'online' | 'offline'>('online');
    const [isSystemModeDialogOpen, setIsSystemModeDialogOpen] = useState(false);
    useEffect(() => {
        if (IS_ELECTRON_BUILD) getOrCreateInstallationId();
    }, []);

    useEffect(() => {
        const savedMode = localStorage.getItem('systemMode') as 'online' | 'offline' | null;

        if (savedMode === 'online' || savedMode === 'offline') {
            setSystemMode(savedMode);
        } else {
            localStorage.setItem('systemMode', 'online');
        }
    }, []);

    // const handleSaveSystemMode = () => {
    //     localStorage.setItem('systemMode', systemMode);
    //     window.location.reload();
    //     toast.success(`System mode changed to ${systemMode}`);
    //     setIsSystemModeDialogOpen(false);
    // };
    const handleSaveSystemMode = () => {
    localStorage.setItem('systemMode', systemMode);
    localStorage.removeItem(AUTH_TOKEN_KEY);
    localStorage.removeItem(COMPANY_CONTEXT_KEY);
    clearDB();

    toast.success(`System mode changed to ${systemMode}`);
    setIsSystemModeDialogOpen(false);

    window.location.reload(); 
};

    const form = useForm({
        resolver: zodResolver(loginSchema),
        defaultValues: {
            // email: domainId ? 'onetouchuser1@gmail.com' : 'jon@yopmail.com',
            staffNumber: undefined,
            password: 'SecurePass@123',
            domainId: domainId || '',
            ...(process.env.NEXT_PUBLIC_APP_TYPE ? { deviceType: process.env.NEXT_PUBLIC_APP_TYPE } : {}),
        },
    });

    const [loggedInData, setLoggedInData] = useState<UserLoginResponse | null>(null);

    // Helper: fetches the company context and persists it to localStorage.
    // Wrapped in try/catch so a context-fetch failure never blocks the login redirect.
    const fetchAndStoreCompanyContext = async (companyId?: string) => {
        try {
            const companyContextRes = await getCompanyContextFn(
                companyId ? { companyId } : undefined,
            );

            if (companyContextRes?.data) {
                localStorage.setItem(COMPANY_CONTEXT_KEY, JSON.stringify(companyContextRes.data));
            }
        } catch (error) {
            // Non-fatal: log and continue, login flow should not be blocked by this
            console.error('Failed to fetch company context:', error);
        }
    };

    // Helper: checks the server for an already-open till session just after login
    // and syncs it into the (localStorage-persisted) till session store, so the
    // cashier is not re-prompted to open a till that is already open on the server.
    // Non-fatal: a failure simply leaves the store untouched.
    const syncActiveTillSession = async () => {
        try {
            const res = await getActiveTillSession();
            const session = res?.data;
            if (isTillSessionActive(session)) {
                useTillSessionState.getState().setTillSession(session);
            } else {
                useTillSessionState.getState().clearTillSession();
            }
        } catch (error) {
            console.error('Failed to sync active till session:', error);
        }
    };

    const finalizeLogin = async (loginData: UserLoginResponse['data'], company = loginData.user.company) => {
        const { user, token, sessionExpiresAt, expiryAt } = loginData;
        localStorage.setItem(AUTH_TOKEN_KEY, token);
        authStore.login({ ...user, token }, user.currency, sessionExpiresAt || expiryAt);
        authStore.setCompany(company);
        await fetchAndStoreCompanyContext(company?.id);
        if (user.terminalId) await syncActiveTillSession();
        await router.push('/');
    };

    const completeLogin = async (loginData: UserLoginResponse['data']) => {
        const { user } = loginData;

        const terminalId = loginData.terminalId?.trim() || '';
        const loggedInUser = {
            ...user,
            ...(terminalId ? { terminalId } : {}),
            sessionId: loginData.sessionId,
            clientType: loginData.clientType || LOGIN_CLIENT_TYPE,
            installationId: loginData.installationId || (IS_ELECTRON_BUILD ? getOrCreateInstallationId() : undefined),
            eligibleTills: loginData.eligibleTills || [],
            rosterAssignmentId: loginData.rosterAssignmentId,
        };
        useTillSessionState.getState().clearTillSession();

        const completedLoginData = {
            ...loginData,
            user: loggedInUser,
            ...(terminalId ? { terminalId } : {}),
        };

        const isAdmin = user.companyUserGroups?.some(
            (companyUserGroup) => companyUserGroup.group?.name?.toLowerCase() === 'admin',
        );
        if (isAdmin) {
            setLoggedInData({ data: completedLoginData, success: true });
            setIsDialogOpen(true);
            return;
        }

        await finalizeLogin(completedLoginData);
    };

    const submitLogin = (values: LoginSchema) => {
        return loginFn.mutate({ ...values, requestHeaders: { 'X-Client-Type': LOGIN_CLIENT_TYPE } }, {
            onSuccess: async (data) => {
                await completeLogin({ ...data.data, message: data.data.message || data.message });
            },
            onError: (error) => {
                const apiError = error as typeof error & {
                    response?: { data?: { message?: string; error?: string } };
                };
                toast.error(
                    getTerminalErrorMessage(
                        apiError.response?.data?.message || apiError.response?.data?.error || apiError.message,
                        'Login failed.',
                    ),
                );
            },
        });
    };

    const onSubmit = (values: LoginSchema) => submitLogin(values);

    const [isDialogOpen, setIsDialogOpen] = useState(false);

    const handleSelectedCompany = async (company: Company) => {
        if (loggedInData) await finalizeLogin(loggedInData.data, company);
    };

    const [showTerminalId, setShowTerminalId] = useState(false);
    useEffect(() => {
        if (IS_ELECTRON_BUILD && !getConfiguredTerminalId()) setShowTerminalId(true);
    }, []);

    return (
        <>
            <div className="p-8">
                <div className="mb-4 border-b border-gray-200 pb-4">
                    <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full">
                        <img src={`/assets/images/onetouch-logo.jpg`} className="h-full w-full rounded-full" />
                    </div>
                </div>

                <div className="mb-4 flex justify-end">
                    <Button
                        type="button"
                        variant="outline"
                        onClick={() => setIsSystemModeDialogOpen(true)}
                    >
                        System Mode : {systemMode}
                    </Button>
                </div>

                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                        {/* <FormField
                            control={form.control}
                            name="email"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Email Address</FormLabel>
                                    <FormControl>
                                        <Input placeholder="Enter your email" {...field} />
                                    </FormControl>
                                    <FormMessage className="-mt-1 text-xs" />
                                </FormItem>
                            )}
                        /> */}
                        <FormField
                            control={form.control}
                            name="staffNumber"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Staff Number</FormLabel>
                                    <FormControl>
                                        <Input
                                            type="number"
                                            placeholder="Enter Staff Number"
                                            value={field.value ?? ''}
                                            onChange={(e) =>
                                                field.onChange(
                                                    e.target.value === '' ? undefined : Number(e.target.valueAsNumber)
                                                )
                                            }
                                        />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name="password"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Password</FormLabel>
                                    <FormControl>
                                        <PasswordInput placeholder="Enter your password" {...field} />
                                    </FormControl>
                                    <FormMessage className="-mt-1 text-xs" />
                                </FormItem>
                            )}
                        />

                        {domainId ? null : (
                            <FormField
                                control={form.control}
                                name="domainId"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Domain</FormLabel>
                                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                                            <FormControl>
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Select Domain" />
                                                </SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                                {domains?.map((option) => (
                                                    <SelectItem key={option.id} value={option.id}>
                                                        {option.domainName} ({option.email})
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        <FormMessage className="-mt-1 text-xs" />
                                    </FormItem>
                                )}
                            />
                        )}

                        {/* <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-2"></div>
                            <Button
                                asChild
                                variant="link"
                                type="button"
                                className="text-sm text-blue-600 hover:text-blue-800 hover:underline"
                            >
                                <Link href="/forget-password">Forgot password?</Link>
                            </Button>
                        </div> */}

                        <div className="space-y-3">
                            <Button
                                type="submit"
                                className="w-full bg-blue-600 py-2.5 font-medium text-white hover:bg-blue-700"
                                disabled={loginFn.isPending}
                            >
                                {loginFn.isPending && <Loader2 className="size-4 animate-spin" />}
                                Login
                            </Button>

                            <Button
                                type="button"
                                variant="outline"
                                className="w-full border-gray-300 bg-transparent text-gray-700 hover:bg-gray-50"
                            >
                                Cancel
                            </Button>
                        </div>
                    </form>
                </Form>

                {IS_ELECTRON_BUILD && (
                    <div className="mt-4 border-t border-gray-200 pt-4 text-center">
                        <p className="text-xs text-gray-500">
                            First time on this EXE?{' '}
                            <Button
                                variant="link"
                                className="text-blue-600 hover:text-blue-800 hover:underline"
                                onClick={() => setShowTerminalId(true)}
                            >
                                Terminal Setup
                            </Button>
                        </p>
                    </div>
                )}
            </div>

            {IS_ELECTRON_BUILD && showTerminalId && (
                <GetTerminalId isOpen={showTerminalId} onClose={() => setShowTerminalId(false)} />
            )}

            {loggedInData && (
                <CompanySelection
                    isOpen={isDialogOpen}
                    onClose={() => setIsDialogOpen(false)}
                    onSelectCompany={handleSelectedCompany}
                    token={loggedInData.data.token}
                />
            )}

            <Dialog open={isSystemModeDialogOpen} onOpenChange={setIsSystemModeDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Select System Mode</DialogTitle>
                    </DialogHeader>

                    <div className="space-y-4 py-4">
                        <Select
                            value={systemMode}
                            onValueChange={(value: 'online' | 'offline') => setSystemMode(value)}
                        >
                            <SelectTrigger>
                                <SelectValue placeholder="Select System Mode" />
                            </SelectTrigger>

                            <SelectContent>
                                <SelectItem value="online">Online</SelectItem>
                                <SelectItem value="offline">Offline</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <DialogFooter>
                        <Button
                            variant="outline"
                            onClick={() => setIsSystemModeDialogOpen(false)}
                        >
                            Cancel
                        </Button>

                        <Button onClick={handleSaveSystemMode}>
                            Save
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
};

LoginPage.layoutType = 'auth';

export default LoginPage;
