import ViewAccessDenied, { hasPermission, ViewAccessDeniedOptions } from '.';
import { PageLoader } from '../custom-components/PageLoader';
import { useGetUsersPermissions } from '@/api-queries/user';
import { useNetworkStore } from '@/stores/network.store';

export interface AnyOfPermissionGuardProps {
    modules: string[];
    permission: string[];
    children: React.ReactNode;
    accessDeniedOptions?: ViewAccessDeniedOptions;
}

export default function AnyOfPermissionGuard({
    modules,
    permission,
    children,
    accessDeniedOptions,
}: AnyOfPermissionGuardProps) {
    const isOnline = useNetworkStore((state) => state.online);

    const { data, isLoading } = useGetUsersPermissions(isOnline);
    const userModulePermissions = data?.data?.rows;

    const isAllowed = (modules || []).some((m) => hasPermission(userModulePermissions, m, permission));

    if (isLoading) return <PageLoader isLoading />;
    if (!isAllowed) return <ViewAccessDenied options={accessDeniedOptions} />;

    return <>{children}</>;
}
