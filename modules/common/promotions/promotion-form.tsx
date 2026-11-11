import moment from 'moment-timezone';
import { useForm } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Form, FormItem, FormField, FormControl, FormLabel } from '@/components/ui/form';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';

// APIs & Types
import {
    type PromotionDetails,
    type PromotionCreateSchema,
    type PromotionUpdateSchema,
    type OfferType,
    type RewardSelectionRule,
    promotionCreateSchema,
    promotionUpdateSchema,
    useCreatePromotion,
    useUpdatePromotion,
} from '@/api-queries/promotions';
import { zodResolverCoerced as zodResolver } from '@/utils/zod-coerced';
import { toast } from 'sonner';
import MandatoryField from '@/components/dynamic-form/mandatory-fields';
import { ShoppingCart, Tag, XIcon } from 'lucide-react';
import { cleanDataPayload } from '@/utils/helpers';
import { PromotionTypesDetails, useGetPromotionTypes } from '@/api-queries/promotions/types';
import { PageLoader } from '@/components/custom-components/PageLoader';
import { useEffect, useState } from 'react';
import SPItemsSelection from './types/items/sp-items-selection';
import CommonItemsSelection from './types/items/common-items-selection';
import RewardItemsSelection from './types/items/reward-items-selection';

// Form Fields
import CommonGroupsSelection from './types/items/common-groups-selection';
import PromotionDynamicFields from './promotion-dynamic-fields';
import { useAuthUser } from '@/stores/auth-user.store';

interface PromotionFormProps {
    onClose: () => void;
    editData: PromotionDetails | null;
}

// Promotion types that use the offer-type payload scheme. For these the create/update
// body is built explicitly so it matches the backend contract:
//   - status must be ACTIVE (otherwise it saves as PENDING and is never applied);
//   - the engine reads the item quantity, so each qualifying item carries a quantity:
//     BMF / BIAGDPT / BIAGDVT use the row's required quantity, the rest mirror the
//     header quantityToBuy;
//   - progressiveLevel is NONE and no progressiveScale is sent.
const EXACT_PAYLOAD_TYPE_CODES = ['SP', 'B1G1', 'BIAGDPT', 'BIAGDVT', 'BMF', 'BXGCF', 'BIAGDPB'];

const toNumber = (value: unknown) => (typeof value === 'number' && !Number.isNaN(value) ? value : Number(value) || 0);

