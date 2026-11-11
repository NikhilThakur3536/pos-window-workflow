import { ArrowDownRight, ArrowUpRight, Package2, ShoppingCart } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { GetReportsResponse } from '@/api-queries/reports';
import { useAuthUser } from '@/stores/auth-user.store';
import { ReactNode } from 'react';

interface SalesWiseStatsProps {
    data: GetReportsResponse;
    children?: ReactNode;
}

export function SalesWiseStatsStrip({ data, children }: SalesWiseStatsProps) {
    const currencySymbol = useAuthUser((state) => state.currency?.symbol) || 'R';

    const {
        totalDistribution: { posPercentage = 0, invoicePercentage = 0 },
        totalRevenue = 0,
        totalQuantity = 0,
    } = data || {};
    const totalPercent = String(posPercentage + invoicePercentage);
    const isPositive = totalPercent && !totalPercent.startsWith('-');

    return (
        <Card className="border border-gray-200 bg-white py-2 shadow-sm">
            <CardContent>
                <div className="flex items-center justify-between">
                    <div>{children || null}</div>

                    <div>
                        <div className="flex items-center justify-end gap-2 text-sm">
                            <Package2 className="h-4 w-4 text-gray-500" />
                            <span className="text-xs text-gray-500">Total Revenue :</span>
                            <div className="font-semibold">
                                {currencySymbol} {(totalRevenue || 0).toFixed(2)}
                            </div>
                        </div>

                        <div className="flex items-center justify-between gap-2 text-sm">
                            <div className="flex items-center gap-2">
                                <ShoppingCart className="h-4 w-4 text-gray-500" />
                                <span className="text-xs text-gray-500">Total Quantity :</span>
                            </div>
                            <div className="font-semibold">{totalQuantity || 0}</div>
                        </div>

                        <div className="flex items-center justify-between gap-2 text-sm">
                            <div className="flex items-center gap-2">
                                {isPositive ? (
                                    <ArrowUpRight className="h-4 w-4 text-green-500" />
                                ) : (
                                    <ArrowDownRight className="h-4 w-4 text-red-500" />
                                )}
                                <span className="text-xs text-gray-500">Distribution :</span>
                            </div>
                            <div
                                className={cn(
                                    'self-end, font-semibold',
                                    isPositive ? 'text-green-500' : 'text-red-500',
                                )}
                            >
                                {totalPercent}%
                            </div>
                        </div>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
