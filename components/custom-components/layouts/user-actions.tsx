import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthUser } from '@/stores/auth-user.store';
import { AUTH_TOKEN_KEY } from '@/lib/constant';
import ConfirmDialog from '@/components/confirm-dialog';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { ArrowLeftRight, Home, Laptop, LogOut, Wifi, WifiOff } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { CompanySelection } from './company-selection';
import { Company } from '@/api-queries/company-details';
import { clearDB } from '@/offline/db';
import { GetTerminalId } from '@/components/system-settings/terminal-id';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { useTillSessionState } from '@/stores/till-session.store';
import { queryClient } from '@/components/query-client';

const UserActions = () => {
    const isElectronApp = process.env.NEXT_PUBLIC_IS_ELECTRON_APP === 'true';
    const router = useRouter();

    const [logoutConfirmModal, setLogoutConfirmModal] = useState(false);
    const authStore = useAuthUser();
    const userDetails = useAuthUser((state) => state.user);
    const company = useAuthUser((state) => state.company);
    const isAdmin = userDetails?.companyUserGroups?.[0]?.group?.name?.toLowerCase() === 'admin';

    const [isDialogOpen, setIsDialogOpen] = useState(false);

    const [systemMode, setSystemMode] = useState<'online' | 'offline'>('online');
    const [isSystemModeDialogOpen, setIsSystemModeDialogOpen] = useState(false);

    // NEW: confirmation step for relogin after switching system mode
    const [relicoginConfirmOpen, setRelicoginConfirmOpen] = useState(false);

    useEffect(() => {
        const savedMode = localStorage.getItem('systemMode') as 'online' | 'offline' | null;

        if (savedMode === 'online' || savedMode === 'offline') {
            setSystemMode(savedMode);
        } else {
            localStorage.setItem('systemMode', 'online');
        }
    }, []);

    // Step 1: called when user clicks "Save" in the system mode dialog
    const handleSaveSystemMode = () => {
        localStorage.setItem('systemMode', systemMode);
        setIsSystemModeDialogOpen(false);
        toast.success(`System mode changed to ${systemMode}`);

        // Instead of reloading immediately, ask the user to relogin
        setRelicoginConfirmOpen(true);
    };

    // Step 2: called when user confirms they want to relogin
    const handleConfirmRelogin = () => {
        setRelicoginConfirmOpen(false);
        clearDB();
        localStorage.removeItem(AUTH_TOKEN_KEY);
        localStorage.removeItem('companyContext');
        useTillSessionState.getState().clearTillSession();
        queryClient.clear();
        authStore.logout();
        router.push('/auth/login');
    };

    const handleGoHome = () => {
        setIsSystemModeDialogOpen(false);
        router.push('/');
    };

    const handleSelectedCompany = (company: Company) => {
        if (company) {
            authStore.setCompany(company);
            window.location.reload();
        }
    };

    async function handleLogout() {
        try {
            const { axiosInstance } = await import('@/api-queries');
            await axiosInstance.post('/api/company/users/logout', {});
        } catch (error) {
            console.error('Logout request failed:', error);
            toast.error('The server logout request failed. Local session data was still cleared.');
        }
        clearDB();
        localStorage.removeItem(AUTH_TOKEN_KEY);
        localStorage.removeItem('companyContext');
        useTillSessionState.getState().clearTillSession();
        queryClient.clear();
        authStore.logout();
        window.location.reload();
    }

    const firstLetter = userDetails?.firstName?.charAt(0)?.toUpperCase() || 'A';

    const [showTerminalId, setShowTerminalId] = useState(false);

    return (
        <>
            <Popover>
                <PopoverTrigger asChild>
                    <div className="flex cursor-pointer items-center gap-3 rounded-full border bg-white px-3 py-1.5 shadow-sm transition-all hover:bg-gray-50">
                        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-green-300 font-bold text-green-900">
                            {firstLetter}
                        </div>

                        <div className="flex flex-col leading-tight">
                            <span className="text-sm font-semibold text-gray-900 whitespace-nowrap">
                                {userDetails?.firstName} {userDetails?.surname || ''}
                            </span>

                            <span className="max-w-[140px] truncate text-xs text-gray-500">
                                {company?.companyName || 'No Company'}
                            </span>
                        </div>
                    </div>
                </PopoverTrigger>

                <PopoverContent className="w-72 p-4">
                    <div className="space-y-4">
                        <div className="text-lg font-semibold">Hi {userDetails?.firstName || 'User'} 👋</div>

                        <Separator />

                        {company && (
                            <div className="space-y-1 text-sm">
                                <p>
                                    <span className="font-medium">Company:</span> {company.companyName}
                                </p>
                                <p>
                                    <span className="font-medium">CIN:</span> {company.companyIdentificationNumber}
                                </p>
                                <p>
                                    <span className="font-medium">Email:</span> {company.emailAddress}
                                </p>
                            </div>
                        )}

                        <Separator />

                        <div className="flex flex-col gap-2">
                            <Button
                                className="w-full justify-between"
                                variant="secondary"
                                onClick={() => setIsSystemModeDialogOpen(true)}
                            >
                                System Mode: {systemMode}
                                {systemMode === 'online' ? <Wifi /> : <WifiOff />}
                            </Button>

                            {isElectronApp && (
                                <Button className="w-full" variant="secondary" onClick={() => setShowTerminalId(true)}>
                                    Terminal Setup
                                    <Laptop />
                                </Button>
                            )}

                            {isAdmin && (
                                <Button className="w-full" onClick={() => setIsDialogOpen(true)}>
                                    Switch Company
                                    <ArrowLeftRight />
                                </Button>
                            )}

                            <Button
                                variant="destructive"
                                className="w-full"
                                onClick={() => setLogoutConfirmModal(true)}
                            >
                                Logout
                                <LogOut />
                            </Button>
                        </div>
                    </div>
                </PopoverContent>
            </Popover>

            {isElectronApp && showTerminalId && (
                <GetTerminalId isOpen={showTerminalId} onClose={() => setShowTerminalId(false)} />
            )}

            {isDialogOpen && (
                <CompanySelection
                    isOpen={isDialogOpen}
                    onClose={() => setIsDialogOpen(false)}
                    onSelectCompany={handleSelectedCompany}
                />
            )}

            {logoutConfirmModal && (
                <ConfirmDialog
                    open={logoutConfirmModal}
                    setOpen={setLogoutConfirmModal}
                    description="Are you sure you want to logout? You have to login again."
                    onConfirm={handleLogout}
                    confirmBtnTitle="Logout"
                    variant="destructive"
                />
            )}

            {/* NEW: relogin confirmation after switching system mode */}
            {relicoginConfirmOpen && (
                <ConfirmDialog
                    open={relicoginConfirmOpen}
                    setOpen={setRelicoginConfirmOpen}
                    description="Switching system mode requires you to relogin. Do you want to continue?"
                    onConfirm={handleConfirmRelogin}
                    confirmBtnTitle="Relogin"
                    variant="destructive"
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

                    <DialogFooter className="flex items-center sm:justify-between">
                        {/* <Button
                            variant="ghost"
                            onClick={handleGoHome}
                            className="gap-2"
                        >
                            <Home className="h-4 w-4" />
                            Home
                        </Button> */}

                        <div className="flex gap-2">
                            <Button
                                variant="outline"
                                onClick={() => setIsSystemModeDialogOpen(false)}
                            >
                                Cancel
                            </Button>

                            <Button onClick={handleSaveSystemMode}>
                                Save
                            </Button>
                        </div>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
};

export default UserActions;