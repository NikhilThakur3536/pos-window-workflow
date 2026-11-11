import React from 'react';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import SelectPopover from '@/components/select-popover';
import { useDebtorList } from '@/api-queries/debtor';
import { debtorGroupLabel, useGetDebtorGroups } from '@/api-queries/debtor/company-debtor-group';
import { useGetWarehouses } from '@/api-queries/warehouse';
import { ReplenishmentPolicy } from '@/api-queries/replenishment';
import { SYSTEM_MODULES, SYSTEM_PERMISSIONS } from '@/lib/constant';
import { hasPermission } from '@/components/permission-guards';
import useUsersPermissions from '@/components/permission-guards/useUsersPermissions';
import { cn } from '@/lib/utils';
import {
    ReplenishmentScope,
    ReplenishmentScopeType,
    REPLENISHMENT_SCOPE_OPTIONS,
    scopeId,
    scopeLabel,
} from './scope';

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export const REPLENISHMENT_TAB_HREFS = {
    recommendations: '/processing/replenishment',
    history: '/processing/replenishment/history',
    policies: '/processing/replenishment/policies',
    automation: '/processing/replenishment/automation',
} as const;

export type ReplenishmentTabId = keyof typeof REPLENISHMENT_TAB_HREFS;

// Shared header tabs: Recommendations / Saved Runs / Policy Settings / Automation.
// The Automation tab is only rendered for the users that may see the automation
// module in the menu, so a user never lands on an access-denied screen.
export const ReplenishmentTabs = ({ active }: { active: ReplenishmentTabId }) => {
    const userGroupPermissions = useUsersPermissions();
    const showAutomation = hasPermission(
        userGroupPermissions,
        SYSTEM_MODULES.PROCESSING.REPLENISHMENT_RECOMMENDATIONS.AUTOMATION.code,
        [SYSTEM_PERMISSIONS.SHOW_IN_MENU],
    );

    const tabs = [
        { id: 'recommendations' as const, label: 'Recommendations', href: REPLENISHMENT_TAB_HREFS.recommendations },
        { id: 'history' as const, label: 'Saved Runs', href: REPLENISHMENT_TAB_HREFS.history },
        { id: 'policies' as const, label: 'Policy Settings', href: REPLENISHMENT_TAB_HREFS.policies },
        ...(showAutomation
            ? [{ id: 'automation' as const, label: 'Automation', href: REPLENISHMENT_TAB_HREFS.automation }]
            : []),
    ];

    const activeIndex = Math.max(
        tabs.findIndex((tab) => tab.id === active),
        0,
    );

    return (
        <nav className="flex items-center gap-4 border-b">
            {tabs.map((tab, i) => (
                <Link
                    key={tab.href}
                    href={tab.href}
                    className={cn(
                        '-mb-px border-b-2 px-1 py-2 text-sm transition-colors',
                        i === activeIndex
                            ? 'border-blue-600 font-medium text-blue-700'
                            : 'border-transparent text-muted-foreground hover:text-foreground',
                    )}
                >
                    {tab.label}
                </Link>
            ))}
        </nav>
    );
};

interface ScopeSelectorProps {
    value: ReplenishmentScope;
    onChange: (scope: ReplenishmentScope) => void;
    allowedTypes?: ReplenishmentScopeType[];
    // Fixed scope for store / warehouse logins: renders a read-only chip, no selector.
    fixed?: ReplenishmentScope;
    disabled?: boolean;
    wrapperClass?: string;
}

