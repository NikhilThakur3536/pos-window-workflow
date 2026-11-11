import ViewAccessDenied, { hasPermission, ViewAccessDeniedOptions } from '.';
import { PageLoader } from '../custom-components/PageLoader';
import { useGetUsersPermissions } from '@/api-queries/user';
import { useNetworkStore } from '@/stores/network.store';

export interface PermissionGuardProps {
    module: string | string[];
    permission: string[];
    match?: 'all' | 'any';
    children: React.ReactNode;
    accessDeniedOptions?: ViewAccessDeniedOptions;
}

export default function PermissionGuard({
    module,
    permission,
    match = 'all',
    children,
    accessDeniedOptions,
}: PermissionGuardProps) {
    const isOnline = useNetworkStore((state) => state.online);

    const { data, isLoading } = useGetUsersPermissions(isOnline);
    const userModulePermissions = data?.data?.rows;

    const modules = Array.isArray(module) ? module : [module];
    const checkPermission = (moduleCode: string) =>
        hasPermission(userModulePermissions, moduleCode, permission);
    const isAllowed = match === 'any' ? modules.some(checkPermission) : modules.every(checkPermission);

    if (isLoading) return <PageLoader isLoading />;
    if (!isAllowed) return <ViewAccessDenied options={accessDeniedOptions} />;

    return <>{children}</>;
}
