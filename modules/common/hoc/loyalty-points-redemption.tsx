import React, { useState } from 'react';
import { LoyaltyPointRedemptionDetails, useGetAccountSaleLoyalty, useGetCashSaleLoyalty } from '@/api-queries/loyalty';
import { Dialog, DialogContent, DialogFooter, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useAuthUser } from '@/stores/auth-user.store';

export interface LoyaltyPointsRedemptionProps {
    open: boolean;
    onClose: () => void;
    debtorId?: string;
    totalAmount: number;
    onApply: (data: LoyaltyPointRedemptionDetails) => void;
    saleType: 'ACCOUNT_SALE' | 'CASH_SALE';
}

const LoyaltyPointsRedemption = ({
    open,
    onClose,
    debtorId,
    totalAmount,
    onApply,
    saleType,
}: LoyaltyPointsRedemptionProps) => {
    const currencySymbol = useAuthUser((state) => state.currency?.symbol) || 'R';
    const [loyaltyCardNumber, setLoyaltyCardNumber] = useState('');

    const {
        mutate: getAccountSaleLoyalty,
        data,
        isPending,
        isError,
        error,
    } = saleType === 'ACCOUNT_SALE' ? useGetAccountSaleLoyalty() : useGetCashSaleLoyalty();

    const handleCheck = async () => {
        if (!loyaltyCardNumber) return;
        getAccountSaleLoyalty(
            { ...(saleType === 'ACCOUNT_SALE' ? { debtorId } : {}), loyaltyCardNumber, totalAmount },
            {
                onSuccess: () => {
                    toast.success('Loyalty Points fetched successfully!');
                },
                onError: (error) => {
                    // @ts-ignore
                    toast.error(error?.response.data.message || 'Internal Server Error!');
                },
            },
        );
    };

    const handleApply = () => {
        if (data?.data) {
            onApply(data.data);
            onClose();
        }
    };

    return (
        <Dialog open={open} onOpenChange={onClose}>
            <DialogContent className="max-w-md">
                <DialogTitle className="text-lg font-semibold text-green-800">Redeem Loyalty Points</DialogTitle>

                <div className="space-y-4">
                    <div>
                        <div className="flex gap-2">
                            <Input
                                placeholder="Enter Loyalty Card Number"
                                value={loyaltyCardNumber}
                                onChange={(e) => setLoyaltyCardNumber(e.target.value)}
                                disabled={isPending}
                            />
                            <Button onClick={handleCheck} disabled={!loyaltyCardNumber || isPending} className="w-20">
                                {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Validate'}
                            </Button>
                        </div>

                        {isError && (
                            <p className="mt-1 text-xs text-red-500">
                                {(error as any)?.response?.data?.message || 'Failed to fetch loyalty details'}
                            </p>
                        )}
                    </div>

                    {data?.data && (
                        <Card className="mt-2 !gap-0 rounded-2xl border bg-gradient-to-br from-gray-50 to-white py-3 shadow-md">
                            <CardHeader className="border-b !pb-2">
                                <CardTitle className="flex items-center justify-between text-lg font-semibold text-gray-800">
                                    <div>
                                        <div>{data.data?.membership?.name}</div>

                                        <div className="text-sm font-medium text-gray-500">
                                            #{data.data?.loyaltyCardNumber}
                                        </div>
                                    </div>
                                    <div>
                                        <div className="rounded-xl bg-gray-100 p-2 text-center">
                                            <p className="text-[10px] font-medium tracking-wide text-gray-800 uppercase">
                                                Available Points
                                            </p>
                                            <p className="flex items-center justify-center gap-1 text-sm font-semibold text-green-600">
                                                {data.data?.availablePoints}
                                            </p>
                                        </div>
                                    </div>
                                </CardTitle>
                            </CardHeader>

                            <CardContent className="grid grid-cols-2 gap-3 px-4 pt-3">
                                <div className="rounded-xl bg-gray-100 p-3 text-center">
                                    <p className="text-xs font-medium tracking-wide text-gray-500 uppercase">
                                        You will earn
                                    </p>
                                    <p className="flex items-center justify-center gap-1 text-lg font-semibold text-blue-600">
                                        {data.data?.earnedPoints} <span className="text-xs">points</span>
                                    </p>
                                </div>

                                <div className="rounded-xl bg-gray-100 p-3 text-center">
                                    <p className="text-xs font-medium tracking-wide text-gray-500 uppercase">
                                        Redeemable
                                    </p>
                                    <p className="flex items-center justify-center gap-1 text-lg font-semibold text-blue-600">
                                        {data.data?.redeemPointsApplied} <span className="text-xs">points</span>
                                    </p>
                                </div>

                                <div className="rounded-xl bg-gray-100 p-3 text-center">
                                    <p className="text-xs font-medium tracking-wide text-gray-500 uppercase">
                                        Redeemable Value
                                    </p>
                                    <p className="text-lg font-semibold text-green-600">
                                        {' '}
                                        {currencySymbol} {data.data?.redeemableValue}
                                    </p>
                                </div>

                                <div className="col-span-2 rounded-xl bg-gray-100 p-3 text-center sm:col-span-1">
                                    <p className="text-xs font-medium tracking-wide text-gray-500 uppercase">
                                        Final Payable
                                    </p>
                                    <p className="text-lg font-semibold text-green-600">
                                        {currencySymbol} {data.data?.finalPayableAmount}
                                    </p>
                                </div>
                            </CardContent>
                        </Card>
                    )}
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={onClose}>
                        Cancel
                    </Button>
                    <Button onClick={handleApply} disabled={!data?.data}>
                        Redeem {data?.data?.redeemPointsApplied || ''} Points
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};

export default LoyaltyPointsRedemption;
