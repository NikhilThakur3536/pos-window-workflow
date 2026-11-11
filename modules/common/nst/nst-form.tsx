import { useEffect, useState } from 'react';
import type { ChangeEvent } from 'react';
import moment from 'moment-timezone';
import { useForm } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Form, FormItem, FormField, FormControl, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { zodResolverCoerced as zodResolver } from '@/utils/zod-coerced';
import { toast } from 'sonner';
import { Loader2, Upload, X } from 'lucide-react';
import MandatoryField from '@/components/dynamic-form/mandatory-fields';
import { cleanDataPayload, generateUUIDForData } from '@/utils/helpers';
import { useDebtorList } from '@/api-queries/debtor';
import SelectPopover from '@/components/select-popover';
import { useGetStockInventories } from '@/api-queries/company/stock-inventories';
import {
    candidateAvailable,
    candidateBatchNumber,
    candidateDiscountedPrice,
    candidateDiscountPct,
    candidateRuleId,
    candidateRuleName,
    candidateStockDetail,
    NST_DISPOSITION_TYPES,
    NST_SOURCE_TYPES,
    DispositionCandidate,
    StockDisposition,
    StockDispositionCreateSchema,
    stockDispositionCreateSchema,
    useCreateStockDisposition,
    useGetDispositionCandidates,
    useGetDispositionRules,
    useUploadNSTPhotos,
    validateNSTPhotos,
    NST_PHOTO_ACCEPT_ATTR,
} from '@/api-queries/nst';

interface NSTFormProps {
    open: boolean;
    onClose: () => void;
    preselectedCandidate?: DispositionCandidate | null;
    companyDebtorId?: string;
    candidateMode?: boolean;
    // Called after the allocation is created (and approved) so the caller can refetch
    // /stockDisposition/candidates and drop the batch when nothing is left to allocate.
    onCompleted?: () => void;
    // The batch already has an allocation, so this is a top-up.
    allocateMore?: boolean;
    // Preselect the disposition kind (e.g. the manual "Mark Damaged Stock" flow).
    presetDispositionType?: 'NEAR_EXPIRY' | 'DAMAGED' | 'EXPIRED';
    // The already-loaded candidate list from the parent screen. When supplied the form
    // resolves the selected product's rule/pricing from it.
    candidates?: DispositionCandidate[];
}

