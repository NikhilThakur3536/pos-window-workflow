import moment from 'moment-timezone';
import { useForm } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Form, FormItem, FormField, FormControl, FormMessage } from '@/components/ui/form';

// APIs & Types
import {
    UserGroupDetails,
    UserGroupCreateSchema,
    UserGroupUpdateSchema,
    userGroupCreateSchema,
    userGroupUpdateSchema,
    useCreateUserGroup,
    useUpdateUserGroup,
} from '@/api-queries/user-groups';
import { zodResolverCoerced as zodResolver } from '@/utils/zod-coerced';
import { toast } from 'sonner';
import { Textarea } from '@/components/ui/textarea';
import { useAuthUser } from '@/stores/auth-user.store';
import MandatoryField from '@/components/dynamic-form/mandatory-fields';
import { Checkbox } from '@/components/ui/checkbox';

interface UserGroupFormProps {
    open: boolean;
    onClose: () => void;
    editData: UserGroupDetails | null;
}

const UserGroupForm = ({ open, editData, onClose }: UserGroupFormProps) => {
    const isAdmin = editData?.name?.toLowerCase() === 'admin';

    const createItemData = useCreateUserGroup();
    const updateItemData = useUpdateUserGroup();
    const companyId = useAuthUser((state) => state?.user?.companyId);
    const domainId = useAuthUser((state) => state?.user?.domainId);

    const isEditing = !!editData;

    const form = useForm<UserGroupCreateSchema | UserGroupUpdateSchema>({
        resolver: zodResolver(isEditing ? userGroupUpdateSchema : userGroupCreateSchema),
        defaultValues: {
            name: editData?.name || '',
            groupCode: editData?.groupCode || '',
            description: editData?.description || '',
            isTerminalLock: editData?.isTerminalLock || false,
            approvalLevel: editData?.approvalLevel ?? 0,
            canSupervisorLogin: editData?.canSupervisorLogin ?? false,
            ...(editData ? { id: editData.id } : { timezone: moment.tz.guess(), companyId, domainId }),
        },
    });

    const { handleSubmit, control } = form;

    function onSubmit(values: UserGroupCreateSchema | UserGroupUpdateSchema) {
        if (editData) {
            if (!editData.id) return toast.error('User Group ID is required');

            return updateItemData.mutate(values as UserGroupUpdateSchema, {
                onSuccess: (data) => {
                    if (data.success) {
                        toast.success('User Group updated successfully');
                        form.reset();
                        onClose();
                    } else {
                        toast.error('User Group updation failed');
                    }
                },
                onError: (error) => {
                    // @ts-ignore
                    toast.error(error?.response?.data?.message || 'Internal Server Error!');
                },
            });
        }

        createItemData.mutate(values as UserGroupCreateSchema, {
            onSuccess: (data) => {
                if (data.success) {
                    toast.success('User Group created successfully');
                    form.reset();
                    onClose();
                } else {
                    toast.error('User Group creation failed');
                }
            },
            onError: (error) => {
                // @ts-ignore
                toast.error(error?.response.data.message || 'Internal Server Error!');
            },
        });
    }

    function onOpenChange() {
        form.reset();
        onClose();
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[540px]">
                <DialogHeader>
                    <DialogTitle>{isEditing ? 'Edit Group' : 'Add New Group'}</DialogTitle>
                </DialogHeader>

                <Form {...form}>
                    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                        <div className="mb-0 grid gap-6 py-4">
                            <div className="flex items-start gap-4">
                                <Label htmlFor="name" className="min-w-[120px] text-sm font-medium">
                                    Group Name <MandatoryField />
                                </Label>
                                <div className="flex-1">
                                    <FormField
                                        control={control}
                                        name="name"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormControl>
                                                    <Input placeholder="eg : Store Manager" {...field} />
                                                </FormControl>
                                                <FormMessage className="!-mt-1 !text-xs" />
                                            </FormItem>
                                        )}
                                    />
                                    <FormMessage />
                                </div>
                            </div>

                            <div className="flex items-start gap-4">
                                <Label htmlFor="groupCode" className="min-w-[120px] text-sm font-medium">
                                    Group Code <MandatoryField />
                                </Label>
                                <div className="flex-1">
                                    <FormField
                                        control={control}
                                        name="groupCode"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormControl>
                                                    <Input placeholder="eg : STR_MANAGER" {...field} />
                                                </FormControl>
                                                <FormMessage className="!-mt-1 !text-xs" />
                                            </FormItem>
                                        )}
                                    />
                                    <FormMessage />
                                </div>
                            </div>

                            <div className="flex items-start gap-4">
                                <Label htmlFor="groupCode" className="mt-2 min-w-[120px] text-sm font-medium">
                                    Description :
                                </Label>
                                <div className="flex-1">
                                    <FormField
                                        control={control}
                                        name="description"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormControl>
                                                    <Textarea
                                                        placeholder="Please enter Description of the group"
                                                        rows={5}
                                                        {...field}
                                                    />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                </div>
                            </div>

                            {isAdmin ? null : (
                                <div className="flex items-start justify-end gap-4">
                                    <FormField
                                        control={control}
                                        name="isTerminalLock"
                                        render={({ field }) => (
                                            <FormItem className="flex items-center gap-2">
                                                <FormControl>
                                                    <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                                                </FormControl>
                                                <Label className="text-sm" htmlFor="isTerminalLock">
                                                    Terminal Lock?
                                                </Label>
                                            </FormItem>
                                        )}
                                    />
                                </div>
                            )}

                            {isAdmin ? null : (
                                <div className="flex items-start gap-4">
                                    <Label htmlFor="approvalLevel" className="mt-2 min-w-[140px] text-sm font-medium">
                                        Approval Level :
                                    </Label>
                                    <div className="flex-1">
                                        <FormField
                                            control={control}
                                            name="approvalLevel"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormControl>
                                                        <Input
                                                            type="number"
                                                            min={0}
                                                            max={99}
                                                            placeholder="Supervisor level (e.g. 20)"
                                                            value={field.value ?? ''}
                                                            onChange={(e) => field.onChange(Number(e.target.value))}
                                                        />
                                                    </FormControl>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                    </div>
                                </div>
                            )}

                            {isAdmin ? null : (
                                <div className="flex items-start justify-end gap-4">
                                    <FormField
                                        control={control}
                                        name="canSupervisorLogin"
                                        render={({ field }) => (
                                            <FormItem className="flex items-center gap-2">
                                                <FormControl>
                                                    <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                                                </FormControl>
                                                <Label className="text-sm" htmlFor="canSupervisorLogin">
                                                    Can supervisor login? (groups with this can approve requests)
                                                </Label>
                                            </FormItem>
                                        )}
                                    />
                                </div>
                            )}
                        </div>

                        <div className="flex justify-end gap-3">
                            <Button type="button" variant="outline" onClick={onClose}>
                                Cancel
                            </Button>
                            <Button type="submit" className="bg-blue-600 hover:bg-blue-700">
                                {editData ? 'Update Group' : 'Create Group'}
                            </Button>
                        </div>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
};

export default UserGroupForm;
