import moment from 'moment-timezone';
import { useForm } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Form, FormItem, FormField, FormControl, FormMessage } from '@/components/ui/form';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';

// APIs & Types
import {
    type UserDetails,
    type UserCreateSchema,
    type UserUpdateSchema,
    userCreateSchema,
    userUpdateSchema,
    useCreateUser,
    useUpdateUser,
    userTypeMenu,
} from '@/api-queries/user';
import { zodResolverCoerced as zodResolver } from '@/utils/zod-coerced';
import { toast } from 'sonner';
import { useGetReportLevels } from '@/api-queries/report-access-level';
import { useGetLanguages } from '@/api-queries/system/languages';
import { useGetCharacterSets } from '@/api-queries/system/character-sets';
import { useGetUserGroups } from '@/api-queries/user-groups';
import { useAuthUser } from '@/stores/auth-user.store';
import MandatoryField from '@/components/dynamic-form/mandatory-fields';
import { useGetWarehouses, WarehouseDetails } from '@/api-queries/warehouse';
import { useDebtorList } from '@/api-queries/debtor';
import { X } from 'lucide-react';
import { CompanyCreditor } from '@/types';

interface UserFormProps {
    onClose: () => void;
    editData: UserDetails | null;
}

const UserForm = ({ editData, onClose }: UserFormProps) => {
    const userDetails = useAuthUser((state) => state.user);
    const authUserType = useAuthUser((state) => state.user?.userType);

    const createItemData = useCreateUser();
    const updateItemData = useUpdateUser();

    const companyId = useAuthUser((state) => state?.company?.id);
    const domainId = useAuthUser((state) => state?.user?.domainId);

    const userGroups = useGetUserGroups({})?.data?.data;
    const reportAccessLevels = useGetReportLevels({})?.data?.data;
    const languages = useGetLanguages({})?.data?.data;
    const characterSets = useGetCharacterSets({})?.data?.data;

    const isEditing = !!editData;

    const form = useForm<UserCreateSchema | UserUpdateSchema>({
        resolver: zodResolver(isEditing ? userUpdateSchema : userCreateSchema),
        defaultValues: {
            firstName: editData?.firstName || '',
            surname: editData?.surname || undefined,
            initials: editData?.initials || undefined,
            staffNumber: editData?.staffNumber || 0,
            idNumber: editData?.idNumber ? String(editData?.idNumber) : '',
            addressOne: editData?.addressOne || undefined,
            addressTwo: editData?.addressTwo || undefined,
            addressThree: editData?.addressThree || undefined,
            postCode: editData?.postCode || undefined,
            telephone: editData?.telephone || '',
            cellPhone: editData?.cellPhone || undefined,
            email: editData?.email || '',
            reportAccessLevelId: editData?.reportAccessLevelId || undefined,
            administrator: editData?.administrator || false,
            forcePasswordChangeEveryXDays: editData?.forcePasswordChangeEveryXDays
                ? +editData?.forcePasswordChangeEveryXDays
                : 0,
            pinNumber: editData?.pinNumber || undefined,
            forcePasswordChange: editData?.forcePasswordChange || 'NEXT-LOGIN',
            useClassicMenu: editData?.useClassicMenu || false,
            groupId: editData?.companyUserGroups?.[0]?.groupId,
            askForPinContinuously: editData?.askForPinContinuously || false,
            enableSystemNotifications: editData?.enableSystemNotifications || false,
            systemLanguageId: editData?.systemLanguageId || undefined,
            systemCharacterSetId: editData?.systemCharacterSetId || undefined,
            ...(editData ? { id: editData.id } : { timezone: moment.tz.guess(), password: '', companyId, domainId }),

            // User Type Related

            userType:
                editData?.userType ||
                (authUserType === 'COMPANY-DEBTOR-USER'
                    ? 'COMPANY-DEBTOR-USER'
                    : authUserType === 'WAREHOUSE-USER'
                      ? 'WAREHOUSE-USER'
                      : 'COMPANY-USER'),

            companyDebtorId:
                editData?.userType === 'COMPANY-DEBTOR-USER'
                    ? editData?.companyDebtorId
                    : authUserType === 'COMPANY-DEBTOR-USER'
                      ? userDetails?.companyDebtor.id
                      : undefined,

            warehouseId:
                editData?.userType === 'WAREHOUSE-USER'
                    ? editData?.warehouseId
                    : authUserType === 'WAREHOUSE-USER'
                      ? userDetails?.warehouse.id
                      : undefined,
        },
    });

    const { handleSubmit, control, watch } = form;

    function onSubmit(values: UserCreateSchema | UserUpdateSchema) {
        if (editData) {
            if (!editData.id) return toast.error('User ID is required');
            return updateItemData.mutate(values as UserUpdateSchema, {
                onSuccess: (data) => {
                    if (data.success) {
                        toast.success('User updated successfully');
                        form.reset();
                        onClose();
                    } else {
                        toast.error('User updation failed');
                    }
                },
                onError: (error) => {
                    // @ts-ignore
                    toast.error(error?.response?.data?.message || 'Internal Server Error!');
                },
            });
        }
        createItemData.mutate(values as UserCreateSchema, {
            onSuccess: (data) => {
                if (data.success) {
                    toast.success('User created successfully');
                    form.reset();
                    onClose();
                } else {
                    toast.error('User creation failed');
                }
            },
            onError: (error) => {
                // @ts-ignore
                toast.error(error?.response.data.message || 'Internal Server Error!');
            },
        });
    }

    // User Types

    const warehouses = useGetWarehouses({})?.data?.data;
    const companyDebtors = useDebtorList({ companyDebtorType: 'COMPANY_OWNED' })?.data?.data?.rows;

    return (
        <Form {...form}>
            <form onSubmit={handleSubmit(onSubmit)}>
                <div className="my-4 grid w-full gap-6 md:grid-cols-2">
                    <div className="grid gap-6">
                        <Card className="gap-2 overflow-hidden pt-0 !pb-3">
                            <CardHeader className="mb-3 gap-0 border-b bg-white !px-4 !py-2">
                                <CardTitle>Staff Details</CardTitle>
                            </CardHeader>

                            <div className="space-y-2 px-4">
                                <div className="flex items-start gap-4">
                                    <Label htmlFor="staffNumber" className="min-w-[120px] text-sm font-medium">
                                        Staff Number <MandatoryField />
                                    </Label>
                                    <div className="flex-1">
                                        <FormField
                                            control={control}
                                            name="staffNumber"
                                            disabled={isEditing}
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormControl>
                                                        <Input
                                                            type="number"
                                                            placeholder="Staff Number"
                                                            {...field}
                                                            value={field.value || ''}
                                                            onChange={(e) =>
                                                                field.onChange(e.target.valueAsNumber || '')
                                                            }
                                                        />
                                                    </FormControl>
                                                    <FormMessage className="!-mt-1 !text-xs" />
                                                </FormItem>
                                            )}
                                        />
                                    </div>
                                </div>

                                <div className="flex items-start gap-4">
                                    <Label htmlFor="firstName" className="min-w-[120px] text-sm font-medium">
                                        First name <MandatoryField />
                                    </Label>
                                    <div className="flex-1">
                                        <FormField
                                            control={control}
                                            name="firstName"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormControl>
                                                        <Input placeholder="First Name" {...field} />
                                                    </FormControl>
                                                    <FormMessage className="!-mt-1 !text-xs" />
                                                </FormItem>
                                            )}
                                        />
                                    </div>
                                </div>

                                <div className="flex items-start gap-4">
                                    <Label htmlFor="surname" className="min-w-[120px] text-sm font-medium">
                                        Surname:
                                    </Label>
                                    <div className="flex-1">
                                        <FormField
                                            control={control}
                                            name="surname"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormControl>
                                                        <Input placeholder="Surname" {...field} />
                                                    </FormControl>
                                                    <FormMessage className="!-mt-1 !text-xs" />
                                                </FormItem>
                                            )}
                                        />
                                    </div>
                                </div>

                                <div className="flex items-start gap-4">
                                    <Label htmlFor="initials" className="min-w-[120px] text-sm font-medium">
                                        Initials:
                                    </Label>
                                    <div className="flex-1">
                                        <FormField
                                            control={control}
                                            name="initials"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormControl>
                                                        <Input placeholder="Initials" {...field} />
                                                    </FormControl>
                                                    <FormMessage className="!-mt-1 !text-xs" />
                                                </FormItem>
                                            )}
                                        />
                                    </div>
                                </div>

                                <div className="flex items-start gap-4">
                                    <Label htmlFor="idNumber" className="min-w-[120px] text-sm font-medium">
                                        Id Number <MandatoryField />
                                    </Label>
                                    <div className="flex-1">
                                        <FormField
                                            control={control}
                                            name="idNumber"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormControl>
                                                        <Input placeholder="Id Number" {...field} />
                                                    </FormControl>
                                                    <FormMessage className="!-mt-1 !text-xs" />
                                                </FormItem>
                                            )}
                                        />
                                    </div>
                                </div>

                                <div className="flex items-start gap-4">
                                    <Label htmlFor="addressOne" className="min-w-[120px] text-sm font-medium">
                                        Address 1:
                                    </Label>
                                    <div className="flex-1">
                                        <FormField
                                            control={control}
                                            name="addressOne"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormControl>
                                                        <Input placeholder="Address 1" {...field} />
                                                    </FormControl>
                                                    <FormMessage className="!-mt-1 !text-xs" />
                                                </FormItem>
                                            )}
                                        />
                                    </div>
                                </div>

                                <div className="flex items-start gap-4">
                                    <Label htmlFor="addressTwo" className="min-w-[120px] text-sm font-medium">
                                        Address 2:
                                    </Label>
                                    <div className="flex-1">
                                        <FormField
                                            control={control}
                                            name="addressTwo"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormControl>
                                                        <Input placeholder="Address 2" {...field} />
                                                    </FormControl>
                                                    <FormMessage className="!-mt-1 !text-xs" />
                                                </FormItem>
                                            )}
                                        />
                                    </div>
                                </div>

                                <div className="flex items-start gap-4">
                                    <Label htmlFor="addressThree" className="min-w-[120px] text-sm font-medium">
                                        Address 3:
                                    </Label>
                                    <div className="flex-1">
                                        <FormField
                                            control={control}
                                            name="addressThree"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormControl>
                                                        <Input placeholder="Address 3" {...field} />
                                                    </FormControl>
                                                    <FormMessage className="!-mt-1 !text-xs" />
                                                </FormItem>
                                            )}
                                        />
                                    </div>
                                </div>

                                <div className="flex items-start gap-4">
                                    <Label htmlFor="postCode" className="min-w-[120px] text-sm font-medium">
                                        Post Code:
                                    </Label>
                                    <div className="flex-1">
                                        <FormField
                                            control={control}
                                            name="postCode"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormControl>
                                                        <Input placeholder="Post Code" {...field} />
                                                    </FormControl>
                                                    <FormMessage className="!-mt-1 !text-xs" />
                                                </FormItem>
                                            )}
                                        />
                                    </div>
                                </div>

                                <div className="flex items-start gap-4">
                                    <Label htmlFor="telephone" className="min-w-[120px] text-sm font-medium">
                                        Telephone:
                                    </Label>
                                    <div className="flex-1">
                                        <FormField
                                            control={control}
                                            name="telephone"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormControl>
                                                        <Input placeholder="Telephone" {...field} />
                                                    </FormControl>
                                                    <FormMessage className="!-mt-1 !text-xs" />
                                                </FormItem>
                                            )}
                                        />
                                    </div>
                                </div>

                                <div className="flex items-start gap-4">
                                    <Label htmlFor="cellPhone" className="min-w-[120px] text-sm font-medium">
                                        Cell Phone:
                                    </Label>
                                    <div className="flex-1">
                                        <FormField
                                            control={control}
                                            name="cellPhone"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormControl>
                                                        <Input placeholder="Cell Phone" {...field} />
                                                    </FormControl>
                                                    <FormMessage className="!-mt-1 !text-xs" />
                                                </FormItem>
                                            )}
                                        />
                                    </div>
                                </div>

                                <div className="flex items-start gap-4">
                                    <Label htmlFor="email" className="min-w-[120px] text-sm font-medium">
                                        E-Mail <MandatoryField />
                                    </Label>
                                    <div className="flex-1">
                                        <FormField
                                            control={control}
                                            name="email"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormControl>
                                                        <Input type="email" placeholder="Email address" {...field} />
                                                    </FormControl>
                                                    <FormMessage className="!-mt-1 !text-xs" />
                                                </FormItem>
                                            )}
                                        />
                                    </div>
                                </div>
                            </div>
                        </Card>
                    </div>

                    <div className="grid gap-6">
                        <Card className="gap-2 overflow-hidden pt-0 !pb-3">
                            <CardHeader className="mb-3 gap-0 border-b bg-white px-4 !py-2">
                                <CardTitle>Settings</CardTitle>
                            </CardHeader>

                            <div className="space-y-2 px-4">
                                {!isEditing && (
                                    <div className="flex items-start gap-4">
                                        <Label htmlFor="password" className="min-w-[120px] text-sm font-medium">
                                            Password <MandatoryField />
                                        </Label>
                                        <div className="flex-1">
                                            <FormField
                                                control={control}
                                                name="password"
                                                render={({ field }) => (
                                                    <FormItem>
                                                        <FormControl>
                                                            <Input
                                                                type="password"
                                                                placeholder="Enter a secure password..."
                                                                {...field}
                                                                className="max-w-72"
                                                            />
                                                        </FormControl>
                                                        <FormMessage className="!-mt-1 !text-xs" />
                                                    </FormItem>
                                                )}
                                            />
                                        </div>
                                    </div>
                                )}

                                {authUserType === 'COMPANY-USER' && (
                                    <div className="flex items-center gap-4">
                                        <Label htmlFor="groupId" className="min-w-[120px] text-sm font-medium">
                                            User Type <MandatoryField />
                                        </Label>
                                        <div className="flex-1">
                                            <FormField
                                                control={form.control}
                                                name="userType"
                                                render={({ field }) => (
                                                    <FormItem className="relative max-w-72">
                                                        <Select
                                                            onValueChange={(val) => {
                                                                field.onChange(val);
                                                                form.setValue('companyDebtorId', undefined);
                                                                form.setValue('warehouseId', undefined);
                                                            }}
                                                            value={field.value}
                                                            disabled={!!editData}
                                                        >
                                                            <FormControl>
                                                                <SelectTrigger>
                                                                    <SelectValue placeholder="Select user type" />
                                                                </SelectTrigger>
                                                            </FormControl>
                                                            <SelectContent>
                                                                {userTypeMenu?.map((data) => (
                                                                    <SelectItem key={data.value} value={data.value}>
                                                                        {data.label}
                                                                    </SelectItem>
                                                                ))}
                                                            </SelectContent>
                                                        </Select>
                                                        <FormMessage className="!-mt-1 !text-xs" />
                                                    </FormItem>
                                                )}
                                            />
                                        </div>
                                    </div>
                                )}

                                {authUserType === 'COMPANY-USER' &&
                                    (form.watch('userType') === 'COMPANY-DEBTOR-USER' ? (
                                        <div className="flex items-center gap-4">
                                            <Label htmlFor="groupId" className="min-w-[120px] text-sm font-medium">
                                                Debtors <MandatoryField />
                                            </Label>
                                            <div className="flex-1">
                                                {companyDebtors && (
                                                    <FormField
                                                        control={form.control}
                                                        name="companyDebtorId"
                                                        render={({ field }) => (
                                                            <FormItem className="relative max-w-72">
                                                                <Select
                                                                    onValueChange={field.onChange}
                                                                    value={field.value}
                                                                    disabled={!!editData}
                                                                >
                                                                    <FormControl>
                                                                        <SelectTrigger>
                                                                            <SelectValue placeholder="Select company debtors" />
                                                                        </SelectTrigger>
                                                                    </FormControl>
                                                                    <SelectContent>
                                                                        {companyDebtors?.map(
                                                                            (data: CompanyCreditor) => (
                                                                                <SelectItem
                                                                                    key={data.id}
                                                                                    value={data.id}
                                                                                >
                                                                                    {data.name}{' '}
                                                                                    {data?.accountNumber
                                                                                        ? `- ${data?.accountNumber}`
                                                                                        : ''}
                                                                                </SelectItem>
                                                                            ),
                                                                        )}
                                                                    </SelectContent>
                                                                </Select>
                                                                <FormMessage className="!-mt-1 !text-xs" />
                                                            </FormItem>
                                                        )}
                                                    />
                                                )}
                                            </div>
                                        </div>
                                    ) : form.watch('userType') === 'WAREHOUSE-USER' ? (
                                        <div className="flex items-center gap-4">
                                            <Label htmlFor="groupId" className="min-w-[120px] text-sm font-medium">
                                                Warehouses <MandatoryField />
                                            </Label>
                                            <div className="flex-1">
                                                {warehouses && (
                                                    <FormField
                                                        control={form.control}
                                                        name="warehouseId"
                                                        render={({ field }) => (
                                                            <FormItem className="relative max-w-72">
                                                                <Select
                                                                    onValueChange={field.onChange}
                                                                    value={field.value}
                                                                    disabled={!!editData}
                                                                >
                                                                    <FormControl>
                                                                        <SelectTrigger>
                                                                            <SelectValue placeholder="Select warehouse" />
                                                                        </SelectTrigger>
                                                                    </FormControl>
                                                                    <SelectContent>
                                                                        {warehouses?.map((data: WarehouseDetails) => (
                                                                            <SelectItem key={data.id} value={data.id}>
                                                                                {data.warehouse}{' '}
                                                                                {data?.groupCode
                                                                                    ? `- ${data?.groupCode}`
                                                                                    : ''}
                                                                            </SelectItem>
                                                                        ))}
                                                                    </SelectContent>
                                                                </Select>
                                                                <FormMessage className="!-mt-1 !text-xs" />
                                                            </FormItem>
                                                        )}
                                                    />
                                                )}
                                            </div>
                                        </div>
                                    ) : null)}

                                <div className="flex items-center gap-4">
                                    <Label htmlFor="groupId" className="min-w-[120px] text-sm font-medium">
                                        User Group:
                                    </Label>
                                    <div className="flex-1">
                                        {userGroups && (
                                            <FormField
                                                control={form.control}
                                                name="groupId"
                                                render={({ field }) => (
                                                    <FormItem className="relative max-w-72">
                                                        <Select onValueChange={field.onChange} value={field.value}>
                                                            <FormControl>
                                                                <SelectTrigger>
                                                                    <SelectValue placeholder="Select user group" />
                                                                </SelectTrigger>
                                                            </FormControl>
                                                            <SelectContent>
                                                                {userGroups?.map((data) => (
                                                                    <SelectItem key={data.id} value={data.id}>
                                                                        {data.name}{' '}
                                                                        {data?.groupCode ? `- ${data?.groupCode}` : ''}
                                                                    </SelectItem>
                                                                ))}
                                                            </SelectContent>

                                                            {field.value && (
                                                                <X
                                                                    onClick={(e) => {
                                                                        e.preventDefault();
                                                                        e.stopPropagation();
                                                                        field.onChange('');
                                                                    }}
                                                                    className="absolute top-1/2 right-5 z-10 -translate-y-1/2 cursor-pointer text-xs text-red-500"
                                                                    size={16}
                                                                />
                                                            )}
                                                        </Select>
                                                        <FormMessage />
                                                    </FormItem>
                                                )}
                                            />
                                        )}
                                    </div>
                                </div>

                                <div className="flex items-center gap-4">
                                    <Label htmlFor="reportAccessLevelId" className="min-w-[120px] text-sm font-medium">
                                        Report Access:
                                    </Label>
                                    <div className="flex-1">
                                        {reportAccessLevels && (
                                            <FormField
                                                control={form.control}
                                                name="reportAccessLevelId"
                                                render={({ field }) => (
                                                    <FormItem>
                                                        <Select onValueChange={field.onChange} value={field.value}>
                                                            <FormControl>
                                                                <SelectTrigger className="max-w-72">
                                                                    <SelectValue placeholder="Select report access level" />
                                                                </SelectTrigger>
                                                            </FormControl>
                                                            <SelectContent>
                                                                {reportAccessLevels?.map((data) => (
                                                                    <SelectItem key={data.id} value={data.id}>
                                                                        {data.description}
                                                                    </SelectItem>
                                                                ))}
                                                            </SelectContent>
                                                        </Select>
                                                        <FormMessage />
                                                    </FormItem>
                                                )}
                                            />
                                        )}
                                    </div>
                                </div>

                                <div className="space-y-3">
                                    <div className="flex items-center gap-4">
                                        <Label htmlFor="administrator" className="min-w-[120px] text-sm font-medium">
                                            Administrator:
                                        </Label>
                                        <div className="flex items-center gap-2">
                                            <FormField
                                                control={control}
                                                name="administrator"
                                                render={({ field }) => (
                                                    <FormItem className="flex items-center gap-2">
                                                        <FormControl>
                                                            <Checkbox
                                                                checked={field.value}
                                                                onCheckedChange={field.onChange}
                                                            />
                                                        </FormControl>
                                                        <Label className="text-sm">Check for Yes</Label>
                                                    </FormItem>
                                                )}
                                            />
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-4">
                                        <Label htmlFor="pinNumber" className="min-w-[120px] text-sm font-medium">
                                            PIN Number:
                                        </Label>
                                        <div className="flex items-center gap-2">
                                            <Checkbox />
                                            <Label className="text-sm">Check to Change Pin Code</Label>
                                        </div>
                                    </div>

                                    <div className="flex items-start gap-4">
                                        <Label
                                            htmlFor="forcePasswordChange"
                                            className="min-w-[120px] text-sm font-medium"
                                        >
                                            Force Password Change:
                                        </Label>
                                        <div className="flex flex-col gap-2">
                                            <div className="flex items-center gap-2">
                                                <FormField
                                                    control={control}
                                                    name="forcePasswordChange"
                                                    render={({ field }) => (
                                                        <FormItem className="flex items-center gap-2">
                                                            <FormControl>
                                                                <Checkbox
                                                                    checked={field.value === 'NEXT-LOGIN'}
                                                                    onCheckedChange={(checked) =>
                                                                        field.onChange(checked ? 'NEXT-LOGIN' : null)
                                                                    }
                                                                />
                                                            </FormControl>
                                                            <Label className="text-sm">Check for Yes</Label>
                                                        </FormItem>
                                                    )}
                                                />
                                                <Checkbox />
                                                <Label className="text-sm">On Next Login</Label>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-4">
                                        <Label
                                            htmlFor="forcePasswordChangeEveryXDays"
                                            className="min-w-[120px] text-sm font-medium"
                                        >
                                            Every X Days:
                                        </Label>
                                        <div className="w-20">
                                            <FormField
                                                control={control}
                                                name="forcePasswordChangeEveryXDays"
                                                render={({ field }) => (
                                                    <FormItem>
                                                        <FormControl>
                                                            <Input
                                                                type="number"
                                                                placeholder="1"
                                                                {...field}
                                                                value={field.value ?? ''}
                                                                onChange={(e) =>
                                                                    field.onChange(e.target.valueAsNumber || '')
                                                                }
                                                            />
                                                        </FormControl>
                                                    </FormItem>
                                                )}
                                            />
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-4">
                                        <Label htmlFor="useClassicMenu" className="min-w-[120px] text-sm font-medium">
                                            Use Classic Menu:
                                        </Label>
                                        <div className="flex items-center gap-2">
                                            <FormField
                                                control={control}
                                                name="useClassicMenu"
                                                render={({ field }) => (
                                                    <FormItem>
                                                        <FormControl>
                                                            <Checkbox
                                                                checked={field.value}
                                                                onCheckedChange={field.onChange}
                                                            />
                                                        </FormControl>
                                                    </FormItem>
                                                )}
                                            />
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-4">
                                        <Label
                                            htmlFor="askForPinContinuously"
                                            className="min-w-[120px] text-sm font-medium"
                                        >
                                            Ask For Pin Continuously:
                                        </Label>
                                        <div className="flex items-center gap-2">
                                            <FormField
                                                control={control}
                                                name="askForPinContinuously"
                                                render={({ field }) => (
                                                    <FormItem>
                                                        <FormControl>
                                                            <Checkbox
                                                                checked={field.value}
                                                                onCheckedChange={field.onChange}
                                                            />
                                                        </FormControl>
                                                    </FormItem>
                                                )}
                                            />
                                            <Label className="text-sm text-blue-600">
                                                Inherited From Company Setting
                                            </Label>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-4">
                                        <Label
                                            htmlFor="enableSystemNotifications"
                                            className="min-w-[120px] text-sm font-medium"
                                        >
                                            Enable System Notifications:
                                        </Label>
                                        <div className="flex items-center gap-2">
                                            <FormField
                                                control={control}
                                                name="enableSystemNotifications"
                                                render={({ field }) => (
                                                    <FormItem>
                                                        <FormControl>
                                                            <Checkbox
                                                                checked={field.value}
                                                                onCheckedChange={field.onChange}
                                                            />
                                                        </FormControl>
                                                    </FormItem>
                                                )}
                                            />
                                        </div>
                                    </div>
                                </div>

                                <div className="flex items-center gap-4">
                                    <Label htmlFor="systemLanguageId" className="min-w-[120px] text-sm font-medium">
                                        System Language:
                                    </Label>
                                    <div className="flex-1">
                                        {languages && (
                                            <FormField
                                                control={form.control}
                                                name="systemLanguageId"
                                                render={({ field }) => (
                                                    <FormItem>
                                                        <Select onValueChange={field.onChange} value={field.value}>
                                                            <FormControl>
                                                                <SelectTrigger className="max-w-72">
                                                                    <SelectValue placeholder="Select system language" />
                                                                </SelectTrigger>
                                                            </FormControl>
                                                            <SelectContent>
                                                                {languages?.map((data) => (
                                                                    <SelectItem key={data.id} value={data.id}>
                                                                        {data.name} ({data.code})
                                                                    </SelectItem>
                                                                ))}
                                                            </SelectContent>
                                                        </Select>
                                                        <FormMessage />
                                                    </FormItem>
                                                )}
                                            />
                                        )}
                                    </div>
                                </div>

                                <div className="flex items-center gap-4">
                                    <Label htmlFor="systemCharacterSetId" className="min-w-[120px] text-sm font-medium">
                                        System Character Set:
                                    </Label>
                                    <div className="flex-1">
                                        {characterSets && (
                                            <FormField
                                                control={form.control}
                                                name="systemCharacterSetId"
                                                render={({ field }) => (
                                                    <FormItem>
                                                        <Select onValueChange={field.onChange} value={field.value}>
                                                            <FormControl>
                                                                <SelectTrigger className="max-w-72">
                                                                    <SelectValue placeholder="Select system character set" />
                                                                </SelectTrigger>
                                                            </FormControl>
                                                            <SelectContent>
                                                                {characterSets?.map((data) => (
                                                                    <SelectItem key={data.id} value={data.id}>
                                                                        {data.name} ({data.code})
                                                                    </SelectItem>
                                                                ))}
                                                            </SelectContent>
                                                        </Select>
                                                        <FormMessage />
                                                    </FormItem>
                                                )}
                                            />
                                        )}
                                    </div>
                                </div>
                            </div>
                        </Card>
                    </div>
                </div>

                <div className="flex justify-end gap-3">
                    <Button type="button" variant="outline" onClick={onClose}>
                        Cancel
                    </Button>
                    <Button type="submit" className="bg-blue-600 hover:bg-blue-700">
                        {editData ? 'Update User' : 'Create User'}
                    </Button>
                </div>
            </form>
        </Form>
    );
};

export default UserForm;