const buildExactPromotionPayload = (
    values: PromotionCreateSchema | PromotionUpdateSchema,
    promotionCode: string | undefined,
) => {
    const quantityToBuy = toNumber(values.quantityToBuy);
    const freeQuantity = toNumber(values.freeQuantity);
    const isActive = values.isActive ?? values.status === 'ACTIVE';

    // The engine reads the item quantity, so mirror quantityToBuy onto every qualifying
    // item (fall back to 1 when the type has no quantityToBuy, e.g. SP).
    const itemQuantity = quantityToBuy > 0 ? quantityToBuy : 1;

    const qualifyingItems = (values.qualifyingItems || []).map((item) => {
        // BMF / BIAGDPT / BIAGDVT carry each row's own required quantity (the grid
        // "Quantity" column); the other offer types mirror the header quantityToBuy.
        const usesRowQuantity = promotionCode === 'BMF' || promotionCode === 'BIAGDPT' || promotionCode === 'BIAGDVT';
        const rowQuantity = Number(item.quantityGiven) > 0 ? Number(item.quantityGiven) : itemQuantity;
        return {
            companyStockDetailId: item.companyStockDetailId,
            quantity: usesRowQuantity ? rowQuantity : itemQuantity,
            ...(toNumber(item.promotionalPrice) > 0 ? { promotionalPrice: toNumber(item.promotionalPrice) } : {}),
        };
    });

    const payload: Record<string, unknown> = {
        promotionDescription: values.promotionDescription,
        promotionBatchCode: values.promotionBatchCode,
        promotionTypeId: values.promotionTypeId,
        startDate: values.startDate,
        endDate: values.endDate,
        timezone: (values as PromotionCreateSchema).timezone,
        status: values.status,
        isActive,
        cashOnly: values.cashOnly,
        loyaltyOnly: values.loyaltyOnly,
        qualifyingItemsRule: values.qualifyingItemsRule,
        progressiveLevel: 'NONE',
        qualifyingItems,
    };

    // Type-specific header fields. SP (Simple Price) sends none: the new unit price is
    // carried on each item's promotionalPrice. Reward items (if any) are appended below.
    if (promotionCode === 'B1G1') {
        payload.quantityToBuy = quantityToBuy;
        payload.offerType = 'BUY_X_GET_Y_FREE' satisfies OfferType;
        payload.rewardSelectionRule = 'CHEAPEST' satisfies RewardSelectionRule;
        payload.freeQuantity = freeQuantity;
    } else if (promotionCode === 'BIAGDPT') {
        // BIAGDPT: Buy Item A Get Discount % On Total.
        payload.quantityToBuy = quantityToBuy;
        payload.discountPercent = toNumber(values.discountPercent);
        payload.maximumDiscount = toNumber(values.maximumDiscount);
    } else if (promotionCode === 'BIAGDVT') {
        // BIAGDVT: Buy Item A Get Discount Value On Total.
        payload.quantityToBuy = quantityToBuy;
        payload.discountValue = toNumber(values.discountValue);
    } else if (promotionCode === 'BMF') {
        // BMF: Buy Minimum For. In "All Items" mode (and a single alternative item) the
        // whole set is bought together, so the header Quantity to buy / Total to pay are
        // the sums of the grid (quantity, quantity x promotionalPrice) and each item
        // carries its own row quantity. In "Any Item" mode with several rows every row is
        // an independent offer, so no common header totals are sent.
        const items = values.qualifyingItems || [];
        if (values.qualifyingItemsRule === 'ANY' && items.length > 1) {
            delete payload.quantityToBuy;
            delete payload.totalToPay;
        } else {
            const totalQuantity = items.reduce((acc, item) => acc + (Number(item?.quantityGiven) || 0), 0);
            const computedTotal = items.reduce(
                (acc, item) => acc + (Number(item?.quantityGiven) || 0) * (Number(item?.promotionalPrice) || 0),
                0,
            );
            payload.quantityToBuy = totalQuantity;
            payload.totalToPay = Number(computedTotal.toFixed(2));
        }
    } else if (promotionCode === 'BXGCF') {
        // BXGCF: Buy X Get Cheapest Free (Buy 2 Get 1, Buy 3 Get 1)
        payload.quantityToBuy = toNumber(values.quantityToBuy);
        payload.freeQuantity = 1;
        payload.rewardSelectionRule = 'CHEAPEST' satisfies RewardSelectionRule;
        payload.offerType = 'BUY_X_GET_CHEAPEST_FREE' satisfies OfferType;
    } else if (promotionCode === 'BIAGDPB') {
        // BIAGDPB: Buy Any Get Discount Percent on the cheapest second item.
        // quantityToBuy counts full-price items only (1 = one full-price item plus one
        // discounted item, i.e. "buy 2, get 50% off the cheaper").
        payload.quantityToBuy = toNumber(values.quantityToBuy);
        payload.discountPercent = toNumber(values.discountPercent);
        payload.qualifyingItemsRule = 'ANY';
        payload.rewardSelectionRule = 'CHEAPEST' satisfies RewardSelectionRule;
        payload.offerType = 'BUY_X_GET_Y_PERCENT' satisfies OfferType;
    }

    // Reward items are handed over free. B1G1 sizes them from the header free quantity;
    // any other offer type keeps the row's own quantity. Sent whenever present so an
    // update always carries the complete rewardItems array.
    //
    // BIAGDPB is different: the second item is not free, it is sold at a percentage
    // discount (e.g. buy 2, get 50% off the cheaper item). Its "Discounted Items" rows
    // therefore carry normal quantities and must NOT be sent with isFree: true.
    const discountedItemsPromotion = promotionCode === 'BIAGDPB';
    const rewardItems = (values.rewardItems || []).map((item) => {
        const rowQuantity = Number(item.quantity) || 1;
        return {
            companyStockDetailId: item.companyStockDetailId,
            quantity:
                promotionCode === 'B1G1'
                    ? freeQuantity > 0
                        ? freeQuantity
                        : 1
                    : discountedItemsPromotion
                      ? Math.max(1, Math.trunc(rowQuantity))
                      : rowQuantity,
            ...(discountedItemsPromotion ? {} : { isFree: true }),
            ...(item.companyTaxRateId ? { companyTaxRateId: item.companyTaxRateId } : {}),
        };
    });
    if (rewardItems.length > 0) payload.rewardItems = rewardItems;

    return payload;
};

