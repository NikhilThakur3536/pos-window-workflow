import { Badge } from '@/components/ui/badge';
import {
    type AutomationExecutionStatus,
    type AutomationOutputType,
    type AutomationScopeType,
    AUTOMATION_OUTPUT_TYPES,
    AUTOMATION_SCOPE_TYPES,
} from '@/api-queries/replenishment-automation';

// Shared labels / badges for the Replenishment Automation screens.

export const AUTOMATION_SCOPE_LABELS: Record<string, string> = {
    STORE: 'Store',
    COMPANY: 'Company',
    WAREHOUSE: 'Warehouse / DC',
};

export const AUTOMATION_OUTPUT_LABELS: Record<string, string> = {
    STORE_ORDER: 'Store Order',
    PURCHASE_ORDER: 'Purchase Order',
};

export const automationScopeLabel = (scopeType?: string | null): string =>
    (scopeType && AUTOMATION_SCOPE_LABELS[scopeType.toUpperCase()]) || scopeType || '—';

export const automationOutputLabel = (outputType?: string | null): string =>
    (outputType && AUTOMATION_OUTPUT_LABELS[outputType.toUpperCase()]) || outputType || '—';

export const isAutomationScopeType = (value: string): value is AutomationScopeType =>
    (AUTOMATION_SCOPE_TYPES as readonly string[]).includes(value);

export const isAutomationOutputType = (value: string): value is AutomationOutputType =>
    (AUTOMATION_OUTPUT_TYPES as readonly string[]).includes(value);

const EXECUTION_STATUS_COLORS: Record<string, string> = {
    PENDING: 'bg-amber-100 text-amber-800',
    SUCCEEDED: 'bg-emerald-100 text-emerald-700',
    SKIPPED: 'bg-slate-100 text-slate-700',
    FAILED: 'bg-red-100 text-red-700',
};

export const AutomationExecutionStatusBadge = ({ status }: { status?: AutomationExecutionStatus | string }) => {
    const value = (status || 'PENDING').toUpperCase();
    return <Badge className={EXECUTION_STATUS_COLORS[value] || 'bg-gray-100 text-gray-700'}>{value}</Badge>;
};

export const AutomationEnabledBadge = ({ enabled }: { enabled?: boolean }) =>
    enabled ? (
        <Badge className="bg-emerald-100 text-emerald-700">Enabled</Badge>
    ) : (
        <Badge className="bg-gray-100 text-gray-600">Paused</Badge>
    );