// Scope selector that enforces "only one of companyDebtorId / companyDebtorGroupId /
// warehouseId" by construction. Store and warehouse logins receive a fixed scope and
// never see the selectors at all.
export const ScopeSelector = ({ value, onChange, allowedTypes, fixed, disabled, wrapperClass }: ScopeSelectorProps) => {
    const stores = useDebtorList({ limit: 500 })?.data?.data?.rows;
    const groups = useGetDebtorGroups({ limit: 500 })?.data?.data?.rows;
    const warehousesRes = useGetWarehouses({ limit: 500 })?.data?.data;
    const warehouses: { id: string; name: string }[] = Array.isArray(warehousesRes) ? warehousesRes : [];

    const type = fixed ? fixed.type : value.type;
    const id = scopeId(fixed || value);
    const storeName = (stores || []).find((d) => d.id === id)?.name || id;
    const warehouseName = warehouses.find((w) => w.id === id)?.name || id;

    if (fixed) {
        const label = type === 'STORE' ? storeName : type === 'WAREHOUSE' ? warehouseName : '';
        return (
            <div className={cn('flex items-center gap-2', wrapperClass)}>
                <Label className="text-xs text-muted-foreground">Scope</Label>
                <Badge variant="outline" className="flex items-center gap-1 bg-blue-50 px-2 py-1 text-xs text-blue-800">
                    {scopeLabel(type)}: {label}
                </Badge>
            </div>
        );
    }

    const typeOptions = REPLENISHMENT_SCOPE_OPTIONS.filter(
        (o) => !allowedTypes || allowedTypes.length === 0 || allowedTypes.includes(o.value),
    );
    const currentType = typeOptions.some((o) => o.value === type) ? type : (typeOptions[0]?.value ?? 'COMPANY');

    const handleTypeChange = (nextType: string) => {
        onChange({ type: nextType as ReplenishmentScopeType });
    };

    const clearOnEmpty = (next: string | null | undefined) => next && next !== '' ? next : undefined;

    return (
        <div className={cn('flex flex-wrap items-end gap-2', wrapperClass)}>
            <div className="min-w-[170px]">
                <Label className="text-xs text-muted-foreground">Scope</Label>
                <select
                    value={currentType}
                    onChange={(e) => handleTypeChange(e.target.value)}
                    disabled={disabled}
                    className="mt-1 h-8 w-full rounded-md border border-input bg-background px-2 text-sm focus:outline-none disabled:opacity-60"
                >
                    {typeOptions.map((o) => (
                        <option key={o.value} value={o.value}>
                            {o.label}
                        </option>
                    ))}
                </select>
            </div>

            {currentType === 'STORE' && (
                <SelectPopover
                    title="Store"
                    options={(stores || []).map((d) => ({ value: d.id, label: d.name }))}
                    selectedValue={value.companyDebtorId || null}
                    onSelect={(v) => onChange({ ...value, companyDebtorId: clearOnEmpty(v) })}
                    disabled={disabled}
                    selectClass="h-8 text-sm"
                    wrapperClass="min-w-[200px]"
                />
            )}

            {currentType === 'STORE_GROUP' && (
                <SelectPopover
                    title="Store Group"
                    options={(groups || []).map((g) => ({ value: g.id, label: debtorGroupLabel(g) }))}
                    selectedValue={value.companyDebtorGroupId || null}
                    onSelect={(v) => onChange({ ...value, companyDebtorGroupId: clearOnEmpty(v) })}
                    disabled={disabled}
                    selectClass="h-8 text-sm"
                    wrapperClass="min-w-[200px]"
                />
            )}

            {currentType === 'WAREHOUSE' && (
                <SelectPopover
                    title="Warehouse / DC"
                    options={warehouses.map((w) => ({ value: w.id, label: w.name }))}
                    selectedValue={value.warehouseId || null}
                    onSelect={(v) => onChange({ ...value, warehouseId: clearOnEmpty(v) })}
                    disabled={disabled}
                    selectClass="h-8 text-sm"
                    wrapperClass="min-w-[200px]"
                />
            )}

            {currentType === 'COMPANY' && (
                <span className="mb-1.5 text-xs text-muted-foreground">
                    Company-wide: no store, group or warehouse is sent.
                </span>
            )}
        </div>
    );
};

// Effective-policy display used by the Recommendations and Policies screens.
export const PolicySummary = ({ policy, isLoading }: { policy?: ReplenishmentPolicy | null; isLoading?: boolean }) => {
    if (isLoading) return <span className="text-xs text-muted-foreground">Resolving effective policy…</span>;
    if (!policy)
        return (
            <span className="text-xs text-muted-foreground">
                No stored policy for this location — system defaults apply.
            </span>
        );

    const source = policy.sourceLabel || policy.sourceType || policy.source || 'Effective policy';
    const fmtMonth = (m?: number) => (m && m >= 1 && m <= 12 ? MONTH_NAMES[m - 1] : '—');

    return (
        <div className="rounded-md border border-blue-200 bg-blue-50/60 px-3 py-2 text-xs text-blue-900">
            <div className="font-semibold">Policy source: {source}</div>
            <div className="mt-1 grid grid-cols-2 gap-x-6 gap-y-0.5 sm:grid-cols-3">
                <span>Lookback: {policy.lookbackDays ?? '—'} days</span>
                <span>Cover: {policy.coverDays ?? '—'} days</span>
                <span>Uplift: {policy.seasonalUpliftPercent ?? '—'}%</span>
                <span>
                    Season: {fmtMonth(policy.seasonalStartMonth)} – {fmtMonth(policy.seasonalEndMonth)}
                </span>
                <span>Incoming stock: {policy.includeIncomingStock ? 'Included' : 'Excluded'}</span>
                <span>Reserved demand: {policy.includeReservedDemand ? 'Included' : 'Excluded'}</span>
            </div>
        </div>
    );
};

const RUN_STATUS_COLORS: Record<string, string> = {
    PROPOSED: 'bg-amber-100 text-amber-800',
    APPROVED: 'bg-emerald-100 text-emerald-700',
    REJECTED: 'bg-red-100 text-red-700',
    CONVERTED: 'bg-blue-100 text-blue-700',
};

export const RunStatusBadge = ({ status }: { status?: string }) => {
    const s = (status || 'PROPOSED').toUpperCase();
    return <Badge className={RUN_STATUS_COLORS[s] || 'bg-gray-100 text-gray-700'}>{s}</Badge>;
};
