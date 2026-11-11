import moment from 'moment-timezone';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Form, FormItem, FormField, FormControl, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useDebtorList } from '@/api-queries/debtor';

// APIs & Types
import {
    TillDetails,
    TillCreateSchema,
    TillUpdateSchema,
    TillCashCustodyRoute,
    TillDebtorReceiptHandoverMode,
    TILL_CASH_CUSTODY_ROUTES,
    TILL_DEBTOR_RECEIPT_HANDOVER_MODES,
    tillCreateSchema,
    tillUpdateSchema,
    useCreateTill,
    useUpdateTill,
} from '@/api-queries/masters/tills';
import { useGetSafes } from '@/api-queries/safes';
import { useGetCashOfficeConfigurations } from '@/api-queries/cash-office';
import { zodResolverCoerced as zodResolver } from '@/utils/zod-coerced';
import { toast } from 'sonner';
import MandatoryField from '@/components/dynamic-form/mandatory-fields';
import { Copy, Info } from 'lucide-react';
import { getTerminalErrorMessage } from '@/utils/terminal-errors';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface TillFormProps {
    open: boolean;
    onClose: () => void;
    editData: TillDetails | null;
    canAssignNow: boolean;
    onAssignNow: (till: Pick<TillDetails, 'id' | 'name' | 'tillNumber'> & Partial<TillDetails>) => void;
}

type TillScope = 'COMPANY' | 'STORE';

