'use client';

import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import {
    ApprovalCountdown,
    ApprovalStatusBadge,
    approvalActionName,
    approvalDocumentLabel,
    approvalEffectiveStatus,
    approvalRequester,
    approvalUserName,
    formatApprovalDate,
} from '@/components/approval/approval-status';
import type { ApprovalRecord } from '@/api-queries/security';
import { CheckCircle2, XCircle } from 'lucide-react';
import { Fragment } from 'react';

interface RequestDetailsDialogProps {
    open: boolean;
    onClose: () => void;
    request: ApprovalRecord | null;
    loading?: boolean;
    error?: string | null;
    mode: 'inbox' | 'history';
    onApprove?: () => void;
    onReject?: () => void;
}

const CONTEXT_LABELS: Record<string, string> = {
    id: 'ID',
    companyId: 'Company',
    domainId: 'Domain',
    terminalId: 'Terminal',
    companyStoreId: 'Store',
    companyDebtorId: 'Debtor',
    warehouseId: 'Warehouse',
    companyStockDetailId: 'Stock item',
    companyStockPricingId: 'Pricing',
    companyStockPricingTypeId: 'Pricing type',
    companyTaxRateId: 'Tax rate',
    pricingPolicyId: 'Pricing policy',
    promotionId: 'Promotion',
    promotionName: 'Promotion name',
    promotionTypeCode: 'Promotion type',
    promotionApplicationSnapshot: 'Promotion application',
    totalPrice: 'Total',
    totalDiscountAmount: 'Total discount',
    manualDiscountAmount: 'Manual discount',
    appliedManualDiscountAmount: 'Applied manual discount',
    pricingBaseUnitPrice: 'Base unit price',
    pricingFinalUnitPrice: 'Final unit price',
    pricingDiscountAmount: 'Pricing discount',
    originalUnitPrice: 'Original unit price',
    promotionalPrice: 'Promotional price',
    appliedPromotionQuantity: 'Applied promotion qty',
    promotionSelection: 'Promotion selection',
    selectedRuleKeys: 'Selected rules',
    excludedRuleKeys: 'Excluded rules',
    tenderTypeId: 'Tender type ID',
    tenderType: 'Tender type',
};

const HIDDEN_CONTEXT_KEYS = new Set([
    'id',
    'reason',
    'timezone',
    'lineKey',
    'ruleKey',
    'selectedRuleKeys',
    'excludedRuleKeys',
    'qualifiedByLineKeys',
    'allocations',
    'pricingBaseUnitPrice',
    'pricingDiscountAmount',
    'pricingFinalUnitPrice',
]);

const isHiddenContextKey = (key: string): boolean => HIDDEN_CONTEXT_KEYS.has(key) || /(^id$|Ids?$)/.test(key);

const hasContextValue = (value: unknown): boolean => {
    if (value === null || value === undefined || value === '') return false;
    if (Array.isArray(value)) return value.length > 0;
    if (isPlainObject(value)) return Object.keys(value).length > 0;
    return true;
};

const humanizeContextKey = (key: string): string => {
    if (CONTEXT_LABELS[key]) return CONTEXT_LABELS[key];
    const spaced = key
        .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
        .replace(/[_-]+/g, ' ')
        .trim();
    return spaced
        .replace(/\bId\b/g, 'ID')
        .replace(/\bUrl\b/g, 'URL')
        .replace(/^./, (char) => char.toUpperCase());
};

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
    typeof value === 'object' && value !== null && !Array.isArray(value);

const formatContextValue = (value: unknown, key: string): string => {
    if (value === null || value === undefined || value === '') return '—';
    if (typeof value === 'boolean') return value ? 'Yes' : 'No';
    if (typeof value === 'number') {
        return Number.isFinite(value) ? value.toLocaleString(undefined, { maximumFractionDigits: 2 }) : String(value);
    }
    if (typeof value === 'string') {
        if (/(At|Date|Time)$/.test(key) && /^\d{4}-\d{2}-\d{2}T/.test(value)) {
            const date = new Date(value);
            if (!Number.isNaN(date.getTime())) return date.toLocaleString();
        }
        return value;
    }
    return String(value);
};

const looksLikeId = (value: unknown): boolean =>
    typeof value === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);

