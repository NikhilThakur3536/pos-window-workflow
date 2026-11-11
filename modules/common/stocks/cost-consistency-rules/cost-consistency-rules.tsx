import React, { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader2, Plus, ShieldCheck, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { PageLoader } from '@/components/custom-components/PageLoader';
import SelectPopover from '@/components/select-popover';
import MandatoryField from '@/components/dynamic-form/mandatory-fields';
import { StockDetails, useCompanyStockDetailsList } from '@/api-queries/company/stock-details';
import {
    OUTCOME_BADGE_CLASS,
    OUTCOME_LABELS,
    PRICING_POLICY_PREVIEW_MAX_ITEMS,
    PricingPolicyValidationResult,
    RULE_SOURCE_LABELS,
    useGetPricingPolicyRule,
    usePreviewPricingPolicy,
    useValidatePricingPolicy,
} from '@/api-queries/pricing-policy/cost-consistency';
import { useAuthUser } from '@/stores/auth-user.store';

interface PreviewItem {
    companyStockDetailId: string;
    priceExclusive: number;
}

const formatPercent = (value?: number | null) => {
    if (value == null) return '—';
    return `${Number(value).toFixed(2)}%`;
};

const CostConsistencyRulesScreen: React.FC = () => {
    const currencySymbol = useAuthUser((state) => state.currency?.symbol) || 'R';

    const [selectedStockId, setSelectedStockId] = useState('');
    const [priceExclusive, setPriceExclusive] = useState('');
    const [useFutureCost, setUseFutureCost] = useState(false);
    const [validationResult, setValidationResult] = useState<PricingPolicyValidationResult | null>(null);

    const [previewItems, setPreviewItems] = useState<PreviewItem[]>([]);
    const [previewResults, setPreviewResults] = useState<PricingPolicyValidationResult[]>([]);

    const stocks = useCompanyStockDetailsList({ limit: 500 })?.data?.data?.rows;

    const ruleQuery = useGetPricingPolicyRule(selectedStockId ? { companyStockDetailId: selectedStockId } : null);
    const validateMutation = useValidatePricingPolicy();
    const previewMutation = usePreviewPricingPolicy();

    const stockOptions = useMemo(
        () =>
            (stocks || []).map((data: StockDetails) => ({
                label: `${data.description} ${data.itemCode ? `(${data.itemCode})` : ''}`,
                value: data.id,
            })),
        [stocks],
    );

    const rule = ruleQuery?.data?.data;

    const handleValidate = () => {
        if (!selectedStockId) {
            toast.error('Select a product to validate');
            return;
        }
        const price = parseFloat(priceExclusive);
        if (priceExclusive === '' || Number.isNaN(price) || price < 0) {
            toast.error('Enter a valid selling price');
            return;
        }
        validateMutation.mutate(
            { companyStockDetailId: selectedStockId, priceExclusive: price, useFutureCost },
            {
                onSuccess: (response) => {
                    if (response.success && response.data) {
                        setValidationResult(response.data);
                        if (response.data.blocked) toast.error('This price is blocked by the cost policy');
                        else if (response.data.requiresApproval) toast.warning('This price requires approval');
                        else if (response.data.warning) toast.warning(response.data.warning);
                        else toast.success('Price is within policy');
                    } else {
                        toast.error(response.message || 'Price validation failed');
                    }
                },
                onError: (error: any) => toast.error(error?.response?.data?.message || 'Internal Server Error!'),
            },
        );
    };

    const handleAddPreviewItem = () => {
        if (!selectedStockId) {
            toast.error('Select a product to add');
            return;
        }
        const price = parseFloat(priceExclusive);
        if (priceExclusive === '' || Number.isNaN(price) || price < 0) {
            toast.error('Enter a valid selling price to add');
            return;
        }
        if (previewItems.some((item) => item.companyStockDetailId === selectedStockId)) {
            toast.error('This product is already in the preview list');
            return;
        }
        if (previewItems.length >= PRICING_POLICY_PREVIEW_MAX_ITEMS) {
            toast.error(`A maximum of ${PRICING_POLICY_PREVIEW_MAX_ITEMS} items can be previewed at once`);
            return;
        }
        setPreviewItems((prev) => [...prev, { companyStockDetailId: selectedStockId, priceExclusive: price }]);
        setPriceExclusive('');
        setValidationResult(null);
    };

    const handleRunPreview = () => {
        if (!previewItems.length) {
            toast.error('Add at least one product to preview');
            return;
        }
        previewMutation.mutate(
            { items: previewItems.map((item) => ({ ...item, useFutureCost })) },
            {
                onSuccess: (response) => {
                    if (response.success) {
                        const rows = response.data?.rows || [];
                        setPreviewResults(rows);
                        const blocked = rows.filter((row) => row.blocked).length;
                        if (blocked) toast.warning(`${blocked} of ${rows.length} prices are blocked by policy`);
                        else toast.success('Preview completed');
                    } else {
                        toast.error(response.message || 'Preview failed');
                    }
                },
                onError: (error: any) => toast.error(error?.response?.data?.message || 'Internal Server Error!'),
            },
        );
    };

    return (
        <PageLoader isLoading={stocks === undefined}>
            <div className="space-y-4 p-3">
                <div>
                    <h1 className="text-base font-semibold">Cost Consistency Rules</h1>
                    <p className="text-xs text-muted-foreground">
                        Check whether a selling price is within the configured gross profit and markup limits for a
                        category or SKU. Rules resolve from SKU, then category, then the company default.
                    </p>
                </div>

                <Card>
                    <CardContent className="space-y-4 p-4">
                        <div className="flex flex-wrap items-end gap-2">
                            <div className="min-w-[300px] flex-1">
                                <Label className="text-xs">
                                    Product <MandatoryField />
                                </Label>
                                <div className="mt-1">
                                    <SelectPopover
                                        options={stockOptions}
                                        title="product"
                                        selectedValue={selectedStockId}
                                        onSelect={(value) => {
                                            setSelectedStockId(String(value || ''));
                                            setValidationResult(null);
                                        }}
                                    />
                                </div>
                            </div>
                            <div className="min-w-[160px]">
                                <Label className="text-xs">
                                    Selling Price (Excl.) <MandatoryField />
                                </Label>
                                <Input
                                    type="number"
                                    className="mt-1"
                                    placeholder="e.g., 199.99"
                                    value={priceExclusive}
                                    onChange={(e) => setPriceExclusive(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && handleValidate()}
                                />
                            </div>
                            <div className="flex items-center gap-2 pb-2">
                                <Checkbox
                                    id="use-future-cost"
                                    checked={useFutureCost}
                                    onCheckedChange={(checked) => setUseFutureCost(!!checked)}
                                />
                                <Label htmlFor="use-future-cost" className="text-xs">
                                    Use Future Cost
                                </Label>
                            </div>
                            <Button
                                onClick={handleValidate}
                                disabled={validateMutation.isPending}
                                className="flex items-center gap-2"
                            >
                                {validateMutation.isPending ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                    <ShieldCheck className="h-4 w-4" />
                                )}
                                Validate Price
                            </Button>
                            <Button
                                variant="outline"
                                onClick={handleAddPreviewItem}
                                className="flex items-center gap-2"
                            >
                                <Plus className="h-4 w-4" />
                                Add to Preview
                            </Button>
                        </div>

                        {rule && (
                            <div className="rounded-md border bg-muted/20 p-3">
                                <div className="mb-2 flex items-center gap-2">
                                    <span className="text-xs font-semibold uppercase tracking-wide">
                                        Effective Rule
                                    </span>
                                    <Badge variant="outline" className="bg-sky-100 text-sky-800">
                                        {RULE_SOURCE_LABELS[rule.ruleSource]}
                                    </Badge>
                                </div>
                                <div className="grid grid-cols-2 gap-3 text-xs md:grid-cols-4">
                                    <div>
                                        <p className="text-muted-foreground">Min GP</p>
                                        <p className="font-mono font-semibold">{formatPercent(rule.minGpPercent)}</p>
                                    </div>
                                    <div>
                                        <p className="text-muted-foreground">Max GP</p>
                                        <p className="font-mono font-semibold">{formatPercent(rule.maxGpPercent)}</p>
                                    </div>
                                    <div>
                                        <p className="text-muted-foreground">Target GP</p>
                                        <p className="font-mono font-semibold">{formatPercent(rule.targetGpPercent)}</p>
                                    </div>
                                    <div>
                                        <p className="text-muted-foreground">Tolerance</p>
                                        <p className="font-mono font-semibold">{formatPercent(rule.tolerancePercent)}</p>
                                    </div>
                                    <div>
                                        <p className="text-muted-foreground">Blocking Variance</p>
                                        <p className="font-mono font-semibold">
                                            {formatPercent(rule.blockingVariancePercent)}
                                        </p>
                                    </div>
                                    <div>
                                        <p className="text-muted-foreground">Enforce Policy</p>
                                        <p className="font-semibold">{rule.enforceGpPolicy ? 'Yes' : 'No'}</p>
                                    </div>
                                    <div>
                                        <p className="text-muted-foreground">Override Category</p>
                                        <p className="font-semibold">{rule.overrideCategoryGpPolicy ? 'Yes' : 'No'}</p>
                                    </div>
                                    <div>
                                        <p className="text-muted-foreground">Company Default</p>
                                        <p className="font-semibold">{rule.isCompanyGpDefault ? 'Yes' : 'No'}</p>
                                    </div>
                                </div>
                            </div>
                        )}

                        {validationResult && (
                            <div className="rounded-md border p-3">
                                <div className="mb-2 flex items-center justify-between">
                                    <span className="text-xs font-semibold uppercase tracking-wide">
                                        Validation Result
                                    </span>
                                    <Badge variant="outline" className={OUTCOME_BADGE_CLASS[validationResult.outcome]}>
                                        {OUTCOME_LABELS[validationResult.outcome]}
                                    </Badge>
                                </div>
                                <div className="grid grid-cols-2 gap-3 text-xs md:grid-cols-4">
                                    <div>
                                        <p className="text-muted-foreground">Cost Basis</p>
                                        <p className="font-mono font-semibold">
                                            {validationResult.costBasis != null
                                                ? `${currencySymbol} ${Number(validationResult.costBasis).toFixed(2)}`
                                                : '—'}
                                        </p>
                                        <p className="text-muted-foreground">
                                            {validationResult.costBasisType || '—'}
                                        </p>
                                    </div>
                                    <div>
                                        <p className="text-muted-foreground">Gross Profit</p>
                                        <p className="font-mono font-semibold">
                                            {formatPercent(validationResult.calculatedGpPercent)}
                                        </p>
                                    </div>
                                    <div>
                                        <p className="text-muted-foreground">Markup</p>
                                        <p className="font-mono font-semibold">
                                            {formatPercent(validationResult.calculatedMarkupPercent)}
                                        </p>
                                    </div>
                                    <div>
                                        <p className="text-muted-foreground">Variance From Target</p>
                                        <p className="font-mono font-semibold">
                                            {formatPercent(validationResult.varianceFromTargetPercent)}
                                        </p>
                                    </div>
                                </div>
                                {validationResult.warning && (
                                    <p className="mt-2 text-xs text-amber-700">{validationResult.warning}</p>
                                )}
                            </div>
                        )}
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="space-y-3 p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <h2 className="text-sm font-semibold">Batch Preview</h2>
                                <p className="text-xs text-muted-foreground">
                                    Validate up to {PRICING_POLICY_PREVIEW_MAX_ITEMS} product prices in one request.
                                </p>
                            </div>
                            <Button
                                onClick={handleRunPreview}
                                disabled={previewMutation.isPending || !previewItems.length}
                                className="flex items-center gap-2"
                            >
                                {previewMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                                Run Preview
                            </Button>
                        </div>

                        {previewItems.length > 0 && (
                            <div className="rounded-md border">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Product</TableHead>
                                            <TableHead className="text-right">Selling Price</TableHead>
                                            <TableHead className="w-10" />
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {previewItems.map((item) => {
                                            const stock = stocks?.find((s) => s.id === item.companyStockDetailId);
                                            return (
                                                <TableRow key={item.companyStockDetailId}>
                                                    <TableCell className="text-xs">
                                                        {stock?.description || '—'}{' '}
                                                        <span className="text-muted-foreground">
                                                            {stock?.itemCode || ''}
                                                        </span>
                                                    </TableCell>
                                                    <TableCell className="text-right font-mono text-xs tabular-nums">
                                                        {currencySymbol} {item.priceExclusive.toFixed(2)}
                                                    </TableCell>
                                                    <TableCell>
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            className="h-8 w-8 p-0 text-red-600 hover:bg-red-50"
                                                            onClick={() =>
                                                                setPreviewItems((prev) =>
                                                                    prev.filter(
                                                                        (
                                                                            p,
                                                                        ) => p.companyStockDetailId !== item.companyStockDetailId,
                                                                    ),
                                                                )
                                                            }
                                                        >
                                                            <Trash2 className="h-4 w-4" />
                                                        </Button>
                                                    </TableCell>
                                                </TableRow>
                                            );
                                        })}
                                    </TableBody>
                                </Table>
                            </div>
                        )}

                        {previewResults.length > 0 && (
                            <div className="rounded-md border">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Product</TableHead>
                                            <TableHead className="text-right">Price</TableHead>
                                            <TableHead className="text-right">Cost Basis</TableHead>
                                            <TableHead className="text-right">GP</TableHead>
                                            <TableHead className="text-right">Markup</TableHead>
                                            <TableHead className="text-right">Variance</TableHead>
                                            <TableHead>Rule</TableHead>
                                            <TableHead>Outcome</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {previewResults.map((row) => {
                                            const stock = stocks?.find((s) => s.id === row.companyStockDetailId);
                                            return (
                                                <TableRow key={row.companyStockDetailId}>
                                                    <TableCell className="text-xs">
                                                        {stock?.description || row.companyStockDetailId}
                                                    </TableCell>
                                                    <TableCell className="text-right font-mono text-xs tabular-nums">
                                                        {row.priceExclusive != null
                                                            ? Number(row.priceExclusive).toFixed(2)
                                                            : '—'}
                                                    </TableCell>
                                                    <TableCell className="text-right font-mono text-xs tabular-nums">
                                                        {row.costBasis != null ? Number(row.costBasis).toFixed(2) : '—'}
                                                    </TableCell>
                                                    <TableCell className="text-right font-mono text-xs tabular-nums">
                                                        {formatPercent(row.calculatedGpPercent)}
                                                    </TableCell>
                                                    <TableCell className="text-right font-mono text-xs tabular-nums">
                                                        {formatPercent(row.calculatedMarkupPercent)}
                                                    </TableCell>
                                                    <TableCell className="text-right font-mono text-xs tabular-nums">
                                                        {formatPercent(row.varianceFromTargetPercent)}
                                                    </TableCell>
                                                    <TableCell className="text-xs">
                                                        {RULE_SOURCE_LABELS[row.ruleSource]}
                                                    </TableCell>
                                                    <TableCell>
                                                        <Badge
                                                            variant="outline"
                                                            className={OUTCOME_BADGE_CLASS[row.outcome]}
                                                        >
                                                            {OUTCOME_LABELS[row.outcome]}
                                                        </Badge>
                                                    </TableCell>
                                                </TableRow>
                                            );
                                        })}
                                    </TableBody>
                                </Table>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </PageLoader>
    );
};

export default CostConsistencyRulesScreen;
