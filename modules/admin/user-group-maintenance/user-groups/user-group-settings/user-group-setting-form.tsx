import moment from 'moment-timezone';
import { useForm } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { Form, FormItem, FormField, FormControl, FormLabel } from '@/components/ui/form';

// APIs & Types
import {
    UserGroupPermissionCreateSchema,
    UserGroupPermissionUpdateSchema,
    userGroupPermissionCreateSchema,
    userGroupPermissionUpdateSchema,
    useCreateUserGroupPermission,
    useUpdateUserGroupPermission,
    UserGroupModulesDetails,
    UserGroupPermissionDetails,
} from '@/api-queries/user-groups/user-group-permissions';
import { zodResolverCoerced as zodResolver } from '@/utils/zod-coerced';
import { toast } from 'sonner';
import { useAuthUser } from '@/stores/auth-user.store';
import { UserGroupDetails } from '@/api-queries/user-groups';
import { SYSTEM_PERMISSIONS } from '@/lib/constant';
import { Eye, Pencil, Shield, Trash2, Check, X } from 'lucide-react';
import clsx from 'clsx';
import { Card } from '@/components/ui/card';
import { JSX } from 'react';
import { useGetUsersPermissions } from '@/api-queries/user';
import { useNetworkStore } from '@/stores/network.store';
import { Checkbox } from '@/components/ui/checkbox';

interface UserGroupSettingsFormProps {
    onClose: () => void;
    userGroupPermissions: UserGroupPermissionDetails[];
    selectedUserGroup: UserGroupDetails;
    module: UserGroupModulesDetails;
}