const ContextFieldValue = ({ fieldKey, value }: { fieldKey: string; value: unknown }) => {
    if (Array.isArray(value)) {
        if (!value.length) return <span className="text-muted-foreground">—</span>;
        const primitiveOnly = value.every((item) => item === null || typeof item !== 'object');
        if (primitiveOnly) {
            return <span>{value.map((item) => formatContextValue(item, fieldKey)).join(', ')}</span>;
        }
        return (
            <div className="space-y-2">
                {value.map((item, index) => (
                    <div key={`${fieldKey}-${index}`} className="bg-background rounded-md border p-2">
                        <div className="text-muted-foreground mb-1 text-[11px] font-medium">
                            {humanizeContextKey(fieldKey).replace(/s$/, '')} {index + 1}
                        </div>
                        {isPlainObject(item) ? (
                            <ContextFields value={item} />
                        ) : (
                            <span>{formatContextValue(item, fieldKey)}</span>
                        )}
                    </div>
                ))}
            </div>
        );
    }

    if (isPlainObject(value)) {
        return (
            <div className="bg-muted/20 rounded-md border p-2">
                <ContextFields value={value} />
            </div>
        );
    }

    const text = formatContextValue(value, fieldKey);
    return <span className={looksLikeId(value) ? 'font-mono text-[11px]' : ''}>{text}</span>;
};

const ContextFields = ({ value }: { value: Record<string, unknown> }) => {
    const entries = Object.entries(value).filter(
        ([key, fieldValue]) => !isHiddenContextKey(key) && hasContextValue(fieldValue),
    );
    if (!entries.length) return null;
    return (
        <div className="grid grid-cols-[minmax(120px,160px)_1fr] gap-x-3 gap-y-1 text-xs">
            {entries.map(([key, fieldValue]) => (
                <Fragment key={key}>
                    <span className="text-muted-foreground">{humanizeContextKey(key)}</span>
                    <div className="min-w-0 break-words">
                        <ContextFieldValue fieldKey={key} value={fieldValue} />
                    </div>
                </Fragment>
            ))}
        </div>
    );
};

const SCOPE_LABELS: Record<string, string> = {
    COMPANY: 'Company-wide',
    STORE: 'Store',
    WAREHOUSE: 'Warehouse',
    STORE_GROUP: 'Store group',
};

const approvalGroupLabel = (group: ApprovalRecord['approvalGroup']): string | null => {
    if (!group) return null;
    if (typeof group === 'string') return group;
    if (!group.name) return null;
    return group.approvalLevel != null ? `${group.name} · Level ${group.approvalLevel}` : group.name;
};

const DetailRow = ({ label, value }: { label: string; value: React.ReactNode }) => (
    <div className="grid grid-cols-[150px_1fr] gap-2 text-sm">
        <span className="text-muted-foreground">{label}</span>
        <span className="min-w-0 break-words">{value ?? '—'}</span>
    </div>
);