const TillForm = ({ open, editData, onClose, canAssignNow, onAssignNow }: TillFormProps) => {
    const createItemData = useCreateTill();
    const updateItemData = useUpdateTill();

    const isEditing = !!editData;
    const isStoreTill = !!editData?.companyDebtorId;

    const { data: storeData } = useDebtorList({ limit: 1000, offset: 0 });
    const stores = storeData?.data?.rows || [];

    const [scope, setScope] = useState<TillScope>(isStoreTill ? 'STORE' : 'COMPANY');
    const [companyDebtorId, setCompanyDebtorId] = useState(editData?.companyDebtorId || '');
    const [createdTerminalId, setCreatedTerminalId] = useState('');
    const [createCompleted, setCreateCompleted] = useState(false);
    const [createdTill, setCreatedTill] = useState<
        (Pick<TillDetails, 'id' | 'name' | 'tillNumber'> & Partial<TillDetails>) | null
    >(null);

    const { data: safesRes } = useGetSafes({ limit: 1000, offset: 0 });
    const { data: cashOfficesRes } = useGetCashOfficeConfigurations({ limit: 200, offset: 0 });
    const safes = safesRes?.data?.rows || [];
    const cashOffices = cashOfficesRes?.data?.rows || [];

    const form = useForm<TillCreateSchema | TillUpdateSchema>({
        resolver: zodResolver(isEditing ? tillUpdateSchema : tillCreateSchema),
        defaultValues: {
            name: editData?.name || '',
            tillNumber: editData?.tillNumber || '',
            terminalId: editData?.terminalId || '',
            cashThreshold:
                editData?.cashThreshold !== undefined && editData?.cashThreshold !== null
                    ? Number(editData.cashThreshold)
                    : undefined,
            cashCustodyRoute: editData?.cashCustodyRoute || 'DIRECT_TO_SAFE',
            safeId: editData?.safeId || undefined,
            cashOfficeId: editData?.cashOfficeId || undefined,
            debtorReceiptCashThreshold:
                editData?.debtorReceiptCashThreshold !== undefined && editData?.debtorReceiptCashThreshold !== null
                    ? Number(editData.debtorReceiptCashThreshold)
                    : undefined,
            debtorReceiptHandoverMode: editData?.debtorReceiptHandoverMode || 'KEEP_IN_TILL',
            ...(editData ? { id: editData.id } : { timezone: moment.tz.guess() }),
        },
    });

    const { handleSubmit, control, watch, setValue } = form;
    const custodyRoute = watch('cashCustodyRoute') as TillCashCustodyRoute | undefined;
    const receiptHandoverMode = watch('debtorReceiptHandoverMode') as TillDebtorReceiptHandoverMode | undefined;

    function onSubmit(values: TillCreateSchema | TillUpdateSchema) {
        if (scope === 'STORE' && !companyDebtorId) {
            toast.error('Select the store for this till.');
            return;
        }
        const payload = {
            ...values,
            ...(scope === 'STORE' && companyDebtorId ? { companyDebtorId } : {}),
        };

        if (editData) {
            if (!editData.id) return toast.error('Till ID is required');

            return updateItemData.mutate(payload as TillUpdateSchema, {
                onSuccess: (data) => {
                    if (data.success) {
                        toast.success('Till updated successfully');
                        form.reset();
                        onClose();
                    } else {
                        toast.error('Till updation failed');
                    }
                },
                onError: (error) => {
                    // @ts-ignore
                    toast.error(error?.response?.data?.message || 'Internal Server Error!');
                },
            });
        }

        const { terminalId: _terminalId, ...createPayload } = payload as TillCreateSchema & {
            terminalId?: string;
        };
        void _terminalId;
        createItemData.mutate(createPayload, {
            onSuccess: (data) => {
                if (data.success) {
                    setCreateCompleted(true);
                    const createdTillData = data.data;
                    const returnedTerminalId = createdTillData?.terminalId || data.terminalId;
                    if (returnedTerminalId) setCreatedTerminalId(returnedTerminalId);
                    else
                        toast.error(data.message || 'Till was created, but the server did not return its Terminal ID.');
                    if (createdTillData?.id) {
                        setCreatedTill({
                            id: createdTillData.id,
                            name: createdTillData.name || values.name,
                            tillNumber: createdTillData.tillNumber || values.tillNumber,
                            terminalId: returnedTerminalId || '',
                            companyDebtorId: createdTillData.companyDebtorId || payload.companyDebtorId || null,
                            companyDebtor:
                                createdTillData.companyDebtor ||
                                stores.find(
                                    (store) => store.id === (createdTillData.companyDebtorId || companyDebtorId),
                                ),
                            assignments: createdTillData.assignments || [],
                            assignmentCount: createdTillData.assignmentCount || 0,
                            availability: createdTillData.availability || 'UNASSIGNED',
                            actions: createdTillData.actions,
                        });
                    }
                    if (returnedTerminalId) toast.success('Till created successfully');
                } else {
                    toast.error(getTerminalErrorMessage(data.message, 'Till creation failed'));
                }
            },
            onError: (error) => {
                const apiError = error as typeof error & {
                    response?: { data?: { message?: string; error?: string } };
                };
                toast.error(
                    getTerminalErrorMessage(
                        apiError.response?.data?.message || apiError.response?.data?.error || apiError.message,
                        'Till creation failed.',
                    ),
                );
            },
        });
    }

    function onOpenChange() {
        form.reset();
        setCreatedTerminalId('');
        setCreateCompleted(false);
        setCreatedTill(null);
        onClose();
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[560px]">
                <DialogHeader>
                    <DialogTitle>{isEditing ? 'Edit Till' : 'Register New Till'}</DialogTitle>
                </DialogHeader>

                {createCompleted ? (
                    <div className="space-y-4">
                        <p className="text-muted-foreground text-sm">
                            Till created. Copy this Terminal ID and use it during the separate EXE Terminal Setup
                            operation.
                        </p>
                        {createdTerminalId ? (
                            <div className="flex items-center gap-2">
                                <Input readOnly value={createdTerminalId} />
                                <Button
                                    type="button"
                                    variant="outline"
                                    aria-label="Copy Terminal ID"
                                    onClick={async () => {
                                        try {
                                            await navigator.clipboard.writeText(createdTerminalId);
                                            toast.success('Terminal ID copied');
                                        } catch {
                                            toast.error('Unable to copy Terminal ID.');
                                        }
                                    }}
                                >
                                    <Copy className="size-4" />
                                </Button>
                            </div>
                        ) : (
                            <p className="text-destructive text-sm">
                                The till was created, but no Terminal ID was returned. Do not register it again; contact
                                support to resolve the missing ID.
                            </p>
                        )}
                        <div className="flex justify-end gap-2">
                            <Button type="button" variant="outline" onClick={onOpenChange}>
                                Assign Later
                            </Button>
                            {createdTill && canAssignNow && (
                                <Button
                                    type="button"
                                    onClick={() => {
                                        onAssignNow(createdTill);
                                        onOpenChange();
                                    }}
                                >
                                    Assign Cashier Now
                                </Button>
                            )}
                        </div>
                    </div>
                ) : (
                    <Form {...form}>
                        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                            <div className="mb-0 grid gap-6 py-4">
                                <div className="flex items-start gap-4">
                                    <Label className="min-w-[120px] text-sm font-medium">Till Scope</Label>
                                    <div className="flex-1">
                                        <Select value={scope} onValueChange={(value) => setScope(value as TillScope)}>
                                            <SelectTrigger className="h-9">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="COMPANY">Company Till</SelectItem>
                                                <SelectItem value="STORE">Store Till</SelectItem>
                                            </SelectContent>
                                        </Select>
                                        <p className="text-muted-foreground mt-1 text-xs">
                                            Company tills are shared across the company. Store tills belong to a single
                                            store and can only be accessed by that store&apos;s cashiers.
                                        </p>
                                    </div>
                                </div>

                                {scope === 'STORE' && (
                                    <div className="flex items-start gap-4">
                                        <Label className="mt-2 min-w-[120px] text-sm font-medium">
                                            Store <MandatoryField />
                                        </Label>
                                        <div className="flex-1">
                                            <Select value={companyDebtorId} onValueChange={setCompanyDebtorId}>
                                                <SelectTrigger className="h-9">
                                                    <SelectValue placeholder="Select a store" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {stores.map((store) => (
                                                        <SelectItem key={store.id} value={store.id}>
                                                            {store.name || store.id}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    </div>
                                )}

                                <div className="flex items-start gap-4">
                                    <Label htmlFor="name" className="min-w-[120px] text-sm font-medium">
                                        Till Name <MandatoryField />
                                    </Label>
                                    <div className="flex-1">
                                        <FormField
                                            control={control}
                                            name="name"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormControl>
                                                        <Input placeholder="eg : Till 3" {...field} />
                                                    </FormControl>
                                                    <FormMessage className="!-mt-1 !text-xs" />
                                                </FormItem>
                                            )}
                                        />
                                        <FormMessage />
                                    </div>
                                </div>

                                <div className="flex items-start gap-4">
                                    <Label htmlFor="tillNumber" className="min-w-[120px] text-sm font-medium">
                                        Till Number <MandatoryField />
                                    </Label>
                                    <div className="flex-1">
                                        <FormField
                                            control={control}
                                            name="tillNumber"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormControl>
                                                        <Input placeholder="eg : TILL0003" {...field} />
                                                    </FormControl>
                                                    <FormMessage className="!-mt-1 !text-xs" />
                                                </FormItem>
                                            )}
                                        />
                                        <FormMessage />
                                    </div>
                                </div>

                                {isEditing && (
                                    <div className="flex items-start gap-4">
                                        <Label htmlFor="terminalId" className="mt-2 min-w-[120px] text-sm font-medium">
                                            Terminal ID :
                                        </Label>
                                        <div className="flex-1">
                                            <FormField
                                                control={control}
                                                name="terminalId"
                                                render={({ field }) => (
                                                    <FormItem>
                                                        <FormControl>
                                                            <Input readOnly {...field} />
                                                        </FormControl>
                                                        <FormMessage className="!-mt-1 !text-xs" />
                                                    </FormItem>
                                                )}
                                            />
                                        </div>
                                    </div>
                                )}

                                <div className="flex items-start gap-4">
                                    <Label
                                        htmlFor="cashThreshold"
                                        className="mt-2 flex min-w-[190px] items-center gap-1 text-sm font-medium"
                                    >
                                        Till Cash Limit
                                        <TooltipProvider>
                                            <Tooltip>
                                                <TooltipTrigger asChild>
                                                    <button
                                                        type="button"
                                                        aria-label="Till Cash Limit information"
                                                        className="text-muted-foreground hover:text-foreground"
                                                    >
                                                        <Info className="size-4" />
                                                    </button>
                                                </TooltipTrigger>
                                                <TooltipContent className="max-w-xs">
                                                    Cash deposited in this till reaching this limit triggers a cash
                                                    handover.
                                                </TooltipContent>
                                            </Tooltip>
                                        </TooltipProvider>
                                    </Label>
                                    <div className="flex-1">
                                        <FormField
                                            control={control}
                                            name="cashThreshold"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormControl>
                                                        <Input
                                                            type="number"
                                                            min={0}
                                                            step="0.01"
                                                            placeholder="Maximum allowed cash in till before alert (e.g. 1000.00)"
                                                            value={field.value ?? ''}
                                                            onChange={(e) =>
                                                                field.onChange(
                                                                    e.target.value === ''
                                                                        ? undefined
                                                                        : e.target.valueAsNumber,
                                                                )
                                                            }
                                                        />
                                                    </FormControl>
                                                    <FormMessage className="!-mt-1 !text-xs" />
                                                </FormItem>
                                            )}
                                        />
                                        <FormMessage />
                                    </div>
                                </div>

                                <div className="flex items-start gap-4">
                                    <Label
                                        htmlFor="cashCustodyRoute"
                                        className="mt-2 min-w-[120px] text-sm font-medium"
                                    >
                                        Cash Custody Route :
                                    </Label>
                                    <div className="min-w-0 flex-1">
                                        <FormField
                                            control={control}
                                            name="cashCustodyRoute"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormControl>
                                                        <Select
                                                            value={field.value || 'DIRECT_TO_SAFE'}
                                                            onValueChange={(value) => {
                                                                const next = value as TillCashCustodyRoute;
                                                                field.onChange(next);
                                                                // Clear the destination that the new route forbids
                                                                // so a stale safeId cannot be submitted.
                                                                if (next === 'DIRECT_TO_SAFE')
                                                                    setValue('cashOfficeId', undefined);
                                                                else setValue('safeId', undefined);
                                                            }}
                                                        >
                                                            <SelectTrigger>
                                                                <SelectValue placeholder="Select cash route" />
                                                            </SelectTrigger>
                                                            <SelectContent>
                                                                {TILL_CASH_CUSTODY_ROUTES.map((route) => (
                                                                    <SelectItem key={route} value={route}>
                                                                        {route.replace(/_/g, ' ')}
                                                                    </SelectItem>
                                                                ))}
                                                            </SelectContent>
                                                        </Select>
                                                    </FormControl>
                                                    <FormMessage className="!-mt-1 !text-xs" />
                                                </FormItem>
                                            )}
                                        />
                                    </div>
                                </div>

                                {custodyRoute === 'CASH_OFFICE_THEN_SAFE' ? (
                                    <div className="flex items-start gap-4">
                                        <Label
                                            htmlFor="cashOfficeId"
                                            className="mt-2 min-w-[120px] text-sm font-medium"
                                        >
                                            Cash Office <MandatoryField />
                                        </Label>
                                        <div className="min-w-0 flex-1">
                                            <FormField
                                                control={control}
                                                name="cashOfficeId"
                                                render={({ field }) => (
                                                    <FormItem>
                                                        <FormControl>
                                                            <Select
                                                                value={field.value || ''}
                                                                onValueChange={(value) =>
                                                                    field.onChange(value === 'none' ? undefined : value)
                                                                }
                                                            >
                                                                <SelectTrigger>
                                                                    <SelectValue placeholder="Select a Cash Office" />
                                                                </SelectTrigger>
                                                                <SelectContent>
                                                                    <SelectItem value="none">None</SelectItem>
                                                                    {cashOffices.map((office) => (
                                                                        <SelectItem key={office.id} value={office.id}>
                                                                            {office.name} ({office.code})
                                                                        </SelectItem>
                                                                    ))}
                                                                </SelectContent>
                                                            </Select>
                                                        </FormControl>
                                                        <FormMessage className="!-mt-1 !text-xs" />
                                                    </FormItem>
                                                )}
                                            />
                                        </div>
                                    </div>
                                ) : (
                                    <div className="flex items-start gap-4">
                                        <Label htmlFor="safeId" className="mt-2 min-w-[120px] text-sm font-medium">
                                            Safe <MandatoryField />
                                        </Label>
                                        <div className="min-w-0 flex-1">
                                            <FormField
                                                control={control}
                                                name="safeId"
                                                render={({ field }) => (
                                                    <FormItem>
                                                        <FormControl>
                                                            <Select
                                                                value={field.value || ''}
                                                                onValueChange={(value) =>
                                                                    field.onChange(value === 'none' ? undefined : value)
                                                                }
                                                            >
                                                                <SelectTrigger>
                                                                    <SelectValue placeholder="Select a Safe" />
                                                                </SelectTrigger>
                                                                <SelectContent>
                                                                    <SelectItem value="none">None</SelectItem>
                                                                    {safes.map((safe) => (
                                                                        <SelectItem key={safe.id} value={safe.id}>
                                                                            {safe.name} ({safe.code})
                                                                        </SelectItem>
                                                                    ))}
                                                                </SelectContent>
                                                            </Select>
                                                        </FormControl>
                                                        <FormMessage className="!-mt-1 !text-xs" />
                                                    </FormItem>
                                                )}
                                            />
                                        </div>
                                    </div>
                                )}

                                <div className="flex items-start gap-4">
                                    <Label
                                        htmlFor="debtorReceiptHandoverMode"
                                        className="mt-2 min-w-[120px] text-sm font-medium"
                                    >
                                        Receipt Cash Mode :
                                    </Label>
                                    <div className="min-w-0 flex-1">
                                        <FormField
                                            control={control}
                                            name="debtorReceiptHandoverMode"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormControl>
                                                        <Select
                                                            value={field.value || 'KEEP_IN_TILL'}
                                                            onValueChange={(value) =>
                                                                field.onChange(value as TillDebtorReceiptHandoverMode)
                                                            }
                                                        >
                                                            <SelectTrigger>
                                                                <SelectValue placeholder="Select receipt cash handling" />
                                                            </SelectTrigger>
                                                            <SelectContent>
                                                                {TILL_DEBTOR_RECEIPT_HANDOVER_MODES.map((mode) => (
                                                                    <SelectItem key={mode} value={mode}>
                                                                        {mode.replace(/_/g, ' ')}
                                                                    </SelectItem>
                                                                ))}
                                                            </SelectContent>
                                                        </Select>
                                                    </FormControl>
                                                    <FormMessage className="!-mt-1 !text-xs" />
                                                </FormItem>
                                            )}
                                        />
                                    </div>
                                </div>

                                {receiptHandoverMode === 'CASH_OFFICE_HANDOVER' ? (
                                    <div className="flex items-start gap-4">
                                        <Label
                                            htmlFor="debtorReceiptCashThreshold"
                                            className="mt-2 flex min-w-[190px] items-center gap-1 text-sm font-medium"
                                        >
                                            Debtor Receipt Limit <MandatoryField />
                                            <TooltipProvider>
                                                <Tooltip>
                                                    <TooltipTrigger asChild>
                                                        <button
                                                            type="button"
                                                            aria-label="Debtor Receipt Limit information"
                                                            className="text-muted-foreground hover:text-foreground"
                                                        >
                                                            <Info className="size-4" />
                                                        </button>
                                                    </TooltipTrigger>
                                                    <TooltipContent className="max-w-xs">
                                                        Controls routing of cash payments received from debtors. A Cash
                                                        Office handover occurs according to the configured receipt cash
                                                        mode.
                                                    </TooltipContent>
                                                </Tooltip>
                                            </TooltipProvider>
                                        </Label>
                                        <div className="min-w-0 flex-1">
                                            <FormField
                                                control={control}
                                                name="debtorReceiptCashThreshold"
                                                render={({ field }) => (
                                                    <FormItem>
                                                        <FormControl>
                                                            <Input
                                                                type="number"
                                                                min={0}
                                                                step="0.01"
                                                                placeholder="Cash receipt amount that triggers a Cash Office handover (e.g. 1000.00)"
                                                                value={field.value ?? ''}
                                                                onChange={(e) =>
                                                                    field.onChange(
                                                                        e.target.value === ''
                                                                            ? undefined
                                                                            : e.target.valueAsNumber,
                                                                    )
                                                                }
                                                            />
                                                        </FormControl>
                                                        <FormMessage className="!-mt-1 !text-xs" />
                                                    </FormItem>
                                                )}
                                            />
                                        </div>
                                    </div>
                                ) : null}
                            </div>

                            <div className="flex justify-end gap-3">
                                <Button type="button" variant="outline" onClick={onOpenChange}>
                                    Cancel
                                </Button>
                                <Button type="submit" className="bg-blue-600 hover:bg-blue-700">
                                    {editData ? 'Update Till' : 'Register Till'}
                                </Button>
                            </div>
                        </form>
                    </Form>
                )}
            </DialogContent>
        </Dialog>
    );
};

export default TillForm;
