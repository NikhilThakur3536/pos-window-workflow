import { useGetUsersPermissions } from '@/api-queries/user';
import { useAuthUser } from '@/stores/auth-user.store';
import { useNetworkStore } from '@/stores/network.store';

const useUsersPermissions = () => {
    const isOnline = useNetworkStore((state) => state.online);
    const { isLoggedIn } = useAuthUser();

    const userGroupPermissions = useGetUsersPermissions(isOnline, isLoggedIn)?.data?.data?.rows;

    return userGroupPermissions;
};

export default useUsersPermissions;
