import { ReplenishmentPolicyResolveProps, ReplenishmentRecommendProps } from '@/api-queries/replenishment';

// Scope selection helpers shared by the Replenishment Recommendations,
// Policies and Saved Runs screens.
//
// Only ONE of companyDebtorId / companyDebtorGroupId / warehouseId may ever be
// present on a request payload; scopePayload() guarantees that.

export type ReplenishmentScopeType = 'COMPANY' | 'STORE_GROUP' | 'STORE' | 'WAREHOUSE';

export const ALL_SCOPE_TYPES: ReplenishmentScopeType[] = ['COMPANY', 'STORE_GROUP', 'STORE', 'WAREHOUSE'];

export const REPLENISHMENT_SCOPE_OPTIONS: Array<{ value: ReplenishmentScopeType; label: string }> = [
    { value: 'COMPANY', label: 'Company' },
    { value: 'STORE_GROUP', label: 'Store Group' },
    { value: 'STORE', label: 'Store' },
    { value: 'WAREHOUSE', label: 'Warehouse / DC' },
];

export interface ReplenishmentScope {
    type: ReplenishmentScopeType;
    companyDebtorId?: string;
    companyDebtorGroupId?: string;
    warehouseId?: string;
}

export interface LoginScope {
    // Fixed scope for store / warehouse logins: the selector is hidden entirely.
    fixed?: ReplenishmentScope;
    // Scope types a company-level user may pick from.
    allowedTypes: ReplenishmentScopeType[];
}

export const getLoginScope = (
    user?: { userType?: string; companyDebtorId?: string; warehouseId?: string } | null,
): LoginScope => {
    // Store login: must see only its own store data and no selector. The backend also
    // forces the store scope, so FE must never offer another store id.
    if (user?.userType === 'COMPANY-DEBTOR-USER') {
        return { fixed: { type: 'STORE', companyDebtorId: user.companyDebtorId || '' }, allowedTypes: ['STORE'] };
    }
    // Warehouse / DC login: fixed to the assigned warehouse when there is exactly one.
    // A warehouse manager without a single assignment gets the warehouse-only selector
    // (no Store / Store Group options).
    if (user?.userType === 'WAREHOUSE-USER') {
        if (user.warehouseId) {
            return { fixed: { type: 'WAREHOUSE', warehouseId: user.warehouseId }, allowedTypes: ['WAREHOUSE'] };
        }
        return { allowedTypes: ['WAREHOUSE'] };
    }
    return { allowedTypes: ALL_SCOPE_TYPES };
};

// Returns the location id for the scope (empty string for company-wide scope).
export const scopeId = (scope?: ReplenishmentScope): string => {
    if (!scope) return '';
    if (scope.type === 'STORE') return scope.companyDebtorId || '';
    if (scope.type === 'STORE_GROUP') return scope.companyDebtorGroupId || '';
    if (scope.type === 'WAREHOUSE') return scope.warehouseId || '';
    return '';
};

export const scopeLabel = (type?: ReplenishmentScopeType): string =>
    REPLENISHMENT_SCOPE_OPTIONS.find((o) => o.value === type)?.label || 'Company';

export const scopeLocations = (
    scope: ReplenishmentScope,
): { companyDebtorId?: string; companyDebtorGroupId?: string; warehouseId?: string } => ({
    ...(scope.type === 'STORE' && scope.companyDebtorId ? { companyDebtorId: scope.companyDebtorId } : {}),
    ...(scope.type === 'STORE_GROUP' && scope.companyDebtorGroupId
        ? { companyDebtorGroupId: scope.companyDebtorGroupId }
        : {}),
    ...(scope.type === 'WAREHOUSE' && scope.warehouseId ? { warehouseId: scope.warehouseId } : {}),
});

export const buildRecommendProps = (
    scope: ReplenishmentScope,
    asOfDate: string,
    limit: number,
    includeZeroRecommendations: boolean,
    companyStockDetailIds?: string[],
): ReplenishmentRecommendProps => ({
    ...scopeLocations(scope),
    asOfDate,
    limit,
    includeZeroRecommendations,
    ...(companyStockDetailIds && companyStockDetailIds.length ? { companyStockDetailIds } : {}),
});

export const buildResolveProps = (scope: ReplenishmentScope, asOfDate?: string): ReplenishmentPolicyResolveProps => ({
    ...(scope.type === 'STORE' && scope.companyDebtorId ? { companyDebtorId: scope.companyDebtorId } : {}),
    ...(scope.type === 'STORE_GROUP' && scope.companyDebtorGroupId
        ? { companyDebtorGroupId: scope.companyDebtorGroupId }
        : {}),
    ...(scope.type === 'WAREHOUSE' && scope.warehouseId ? { warehouseId: scope.warehouseId } : {}),
    ...(asOfDate ? { asOfDate } : {}),
});

// Resolve is only requested when a location id is known; company-wide scope has no
// location to resolve against.
export const canResolvePolicy = (scope?: ReplenishmentScope): boolean => !!scope && !!scopeId(scope);
