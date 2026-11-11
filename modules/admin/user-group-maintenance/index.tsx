import { useEffect, useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import UserGroups from './user-groups';
import Users from './users';
import { hasPermission, ViewAccessDeniedDialog } from '@/components/permission-guards';
import { SYSTEM_MODULES, SYSTEM_PERMISSIONS } from '@/lib/constant';
import { useAuthUser } from '@/stores/auth-user.store';
import useUsersPermissions from '@/components/permission-guards/useUsersPermissions';

const UserGroupMaintenance = () => {
    const authUser = useAuthUser((state) => state.user?.companyUserGroups?.[0]?.group?.name);
    const userGroupPermissions = useUsersPermissions();
    const [isPermissionDeniedOpen, setIsPermissionDeniedOpen] = useState(false);
    const [activeTab, setActiveTab] = useState<string>('groups');
    const [deniedMessage, setDeniedMessage] = useState('');

    const onClosePermissionDenied = () => {
        setIsPermissionDeniedOpen(false);
    };

    const checkPermission = (tab: string) => {
        if (tab === 'groups') {
            return hasPermission(
                userGroupPermissions,
                SYSTEM_MODULES.UTILITIES.SETUP.MODULE_PARAMETERS.USER_GROUP_AND_MAINTENANCE.USER_GROUPS.code,
                [SYSTEM_PERMISSIONS.READ],
                false,
                authUser?.toLowerCase() === 'admin',
            );
        }
        if (tab === 'users') {
            return hasPermission(
                userGroupPermissions,
                SYSTEM_MODULES.UTILITIES.SETUP.MODULE_PARAMETERS.USER_GROUP_AND_MAINTENANCE.USERS.code,
                [SYSTEM_PERMISSIONS.READ],
            );
        }
        return true;
    };

    const handleTabChange = (value: string) => {
        if (!checkPermission(value)) {
            setDeniedMessage(
                value === 'groups'
                    ? "You don't have access to view/manage user groups."
                    : "You don't have access to view/manage users.",
            );
            setIsPermissionDeniedOpen(true);
            return;
        }
        setActiveTab(value);
    };

    useEffect(() => {
        if (!userGroupPermissions) return;

        if (checkPermission('groups')) {
            setActiveTab('groups');
        } else if (checkPermission('users')) {
            setActiveTab('users');
        } else {
            setDeniedMessage("You don't have access to User Groups or Users.");
            setIsPermissionDeniedOpen(true);
        }
    }, [userGroupPermissions]);

    return (
        <>
            <Tabs value={activeTab ?? undefined} onValueChange={handleTabChange} className="w-full bg-white p-3">
                <TabsList className="grid w-full max-w-md grid-cols-2">
                    <TabsTrigger value="groups" className="text-sm">
                        Groups / Profiles
                    </TabsTrigger>
                    <TabsTrigger value="users" className="text-sm">
                        Users
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="groups">{checkPermission('groups') ? <UserGroups /> : null}</TabsContent>

                <TabsContent value="users">{checkPermission('groups') ? <Users /> : null}</TabsContent>
            </Tabs>

            <ViewAccessDeniedDialog
                open={isPermissionDeniedOpen}
                onClose={onClosePermissionDenied}
                options={{ description: deniedMessage }}
            />
        </>
    );
};

export default UserGroupMaintenance;