const NSTForm = ({
    open,
    onClose,
    preselectedCandidate,
    companyDebtorId,
    candidateMode,
    onCompleted,
    allocateMore,
    presetDispositionType,
    candidates: candidatesProp,
}: NSTFormProps) => {
    const debtors = useDebtorList({ companyDebtorType: 'COMPANY_OWNED' })?.data?.data?.rows;
    const inventories = useGetStockInventories({ limit: 100 })?.data?.data?.rows;
    const create = useCreateStockDisposition();
    const uploadNstPhotos = useUploadNSTPhotos();
    const [pendingPhotos, setPendingPhotos] = useState<File[]>([]);

    const rules = useGetDispositionRules({})?.data?.data;

    // The disposition candidates API stays in place exactly as before. The rows the screen
    // already loaded are preferred so the selected product's rule/pricing resolve without
    // waiting on (or depending on) this lookup; the fetched list is the fallback.
    const fetchedCandidates = useGetDispositionCandidates({
        ...(companyDebtorId ? { companyDebtorId } : {}),
        maxDays: 30,
    })?.data?.data;

    const candidates = candidatesProp?.length ? candidatesProp : fetchedCandidates;

    const form = useForm<StockDispositionCreateSchema>({
        resolver: zodResolver(stockDispositionCreateSchema),
        defaultValues: {
            companyDebtorId: companyDebtorId || undefined,
            companyStockDetailId: preselectedCandidate?.companyStockDetailId || '',
            companyStockInventoryId: preselectedCandidate?.companyStockInventoryId || undefined,
            stockDispositionRuleId: preselectedCandidate ? candidateRuleId(preselectedCandidate) : undefined,
            // The batch and its expiry travel with the create for near-expiry / expired rows.
            batchNumber: preselectedCandidate ? candidateBatchNumber(preselectedCandidate) : undefined,
            expiryDate: preselectedCandidate?.expiryDate || undefined,
            // The disposition type comes from the candidate's own dispositionType (e.g. "EXPIRED"),
            // never from the rule object's code.
            dispositionType: preselectedCandidate?.dispositionType || presetDispositionType || 'NEAR_EXPIRY',
            sourceType: candidateMode ? 'AUTOMATIC' : 'MANUAL',
            allocatedQuantity: undefined,
            reason: candidateMode ? 'Automatic near-expiry candidate confirmed' : '',
            companyStockPricingId: preselectedCandidate?.companyStockPricingId || undefined,
            companyStockPricingTypeId: preselectedCandidate?.companyStockPricingTypeId || undefined,
            // Idempotency key: retrying the same create never double-reserves batch stock.
            clientDocumentId: generateUUIDForData(),
        },
    });

    const { handleSubmit, control, watch } = form;
    const isUploadingPhoto = uploadNstPhotos.isPending;

    useEffect(() => {
        if (open) {
            form.reset({
                companyDebtorId: companyDebtorId || undefined,
                companyStockDetailId: preselectedCandidate?.companyStockDetailId || '',
                companyStockInventoryId: preselectedCandidate?.companyStockInventoryId || undefined,
                stockDispositionRuleId: preselectedCandidate ? candidateRuleId(preselectedCandidate) : undefined,
                // The batch and its expiry travel with the create for near-expiry / expired rows.
                batchNumber: preselectedCandidate ? candidateBatchNumber(preselectedCandidate) : undefined,
                expiryDate: preselectedCandidate?.expiryDate || undefined,
                dispositionType: preselectedCandidate?.dispositionType || presetDispositionType || 'NEAR_EXPIRY',
                sourceType: candidateMode ? 'AUTOMATIC' : 'MANUAL',
                allocatedQuantity: undefined,
                reason: candidateMode ? 'Automatic near-expiry candidate confirmed' : '',
                companyStockPricingId: preselectedCandidate?.companyStockPricingId || undefined,
                companyStockPricingTypeId: preselectedCandidate?.companyStockPricingTypeId || undefined,
                clientDocumentId: generateUUIDForData(),
            });
        }
    }, [open]);

    // The selected inventory row is the candidate. Matching on the product alone would
    // surface another batch's expiry, which is what the spec calls out as wrong.
    const matchedCandidate = candidateMode
        ? candidates?.find((c) => c.companyStockInventoryId === watch('companyStockInventoryId'))
        : undefined;

    // Files wait in local state: the upload endpoint needs the disposition id, which only
    // exists after create, so they cannot be sent with the create payload.
    const finish = () => {
        setPendingPhotos([]);
        form.reset();
        onCompleted?.();
        onClose();
    };

    const attachPhotos = (dispositionId: string) => {
        if (!pendingPhotos.length) return;
        uploadNstPhotos.mutate(
            { id: dispositionId, photos: pendingPhotos },
            {
                onSuccess: (res) => {
                    if (res?.success) toast.success('Photos attached');
                    else toast.error(res?.message || 'Photo upload failed');
                },
                onError: (error) => {
                    // @ts-ignore
                    toast.error(error?.response?.data?.message || 'Photo upload failed');
                },
            },
        );
    };

    // Allocation reserves batch stock only; it does not sell anything. When the rule
    // requires approval the record stays DRAFT / PENDING and is listed under the
    // Pending Approval queue only — creation never auto-approves (spec).
    const afterCreate = (created: StockDisposition) => {
        const needsApproval =
            created.approvalRequired === true ||
            created.approvalStatus === 'DRAFT' ||
            created.approvalStatus === 'PENDING' ||
            created.status === 'PENDING_APPROVAL';
        attachPhotos(created.id);
        toast.success(
            needsApproval
                ? 'NST allocation created. It requires approval before it can be sold.'
                : 'NST allocation created successfully',
        );
        finish();
    };

    function onSubmit(values: StockDispositionCreateSchema) {
        // A blocked batch must never hit /stockDisposition/create; show why instead.
        if (matchedCandidate?.canAllocate === false) {
            toast.error(
                matchedCandidate.allocationBlockedReason || 'This batch can no longer be allocated. Please refresh.',
            );
            return;
        }

        if (candidateMode) {
            const pricingCandidate =
                matchedCandidate ??
                candidates?.find((c) => c.companyStockInventoryId === values.companyStockInventoryId);
            if (!pricingCandidate?.companyStockPricingId || !pricingCandidate?.companyStockPricingTypeId) {
                toast.error('This batch is missing pricing information. Refresh the recommendations and try again.');
                return;
            }
        }
        // photoUrls is not part of create; only the batch and reason travel with it.
        // The matched candidate carries the pricing the allocation must attach to.
        const candidate = candidateMode
            ? (matchedCandidate ??
              candidates?.find((c) => c.companyStockInventoryId === values.companyStockInventoryId))
            : undefined;
        const payload = cleanDataPayload({
            ...values,
            // The candidate's own dispositionType (e.g. "EXPIRED") is what gets sent.
            ...(candidate?.dispositionType ? { dispositionType: candidate.dispositionType } : {}),
            ...(candidate?.companyStockPricingId ? { companyStockPricingId: candidate.companyStockPricingId } : {}),
            ...(candidate?.companyStockPricingTypeId
                ? { companyStockPricingTypeId: candidate.companyStockPricingTypeId }
                : {}),
        });
        // Ensure allocated quantity does not exceed available stock for the selected batch.
        const available = candidate ? candidateAvailable(candidate) : (candidateAvailable(matchedCandidate as any) || 0);
        if (available > 0 && typeof payload.allocatedQuantity === 'number' && payload.allocatedQuantity > available) {
            toast.error(`Allocated quantity cannot exceed available stock (${available}).`);
            return;
        }
        create.mutate(payload as StockDispositionCreateSchema, {
            onSuccess: (data) => {
                if (data?.success && data.data) {
                    afterCreate(data.data);
                } else if (data?.success) {
                    toast.success('NST allocation created successfully');
                    finish();
                } else {
                    toast.error(data?.message || 'NST allocation creation failed');
                }
            },
            onError: (error) => {
                // @ts-ignore
                toast.error(error?.response?.data?.message || 'Internal Server Error!');
            },
        });
    }

    // Candidate mode exposes the near-expiry/expired recommendations; the manual flows
    // (including "Mark Damaged Stock") must pick a real inventory batch instead, because
    // damaged stock is never sourced from the candidate window.
    const productOptions =
        candidateMode && candidates?.length
            ? candidates.map((c) => {
                  const detail = candidateStockDetail(c);
                  const batch = candidateBatchNumber(c);
                  const days = c.remainingDays;
                  return {
                      value: c.companyStockInventoryId,
                      label: `${c.description || detail?.description || 'Product'} (${c.itemCode || detail?.itemCode || ''})${batch ? ` - Batch ${batch}` : ''}${c.expiryDate ? ` - Exp ${moment(c.expiryDate).format('DD MMM, YY')}` : ''}${days != null ? ` (${days}d)` : ''}`,
                  };
              })
            : (inventories || []).map((inv) => ({
                  value: inv.id,
                  label: `${inv.CompanyStockDetail?.description || 'Product'} (${inv.CompanyStockDetail?.itemCode || ''})${inv.batchNumber ? ` - Batch ${inv.batchNumber}` : ''}${inv.expiryDate ? ` - Exp ${moment(inv.expiryDate).format('DD MMM, YY')}` : ''}`,
              })) || [];

    const handleProductSelectField = (v?: string) => {
        fieldProductChange(v);
    };

    const fieldProductChange = (v?: string) => {
        const value = v || '';
        if (!value) return;
        form.setValue('companyStockInventoryId', value);
        const candidate = candidates?.find((c) => c.companyStockInventoryId === value);
        const inventory = (inventories || []).find((inv) => inv.id === value);
        if (candidate?.companyStockDetailId) {
            form.setValue('companyStockDetailId', candidate.companyStockDetailId);
        } else if (inventory?.companyStockDetailId) {
            form.setValue('companyStockDetailId', inventory.companyStockDetailId);
        }
        // The disposition type is the candidate's own dispositionType (e.g. "EXPIRED"),
        // not the rule object's code.
        if (candidate?.dispositionType) {
            form.setValue('dispositionType', candidate.dispositionType, { shouldValidate: true });
        }
        // The rule, batch and expiry come from the candidate, never from another batch.
        const ruleId = candidateRuleId(candidate);
        if (ruleId) {
            form.setValue('stockDispositionRuleId', ruleId);
        }
        const batch = candidateBatchNumber(candidate) || inventory?.batchNumber;
        if (batch) {
            form.setValue('batchNumber', batch);
            form.setValue('expiryDate', candidate?.expiryDate || inventory?.expiryDate || '');
        }
        // The allocation must stay tied to the candidate's pricing record so the POS can
        // quote the discounted price later without re-resolving the price list.
        if (candidate?.companyStockPricingId) {
            form.setValue('companyStockPricingId', candidate.companyStockPricingId);
        }
        if (candidate?.companyStockPricingTypeId) {
            form.setValue('companyStockPricingTypeId', candidate.companyStockPricingTypeId);
        }
    };

    const handlePhotoUpload = (e: ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(e.target.files || []);
        e.target.value = '';
        if (!files.length) return;
        const error = validateNSTPhotos([...pendingPhotos, ...files]);
        if (error) {
            toast.error(error);
            return;
        }
        setPendingPhotos((prev) => [...prev, ...files]);
    };

    const removePhoto = (index: number) => {
        setPendingPhotos((prev) => prev.filter((_, i) => i !== index));
    };

    return (
        <>
            <Dialog open={open} onOpenChange={onClose}>
                <DialogContent
                    className="max-h-[90vh] overflow-auto sm:max-w-[820px]"
                    onWheel={(e) => e.stopPropagation()}
                >
                    <DialogHeader>
                        <DialogTitle className="font-semibold">
                            {allocateMore ? 'Allocate More NST Stock' : 'Create NST Allocation'}
                        </DialogTitle>
                    </DialogHeader>

                    <Form {...form}>
                        <form
                            onSubmit={handleSubmit(onSubmit)}
                            className="space-y-3 rounded-md border border-blue-500 bg-gray-100 p-3 text-xs"
                        >
                            <div className="grid grid-cols-3 items-start gap-3">
                                <FormField
                                    control={control}
                                    name="companyDebtorId"
                                    render={({ field }) => (
                                        <FormItem className="gap-1">
                                            {/* Back-office only: an admin may target a store
                                            explicitly. POS lookups never send this, they let
                                            the backend resolve the cashier's own scope. */}
                                            <Label className="gap-1 text-xs">Store / Debtor</Label>
                                            <FormControl>
                                                <SelectPopover
                                                    title="debtor (store)"
                                                    selectedValue={field.value}
                                                    options={
                                                        debtors
                                                            ? debtors.map((d) => ({
                                                                  value: d?.id,
                                                                  label: `${d?.name} (${d?.accountNumber})`,
                                                              }))
                                                            : []
                                                    }
                                                    onSelect={field.onChange}
                                                    selectClass="h-7 text-xs"
                                                />
                                            </FormControl>
                                            <FormMessage className="text-[10px]" />
                                        </FormItem>
                                    )}
                                />

                                <FormField
                                    control={control}
                                    name="companyStockInventoryId"
                                    render={({ field }) => (
                                        <FormItem className="gap-1">
                                            <Label className="gap-1 text-xs">
                                                Product / Batch <MandatoryField parentFontSize />
                                            </Label>
                                            <FormControl>
                                                <SelectPopover
                                                    title="product"
                                                    selectedValue={field.value}
                                                    options={productOptions}
                                                    onSelect={handleProductSelectField}
                                                    selectClass="h-7 text-xs"
                                                />
                                            </FormControl>
                                            <FormMessage className="text-[10px]" />
                                        </FormItem>
                                    )}
                                />

                                <FormField
                                    control={control}
                                    name="dispositionType"
                                    render={({ field }) => (
                                        <FormItem className="gap-1">
                                            <Label className="gap-1 text-xs">
                                                Disposition Type <MandatoryField parentFontSize />
                                            </Label>
                                            <FormControl>
                                                <Select
                                                    onValueChange={field.onChange}
                                                    value={field.value}
                                                    disabled={candidateMode}
                                                >
                                                    <SelectTrigger className="!h-7 text-xs">
                                                        <SelectValue placeholder="Select type" />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        {NST_DISPOSITION_TYPES.map((t) => (
                                                            <SelectItem key={t} value={t}>
                                                                {t.replace(/_/g, ' ')}
                                                            </SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                            </FormControl>
                                            <FormMessage className="text-[10px]" />
                                        </FormItem>
                                    )}
                                />

                                <FormField
                                    control={control}
                                    name="sourceType"
                                    render={({ field }) => (
                                        <FormItem className="gap-1">
                                            <Label className="gap-1 text-xs">
                                                Source <MandatoryField parentFontSize />
                                            </Label>
                                            <FormControl>
                                                <Select
                                                    onValueChange={field.onChange}
                                                    value={field.value}
                                                    disabled={candidateMode}
                                                >
                                                    <SelectTrigger className="!h-7 text-xs">
                                                        <SelectValue placeholder="Select source" />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        {NST_SOURCE_TYPES.map((t) => (
                                                            <SelectItem key={t} value={t}>
                                                                {t}
                                                            </SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                            </FormControl>
                                            <FormMessage className="text-[10px]" />
                                        </FormItem>
                                    )}
                                />

                                <FormField
                                    control={control}
                                    name="allocatedQuantity"
                                    render={({ field }) => (
                                        <FormItem className="gap-1">
                                            <Label className="gap-1 text-xs">
                                                Allocated Quantity <MandatoryField parentFontSize />
                                            </Label>
                                            <FormControl>
                                                <Input
                                                    type="number"
                                                    {...field}
                                                    value={field.value ?? ''}
                                                    min={1}
                                                    max={matchedCandidate ? candidateAvailable(matchedCandidate) : undefined}
                                                    onChange={(e) => field.onChange(e.target.valueAsNumber || '')}
                                                    className="h-7 text-xs"
                                                />
                                            </FormControl>
                                            <FormMessage className="text-[10px]" />
                                        </FormItem>
                                    )}
                                />

                                {/* The idempotency key is generated internally and reused on
                                retry, so it is never shown to the operator. */}
                            </div>

                            {/* Nothing renders until a batch is picked, so a stale expiry or
                            "N/A" grid can never be mistaken for the selected batch. */}
                            {matchedCandidate ? (
                                <div className="rounded-md border bg-white p-2 text-xs">
                                    <div className="mb-2 font-semibold text-blue-600">
                                        {candidateMode ? 'Matched near-expiry candidate' : 'Candidate info'}
                                    </div>
                                    <div className="grid grid-cols-4 gap-2">
                                        <div>
                                            Available:{' '}
                                            <span className="font-semibold">
                                                {candidateAvailable(matchedCandidate)}
                                            </span>
                                        </div>
                                        <div>
                                            Batch:{' '}
                                            <span className="font-semibold">
                                                {candidateBatchNumber(matchedCandidate) || 'N/A'}
                                            </span>
                                        </div>
                                        <div>
                                            Expiry:{' '}
                                            <span className="font-semibold">
                                                {matchedCandidate.expiryDate
                                                    ? moment(matchedCandidate.expiryDate).format('DD MMM, YY')
                                                    : 'N/A'}
                                                {matchedCandidate.remainingDays != null
                                                    ? ` (${matchedCandidate.remainingDays}d)`
                                                    : ''}
                                            </span>
                                        </div>
                                        <div>
                                            Discount:{' '}
                                            <span className="font-semibold">
                                                {candidateDiscountPct(matchedCandidate)}%
                                            </span>
                                        </div>
                                        <div>
                                            Suggested Price:{' '}
                                            <span className="font-semibold">
                                                {candidateDiscountedPrice(matchedCandidate) ?? 'N/A'}
                                            </span>
                                        </div>
                                        <div>
                                            Margin:{' '}
                                            <span className="font-semibold">
                                                {matchedCandidate.marginPercentage ?? 0}%
                                            </span>
                                        </div>
                                        <div className="col-span-2">
                                            Rule:{' '}
                                            <span className="font-semibold">
                                                {candidateRuleName(matchedCandidate) || 'N/A'}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            ) : null}

                            {matchedCandidate?.canAllocate === false ? (
                                <div className="rounded-md border border-red-200 bg-red-50 p-2 text-[11px] text-red-700">
                                    {matchedCandidate.allocationBlockedReason ||
                                        'This batch can no longer be allocated. Please refresh the recommendations.'}
                                </div>
                            ) : null}

                            {/* Stock remains in its current physical location. Selling it later will
                            draw from that location's stock; no stock is moved at NST creation. */}
                            <div className="rounded-md border border-blue-100 bg-blue-50 p-2 text-[11px] text-blue-700">
                                Note: Stock stays at this location. No physical movement happens on NST creation.
                            </div>

                            <FormField
                                control={control}
                                name="stockDispositionRuleId"
                                render={({ field }) => (
                                    <FormItem className="gap-1">
                                        <Label className="gap-1 text-xs">Disposition Rule</Label>
                                        <FormControl>
                                            <SelectPopover
                                                title="rule"
                                                selectedValue={field.value}
                                                options={
                                                    rules
                                                        ? rules
                                                              .filter((r) => r.status === 'ACTIVE')
                                                              .map((r) => ({
                                                                  value: r.id,
                                                                  label: `${r.name} (${r.code})`,
                                                              }))
                                                        : []
                                                }
                                                onSelect={field.onChange}
                                                selectClass="h-7 text-xs"
                                                disabled={candidateMode}
                                            />
                                        </FormControl>
                                        <FormMessage className="text-[10px]" />
                                    </FormItem>
                                )}
                            />

                            <div>
                                <Label className="text-xs">Photos</Label>
                                <div className="mt-1 space-y-2">
                                    <div className="flex items-center gap-2">
                                        <Input
                                            type="file"
                                            multiple
                                            accept={NST_PHOTO_ACCEPT_ATTR}
                                            onChange={handlePhotoUpload}
                                            className="h-7 text-xs"
                                        />
                                        {isUploadingPhoto ? (
                                            <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
                                        ) : (
                                            <Upload className="h-4 w-4 text-gray-400" />
                                        )}
                                    </div>
                                    {pendingPhotos.length ? (
                                        <div className="flex flex-wrap gap-2">
                                            {pendingPhotos.map((file, i) => (
                                                <div key={`${file.name}-${i}`} className="relative">
                                                    <img
                                                        src={URL.createObjectURL(file)}
                                                        alt={`Disposition photo ${i + 1}`}
                                                        className="h-12 w-12 rounded-md border object-cover"
                                                    />
                                                    <Button
                                                        type="button"
                                                        variant="ghost"
                                                        size="sm"
                                                        className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-red-600 p-0 text-white hover:bg-red-700"
                                                        onClick={() => removePhoto(i)}
                                                    >
                                                        <X className="h-3 w-3" />
                                                    </Button>
                                                </div>
                                            ))}
                                        </div>
                                    ) : null}
                                </div>
                            </div>

                            <FormField
                                control={control}
                                name="reason"
                                render={({ field }) => (
                                    <FormItem className="gap-1">
                                        <Label htmlFor="reason" className="text-xs">
                                            Reason
                                        </Label>
                                        <FormControl>
                                            <Textarea
                                                {...field}
                                                className="border-input h-12 rounded-md border bg-white text-xs"
                                            />
                                        </FormControl>
                                        <FormMessage className="!-mt-2 !text-xs" />
                                    </FormItem>
                                )}
                            />

                            <div className="flex justify-end gap-2 pt-2">
                                <Button type="button" variant="outline" className="px-2 py-1 text-xs" onClick={onClose}>
                                    Cancel
                                </Button>
                                <Button
                                    type="submit"
                                    className="bg-blue-600 px-3 py-1 text-xs hover:bg-blue-700"
                                    disabled={create.isPending || matchedCandidate?.canAllocate === false}
                                >
                                    {create.isPending ? 'Creating...' : 'Create Allocation'}
                                </Button>
                            </div>
                        </form>
                    </Form>
                </DialogContent>
            </Dialog>
        </>
    );
};

export default NSTForm;