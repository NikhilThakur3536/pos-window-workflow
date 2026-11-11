import React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import FilterActionButtons from '@/components/custom-components/filter-action-buttons';
import useTableFilters from '@/components/list-only-table/use-table-filters';
import { PageLoader } from '@/components/custom-components/PageLoader';
import {
    PromotionDetails,
    useValidatePromotion,
    PromotionValidationSchema,
    PromotionValidationCartItemsSchema,
    AppliedPromotionDetails,
    useGetElgiblePromotions,
    EligiblePromotionsFilterProps,
} from '@/api-queries/promotions';
import moment from 'moment';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Calendar, Clock, Tag, X } from 'lucide-react';

interface EligiblePromotionsListProps {
    onApplyPromotion: (appliedPromotion: AppliedPromotionDetails) => void;
    cartItems: PromotionValidationCartItemsSchema;
    basketTotal: number;
    appliedPromotionId?: string;
    appliedPromotionIds?: string[];
    removePromotion: () => void;
    isParentLoading?: boolean;
}

export function EligiblePromotionsList({
    onApplyPromotion,
    cartItems,
    basketTotal,
    appliedPromotionId,
    appliedPromotionIds,
    removePromotion,
    isParentLoading = false,
}: EligiblePromotionsListProps) {
    const { mutate: validatePromotion, isPending } = useValidatePromotion();

    const initialFilters = {
        search: '',
    };

    const { filters, setFilters, handleFilters, clearFilters, appliedFilters, showClearButton } =
        useTableFilters<EligiblePromotionsFilterProps>({ items: cartItems, basketTotal, ...initialFilters });

    const { data: promotions, isLoading } = useGetElgiblePromotions({
        items: cartItems,
        basketTotal,
        ...(appliedFilters?.search ? { search: appliedFilters?.search } : {}),
    });

    const hasAppliedPromotion = !!appliedPromotionId || (appliedPromotionIds?.length ?? 0) > 0;

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') handleApplyFilters();
    };

    const handleClearSearch = () => {
        clearFilters();
    };

    const handleApplyFilters = () => {
        handleFilters(filters);
    };

    const handleSelectAndClose = (selectedPromotion: PromotionDetails) => {
        if (hasAppliedPromotion) {
            toast.error('Remove the applied promotion before applying another one');
            return;
        }

        if (selectedPromotion && cartItems) {
            const payload: PromotionValidationSchema = {
                promotionId: selectedPromotion?.id,
                items: cartItems,
            };

            validatePromotion(payload, {
                onSuccess: (data) => {
                    onApplyPromotion(data.data);
                    toast.success(`"${selectedPromotion?.promotionDescription}" applied successfully`);
                },
                onError: (error) => {
                    // @ts-ignore
                    toast.error(error?.response.data.message || 'Internal Server Error!');
                },
            });
        }
    };

    return (
        <div className="flex w-full flex-col overflow-auto">
            <PageLoader isLoading={isLoading || isPending || isParentLoading}>
                <div className="flex items-center justify-between gap-2 pb-0">
                    <h3 className="text-lg font-semibold">Promotions</h3>

                    <div className="flex items-center gap-2">
                        <Input
                            placeholder="Search by name or batch"
                            value={filters.search || ''}
                            onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                            onKeyDown={handleKeyDown}
                            className="h-6 w-full p-1 text-xs"
                        />
                        <FilterActionButtons
                            height="!h-6"
                            onApplyFilters={handleApplyFilters}
                            onClearClick={handleClearSearch}
                            showClearButton={showClearButton}
                        />
                    </div>
                </div>

                <div className="mt-2 flex-1 overflow-y-auto">
                    {promotions && promotions?.data.rows?.length !== 0 ? (
                        <div>
                            {promotions?.data?.rows.map((promotion) => {
                                const isApplied =
                                    appliedPromotionIds?.includes(promotion.id) || appliedPromotionId === promotion.id;
                                const isApplyBlocked = hasAppliedPromotion && !isApplied;
                                return (
                                    <div
                                        key={promotion.id}
                                        className={`group flex items-center justify-between gap-2 border-t p-2 text-xs transition-all ${
                                            !promotion.isEligible
                                                ? 'cursor-not-allowed border-gray-200 bg-gray-100 opacity-75'
                                                : isApplyBlocked
                                                  ? 'cursor-not-allowed border-gray-300 bg-gray-50 opacity-75'
                                                  : 'cursor-pointer border-gray-300 bg-green-50 hover:border-blue-400 hover:bg-blue-50'
                                        }`}
                                    >
                                        <div className="flex-1 space-y-1">
                                            <div className="flex w-full items-center justify-between gap-2">
                                                <span
                                                    className={`font-semibold ${!promotion.isEligible ? 'text-gray-700' : 'text-green-900'}`}
                                                >
                                                    {promotion.promotionDescription} ({promotion?.promotionBatchCode})
                                                </span>

                                                {!promotion.isEligible && (
                                                    <Badge variant="destructive" className="h-5 text-[10px]">
                                                        Not Eligible
                                                    </Badge>
                                                )}
                                            </div>

                                            <div className="flex items-center gap-2 text-[11px] text-gray-900">
                                                <span className="flex items-center gap-1 font-bold">
                                                    <Calendar className="h-3 w-3 shrink-0" />
                                                    Valid Till : {moment(promotion.endDate).format('DD MMM, YY')}
                                                </span>{' '}
                                                |
                                                <span className="flex items-center gap-1">
                                                    <Clock className="h-3 w-3 shrink-0" />
                                                    {promotion?.startTime
                                                        ? moment(promotion?.startTime, 'HH:mm:ss').format('hh:mm A')
                                                        : 'N/A'}{' '}
                                                    -{' '}
                                                    {promotion?.endTime
                                                        ? moment(promotion?.endTime, 'HH:mm:ss').format('hh:mm A')
                                                        : 'N/A'}
                                                </span>
                                            </div>
                                        </div>

                                        {promotion?.isEligible ? (
                                            isApplied ? (
                                                <div className="flex items-center gap-2">
                                                    <Badge
                                                        variant="secondary"
                                                        className="h-6 text-[11px] font-bold text-green-900"
                                                    >
                                                        Applied
                                                    </Badge>

                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        onClick={removePromotion}
                                                        className="!w-max text-red-500 hover:text-red-700"
                                                    >
                                                        <X />
                                                    </Button>
                                                </div>
                                            ) : hasAppliedPromotion ? (
                                                <Badge variant="outline" className="h-6 text-[10px]">
                                                    Remove applied promotion first
                                                </Badge>
                                            ) : (
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    className="h-7 px-3 text-xs"
                                                    onClick={() => handleSelectAndClose(promotion)}
                                                    disabled={isPending}
                                                >
                                                    {isPending ? 'Applying...' : 'Apply'}
                                                </Button>
                                            )
                                        ) : null}
                                    </div>
                                );
                            })}
                        </div>
                    ) : (
                        <div className="flex h-full items-center justify-center rounded-lg bg-gray-100 text-xs text-red-600">
                            Cart items are not eligible for any promotion
                        </div>
                    )}
                </div>
            </PageLoader>
        </div>
    );
}
