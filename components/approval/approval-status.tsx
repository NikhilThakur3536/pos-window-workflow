'use client';

import { useEffect, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { ApprovalRecord, ApprovalStatus, ApprovalUserSummary } from '@/api-queries/security';

const STATUS_STYLES: Record<string, { label: string; className: string }> = {
    PENDING: { label: 'Pending', className: 'bg-amber-100 text-amber-800 border-amber-200' },
    APPROVED: { label: 'Approved', className: 'bg-emerald-100 text-emerald-800 border-emerald-200' },
    REJECTED: { label: 'Rejected', className: 'bg-red-100 text-red-800 border-red-200' },
    CANCELLED: { label: 'Cancelled', className: 'bg-gray-100 text-gray-700 border-gray-200' },
    EXPIRED: { label: 'Expired', className: 'bg-slate-200 text-slate-700 border-slate-300' },
    CONSUMED: { label: 'Consumed', className: 'bg-blue-100 text-blue-800 border-blue-200' },
};

export const approvalEffectiveStatus = (record?: ApprovalRecord | null): ApprovalStatus =>
    (record?.effectiveStatus || record?.status || 'PENDING') as ApprovalStatus;

export const approvalUserName = (user?: ApprovalUserSummary | null): string => {
    if (!user) return '—';
    const full = [user.firstName, user.surname].filter(Boolean).join(' ').trim();
    return full || user.email || (user.staffNumber != null ? String(user.staffNumber) : '—');
};

export const approvalRequester = (record?: ApprovalRecord | null): ApprovalUserSummary | null =>
    record?.requestedByUser || record?.requester || null;

export const approvalActionName = (record?: ApprovalRecord | null): string =>
    record?.action?.name || record?.actionName || record?.action?.code || record?.actionCode || '—';

export const approvalDocumentLabel = (record?: ApprovalRecord | null): string => {
    if (!record) return '—';
    return record.requestReference || record.resourceId || record.id;
};

export const formatApprovalDate = (value?: string | null): string => {
    if (!value) return '—';
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? '—' : date.toLocaleString();
};

export const secondsUntil = (value?: string | null): number | null => {
    if (!value) return null;
    const time = new Date(value).getTime();
    if (Number.isNaN(time)) return null;
    return Math.max(0, Math.floor((time - Date.now()) / 1000));
};

export const formatCountdown = (totalSeconds: number | null): string => {
    if (totalSeconds == null) return '—';
    if (totalSeconds <= 0) return 'Expired';
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${String(seconds).padStart(2, '0')}`;
};

export function ApprovalStatusBadge({ status, className }: { status?: string; className?: string }) {
    const key = String(status || 'PENDING').toUpperCase();
    const style = STATUS_STYLES[key] || { label: key, className: 'bg-gray-100 text-gray-700' };
    return (
        <Badge variant="outline" className={cn(style.className, className)}>
            {style.label}
        </Badge>
    );
}

export function ApprovalCountdown({
    expiresAt,
    fallbackSeconds,
    className,
}: {
    expiresAt?: string | null;
    fallbackSeconds?: number | null;
    className?: string;
}) {
    const [now, setNow] = useState(() => Date.now());

    useEffect(() => {
        const timer = window.setInterval(() => setNow(Date.now()), 1000);
        return () => window.clearInterval(timer);
    }, []);

    const expiresAtTime = expiresAt ? new Date(expiresAt).getTime() : Number.NaN;
    const seconds = Number.isNaN(expiresAtTime)
        ? fallbackSeconds ?? null
        : Math.max(0, Math.floor((expiresAtTime - now) / 1000));

    return (
        <span
            className={cn(
                'font-mono text-xs tabular-nums',
                seconds != null && seconds <= 60 ? 'font-semibold text-red-600' : 'text-muted-foreground',
                className,
            )}
            title={expiresAt ? new Date(expiresAt).toLocaleString() : undefined}
        >
            {formatCountdown(seconds)}
        </span>
    );
}
