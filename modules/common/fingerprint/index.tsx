import { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { PageLoader } from '@/components/custom-components/PageLoader';
import { Fingerprint as FingerprintIcon, Plus } from 'lucide-react';
import { useAuthUser } from '@/stores/auth-user.store';
import { useGetUsers } from '@/api-queries/user';
import FingerprintList from './fingerprint-list';
import EnrollFingerprintDialog from './enroll-fingerprint-dialog';

interface AuthUserSnapshot {
    id?: string;
    administrator?: boolean;
    firstName?: string;
    surname?: string;
    email?: string;
}

interface ListedUser {
    id?: string;
    firstName?: string;
    surname?: string;
    email?: string;
    staffNumber?: number | string;
    userType?: string;
}

const toUsers = (res: any): ListedUser[] => {
    const body = res?.data ?? res;
    if (Array.isArray(body)) return body as ListedUser[];
    if (Array.isArray((body as any)?.rows)) return (body as any).rows as ListedUser[];
    return [];
};

const getDisplayName = (user?: ListedUser | null): string => {
    if (!user) return '';
    return (
        [user.firstName, user.surname].filter(Boolean).join(' ') ||
        user.email ||
        (user.staffNumber != null ? `#${user.staffNumber}` : '')
    );
};

interface AdminViewProps {
    currentUser: AuthUserSnapshot;
}

const AdminView = ({ currentUser }: AdminViewProps) => {
    const usersQuery = useGetUsers({ status: 'ACTIVE', limit: 1000, offset: 0 });
    const { data, isLoading } = usersQuery;
    const users = useMemo(() => toUsers(data), [data]);

    const defaultUserId = useMemo(() => {
        if (users.some((u) => !!u.userType)) {
            return users.find((u) => u.userType === 'COMPANY-USER')?.id || users[0]?.id || '';
        }
        return users[0]?.id || '';
    }, [users]);

    const [selectedUserId, setSelectedUserId] = useState('');
    const [isEnrollOpen, setIsEnrollOpen] = useState(false);

    const activeUserId = selectedUserId || defaultUserId;
    const selectedUser = users.find((u) => u.id === activeUserId) || currentUser;
    const userName = getDisplayName(selectedUser);

    const onUserChange = (value: string) => {
        setSelectedUserId(value);
        setIsEnrollOpen(false);
    };

    return (
        <PageLoader isLoading={isLoading}>
            <div className="space-y-4 p-3">
                <div className="flex flex-wrap items-center justify-between gap-4">
                    <div>
                        <div className="flex items-center gap-2 text-lg font-bold">
                            <FingerprintIcon className="h-5 w-5" />
                            Fingerprint Enrollment
                        </div>
                        <div className="text-sm text-muted-foreground">
                            Enroll and manage fingerprint credentials for users in this company.
                        </div>
                    </div>

                    <Button onClick={() => setIsEnrollOpen(true)} disabled={!activeUserId} className="flex items-center gap-2">
                        <Plus className="h-4 w-4" />
                        Enroll Fingerprint
                    </Button>
                </div>

                <div className="flex items-center gap-3">
                    <div className="text-sm font-medium">User</div>
                    <div className="w-72">
                        <Select value={activeUserId || undefined} onValueChange={onUserChange}>
                            <SelectTrigger>
                                <SelectValue placeholder="Select a user" />
                            </SelectTrigger>
                            <SelectContent>
                                {users.map((user) => (
                                    <SelectItem key={user.id} value={user.id || ''}>
                                        {getDisplayName(user)}
                                        {user.staffNumber != null ? ` (${user.staffNumber})` : ''}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                </div>

                {activeUserId ? (
                    <FingerprintCard userId={activeUserId} userName={userName} />
                ) : (
                    <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
                        No user selected.
                    </div>
                )}
            </div>

            {isEnrollOpen && activeUserId && (
                <EnrollFingerprintDialog
                    open={isEnrollOpen}
                    onClose={() => setIsEnrollOpen(false)}
                    userId={activeUserId}
                    userName={userName || activeUserId}
                />
            )}
        </PageLoader>
    );
};

interface UserViewProps {
    currentUser: AuthUserSnapshot;
}

const UserView = ({ currentUser }: UserViewProps) => {
    const [isEnrollOpen, setIsEnrollOpen] = useState(false);
    const userId = currentUser.id || '';
    const userName = getDisplayName(currentUser);

    return (
        <div className="space-y-4 p-3">
            <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                    <div className="flex items-center gap-2 text-lg font-bold">
                        <FingerprintIcon className="h-5 w-5" />
                        Fingerprint Enrollment
                    </div>
                    <div className="text-sm text-muted-foreground">Manage your fingerprint for scanner-based login.</div>
                </div>

                <Button onClick={() => setIsEnrollOpen(true)} disabled={!userId} className="flex items-center gap-2">
                    <Plus className="h-4 w-4" />
                    Enroll Fingerprint
                </Button>
            </div>

            {userId ? <FingerprintCard userId={userId} userName={userName} /> : null}

            {isEnrollOpen && userId && (
                <EnrollFingerprintDialog
                    open={isEnrollOpen}
                    onClose={() => setIsEnrollOpen(false)}
                    userId={userId}
                    userName={userName || userId}
                />
            )}
        </div>
    );
};

const FingerprintCard = ({ userId, userName }: { userId: string; userName: string }) => (
    <div className="rounded-lg border bg-card">
        <div className="border-b px-4 py-3">
            <div className="text-sm font-semibold">Enrolled fingerprints</div>
            <div className="text-xs text-muted-foreground">{userName}</div>
        </div>
        <div className="p-4">
            <FingerprintList userId={userId} key={userId} />
        </div>
    </div>
);

const FingerprintModule = () => {
    const currentUser = useAuthUser((state) => state.user);
    const isAdministrator = !!currentUser?.administrator;

    if (!currentUser) {
        return (
            <div className="p-8 text-center text-sm text-muted-foreground">You must be logged in to manage fingerprints.</div>
        );
    }

    return isAdministrator ? <AdminView currentUser={currentUser} /> : <UserView currentUser={currentUser} />;
};

export default FingerprintModule;
