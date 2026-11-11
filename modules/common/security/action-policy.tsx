'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { PageLoader } from '@/components/custom-components/PageLoader';
import {
    useGetSecurityActions,
    useGetSecurityActionPolicy,
    useUpdateSecurityActionPolicy,
    type SecurityAction,
    type SecurityPolicyData,
} from '@/api-queries/security';
import SelectPopover from '@/components/select-popover';
import { toast } from 'sonner';
import { Save } from 'lucide-react';

const ActionPolicy = () => {
    const [actionCode, setActionCode] = useState<string>('');

    const { data: actionsRes, isLoading: actionsLoading } = useGetSecurityActions();
    const actions: SecurityAction[] = actionsRes?.data || [];

    const actionOptions = actions
        .filter((action) => !!action?.code)
        .map((action) => ({
            label: action.name || action.code,
            value: action.code,
        }));

    const policyQuery = useGetSecurityActionPolicy(actionCode || null);
    const policy: SecurityPolicyData | null = policyQuery?.data?.data || null;

    const updateMutation = useUpdateSecurityActionPolicy();

    const [form, setForm] = useState({
        minimumApproverLevel: 0,
        allowedPassword: true,
        allowedFingerprint: false,
        sameStoreOnly: false,
        requireReason: false,
        approvalTtlSeconds: 300,
        status: 'ACTIVE' as 'ACTIVE' | 'INACTIVE',
    });

    // sync form when policy loads
    const [syncedKey, setSyncedKey] = useState<string>('');
    if (actionCode && syncedKey !== actionCode && policyQuery.data) {
        const p = policyQuery.data.data;
        if (p) {
            setForm({
                minimumApproverLevel: p.minimumApproverLevel ?? 0,
                allowedPassword: !p.allowedAuthMethods || p.allowedAuthMethods.includes('PASSWORD'),
                allowedFingerprint: !!p.allowedAuthMethods?.includes('FINGERPRINT'),
                sameStoreOnly: p.sameStoreOnly ?? false,
                requireReason: p.requireReason ?? false,
                approvalTtlSeconds: p.approvalTtlSeconds ?? 300,
                status: p.status ?? 'ACTIVE',
            });
        }
        setSyncedKey(actionCode);
    }

    const onActionChange = (value: string) => {
        setActionCode(value);
        setSyncedKey('');
        setForm({
            minimumApproverLevel: 0,
            allowedPassword: true,
            allowedFingerprint: false,
            sameStoreOnly: false,
            requireReason: false,
            approvalTtlSeconds: 300,
            status: 'ACTIVE',
        });
    };

    const handleSave = () => {
        if (!actionCode) return;
        const allowedAuthMethods: ('PASSWORD' | 'FINGERPRINT')[] = [];
        if (form.allowedPassword) allowedAuthMethods.push('PASSWORD');
        if (form.allowedFingerprint) allowedAuthMethods.push('FINGERPRINT');

        updateMutation.mutate(
            {
                actionCode,
                minimumApproverLevel: Number(form.minimumApproverLevel) || 0,
                allowedAuthMethods,
                sameStoreOnly: form.sameStoreOnly,
                requireReason: form.requireReason,
                approvalTtlSeconds: Number(form.approvalTtlSeconds) || 0,
                status: form.status,
            },
            {
                onSuccess: (data) => {
                    if (data.success) {
                        toast.success('Action policy saved');
                    } else {
                        toast.error(data.message || 'Save failed');
                    }
                },
                onError: (error) => {
                    // @ts-ignore
                    toast.error(error?.response?.data?.message || 'Internal Server Error!');
                },
            },
        );
    };

    const isLoading = actionsLoading || policyQuery.isLoading;

    return (
        <PageLoader isLoading={isLoading}>
            <div className="space-y-4 px-2">
                <div className="flex flex-wrap items-end justify-between gap-3">
                    <div className="min-w-[280px]">
                        <div className="mb-1 text-sm font-medium text-muted-foreground">Select Action</div>
                        <SelectPopover
                            title="Action"
                            onlyTitle="Select an action"
                            selectedValue={actionCode}
                            options={actionOptions}
                            onSelect={(value) => onActionChange(String(value || ''))}
                        />
                    </div>
                    <Button
                        className="bg-blue-600 hover:bg-blue-700"
                        disabled={!actionCode || updateMutation.isPending}
                        onClick={handleSave}
                    >
                        <Save className="mr-1 h-4 w-4" /> Save Policy
                    </Button>
                </div>

                {!actionCode ? (
                    <Card>
                        <CardContent className="py-10 text-center text-sm text-muted-foreground">
                            Select an action to configure its approval policy.
                        </CardContent>
                    </Card>
                ) : (
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-sm">Action Policy — {actionCode}</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="flex items-start gap-4">
                                <Label className="mt-2 min-w-[200px] text-sm font-medium">Minimum Approver Level</Label>
                                <div className="flex-1">
                                    <Input
                                        type="number"
                                        min={0}
                                        max={99}
                                        value={form.minimumApproverLevel}
                                        onChange={(e) =>
                                            setForm((prev) => ({ ...prev, minimumApproverLevel: Number(e.target.value) }))
                                        }
                                    />
                                    <p className="mt-1 text-xs text-muted-foreground">
                                        A supervisor&apos;s group level must be at least this value to approve.
                                    </p>
                                </div>
                            </div>

                            <div className="flex items-start gap-4">
                                <Label className="mt-2 min-w-[200px] text-sm font-medium">Allowed Auth Methods</Label>
                                <div className="flex flex-col gap-2">
                                    <div className="flex items-center gap-2">
                                        <Checkbox
                                            checked={form.allowedPassword}
                                            onCheckedChange={(v) =>
                                                setForm((prev) => ({ ...prev, allowedPassword: Boolean(v) }))
                                            }
                                        />
                                        <span className="text-sm">Password</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Checkbox
                                            checked={form.allowedFingerprint}
                                            onCheckedChange={(v) =>
                                                setForm((prev) => ({ ...prev, allowedFingerprint: Boolean(v) }))
                                            }
                                        />
                                        <span className="text-sm">Fingerprint</span>
                                    </div>
                                </div>
                            </div>

                            <div className="flex items-start gap-4">
                                <Label className="mt-2 min-w-[200px] text-sm font-medium">Same Store Only</Label>
                                <div className="flex items-center gap-2 pt-1">
                                    <Checkbox
                                        checked={form.sameStoreOnly}
                                        onCheckedChange={(v) => setForm((prev) => ({ ...prev, sameStoreOnly: Boolean(v) }))}
                                    />
                                    <span className="text-sm text-muted-foreground">
                                        Approver must be from the same store when configured
                                    </span>
                                </div>
                            </div>

                            <div className="flex items-start gap-4">
                                <Label className="mt-2 min-w-[200px] text-sm font-medium">Require Reason</Label>
                                <div className="flex items-center gap-2 pt-1">
                                    <Checkbox
                                        checked={form.requireReason}
                                        onCheckedChange={(v) => setForm((prev) => ({ ...prev, requireReason: Boolean(v) }))}
                                    />
                                    <span className="text-sm text-muted-foreground">
                                        Require a reason to be provided for this action
                                    </span>
                                </div>
                            </div>

                            <div className="flex items-start gap-4">
                                <Label className="mt-2 min-w-[200px] text-sm font-medium">Approval TTL (seconds)</Label>
                                <div className="flex-1">
                                    <Input
                                        type="number"
                                        min={0}
                                        value={form.approvalTtlSeconds}
                                        onChange={(e) =>
                                            setForm((prev) => ({ ...prev, approvalTtlSeconds: Number(e.target.value) }))
                                        }
                                    />
                                </div>
                            </div>

                            <div className="flex items-start gap-4">
                                <Label className="mt-2 min-w-[200px] text-sm font-medium">Status</Label>
                                <div className="flex gap-2">
                                    <Button
                                        type="button"
                                        size="sm"
                                        variant={form.status === 'ACTIVE' ? 'default' : 'outline'}
                                        onClick={() => setForm((prev) => ({ ...prev, status: 'ACTIVE' }))}
                                    >
                                        Active
                                    </Button>
                                    <Button
                                        type="button"
                                        size="sm"
                                        variant={form.status === 'INACTIVE' ? 'default' : 'outline'}
                                        onClick={() => setForm((prev) => ({ ...prev, status: 'INACTIVE' }))}
                                    >
                                        Inactive
                                    </Button>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                )}
            </div>
        </PageLoader>
    );
};

export default ActionPolicy;
