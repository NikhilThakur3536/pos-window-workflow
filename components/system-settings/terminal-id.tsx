import { useState, type FormEvent } from 'react';
import axios from 'axios';
import { Copy } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { getApiBaseUrl } from '@/lib/constant';
import { getConfiguredTerminalId, getOrCreateInstallationId, useTerminalConfigsState } from '@/stores/terminal.store';
import { getTerminalErrorMessage } from '@/utils/terminal-errors';

interface GetTerminalIdProps {
    isOpen: boolean;
    onClose: () => void;
}

export function GetTerminalId({ isOpen, onClose }: GetTerminalIdProps) {
    const savedTerminalId = useTerminalConfigsState((state) => state.configuredTerminalId);
    const installationId = useTerminalConfigsState((state) => state.installationId);
    const setConfiguredTerminalId = useTerminalConfigsState((state) => state.setConfiguredTerminalId);
    const [staffNumber, setStaffNumber] = useState('');
    const [password, setPassword] = useState('');
    const [domainId, setDomainId] = useState(process.env.NEXT_PUBLIC_DOMAIN_ID || '');
    const [terminalId, setTerminalId] = useState('');
    const [isRegistering, setIsRegistering] = useState(false);

    const copyTerminalId = async () => {
        await navigator.clipboard.writeText(savedTerminalId);
        toast.success('Terminal ID copied');
    };
    const copyInstallationId = async () => {
        if (!installationId) return;
        await navigator.clipboard.writeText(installationId);
        toast.success('Installation ID copied');
    };
    const closeSetup = () => {
        setPassword('');
        setStaffNumber('');
        setTerminalId('');
        onClose();
    };

    const registerTerminal = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        const terminal = terminalId.trim();
        if (!staffNumber || !password || !domainId.trim() || !terminal) {
            toast.error('Enter the admin credentials, domain, and Terminal ID.');
            return;
        }
        if (getConfiguredTerminalId() && getConfiguredTerminalId() !== terminal) {
            toast.error(
                'This installation is already configured. Ask an admin to reset its registration before changing tills.',
            );
            return;
        }

        setIsRegistering(true);
        try {
            const installationId = getOrCreateInstallationId();
            if (!installationId) throw new Error('Could not create a persistent installation ID.');

            const loginResponse = await axios.post(
                `${getApiBaseUrl()}/api/company/users/login`,
                {
                    staffNumber: Number(staffNumber),
                    password,
                    domainId: domainId.trim(),
                    posLogin: false,
                    ...(process.env.NEXT_PUBLIC_APP_TYPE ? { deviceType: process.env.NEXT_PUBLIC_APP_TYPE } : {}),
                },
                { headers: { 'X-Client-Type': 'WEB', 'Content-Type': 'application/json' } },
            );
            const loginData = loginResponse.data?.data;
            const adminToken = loginData?.token;
            const companyId = loginData?.user?.company?.id;
            if (!adminToken || !companyId) {
                throw new Error('Admin login did not return a company. Sign in with an admin for the correct company.');
            }

            const registrationResponse = await axios.post(
                `${getApiBaseUrl()}/api/company/till/installation/register`,
                { terminalId: terminal, installationId },
                {
                    headers: {
                        'Authorization': `Bearer ${adminToken}`,
                        'Company-Id': companyId,
                        'Content-Type': 'application/json',
                    },
                },
            );
            const registration = registrationResponse.data?.data ?? registrationResponse.data;
            if (!registration?.registered && !registration?.duplicate) {
                throw new Error(registrationResponse.data?.message || 'Terminal registration was not confirmed.');
            }

            setConfiguredTerminalId(registration.terminalId || terminal);
            toast.success(
                registration.duplicate ? 'Terminal registration already exists.' : 'Terminal registered successfully.',
            );
            closeSetup();
        } catch (error) {
            const message = axios.isAxiosError(error)
                ? error.response?.data?.message || error.response?.data?.error || error.message
                : error instanceof Error
                  ? error.message
                  : 'Terminal registration failed.';
            toast.error(getTerminalErrorMessage(message));
        } finally {
            setIsRegistering(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={closeSetup}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>EXE Terminal Setup</DialogTitle>
                </DialogHeader>

                {savedTerminalId ? (
                    <div className="space-y-4">
                        <p className="text-muted-foreground text-sm">
                            This installation is registered. Its terminal setup is retained across logout and
                            application updates.
                        </p>
                        <div className="flex items-center gap-2">
                            <Input readOnly value={savedTerminalId} />
                            <Button
                                type="button"
                                variant="outline"
                                onClick={copyTerminalId}
                                aria-label="Copy Terminal ID"
                            >
                                <Copy className="size-4" />
                            </Button>
                        </div>
                        <Label>Installation ID</Label>
                        <div className="flex items-center gap-2">
                            <Input readOnly value={installationId || 'Unavailable on this installation'} />
                            <Button
                                type="button"
                                variant="outline"
                                onClick={copyInstallationId}
                                disabled={!installationId}
                                aria-label="Copy Installation ID"
                            >
                                <Copy className="size-4" />
                            </Button>
                        </div>
                    </div>
                ) : (
                    <form className="space-y-4" onSubmit={registerTerminal}>
                        <p className="text-muted-foreground text-sm">
                            Sign in as an admin, then register the Terminal ID created in Till Maintenance.
                        </p>
                        <div className="space-y-2">
                            <Label htmlFor="terminal-setup-staff">Admin staff number</Label>
                            <Input
                                id="terminal-setup-staff"
                                type="number"
                                value={staffNumber}
                                onChange={(event) => setStaffNumber(event.target.value)}
                                required
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="terminal-setup-password">Password</Label>
                            <Input
                                id="terminal-setup-password"
                                type="password"
                                value={password}
                                onChange={(event) => setPassword(event.target.value)}
                                required
                            />
                        </div>
                        {!process.env.NEXT_PUBLIC_DOMAIN_ID && (
                            <div className="space-y-2">
                                <Label htmlFor="terminal-setup-domain">Domain ID</Label>
                                <Input
                                    id="terminal-setup-domain"
                                    value={domainId}
                                    onChange={(event) => setDomainId(event.target.value)}
                                    required
                                />
                            </div>
                        )}
                        <div className="space-y-2">
                            <Label htmlFor="terminal-setup-id">Terminal ID</Label>
                            <Input
                                id="terminal-setup-id"
                                value={terminalId}
                                onChange={(event) => setTerminalId(event.target.value)}
                                required
                            />
                        </div>
                        <p className="text-muted-foreground text-xs break-all">
                            Installation ID: {installationId || 'Will be generated on this EXE installation'}
                        </p>
                        <Button type="submit" className="w-full" disabled={isRegistering}>
                            {isRegistering ? 'Registering…' : 'Register Terminal'}
                        </Button>
                    </form>
                )}
            </DialogContent>
        </Dialog>
    );
}