const UserGroupSettingsForm = ({
    userGroupPermissions,
    onClose,
    selectedUserGroup,
    module,
}: UserGroupSettingsFormProps) => {
    const isOnline = useNetworkStore((state) => state.online);
    const { refetch: refetchUserPermissions } = useGetUsersPermissions(isOnline, false);

    const createItemData = useCreateUserGroupPermission();
    const updateItemData = useUpdateUserGroupPermission();
    const companyId = useAuthUser((state) => state?.user?.companyId);
    const domainId = useAuthUser((state) => state?.user?.domainId);

    const userGroupPermission = userGroupPermissions?.[0];
    const isUserGroupPermissionExist = userGroupPermissions?.length !== 0;
    const form = useForm<UserGroupPermissionCreateSchema | UserGroupPermissionUpdateSchema>({
        resolver: zodResolver(
            isUserGroupPermissionExist ? userGroupPermissionUpdateSchema : userGroupPermissionCreateSchema,
        ),
        defaultValues: {
            canAccess: userGroupPermission?.canAccess || false,
            canCreate: userGroupPermission?.canCreate || false,
            canUpdate: userGroupPermission?.canUpdate || false,
            canDelete: userGroupPermission?.canDelete || false,
            showInMenu: userGroupPermission ? userGroupPermission?.showInMenu : true,
            groupId: selectedUserGroup?.id!,
            moduleId: module?.id!,
            companyId: companyId!,
            domainId: domainId!,
            ...(isUserGroupPermissionExist
                ? {
                      id: userGroupPermission?.id,
                  }
                : {
                      timezone: moment.tz.guess(),
                  }),
        },
    });

    const { handleSubmit, control } = form;

    function onSubmit(values: UserGroupPermissionCreateSchema | UserGroupPermissionUpdateSchema) {
        if (isUserGroupPermissionExist) {
            if (!userGroupPermission?.id) return toast.error('User Group Permission Id is required');

            const payload = {
                ...values,
                id: userGroupPermission?.id,
            };
            return updateItemData.mutate(payload as UserGroupPermissionUpdateSchema, {
                onSuccess: (data) => {
                    if (data.success) {
                        toast.success('User Group Permission updated successfully');
                        refetchUserPermissions();
                        form.reset();
                        onClose();
                    } else {
                        toast.error('User Group Permission updation failed');
                    }
                },
                onError: (error) => {
                    // @ts-ignore
                    toast.error(error?.response?.data?.message || 'Internal Server Error!');
                },
            });
        } else {
            const payload = {
                ...values,
                companyId,
                domainId,
                groupId: selectedUserGroup?.id,
                moduleId: module?.id,
            };

            createItemData.mutate(payload as UserGroupPermissionCreateSchema, {
                onSuccess: (data) => {
                    if (data.success) {
                        toast.success('User Group Permission created successfully');
                        refetchUserPermissions();
                        form.reset();
                        onClose();
                    } else {
                        toast.error('User Group Permission creation failed');
                    }
                },
                onError: (error) => {
                    // @ts-ignore
                    toast.error(error?.response.data.message || 'Internal Server Error!');
                },
            });
        }
    }

    const permissionIcons: Record<string, JSX.Element> = {
        CREATE: <Shield className="h-5 w-5 text-green-600" />,
        READ: <Eye className="h-5 w-5 text-blue-600" />,
        UPDATE: <Pencil className="h-5 w-5 text-yellow-600" />,
        DELETE: <Trash2 className="h-5 w-5 text-red-600" />,
    };

    type SystemPermissionValue = (typeof SYSTEM_PERMISSIONS)[keyof typeof SYSTEM_PERMISSIONS];

    type SystemPermissionsType = {
        value: SystemPermissionValue;
        label: keyof typeof SYSTEM_PERMISSIONS;
    };

    const systemPermissions: SystemPermissionsType[] = [
        { value: SYSTEM_PERMISSIONS.CREATE, label: 'CREATE' },
        { value: SYSTEM_PERMISSIONS.READ, label: 'READ' },
        { value: SYSTEM_PERMISSIONS.UPDATE, label: 'UPDATE' },
        { value: SYSTEM_PERMISSIONS.DELETE, label: 'DELETE' },
    ];

    function onSelectAll() {
        const allSelected = systemPermissions.every((perm) => form.getValues(perm.value));

        systemPermissions.forEach((perm) => {
            form.setValue(perm.value, !allSelected, { shouldDirty: true });
        });
    }

    return (
        <Form {...form}>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 pt-1 pb-2">
                <div className="grid grid-cols-2 gap-4">
                    {systemPermissions.map((perm) => (
                        <FormField
                            key={perm.value}
                            control={control}
                            name={perm.value}
                            render={({ field }) => (
                                <FormItem>
                                    <FormControl>
                                        <Card
                                            onClick={() => field.onChange(!field.value)}
                                            className={clsx(
                                                'flex cursor-pointer items-center justify-between gap-3 rounded-xl border p-2 transition select-none',
                                                field.value
                                                    ? 'border-green-700 bg-green-50 shadow-md'
                                                    : 'hover:border-gray-400',
                                            )}
                                        >
                                            <div className="flex items-center gap-2">
                                                {permissionIcons[perm.label]}
                                                <FormLabel className="cursor-pointer font-medium">
                                                    {perm.label}
                                                </FormLabel>
                                                {field.value ? (
                                                    <Check className="!h-5 !w-5 text-green-700" />
                                                ) : (
                                                    <X className="!h-5 !w-5 text-red-700" />
                                                )}
                                            </div>
                                        </Card>
                                    </FormControl>
                                </FormItem>
                            )}
                        />
                    ))}
                </div>

                <FormField
                    control={form.control}
                    name="showInMenu"
                    render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-end">
                            <FormControl>
                                <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                            </FormControl>
                            <FormLabel className="text-xs">Show in menu?</FormLabel>
                        </FormItem>
                    )}
                />

                <div className="flex justify-end gap-3">
                    <Button type="button" variant="outline" onClick={onSelectAll}>
                        Select All
                    </Button>
                    <Button type="button" variant="destructive" onClick={onClose}>
                        Cancel
                    </Button>
                    <Button type="submit" className="bg-blue-600 hover:bg-blue-700">
                        Save
                    </Button>
                </div>
            </form>
        </Form>
    );
};

export default UserGroupSettingsForm;