const PromotionForm = ({ editData, onClose }: PromotionFormProps) => {
    const createItemData = useCreatePromotion();
    const updateItemData = useUpdatePromotion();
    const isSaving = createItemData.isPending || updateItemData.isPending;

    const isCompanyDebtor = useAuthUser((state) => state.user?.userType) === 'COMPANY-DEBTOR-USER';

    const { data, isLoading } = useGetPromotionTypes({});
    const promotionTypes = data?.data?.rows || [];

    const isEditing = !!editData;

    const form = useForm<PromotionCreateSchema | PromotionUpdateSchema>({
        resolver: zodResolver(isEditing ? promotionUpdateSchema : promotionCreateSchema),
        defaultValues: {
            status: editData?.status || 'ACTIVE',
            isActive: editData?.isActive ?? (editData ? editData.status === 'ACTIVE' : true),
            promotionDescription: editData?.promotionDescription || '',
            promotionBatchCode: editData?.promotionBatchCode || '',
            startDate: editData?.startDate || '',
            endDate: editData?.endDate || '',
            startTime: editData?.startTime || '',
            endTime: editData?.endTime || '',
            openEnded: editData?.openEnded || false,
            cashOnly: editData?.cashOnly || false,
            loyaltyOnly: editData?.loyaltyOnly || false,
            qualifyingItemsRule: editData?.qualifyingItemsRule || 'ANY',
            promotionTypeId: editData?.promotionTypeId || promotionTypes?.[0]?.id || '',
            ...(editData ? { companyStockPromotionId: editData.id } : { timezone: moment.tz.guess() }),

            // Optional Fields
            quantityToBuy: editData?.quantityToBuy || 0,
            freeQuantity: editData?.freeQuantity || 0,
            progressiveLevel: editData?.progressiveLevel || 'NONE',
            reoccurence: editData?.reoccurence || 'STAGGERED',
            progressiveScale: editData?.progressiveScale || [],
            discountPercent: editData?.discountPercent || 0,
            discountValue: editData?.discountValue || 0,
            maximumDiscount: editData?.maximumDiscount || 0,
            totalToPay: editData?.totalToPay || 0,
            priceToPayPerItem: editData?.priceToPayPerItem || 0,
            minimumSpend: editData?.minimumSpend || 0,

            // Offer-type fields echoed by the list/detail API
            offerType: editData?.offerType as PromotionCreateSchema['offerType'],
            rewardSelectionRule: editData?.rewardSelectionRule as PromotionCreateSchema['rewardSelectionRule'],
            allowStacking: editData?.allowStacking,

            // Reward items (Buy-X-Get-Y free items). The detail/list API returns every
            // product under CompanyStockPromotionItems flagged by itemType, so split the
            // REWARD lines out and prefill the legacy rewardItems field.
            rewardItems: (() => {
                const promotionItems = editData?.CompanyStockPromotionItems || [];
                const detailRewardItems = (editData as any)?.rewardItems?.length
                    ? (editData as any)?.rewardItems
                    : promotionItems.filter((data) => data?.itemType === 'REWARD');
                return (detailRewardItems || []).map((data: any) => ({
                    companyStockDetailId: data?.companyStockDetailId || data?.CompanyStockDetail?.id,
                    code: data?.CompanyStockDetail?.itemCode || data?.code,
                    description: data?.CompanyStockDetail?.description || data?.description,
                    onHand: data?.CompanyStockDetail?.stockOnHand,
                    price: data?.CompanyStockDetail?.priceInclusive,
                    priceExclusive: data?.CompanyStockDetail?.priceExclusive,
                    quantity: data?.quantity ?? data?.quantityGiven ?? 1,
                    isFree: data?.isFree ?? data?.itemType === 'REWARD',
                    ...(data?.CompanyStockDetail?.companyTaxRateId || data?.companyTaxRateId
                        ? {
                              companyTaxRateId: data?.CompanyStockDetail?.companyTaxRateId || data?.companyTaxRateId,
                          }
                        : {}),
                }));
            })(),

            // Items
            qualifyingItems: editData?.CompanyStockPromotionItems
                ? editData?.CompanyStockPromotionItems?.filter((data) => data?.itemType !== 'REWARD')?.map((data) => ({
                      companyStockDetailId: data?.CompanyStockDetail?.id,
                      code: data?.CompanyStockDetail?.itemCode,
                      description: data?.CompanyStockDetail?.description,
                      onHand: data?.CompanyStockDetail?.stockOnHand,
                      price:
                          data?.CompanyStockDetail?.priceInclusive ??
                          data?.CompanyStockDetail?.pricingTypes?.find((pricing) => (pricing.priceInclusive ?? 0) > 0)
                              ?.priceInclusive,
                      priceExclusive:
                          data?.CompanyStockDetail?.priceExclusive ??
                          data?.CompanyStockDetail?.pricingTypes?.find((pricing) => (pricing.priceInclusive ?? 0) > 0)
                              ?.priceExclusive,
                      ...(data?.promotionalPrice ? { promotionalPrice: data?.promotionalPrice } : {}),
                      ...(data?.quantityGiven ? { quantityGiven: data?.quantityGiven } : {}),
                  }))
                : [],

            // Groups
            qualifyingGroups: editData?.CompanyStockPromotionGroup
                ? editData?.CompanyStockPromotionGroup?.map((data) => ({
                      companyStockPromotionId: data?.group?.id,
                      colorCode: data?.group?.colorCode,
                      groupName: data?.group?.groupName,
                      ...(data?.quantityGiven ? { quantityGiven: data?.quantityGiven } : {}),
                  }))
                : [],
        },
    });

    const { handleSubmit, control, watch, setValue } = form;

    const promotionTypeId = watch('promotionTypeId');
    const [selectedPromotion, setSelectedPromotion] = useState<PromotionTypesDetails | null>(
        editData?.CompanyStockPromotionType || promotionTypes?.[0] || null,
    );

    // When editing, decide from the promotion's own products which item grids must be
    // shown, so a REWARD line always lands in "Reward Items (Free)" and a QUALIFYING
    // line in "Promotion Items" even if the type's requirement flags omit them.
    const promotionItems = editData?.CompanyStockPromotionItems || [];
    const hasQualifyingItems = promotionItems.some((item) => item?.itemType !== 'REWARD');
    const hasRewardItems = promotionItems.some((item) => item?.itemType === 'REWARD');

    // BMF header "Quantity to buy" / "Total to pay" are derived from the qualifying item
    // grid (sum of quantities, sum of quantity x promotionalPrice) and computed
    // automatically. This is shown as a read-only summary in "All Items" mode and when
    // there is a single "Any Item". With several "Any Item" rows every row is its own
    // offer, so there is no common header and the Create action is blocked until the
    // bundle engine supports it.
    const selectedPromotionCode = selectedPromotion?.code;
    // BIAGDPB's second grid holds items sold at a percentage discount, not free gifts.
    const isDiscountedItems = selectedPromotionCode === 'BIAGDPB';
    const qualifyingItemsRule = watch('qualifyingItemsRule');
    const watchedQualifyingItems = watch('qualifyingItems');
    const qualifyingItemsCount = (watchedQualifyingItems || []).length;
    const bmfShowHeader =
        selectedPromotionCode === 'BMF' && (qualifyingItemsRule === 'ALL' || qualifyingItemsCount <= 1);
    const bmfMultiAny = selectedPromotionCode === 'BMF' && qualifyingItemsRule === 'ANY' && qualifyingItemsCount > 1;

    useEffect(() => {
        if (selectedPromotionCode !== 'BMF' || !bmfShowHeader) return;
        const items = watchedQualifyingItems || [];
        const totalQuantity = items.reduce((acc, item) => acc + (Number(item?.quantityGiven) || 0), 0);
        const computedTotal = items.reduce(
            (acc, item) => acc + (Number(item?.quantityGiven) || 0) * (Number(item?.promotionalPrice) || 0),
            0,
        );
        setValue('quantityToBuy', totalQuantity, { shouldValidate: false });
        setValue('totalToPay', Number(computedTotal.toFixed(2)), { shouldValidate: false });
    }, [selectedPromotionCode, bmfShowHeader, watchedQualifyingItems, setValue]);

    // Open Ended promotions have no end date; keep the field cleared and disabled.
    const openEnded = watch('openEnded');
    useEffect(() => {
        if (openEnded) setValue('endDate', '');
    }, [openEnded, setValue]);

    useEffect(() => {
        if (promotionTypes) {
            let promotionType;
            if (editData) {
                // Prefer the type fetched from the promotion-types API: it carries the
                // requires* flags that drive the dynamic fields (Quantity to buy / Free
                // quantity etc.). The type embedded in the list/detail response only has
                // typeName/code, so it is used as a fallback.
                promotionType =
                    promotionTypes.find((type) => type.id === editData.promotionTypeId) ||
                    editData?.CompanyStockPromotionType;
                setValue('promotionTypeId', promotionType?.id);
                setSelectedPromotion(promotionType || null);
            } else {
                promotionType = promotionTypes?.[0];
                setValue('promotionTypeId', promotionType?.id);
                setSelectedPromotion(promotionType || null);
            }
        }
    }, [promotionTypes, editData]);

    function onSubmit(values: PromotionCreateSchema | PromotionUpdateSchema) {
        // BMF with several alternative items has no single common offer yet; the bundle
        // engine must support it first, so block saving instead of sending dummy totals.
        if (bmfMultiAny) {
            toast.error('Multiple alternative BMF items are not supported yet');
            return;
        }

        // BIAGDPB is "Buy X, get Y% off the cheaper item". The engine expects whole
        // full-price quantities and a whole percentage (1-100); reject anything else on
        // the client so the form never sends values the backend will reject.
        if (selectedPromotion?.code === 'BIAGDPB') {
            const quantityToBuy = Number(values.quantityToBuy);
            if (!Number.isInteger(quantityToBuy) || quantityToBuy < 1) {
                form.setError('quantityToBuy', {
                    type: 'manual',
                    message: 'Enter a whole number greater than 0',
                });
                toast.error('Quantity to buy must be a whole number greater than 0');
                return;
            }

            const discountPercent = Number(values.discountPercent);
            if (!Number.isInteger(discountPercent) || discountPercent < 1 || discountPercent > 100) {
                form.setError('discountPercent', {
                    type: 'manual',
                    message: 'Enter a whole number from 1 to 100',
                });
                toast.error('Discount percentage must be a whole number from 1 to 100');
                return;
            }

            const invalidDiscountedItem = (values.rewardItems || []).some((item) => {
                const quantity = Number(item.quantity);
                return !Number.isInteger(quantity) || quantity < 1;
            });
            if (invalidDiscountedItem) {
                toast.error('Discounted item quantities must be whole numbers greater than 0');
                return;
            }

            form.clearErrors(['quantityToBuy', 'discountPercent']);
        }

        // Offer-type promotions (SP / B1G1 / BIAGDPT / BIAGDVT / BMF) need the exact
        // contract payload; all other types keep the legacy shape.
        const payload = EXACT_PAYLOAD_TYPE_CODES.includes(selectedPromotion?.code || '')
            ? buildExactPromotionPayload(values, selectedPromotion?.code)
            : cleanDataPayload(values);

        if (payload.startDate && payload.endDate && moment(payload.startDate).isAfter(payload.endDate)) {
            toast.error('Promotion Start date cannot be greater than end date.');
            return;
        }

        if (editData) {
            if (!editData.id) return toast.error('Promotion ID is required');
            return updateItemData.mutate(
                { ...payload, companyStockPromotionId: editData.id } as PromotionUpdateSchema,
                {
                    onSuccess: (data) => {
                        if (data.success) {
                            toast.success('Promotion updated successfully');
                            form.reset();
                            onClose();
                        } else {
                            toast.error('Promotion updation failed');
                        }
                    },
                    onError: (error) => {
                        // @ts-ignore
                        toast.error(error?.response?.data?.message || 'Internal Server Error!');
                    },
                },
            );
        }
        createItemData.mutate(payload as PromotionCreateSchema, {
            onSuccess: (data) => {
                if (data.success) {
                    toast.success('Promotion created successfully');
                    form.reset();
                    onClose();
                } else {
                    toast.error('Promotion creation failed');
                }
            },
            onError: (error) => {
                // @ts-ignore
                toast.error(error?.response.data.message || 'Internal Server Error!');
            },
        });
    }

    // Resetting form values

    useEffect(() => {
        if (promotionTypeId && !isEditing) {
            form.reset({
                ...form.getValues(),
                quantityToBuy: 0,
                freeQuantity: 0,
                progressiveLevel: 'NONE',
                reoccurence: 'STAGGERED',
                discountPercent: 0,
                discountValue: 0,
                maximumDiscount: 0,
                progressiveScale: [],
                totalToPay: 0,
                priceToPayPerItem: 0,
                minimumSpend: 0,
                qualifyingItems: [],
                qualifyingGroups: [],
                rewardItems: [],
            });
        }
    }, [promotionTypeId, isEditing]);

    return (
        <PageLoader isLoading={isLoading}>
            <div className="relative">
                {isCompanyDebtor && <div className="absolute inset-0 z-10 cursor-not-allowed" />}

                <Form {...form}>
                    <form onSubmit={handleSubmit(onSubmit)}>
                        <div className="my-2 w-full">
                            {promotionTypes && (
                                <div className="flex h-[69.5vh] bg-gray-50">
                                    <div className="w-72 border-r border-gray-200 bg-white">
                                        <div className="border-b border-gray-200 p-1">
                                            <h2 className="text-sm font-semibold text-gray-900">Promotion Types</h2>
                                        </div>

                                        <div className={`h-[93%] overflow-y-auto p-1 ${isEditing ? 'bg-gray-50' : ''}`}>
                                            {promotionTypes?.map((type) => (
                                                <button
                                                    key={type.id}
                                                    type="button"
                                                    disabled={isEditing}
                                                    onClick={() => {
                                                        setValue('promotionTypeId', type.id);
                                                        setSelectedPromotion(type);
                                                    }}
                                                    className={`w-full rounded-md p-1 text-left transition-colors ${
                                                        promotionTypeId === type.id
                                                            ? 'border border-blue-200 bg-blue-50 font-medium text-blue-700'
                                                            : isEditing
                                                              ? '!text-gray-400'
                                                              : 'text-gray-700 hover:bg-gray-50'
                                                    } ${isEditing ? '!cursor-not-allowed' : ''}`}
                                                >
                                                    <div className="text-xs">
                                                        {type.typeName} ({type.code})
                                                    </div>
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    <div className="flex flex-1 flex-col gap-2 overflow-y-auto">
                                        <div className="shrink-0 overflow-hidden border-r-0">
                                            <div className="flex items-center gap-2 border-b border-gray-200 bg-white p-1">
                                                <Tag className="h-4 w-4 text-green-600" />
                                                <h2 className="text-sm font-semibold text-gray-900">
                                                    Promotion Details
                                                </h2>
                                            </div>

                                            <div className="space-y-1.5 p-4">
                                                <div className="grid grid-cols-3 gap-3 border-gray-300">
                                                    <div className="space-y-2">
                                                        <div className="flex items-center gap-2">
                                                            <Label className="min-w-[80px] text-xs font-medium">
                                                                Active:
                                                            </Label>
                                                            <FormField
                                                                control={control}
                                                                name="isActive"
                                                                render={({ field }) => (
                                                                    <Checkbox
                                                                        checked={!!field.value}
                                                                        onCheckedChange={(val) => {
                                                                            const active = !!val;
                                                                            field.onChange(active);
                                                                            setValue('status', active ? 'ACTIVE' : 'INACTIVE', {
                                                                                shouldDirty: true,
                                                                                shouldValidate: false,
                                                                            });
                                                                        }}
                                                                    />
                                                                )}
                                                            />
                                                            <span className="text-[11px]">Tick for Yes</span>
                                                        </div>

                                                        <div className="flex items-center gap-2">
                                                            <Label className="min-w-[80px] text-xs font-medium">
                                                                Batch
                                                                <MandatoryField parentFontSize />
                                                            </Label>
                                                            <FormField
                                                                control={control}
                                                                name="promotionBatchCode"
                                                                render={({ field }) => (
                                                                    <FormItem className="w-full">
                                                                        <FormControl>
                                                                            <Input
                                                                                className="h-6 text-[11px]"
                                                                                placeholder="Enter batch code"
                                                                                {...field}
                                                                            />
                                                                        </FormControl>
                                                                    </FormItem>
                                                                )}
                                                            />
                                                        </div>

                                                        <div className="flex items-center gap-2">
                                                            <Label className="min-w-[80px] text-xs font-medium">
                                                                Cash Only:
                                                            </Label>
                                                            <FormField
                                                                control={control}
                                                                name="cashOnly"
                                                                render={({ field }) => (
                                                                    <Checkbox
                                                                        checked={field.value}
                                                                        onCheckedChange={field.onChange}
                                                                    />
                                                                )}
                                                            />
                                                            <span className="text-[11px]">Tick for Yes</span>
                                                        </div>

                                                        <div className="flex items-center gap-2">
                                                            <Label className="min-w-[80px] text-xs font-medium">
                                                                Loyalty Only:
                                                            </Label>
                                                            <FormField
                                                                control={control}
                                                                name="loyaltyOnly"
                                                                render={({ field }) => (
                                                                    <Checkbox
                                                                        checked={field.value}
                                                                        onCheckedChange={field.onChange}
                                                                    />
                                                                )}
                                                            />
                                                            <span className="text-[11px]">Tick for Yes</span>
                                                        </div>

                                                        <div className="flex items-center gap-2">
                                                            <Label className="min-w-[80px] text-xs font-medium">
                                                                Description <MandatoryField parentFontSize />
                                                            </Label>
                                                            <FormField
                                                                control={control}
                                                                name="promotionDescription"
                                                                render={({ field }) => (
                                                                    <FormItem className="w-full">
                                                                        <FormControl>
                                                                            <Input
                                                                                className="h-6 text-[11px]"
                                                                                placeholder="Enter description..."
                                                                                {...field}
                                                                            />
                                                                        </FormControl>
                                                                    </FormItem>
                                                                )}
                                                            />
                                                        </div>
                                                    </div>

                                                    <div className="rounded-md border border-gray-200">
                                                        <div className="rounded-md bg-white px-2 py-1 text-[11px] font-semibold">
                                                            Day Span Of Promotion
                                                        </div>

                                                        <div className="space-y-2 p-2 text-[11px]">
                                                            <div className="flex items-center gap-4">
                                                                <Label className="w-16 text-[11px] font-medium">
                                                                    Start Date:
                                                                </Label>

                                                                <div className="relative flex items-center">
                                                                    <FormField
                                                                        control={control}
                                                                        name="startDate"
                                                                        render={({ field }) => (
                                                                            <Input
                                                                                type="date"
                                                                                className="h-6 w-max text-[11px]"
                                                                                {...field}
                                                                            />
                                                                        )}
                                                                    />

                                                                    {watch('startDate') ? (
                                                                        <Button
                                                                            type="button"
                                                                            variant="ghost"
                                                                            size="icon"
                                                                            className="absolute top-0 -right-6 h-6 w-6 p-0 text-[10px] text-red-500 hover:text-black"
                                                                            onClick={() => setValue('startDate', '')}
                                                                        >
                                                                            <XIcon />
                                                                        </Button>
                                                                    ) : null}
                                                                </div>
                                                            </div>

                                                            <div className="flex items-center gap-4">
                                                                <Label className="w-16 text-[11px] font-medium">
                                                                    End Date:
                                                                </Label>
                                                                <div className="relative flex items-center">
                                                                    <FormField
                                                                        control={control}
                                                                        name="endDate"
                                                                        render={({ field }) => (
                                                                            <Input
                                                                                type="date"
                                                                                className="h-6 w-max text-[11px]"
                                                                                disabled={openEnded}
                                                                                {...field}
                                                                            />
                                                                        )}
                                                                    />

                                                                    {watch('endDate') && !openEnded ? (
                                                                        <Button
                                                                            type="button"
                                                                            variant="ghost"
                                                                            size="icon"
                                                                            className="absolute top-0 -right-6 h-6 w-6 p-0 text-[10px] text-red-500 hover:text-black"
                                                                            onClick={() => setValue('endDate', '')}
                                                                        >
                                                                            <XIcon />
                                                                        </Button>
                                                                    ) : null}
                                                                </div>
                                                            </div>

                                                            <div className="flex items-center gap-4">
                                                                <Label className="text-[11px] font-medium">
                                                                    Open Ended:
                                                                </Label>
                                                                <FormField
                                                                    control={control}
                                                                    name="openEnded"
                                                                    render={({ field }) => (
                                                                        <Checkbox
                                                                            checked={field.value}
                                                                            onCheckedChange={(checked) => {
                                                                                field.onChange(checked);
                                                                                if (checked) {
                                                                                    setValue('endDate', '');
                                                                                }
                                                                            }}
                                                                        />
                                                                    )}
                                                                />
                                                            </div>
                                                        </div>
                                                    </div>

                                                    <div className="rounded-md border border-gray-200">
                                                        <div className="rounded-md bg-white px-2 py-1 text-[11px] font-semibold">
                                                            Time Span In Each Day
                                                        </div>

                                                        <div className="space-y-2 p-2 text-[11px]">
                                                            <div className="flex items-center gap-4">
                                                                <Label className="w-16 text-[11px] font-medium">
                                                                    Start Time:
                                                                </Label>
                                                                <div className="relative flex items-center">
                                                                    <FormField
                                                                        control={control}
                                                                        name="startTime"
                                                                        render={({ field }) => (
                                                                            <Input
                                                                                type="time"
                                                                                className="h-6 w-max text-[11px]"
                                                                                {...field}
                                                                            />
                                                                        )}
                                                                    />

                                                                    {watch('startTime') ? (
                                                                        <Button
                                                                            type="button"
                                                                            variant="ghost"
                                                                            size="icon"
                                                                            className="absolute top-0 -right-6 h-6 w-6 p-0 text-[10px] text-red-500 hover:text-black"
                                                                            onClick={() => setValue('startTime', '')}
                                                                        >
                                                                            <XIcon />
                                                                        </Button>
                                                                    ) : null}
                                                                </div>
                                                            </div>

                                                            <div className="flex items-center gap-4">
                                                                <Label className="w-16 text-[11px] font-medium">
                                                                    End Time:
                                                                </Label>
                                                                <div className="relative flex items-center">
                                                                    <FormField
                                                                        control={control}
                                                                        name="endTime"
                                                                        render={({ field }) => (
                                                                            <Input
                                                                                type="time"
                                                                                className="h-6 w-max text-[11px]"
                                                                                {...field}
                                                                            />
                                                                        )}
                                                                    />

                                                                    {watch('endTime') ? (
                                                                        <Button
                                                                            type="button"
                                                                            variant="ghost"
                                                                            size="icon"
                                                                            className="absolute top-0 -right-6 h-6 w-6 p-0 text-[10px] text-red-500 hover:text-black"
                                                                            onClick={() => setValue('endTime', '')}
                                                                        >
                                                                            <XIcon />
                                                                        </Button>
                                                                    ) : null}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="shrink-0 border-r-0 px-4 py-2">
                                            <div className="grid w-full grid-cols-3 items-start gap-3 [&>*]:min-w-0">
                                                <PromotionDynamicFields
                                                    key={promotionTypeId}
                                                    control={control}
                                                    watch={watch}
                                                    setValue={setValue}
                                                    type={selectedPromotion}
                                                    bmfShowHeader={bmfShowHeader}
                                                    bmfMultiAny={bmfMultiAny}
                                                />
                                            </div>
                                        </div>

                                        {(selectedPromotion?.requiresQualifyingItems ||
                                            (isEditing && hasQualifyingItems)) && (
                                            <div className="shrink-0 overflow-hidden rounded-md border border-gray-200">
                                                <div className="border-b border-gray-200">
                                                    <div className="flex w-full items-center justify-between bg-white p-1">
                                                        <div className="flex items-center gap-2">
                                                            <ShoppingCart className="h-4 w-4 text-green-600" />
                                                            <h2 className="text-sm font-semibold text-gray-900">
                                                                Promotion Items
                                                            </h2>
                                                        </div>

                                                        <div className="flex items-center gap-3 bg-gray-50 px-2">
                                                            <span className="py-2 text-xs">
                                                                The client will be eligible for the promotion once which
                                                                item in the grid are present in the sale?
                                                            </span>

                                                            <FormField
                                                                control={form.control}
                                                                name="qualifyingItemsRule"
                                                                render={({ field }) => (
                                                                    <FormItem className="flex-grow">
                                                                        <FormControl>
                                                                            <RadioGroup
                                                                                value={field.value}
                                                                                onValueChange={field.onChange}
                                                                                className="flex gap-1"
                                                                            >
                                                                                <FormItem className="flex items-center gap-1 border bg-white p-1">
                                                                                    <FormControl>
                                                                                        <RadioGroupItem value="ANY" />
                                                                                    </FormControl>
                                                                                    <FormLabel className="text-xs font-normal">
                                                                                        Any Item
                                                                                    </FormLabel>
                                                                                </FormItem>

                                                                                <FormItem className="flex items-center gap-1 border bg-white p-1">
                                                                                    <FormControl>
                                                                                        <RadioGroupItem value="ALL" />
                                                                                    </FormControl>
                                                                                    <FormLabel className="text-xs font-normal">
                                                                                        All Items
                                                                                    </FormLabel>
                                                                                </FormItem>
                                                                            </RadioGroup>
                                                                        </FormControl>
                                                                    </FormItem>
                                                                )}
                                                            />
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="overflow-auto" style={{ height: '19vh' }}>
                                                    {selectedPromotion?.code === 'SP' ||
                                                    selectedPromotion?.code === 'BMF' ? (
                                                        <SPItemsSelection
                                                            key={promotionTypeId}
                                                            watch={watch}
                                                            setValue={setValue}
                                                            isQuantityCol={selectedPromotion?.code === 'BMF'}
                                                        />
                                                    ) : selectedPromotion?.code === 'BMMGGRD' ||
                                                      selectedPromotion?.code === 'BMMGGPD' ||
                                                      selectedPromotion?.code === 'BMMGPRV' ? (
                                                        <CommonGroupsSelection
                                                            key={promotionTypeId}
                                                            watch={watch}
                                                            setValue={setValue}
                                                        />
                                                    ) : (
                                                        <CommonItemsSelection
                                                            key={promotionTypeId}
                                                            watch={watch}
                                                            setValue={setValue}
                                                            isQuantityCol={
                                                                selectedPromotion?.code === 'BGFRV' ||
                                                                selectedPromotion?.code === 'BGGDPGI' ||
                                                                selectedPromotion?.code === 'BGGDVGI' ||
                                                                selectedPromotion?.code === 'BIAGDPT' ||
                                                                selectedPromotion?.code === 'BIAGDVT'
                                                            }
                                                        />
                                                    )}
                                                </div>
                                            </div>
                                        )}

                                        {(selectedPromotion?.requiresRewardItems ||
                                            selectedPromotion?.code === 'B1G1' ||
                                            isDiscountedItems ||
                                            (isEditing && hasRewardItems)) && (
                                            <div className="shrink-0 overflow-hidden rounded-md border border-gray-200">
                                                <div className="border-b border-gray-200">
                                                    <div className="flex w-full items-center justify-between bg-white p-1">
                                                        <div className="flex items-center gap-2">
                                                            <ShoppingCart className="h-4 w-4 text-green-600" />
                                                            <h2 className="text-sm font-semibold text-gray-900">
                                                                {isDiscountedItems ? 'Discounted Items' : 'Reward Items (Free)'}
                                                            </h2>
                                                        </div>
                                                        {isDiscountedItems ? (
                                                            <span className="px-2 py-2 text-xs text-gray-500">
                                                                Items sold at the discount percentage. The cheapest
                                                                eligible item in the basket is discounted.
                                                            </span>
                                                        ) : (
                                                            <span className="px-2 py-2 text-xs text-gray-500">
                                                                Products handed over free. For buy 1 get 1 of the same
                                                                item, add that item here too.
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>

                                                <div className="overflow-auto" style={{ height: '15vh' }}>
                                                    <RewardItemsSelection
                                                        key={promotionTypeId}
                                                        watch={watch}
                                                        setValue={setValue}
                                                        isDiscountedItems={isDiscountedItems}
                                                    />
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>

                        {isCompanyDebtor ? null : (
                            <div className="mt-3 flex justify-end gap-3">
                                <Button type="button" variant="outline" onClick={onClose}>
                                    Cancel
                                </Button>
                                <Button
                                    type="submit"
                                    disabled={isSaving || bmfMultiAny}
                                    className="bg-blue-600 hover:bg-blue-700"
                                >
                                    {isSaving
                                        ? editData
                                            ? 'Updating...'
                                            : 'Creating...'
                                        : editData
                                          ? 'Update Promotion'
                                          : 'Create Promotion'}
                                </Button>
                            </div>
                        )}
                    </form>
                </Form>
            </div>
        </PageLoader>
    );
};

export default PromotionForm;