const RequestDetailsDialog = ({
    open,
    onClose,
    request,
    loading,
    error,
    mode,
    onApprove,
    onReject,
}: RequestDetailsDialogProps) => {
    const status = approvalEffectiveStatus(request);
    const requester = approvalRequester(request);
    const canDecide = mode === 'inbox' && !!request?.canDecide && status === 'PENDING';
    const groupLabel = approvalGroupLabel(request?.approvalGroup);
    const scopeLabel = request?.routingScopeType
        ? SCOPE_LABELS[request.routingScopeType] || humanizeContextKey(request.routingScopeType)
        : [
              request?.companyStoreId ? 'Store' : null,
              request?.warehouseId ? 'Warehouse' : null,
              request?.companyDebtorId ? 'Debtor' : null,
          ]
              .filter(Boolean)
              .join(' · ') || '—';

    return (
        <Dialog open={open} onOpenChange={(value) => !value && onClose()}>
            <DialogContent className="max-h-[90vh] overflow-auto sm:max-w-[720px]">
                <DialogHeader>
                    <DialogTitle className="flex flex-wrap items-center gap-2">
                        <span>{approvalActionName(request)}</span>
                        <ApprovalStatusBadge status={status} />
                    </DialogTitle>
                    <DialogDescription className="font-mono text-xs">
                        {request?.requestReference || request?.id || 'Approval request'}
                    </DialogDescription>
                </DialogHeader>

                {loading ? (
                    <div className="text-muted-foreground py-10 text-center text-sm">Loading request…</div>
                ) : error ? (
                    <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>
                ) : request ? (
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <DetailRow label="Action" value={approvalActionName(request)} />
                            <DetailRow label="Requester" value={approvalUserName(requester)} />
                            <DetailRow label="Document" value={approvalDocumentLabel(request)} />
                            <DetailRow label="Resource" value={request.resourceType || '—'} />
                            <DetailRow label="Scope" value={scopeLabel} />
                            <DetailRow label="Requested" value={formatApprovalDate(request.createdAt)} />
                            <DetailRow
                                label={status === 'APPROVED' ? 'Complete within' : 'Expires'}
                                value={
                                    <span className="flex items-center gap-2">
                                        <span>{formatApprovalDate(request.expiresAt)}</span>
                                        <ApprovalCountdown
                                            expiresAt={request.expiresAt}
                                            fallbackSeconds={request.secondsRemaining}
                                        />
                                    </span>
                                }
                            />
                            {request.reason ? <DetailRow label="Reason" value={request.reason} /> : null}
                            {request.decision ? <DetailRow label="Decision" value={request.decision} /> : null}
                            {request.decisionReason ? (
                                <DetailRow label="Decision reason" value={request.decisionReason} />
                            ) : null}
                            {request.decidedAt ? (
                                <DetailRow label="Decided at" value={formatApprovalDate(request.decidedAt)} />
                            ) : null}
                            {request.approvedByUser ? (
                                <DetailRow label="Decided by" value={approvalUserName(request.approvedByUser)} />
                            ) : null}
                            {groupLabel ? <DetailRow label="Group" value={groupLabel} /> : null}
                        </div>

                        {request.context && Object.keys(request.context).length ? (
                            <div className="space-y-1">
                                <div className="text-muted-foreground text-xs font-medium">Request context</div>
                                <div className="bg-muted/20 max-h-[45vh] overflow-auto rounded-md border p-3">
                                    <ContextFields value={request.context} />
                                </div>
                            </div>
                        ) : null}

                        <Separator />

                        <div className="space-y-2">
                            <div className="text-sm font-medium">Timeline</div>
                            {request.timeline?.length ? (
                                <ol className="space-y-2">
                                    {request.timeline.map((entry, index) => (
                                        <li
                                            key={`${entry.event || 'event'}-${entry.timestamp || index}`}
                                            className="flex gap-3"
                                        >
                                            <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-blue-500" />
                                            <div className="min-w-0 text-sm">
                                                <div className="flex flex-wrap items-center gap-2">
                                                    <span className="font-medium">
                                                        {String(entry.event || 'EVENT').replace(/_/g, ' ')}
                                                    </span>
                                                    <span className="text-muted-foreground text-xs">
                                                        {formatApprovalDate(entry.timestamp)}
                                                    </span>
                                                </div>
                                                {entry.reason ? (
                                                    <div className="text-muted-foreground text-xs">{entry.reason}</div>
                                                ) : null}
                                                {entry.actorUser || entry.actorName ? (
                                                    <div className="text-muted-foreground text-xs">
                                                        {entry.actorUser
                                                            ? approvalUserName(entry.actorUser)
                                                            : entry.actorName}
                                                    </div>
                                                ) : null}
                                                {entry.terminalId ? (
                                                    <div className="text-muted-foreground font-mono text-[11px]">
                                                        Terminal {entry.terminalId}
                                                    </div>
                                                ) : null}
                                            </div>
                                        </li>
                                    ))}
                                </ol>
                            ) : (
                                <div className="text-muted-foreground text-sm">No timeline entries.</div>
                            )}
                        </div>
                    </div>
                ) : null}

                <DialogFooter>
                    <Button type="button" variant="outline" onClick={onClose}>
                        Close
                    </Button>
                    {canDecide ? (
                        <>
                            <Button type="button" variant="destructive" onClick={onReject}>
                                <XCircle className="mr-1 h-4 w-4" />
                                Reject
                            </Button>
                            <Button
                                type="button"
                                className="bg-green-600 text-white hover:bg-green-700"
                                onClick={onApprove}
                            >
                                <CheckCircle2 className="mr-1 h-4 w-4" />
                                Approve
                            </Button>
                        </>
                    ) : null}
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};

export default RequestDetailsDialog;
