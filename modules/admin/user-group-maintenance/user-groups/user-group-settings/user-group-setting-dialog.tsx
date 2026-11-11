import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

// APIs & Types
import { useGetUserGroupPermissions, UserGroupModulesDetails } from '@/api-queries/user-groups/user-group-permissions';
import { UserGroupDetails } from '@/api-queries/user-groups';
import { PageLoader } from '@/components/custom-components/PageLoader';
import UserGroupSettingsForm from './user-group-setting-form';
import { DialogDescription } from '@radix-ui/react-dialog';

interface UserGroupPermissionDialogProps {
    open: boolean;
    onClose: () => void;
    selectedUserGroup: UserGroupDetails;
    module: UserGroupModulesDetails;
}

const UserGroupPermissionDialog = ({ open, onClose, selectedUserGroup, module }: UserGroupPermissionDialogProps) => {
    const { data, isLoading } = useGetUserGroupPermissions({
        companyUserGroupId: selectedUserGroup?.id,
        moduleId: module?.id,
    });
    const userGroupPermissions = data?.data?.rows;

    return (
        <PageLoader isLoading={isLoading}>
            <Dialog open={open} onOpenChange={onClose}>
                <DialogContent className="w-[372px]">
                    <DialogHeader>
                        <DialogTitle>Permissions Set Up</DialogTitle>
                        <DialogDescription className="text-sm font-[500]">
                            {module?.name} for {selectedUserGroup?.name}
                        </DialogDescription>
                    </DialogHeader>

                    {userGroupPermissions && selectedUserGroup && module && (
                        <UserGroupSettingsForm
                            onClose={onClose}
                            module={module}
                            selectedUserGroup={selectedUserGroup}
                            userGroupPermissions={userGroupPermissions}
                        />
                    )}
                </DialogContent>
            </Dialog>
        </PageLoader>
    );
};

export default UserGroupPermissionDialog;
