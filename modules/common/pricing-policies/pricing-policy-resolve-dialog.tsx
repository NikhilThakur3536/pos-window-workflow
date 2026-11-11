import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { useMemo, useState } from 'react';
import SelectPopover from '@/components/select-popover';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Loader2, Plus, Trash2, FlaskConical } from 'lucide-react';
import { useDebtorList } from '@/api-queries/debtor';
import { useGetUsers } from '@/api-queries/user';
import { StockDetails, useCompanyStockDetailsList } from '@/api-queries/company/stock-details';
import { useAuthUser } from '@/stores/auth-user.store';
import {
    PricingMatrixResolveItem,
    PricingMatrixResolveResponse,
    PricingMatrixResolvedRule,
    useResolvePricingMatrix,
} from '@/api-queries/pricing-policy';

interface ResolveLine extends PricingMatrixResolveItem {
    id: string;
}

interface PricingPolicyResolveDialogProps {
    open: boolean;
    onClose: () => void;
}

const emptyLine = (id: string): ResolveLine => ({
    id,
    companyStockDetailId: '',
    quantity: 1,
    unitPrice: 0,
    discount: 0,
    discountPercentage: 0,
    isDiscountOverride: false,
    isPriceOverride: false,
    originalUnitPrice: 0,
});

const PricingPolicyResolveDialog = ({ open, onClose }: PricingPolicyResolveDialogProps) => {
    const resolveMutation = useResolvePricingMatrix();
    const currentUserId = useAuthUser((state) => state.user?.id) || '';

    const [transactionType, setTransactionType] = useState<'POS' | 'ACCOUNT_SALE'>('POS');
    const [userId, setUserId] = useState<string>(currentUserId);
    const [debtorId, setDebtorId] = useState<string>('');
    const [lines, setLines] = useState<ResolveLine[]>([emptyLine('line-1')]);
    const [result, setResult] = useState<PricingMatrixResolveResponse | null>(null);
    const [isResolving, setIsResolving] = useState(false);

    const [productSearch, setProductSearch] = useState('');

    const users = useGetUsers({ limit: 100, offset: 0 })?.data?.data || [];
    const debtors = useDebtorList({ limit: 100, offset: 0 })?.data?.data?.rows || [];

    const productsQuery = useCompanyStockDetailsList({
        limit: 20,
        offset: 0,
        status: 'ACTIVE',
        pricing: true,
        ...(productSearch ? { search: productSearch } : {}),
    });
    const products = productsQuery?.data?.data?.rows || [];

    const productById = useMemo(() => {
        const map = new Map<string, StockDetails>();
        products.forEach((p) => map.set(p.id, p));
        return map;
    }, [products]);

    const selectProduct = (index: number, companyStockDetailId: string) => {
        const product = productById.get(companyStockDetailId);
        const defaultPrice = product?.pricingTypes?.find((p) => p.isDefault) ?? product?.pricingTypes?.[0];
        const originalUnitPrice = Number(defaultPrice?.priceInclusive ?? 0) || 0;
        updateLine(index, {
            companyStockDetailId,
            originalUnitPrice,
            unitPrice: originalUnitPrice,
            discount: 0,
            discountPercentage: 0,
            isPriceOverride: false,
            isDiscountOverride: false,
        });
    };

    const productOptions = useMemo(
        () => products.map((p) => ({ label: `${p.itemCode} - ${p.description}`, value: p.id })),
        [products],
    );

    const currentUserIdLabel = useMemo(() => {
        const u = users.find((x) => x.id === currentUserId);
        return u ? `${u.firstName} ${u.surname}` : '';
    }, [users, currentUserId]);

    const updateLine = (index: number, updates: Partial<ResolveLine>) => {
        setLines((prev) => prev.map((line, i) => (i === index ? { ...line, ...updates } : line)));
    };

    const addLine = () => setLines((prev) => [...prev, emptyLine(`line-${prev.length + 1}`)]);

    const removeLine = (index: number) => {
        if (lines.length <= 1) {
            setLines([emptyLine('line-1')]);
            return;
        }
        setLines((prev) => prev.filter((_, i) => i !== index));
    };

    const handleResolve = async () => {
        const validLines = lines.filter((l) => l.companyStockDetailId && l.quantity > 0);
        if (!validLines.length) {
            toast.error('Add at least one product line to resolve.');
            return;
        }

        setIsResolving(true);
        setResult(null);
        try {
            const items: PricingMatrixResolveItem[] = validLines.map(({ id: _id, ...line }) => {
                void _id;
                return line;
            });
            const res = await resolveMutation.mutateAsync({
                transactionType,
                ...(userId ? { userId } : {}),
                ...(debtorId ? { companyDebtorId: debtorId } : {}),
                items,
            });
            setResult(res || {});
        } catch (error) {
            toast.error((error as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Resolve failed');
        } finally {
            setIsResolving(false);
        }
    };

    const ruleRows = result?.rule
        ? [result.rule]
        : result?.rules && result.rules.length
          ? result.rules
          : result?.policy
            ? [result.policy]
            : [];

    const displayItemResults = Array.isArray(result?.items) ? result.items : [];
    const anyOverrideRequired = displayItemResults.some((item) => item.overrideRequired === true);

    return (
        <Dialog open={open} onOpenChange={(o) => { if (!o) { setResult(null); onClose(); } }}>
            <DialogContent className="sm:max-w-[820px]">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 font-semibold">
                        <FlaskConical className="h-4 w-4" />
                        Test Pricing Matrix (Resolve)
                    </DialogTitle>
                </DialogHeader>

                <div className="max-h-[75vh] space-y-3 overflow-auto text-xs">
                    <div className="grid grid-cols-3 items-start gap-3">
                        <div className="space-y-1">
                            <Label className="text-xs font-medium">Transaction Type</Label>
                            <Select value={transactionType} onValueChange={(v) => setTransactionType(v as 'POS' | 'ACCOUNT_SALE')}>
                                <SelectTrigger className="h-8 text-xs">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="POS">POS / Cash Sale</SelectItem>
                                    <SelectItem value="ACCOUNT_SALE">Account Sale</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-1">
                            <Label className="text-xs font-medium">User (scope)</Label>
                            <SelectPopover
                                title="User"
                                onlyTitle="Select user"
                                options={users.map((u) => ({
                                    label: `${u.firstName} ${u.surname}${u.staffNumber ? ` (${u.staffNumber})` : ''}`,
                                    value: u.id,
                                }))}
                                selectedValue={userId}
                                onSelect={(val) => setUserId(String(val || ''))}
                            />
                            {currentUserIdLabel && <p className="text-[10px] text-muted-foreground">Current: {currentUserIdLabel}</p>}
                        </div>

                        <div className="space-y-1">
                            <Label className="text-xs font-medium">Customer (debtor)</Label>
                            <SelectPopover
                                title="Customer"
                                onlyTitle="Optional - select customer"
                                options={debtors.map((d) => ({ label: d.name, value: d.id }))}
                                selectedValue={debtorId}
                                onSelect={(val) => setDebtorId(String(val || ''))}
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <Label className="text-xs font-semibold">Lines</Label>
                            <Button type="button" variant="outline" size="sm" className="h-6 text-xs" onClick={addLine}>
                                <Plus className="h-3 w-3" />
                                Add Line
                            </Button>
                        </div>

                        {lines.map((line, index) => (
                            <div key={line.id} className="space-y-1 rounded-md border border-gray-200 bg-gray-50 p-2">
                                <div className="flex items-center gap-2">
                                    <div className="min-w-0 flex-1">
                                        <SelectPopover
                                            title="Product"
                                            onlyTitle="Search product / SKU..."
                                            options={productOptions}
                                            selectedValue={line.companyStockDetailId || ''}
                                            onSelect={(val) => selectProduct(index, String(val || ''))}
                                            onSearch={setProductSearch}
                                            isSearching={productsQuery.isFetching}
                                        />
                                    </div>
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="sm"
                                        className="h-7 w-7 p-0 text-red-500"
                                        onClick={() => removeLine(index)}
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </div>
                                <div className="grid grid-cols-6 gap-2">
                                    <div>
                                        <Label className="text-[10px] text-muted-foreground">Qty</Label>
                                        <Input
                                            type="number"
                                            min={1}
                                            className="h-7 text-right text-xs"
                                            value={line.quantity}
                                            onChange={(e) => updateLine(index, { quantity: Number(e.target.value) || 0 })}
                                        />
                                    </div>
                                    <div>
                                        <Label className="text-[10px] text-muted-foreground">Unit Price</Label>
                                        <Input
                                            type="number"
                                            min={0}
                                            step={0.01}
                                            className="h-7 text-right text-xs"
                                            value={line.unitPrice}
                                            onChange={(e) =>
                                                updateLine(index, {
                                                    unitPrice: Number(e.target.value) || 0,
                                                    isPriceOverride: true,
                                                })
                                            }
                                        />
                                    </div>
                                    <div>
                                        <Label className="text-[10px] text-muted-foreground">Original Price</Label>
                                        <Input
                                            type="number"
                                            min={0}
                                            step={0.01}
                                            readOnly
                                            className="h-7 text-right text-xs"
                                            value={line.originalUnitPrice ?? 0}
                                        />
                                    </div>
                                    <div>
                                        <Label className="text-[10px] text-muted-foreground">Discount $</Label>
                                        <Input
                                            type="number"
                                            min={0}
                                            step={0.01}
                                            className="h-7 text-right text-xs"
                                            value={line.discount ?? 0}
                                            onChange={(e) => {
                                                const v = Number(e.target.value) || 0;
                                                updateLine(index, { discount: v, isDiscountOverride: v > 0 });
                                            }}
                                        />
                                    </div>
                                    <div>
                                        <Label className="text-[10px] text-muted-foreground">Discount %</Label>
                                        <Input
                                            type="number"
                                            min={0}
                                            max={100}
                                            step={0.01}
                                            className="h-7 text-right text-xs"
                                            value={line.discountPercentage ?? 0}
                                            onChange={(e) => {
                                                const v = Number(e.target.value) || 0;
                                                updateLine(index, { discountPercentage: v, isDiscountOverride: v > 0 });
                                            }}
                                        />
                                    </div>
                                    <div className="flex items-end gap-2 pb-1">
                                        <div className="flex items-center gap-1">
                                            <Checkbox
                                                id={`price-${index}`}
                                                checked={!!line.isPriceOverride}
                                                onCheckedChange={() => undefined}
                                                aria-readonly
                                            />
                                            <Label htmlFor={`price-${index}`} className="text-[10px]">
                                                Price Ovr
                                            </Label>
                                        </div>
                                        <div className="flex items-center gap-1">
                                            <Checkbox
                                                id={`disc-${index}`}
                                                checked={!!line.isDiscountOverride}
                                                onCheckedChange={() => undefined}
                                                aria-readonly
                                            />
                                            <Label htmlFor={`disc-${index}`} className="text-[10px]">
                                                Disc Ovr
                                            </Label>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                    <Button
                        type="button"
                        onClick={handleResolve}
                        disabled={isResolving}
                        className="h-8 gap-2 text-xs"
                    >
                        {isResolving ? (
                            <>
                                <Loader2 className="h-4 w-4 animate-spin" />
                                Resolving...
                            </>
                        ) : (
                            <>
                                <FlaskConical className="h-4 w-4" />
                                Resolve Rule
                            </>
                        )}
                    </Button>

                    {result && (
                        <div className="space-y-2 rounded-md border border-blue-200 bg-blue-50/50 p-2">
                            <div className="flex items-center gap-2">
                                <span className="font-semibold">Result:</span>
                                {result.success === false && <span className="text-red-600">{result.message || 'Not allowed'}</span>}
                                {result.success !== false && anyOverrideRequired && (
                                    <Badge variant="destructive" className="text-[10px]">
                                        OVERRIDE REQUIRED
                                    </Badge>
                                )}
                                {result.success !== false && !anyOverrideRequired && (
                                    <Badge variant="default" className="text-[10px]">
                                        ALLOWED
                                    </Badge>
                                )}
                                {(result.requiredActions || []).length > 0 && (
                                    <Badge variant="secondary" className="text-[10px]">
                                        Required: {result.requiredActions!.join(', ')}
                                    </Badge>
                                )}
                            </div>

                            {result.allowedPrice != null && (
                                <div className="flex gap-4">
                                    <span><b>Allowed Price:</b> {Number(result.allowedPrice).toFixed(2)}</span>
                                    {result.allowedDiscountPercent != null && (
                                        <span><b>Allowed Disc. %:</b> {Number(result.allowedDiscountPercent).toFixed(2)}</span>
                                    )}
                                    {result.allowedDiscount != null && (
                                        <span><b>Allowed Disc. $:</b> {Number(result.allowedDiscount).toFixed(2)}</span>
                                    )}
                                </div>
                            )}

                            {ruleRows.length > 0 && (
                                <div className="overflow-hidden rounded-md border border-gray-200">
                                    <div className="bg-gray-100 px-2 py-1 font-semibold">Applicable Policy / Rule</div>
                                    <div className="divide-y divide-gray-200">
                                        {ruleRows.map((rule, idx) => (
                                            <div key={(rule as PricingMatrixResolvedRule).ruleId || rule.id || idx} className="grid grid-cols-2 gap-x-4 gap-y-1 bg-white px-2 py-2 text-[11px]">
                                                <div><b>Name:</b> {rule.name || (rule as PricingMatrixResolvedRule).ruleId || rule.id || 'N/A'}</div>
                                                <div><b>Status:</b> {rule.status || 'N/A'}</div>
                                                <div><b>Transaction:</b> {rule.transactionType || 'N/A'}</div>
                                                <div><b>Priority:</b> {rule.priority != null ? rule.priority : 'N/A'}</div>
                                                <div><b>Max Disc. %:</b> {rule.maxDiscountPercent != null ? `${rule.maxDiscountPercent}%` : 'N/A'}</div>
                                                <div><b>Max Disc. Amount:</b> {rule.maxDiscountAmount != null ? Number(rule.maxDiscountAmount).toFixed(2) : 'N/A'}</div>
                                                <div><b>Price Override:</b> {rule.allowPriceOverride ? 'Allowed' : 'Blocked'}</div>
                                                <div><b>Approval Above Limit:</b> {rule.requireApprovalAboveLimit ? 'Yes' : 'No'}</div>
                                                <div><b>Target GP %:</b> {rule.targetGpPercent != null ? `${rule.targetGpPercent}%` : 'N/A'}</div>
                                                <div><b>Scope:</b> {rule.groupId ? `Group (${rule.groupId})` : rule.userId ? `User (${rule.userId})` : rule.companyStockDetailId ? `SKU (${rule.companyStockDetailId})` : 'Company'}</div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {displayItemResults.length > 0 && (
                                <div className="overflow-hidden rounded-md border border-gray-200">
                                    <div className="bg-gray-100 px-2 py-1 font-semibold">Per-Line Results</div>
                                    <table className="min-w-full text-[11px]">
                                        <thead>
                                            <tr className="bg-gray-100 text-left">
                                                <th className="px-2 py-1">SKU</th>
                                                <th className="px-2 py-1 text-right">Base Price</th>
                                                <th className="px-2 py-1 text-right">Requested Price</th>
                                                <th className="px-2 py-1 text-right">Disc. $</th>
                                                <th className="px-2 py-1 text-right">Disc. %</th>
                                                <th className="px-2 py-1 text-right">Override Req.</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {displayItemResults.map((item, idx) => (
                                                <tr key={item.companyStockDetailId || idx} className="border-t">
                                                    <td className="px-2 py-1 font-mono">{item.skuCode || item.companyStockDetailId?.slice(0, 8)}</td>
                                                    <td className="px-2 py-1 text-right">{item.baseUnitPrice != null ? Number(item.baseUnitPrice).toFixed(2) : '—'}</td>
                                                    <td className="px-2 py-1 text-right">
                                                        {item.requestedUnitPrice != null && Number(item.requestedUnitPrice).toFixed(2)}
                                                        {item.requestedUnitPrice == null && item.appliedPrice != null && Number(item.appliedPrice).toFixed(2)}
                                                        {item.requestedUnitPrice == null && item.appliedPrice == null && '—'}
                                                    </td>
                                                    <td className="px-2 py-1 text-right">{item.discountAmount != null ? Number(item.discountAmount).toFixed(2) : item.allowedDiscountAmount != null ? Number(item.allowedDiscountAmount).toFixed(2) : '—'}</td>
                                                    <td className="px-2 py-1 text-right">{item.discountPercent != null ? `${Number(item.discountPercent).toFixed(2)}%` : item.allowedDiscountPercent != null ? `${Number(item.allowedDiscountPercent).toFixed(2)}%` : '—'}</td>
                                                    <td className="px-2 py-1 text-right">
                                                        {item.overrideRequired === true ? (
                                                            <span className="font-semibold text-red-600">Yes</span>
                                                        ) : (
                                                            <span className="font-semibold text-green-600">No</span>
                                                        )}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
};

export default PricingPolicyResolveDialog;