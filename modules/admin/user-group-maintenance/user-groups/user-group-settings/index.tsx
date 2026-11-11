import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import type { UserGroupDetails } from '@/api-queries/user-groups';
import {
    useGetUserGroupModules,
    useGetUserGroupPermissions,
    type UserGroupModulesDetails,
} from '@/api-queries/user-groups/user-group-permissions';
import { PageLoader } from '@/components/custom-components/PageLoader';
import ModuleChildrenNode, { type Crud } from './ModuleChildrenNode';
import { SYSTEM_PERMISSIONS } from '@/lib/constant';
import UserGroupPermissionDialog from './user-group-setting-dialog';

interface UserGroupSettingsProps {
    selectedUserGroup: UserGroupDetails;
    onSettingsClose: () => void;
}

const UserGroupSettings = ({ selectedUserGroup, onSettingsClose }: UserGroupSettingsProps) => {
    const userGroupPermissionsRows = useGetUserGroupPermissions({ companyUserGroupId: selectedUserGroup?.id })?.data
        ?.data?.rows;

    const { data: userGroupModulesRes, isLoading } = useGetUserGroupModules();
    const userGroupModules: UserGroupModulesDetails[] = userGroupModulesRes?.data || [];

    const hasPermission = (moduleId: string, action: Crud) => {
        if (!userGroupPermissionsRows) return false;

        for (let i = 0; i < userGroupPermissionsRows.length; i++) {
            const row = userGroupPermissionsRows[i];
            if (String(row.moduleId) === String(moduleId)) {
                const key = action as (typeof SYSTEM_PERMISSIONS)[keyof typeof SYSTEM_PERMISSIONS];
                return Boolean((row as any)[key]);
            }
        }
        return false;
    };

    const [expandedIds, setExpandedIds] = useState<string[]>([]);

    const toggle = (id: string) => {
        const newExpanded = [...expandedIds];
        const index = newExpanded.indexOf(id);
        if (index > -1) {
            newExpanded.splice(index, 1);
        } else {
            newExpanded.push(id);
        }
        setExpandedIds(newExpanded);
    };

    const [selectedModule, setSelectedModule] = useState<UserGroupModulesDetails | null>(null);
    const [open, setOpen] = useState(false);

    const onOpenSettings = (module: UserGroupModulesDetails) => {
        setSelectedModule(module);
        setOpen(true);
    };

    const onClose = () => {
        setSelectedModule(null);
        setOpen(false);
    };

    return (
        <PageLoader isLoading={isLoading}>
            <div className="space-y-4 px-2">
                <div className="flex items-center justify-between">
                    <h1 className="my-2 text-2xl text-balance">Setup Permissions for {selectedUserGroup?.name}</h1>

                    <Button className="d-flex items-center gap-2" variant="secondary" onClick={onSettingsClose}>
                        <ArrowLeft /> Back
                    </Button>
                </div>

                <div className="rounded-md border">
                    <div
                        className="bg-muted/60 text-muted-foreground grid grid-cols-[50vw_repeat(6,auto)] items-center gap-x-2 px-2 py-2 text-xs font-semibold"
                        role="row"
                    >
                        <div>Module</div>

                        <div className="text-center">Settings</div>

                        <div className="text-center">CREATE</div>
                        <div className="text-center">READ</div>
                        <div className="text-center">UPDATE</div>
                        <div className="text-center">DELETE</div>
                        <div className="text-center">MENU</div>
                    </div>

                    <div role="rowgroup">
                        {userGroupModules?.length ? (
                            userGroupModules.map((root) => (
                                <ModuleChildrenNode
                                    key={root.id}
                                    node={root}
                                    depth={0}
                                    expandedIds={expandedIds}
                                    toggle={toggle}
                                    hasPermission={hasPermission}
                                    onOpenSettings={onOpenSettings}
                                    selectedId={selectedModule?.id ?? null}
                                />
                            ))
                        ) : (
                            <div className="text-muted-foreground px-3 py-6 text-center text-sm">No modules found.</div>
                        )}
                    </div>
                </div>

                {selectedModule && selectedUserGroup && (
                    <UserGroupPermissionDialog
                        open={open}
                        onClose={onClose}
                        module={selectedModule}
                        selectedUserGroup={selectedUserGroup}
                        key={selectedModule?.id}
                    />
                )}
            </div>
        </PageLoader>
    );
};

export default UserGroupSettings;
