import { useCallback, useEffect, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { AxiosError } from 'axios';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { apiUrls } from '@/api-queries';
import {
    createTillAssignment,
    getTillAssignmentHistory,
    removeTillAssignment,
    TillAssignment,
    TillDetails,
    useGetEligibleTillUsers,
} from '@/api-queries/masters/tills';
import { AlertCircle } from 'lucide-react';
import { getApiKey } from '@/utils/helpers';

const PAGE_SIZE = 25;

const userName = (user?: TillAssignment['user'] | null) =>
    user
        ? user.name || `${user.firstName || ''} ${user.surname || ''}`.trim() || 'Unknown cashier'
        : 'Unknown cashier';

const tillScope = (till: Pick<TillDetails, 'id' | 'name' | 'tillNumber'> & Partial<TillDetails>) =>
    till.companyDebtorId ? `Store${till.companyDebtor?.name ? ` · ${till.companyDebtor.name}` : ''}` : 'Company';

const apiMessage = (error: unknown, fallback: string) => {
    const axiosError = error as AxiosError<{ message?: string }>;
    return axiosError.response?.data?.message || fallback;
};

const apiCode = (error: unknown) => {
    const axiosError = error as AxiosError<{ code?: string; error?: string; errorCode?: string; message?: string }>;
    const response = axiosError.response?.data;
    const knownCodes = ['TILL_IN_USE', 'TILL_ASSIGNMENT_CHANGED', 'TILL_ASSIGNMENT_CONFLICT', 'TILL_ROSTER_ACTIVE'];
    return [response?.code, response?.errorCode, response?.error, response?.message].find((code) =>
        knownCodes.includes(code || ''),
    );
};

interface AssignTillDialogProps {
    till: (Pick<TillDetails, 'id' | 'name' | 'tillNumber'> & Partial<TillDetails>) | null;
    open: boolean;
    onClose: () => void;
    onRefreshRequired: () => void;
}

export function AssignTillDialog({ till, open, onClose, onRefreshRequired }: AssignTillDialogProps) {
    const queryClient = useQueryClient();
    const [search, setSearch] = useState('');
    const [page, setPage] = useState(0);
    const [userId, setUserId] = useState('');
    const [reason, setReason] = useState('');
    const [confirmOpen, setConfirmOpen] = useState(false);
    const eligibleQuery = useGetEligibleTillUsers({
        tillId: till?.id,
        search,
        limit: PAGE_SIZE,
        offset: page * PAGE_SIZE,
    });
    useEffect(() => {
        if (open) {
            setSearch('');
            setPage(0);
            setUserId('');
            setReason('');
            setConfirmOpen(false);
        }
    }, [open, till?.id]);

    const eligibleUsers = eligibleQuery.data?.data.rows || [];
    const selectedUser = eligibleUsers.find((user) => user.id === userId);
    const assignments = till?.assignments || [];
    const hasCurrentTillAssignment = assignments.length > 0;
    const needsConfirmation = hasCurrentTillAssignment || !!selectedUser?.requiresReassignment;

    const createMutation = useMutation({
        mutationFn: createTillAssignment,
        onSuccess: async (response) => {
            if (!response.success) {
                toast.error(response.message || 'Till assignment failed.');
                return;
            }
            toast.success(response.message || 'Cashier assigned successfully.');
            await Promise.all([
                queryClient.invalidateQueries({ queryKey: ['eligible-till-users'] }),
                queryClient.invalidateQueries({ queryKey: [getApiKey(apiUrls.masters.tills)] }),
            ]);
            onRefreshRequired();
            onClose();
        },
        onError: async (error) => {
            const message = apiMessage(error, 'Till assignment failed.');
            const code = apiCode(error);
            if (code === 'TILL_ASSIGNMENT_CHANGED') {
                await Promise.all([
                    queryClient.invalidateQueries({ queryKey: ['eligible-till-users'] }),
                    queryClient.invalidateQueries({ queryKey: [getApiKey(apiUrls.masters.tills)] }),
                ]);
                toast.error(message, {
                    description: 'Assignments were refreshed. Review the current state and confirm again.',
                });
                setUserId('');
                setConfirmOpen(false);
                onRefreshRequired();
                onClose();
                return;
            }
            if (code === 'TILL_IN_USE') {
                toast.error(message, { description: 'Cash-up and cashier handover must finish before reassignment.' });
                return;
            }
            if (code === 'TILL_ASSIGNMENT_CONFLICT') {
                toast.error(message, {
                    description: 'Conflicting assignments must be resolved explicitly before continuing.',
                });
                onRefreshRequired();
                onClose();
                return;
            }
            if (code === 'TILL_ROSTER_ACTIVE') {
                toast.error(message, { description: 'Update the active standing assignment in Staff Roster first.' });
                return;
            }
            toast.error(message);
        },
    });

    const submitAssignment = () => {
        if (!till || !selectedUser) return;
        const cleanedReason = reason.trim();
        if (!cleanedReason) {
            toast.error('Enter a reason for this assignment.');
            return;
        }
        if (assignments.length > 1) {
            toast.error('This till has conflicting assignments. Resolve them explicitly before reassigning.');
            onRefreshRequired();
            onClose();
            return;
        }
        if ((till.assignmentCount || assignments.length) > 0 && !assignments[0]?.id) {
            toast.error('The current till assignment could not be verified. Refresh the till and confirm again.');
            onRefreshRequired();
            return;
        }
        if ((selectedUser.assignments?.length || 0) > 1) {
            toast.error('This cashier has conflicting assignments. Resolve them explicitly before reassigning.');
            onRefreshRequired();
            return;
        }
        if (
            (selectedUser.assignments?.length || selectedUser.requiresReassignment) &&
            !selectedUser.expectedUserAssignmentId
        ) {
            toast.error(
                'The current cashier assignment could not be verified. Refresh the eligible cashiers and confirm again.',
            );
            void eligibleQuery.refetch();
            return;
        }
        createMutation.mutate({
            tillId: till.id,
            userId: selectedUser.id,
            expectedAssignmentId: assignments.length === 1 ? assignments[0].id : null,
            expectedUserAssignmentId: selectedUser.expectedUserAssignmentId ?? null,
            reason: cleanedReason,
        });
        setConfirmOpen(false);
    };

    const close = () => {
        setSearch('');
        setPage(0);
        setUserId('');
        setReason('');
        setConfirmOpen(false);
        onClose();
    };

    const currentTillAssignment = assignments.length === 1 ? assignments[0] : null;
    const otherAssignment = selectedUser?.assignments?.find(
        (assignment) => assignment.id === selectedUser.expectedUserAssignmentId,
    );
    const canSubmit = !!selectedUser?.canAssign && !!reason.trim() && !createMutation.isPending;

    return (
        <Dialog open={open} onOpenChange={(value) => !value && close()}>
            <DialogContent className="sm:max-w-[600px]">
                <DialogHeader>
                    <DialogTitle>Assign Cashier</DialogTitle>
                </DialogHeader>
                {till && (
                    <div className="space-y-4">
                        <div className="bg-muted/30 rounded-md border p-3 text-sm">
                            <div className="font-medium">
                                {till.name} ({till.tillNumber})
                            </div>
                            <div className="text-muted-foreground">{tillScope(till)}</div>
                            <div className="mt-1">
                                Current assignment:{' '}
                                {assignments.length === 0
                                    ? 'Unassigned'
                                    : assignments.length === 1
                                      ? `${userName(currentTillAssignment?.user)}${currentTillAssignment?.user?.staffNumber ? ` · Staff ${currentTillAssignment.user.staffNumber}` : ''}`
                                      : `Conflict · ${assignments.map((assignment) => userName(assignment.user)).join(', ')}`}
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="eligible-cashier-search">Search eligible cashiers</Label>
                            <Input
                                id="eligible-cashier-search"
                                value={search}
                                onChange={(event) => {
                                    setSearch(event.target.value);
                                    setPage(0);
                                    setUserId('');
                                }}
                                placeholder="Search by name or staff number"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Cashier</Label>
                            <Select value={userId} onValueChange={setUserId}>
                                <SelectTrigger>
                                    <SelectValue
                                        placeholder={eligibleQuery.isLoading ? 'Loading cashiers…' : 'Select a cashier'}
                                    />
                                </SelectTrigger>
                                <SelectContent
                                    footer={
                                        <div className="bg-popover flex items-center justify-between gap-2 border-t px-2 py-2">
                                            <span className="text-muted-foreground text-xs">
                                                {eligibleQuery.data?.data.count || 0} cashiers
                                            </span>
                                            <div className="flex gap-2">
                                                <Button
                                                    type="button"
                                                    variant="outline"
                                                    size="sm"
                                                    disabled={page === 0 || eligibleQuery.isFetching}
                                                    onClick={() => setPage((currentPage) => currentPage - 1)}
                                                >
                                                    Previous
                                                </Button>
                                                <Button
                                                    type="button"
                                                    variant="outline"
                                                    size="sm"
                                                    disabled={
                                                        (page + 1) * PAGE_SIZE >=
                                                            (eligibleQuery.data?.data.count || 0) ||
                                                        eligibleQuery.isFetching
                                                    }
                                                    onClick={() => setPage((currentPage) => currentPage + 1)}
                                                >
                                                    Next
                                                </Button>
                                            </div>
                                        </div>
                                    }
                                >
                                    {eligibleUsers.map((user) => {
                                        const currentAssignment = user.assignments?.find(
                                            (assignment) => assignment.id === user.expectedUserAssignmentId,
                                        );
                                        const openShift = (user.openShifts?.length || 0) > 0;
                                        const assignmentLabel = openShift
                                            ? 'Open shift; handover required'
                                            : currentAssignment
                                              ? `Assigned to ${currentAssignment.till?.name || 'another till'}`
                                              : 'Not assigned';
                                        return (
                                            <SelectItem key={user.id} value={user.id} disabled={!user.canAssign}>
                                                {userName(user)}
                                                {user.staffNumber ? ` — Staff ${user.staffNumber}` : ''} —{' '}
                                                {assignmentLabel}
                                                {!user.canAssign && user.reason ? ` (${user.reason})` : ''}
                                            </SelectItem>
                                        );
                                    })}
                                </SelectContent>
                            </Select>
                            {eligibleQuery.isError && (
                                <p className="text-destructive text-sm">
                                    {apiMessage(eligibleQuery.error, 'Unable to load eligible cashiers.')}
                                </p>
                            )}
                            {eligibleUsers.length === 0 && !eligibleQuery.isLoading && !eligibleQuery.isError && (
                                <p className="text-muted-foreground text-sm">No eligible cashiers found.</p>
                            )}
                        </div>

                        {selectedUser?.reason && (
                            <p
                                className={`text-sm ${selectedUser.canAssign ? 'text-muted-foreground' : 'text-destructive'}`}
                            >
                                {selectedUser.reason}
                            </p>
                        )}
                        {selectedUser?.requiresReassignment && (
                            <div className="flex gap-2 rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-950">
                                <AlertCircle className="mt-0.5 size-4 shrink-0" />
                                This cashier already has an assignment. The existing assignment will be replaced.
                            </div>
                        )}
                        <div className="space-y-2">
                            <Label htmlFor="till-assignment-reason">Reason (required)</Label>
                            <Textarea
                                id="till-assignment-reason"
                                value={reason}
                                onChange={(event) => setReason(event.target.value)}
                                maxLength={500}
                                placeholder="Why is this cashier being assigned?"
                            />
                        </div>
                        <div className="flex justify-end gap-2">
                            <Button type="button" variant="outline" onClick={close}>
                                Cancel
                            </Button>
                            <Button
                                type="button"
                                disabled={!canSubmit}
                                onClick={() => (needsConfirmation ? setConfirmOpen(true) : submitAssignment())}
                            >
                                {createMutation.isPending
                                    ? 'Saving…'
                                    : needsConfirmation
                                      ? 'Review Replacement'
                                      : 'Assign Cashier'}
                            </Button>
                        </div>
                    </div>
                )}
            </DialogContent>

            <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
                <DialogContent className="sm:max-w-[480px]">
                    <DialogHeader>
                        <DialogTitle>Confirm assignment replacement</DialogTitle>
                    </DialogHeader>
                    <p className="text-sm">
                        {till && currentTillAssignment
                            ? `${till.name} is assigned to ${userName(currentTillAssignment.user)}. `
                            : ''}
                        {selectedUser && otherAssignment
                            ? `${userName(selectedUser)} is currently assigned to ${otherAssignment.till?.name || 'another till'}. `
                            : ''}
                        Replace these assignments?
                    </p>
                    {(till?.availability === 'IN_USE' || (till?.openShifts?.length || 0) > 0) && (
                        <p className="text-destructive text-sm font-medium">
                            An open financial shift blocks reassignment. Cash-up and handover must finish first.
                        </p>
                    )}
                    <div className="flex justify-end gap-2">
                        <Button type="button" variant="outline" onClick={() => setConfirmOpen(false)}>
                            Cancel
                        </Button>
                        <Button
                            type="button"
                            variant="destructive"
                            disabled={
                                !canSubmit || till?.availability === 'IN_USE' || (till?.openShifts?.length || 0) > 0
                            }
                            onClick={submitAssignment}
                        >
                            Confirm Replacement
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
        </Dialog>
    );
}

interface RemoveTillAssignmentDialogProps {
    till: TillDetails | null;
    open: boolean;
    onClose: () => void;
    onRemoved: () => void;
}

export function RemoveTillAssignmentDialog({ till, open, onClose, onRemoved }: RemoveTillAssignmentDialogProps) {
    const queryClient = useQueryClient();
    const [assignmentId, setAssignmentId] = useState('');
    const removeMutation = useMutation({
        mutationFn: removeTillAssignment,
        onSuccess: async (response) => {
            if (!response.success) {
                toast.error(response.message || 'Assignment removal failed.');
                return;
            }
            toast.success(response.message || 'Assignment removed. Till and financial history were not changed.');
            await queryClient.invalidateQueries({ queryKey: [getApiKey(apiUrls.masters.tills)] });
            onRemoved();
            onClose();
        },
        onError: async (error) => {
            const message = apiMessage(error, 'Assignment removal failed.');
            const code = apiCode(error);
            if (code === 'TILL_IN_USE') {
                toast.error(message, {
                    description: 'Cash-up and cashier handover must finish before removing the assignment.',
                });
                return;
            }
            if (code === 'TILL_ASSIGNMENT_CHANGED') {
                await queryClient.invalidateQueries({ queryKey: [getApiKey(apiUrls.masters.tills)] });
                toast.error(message, {
                    description: 'The till was refreshed. Select the current assignment and confirm again.',
                });
                onRemoved();
                onClose();
                return;
            }
            toast.error(message);
        },
    });
    useEffect(() => {
        if (open) setAssignmentId('');
    }, [open, till?.id]);
    const assignments = till?.assignments || [];
    const selectedAssignment =
        assignments.length === 1 ? assignments[0] : assignments.find((assignment) => assignment.id === assignmentId);

    return (
        <Dialog open={open} onOpenChange={(value) => !value && onClose()}>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle>Remove Cashier Assignment</DialogTitle>
                </DialogHeader>
                {till && (
                    <div className="space-y-4">
                        <p className="text-sm">
                            This removes the assignment only. The till, cash balance, and financial history remain
                            unchanged.
                        </p>
                        {assignments.length > 1 ? (
                            <div className="space-y-2">
                                <Label>Choose the exact assignment to remove</Label>
                                <Select value={assignmentId} onValueChange={setAssignmentId}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select an assignment" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {assignments.map((assignment) => (
                                            <SelectItem key={assignment.id} value={assignment.id}>
                                                {userName(assignment.user)}
                                                {assignment.user?.staffNumber
                                                    ? ` · Staff ${assignment.user.staffNumber}`
                                                    : ''}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        ) : (
                            <p className="rounded-md border p-3 text-sm">
                                {userName(assignments[0]?.user)}
                                {assignments[0]?.user?.staffNumber ? ` · Staff ${assignments[0].user.staffNumber}` : ''}
                            </p>
                        )}
                        {(till.availability === 'IN_USE' || (till.openShifts?.length || 0) > 0) && (
                            <p className="text-destructive text-sm">
                                An open shift blocks removal. Cash-up and handover must finish first.
                            </p>
                        )}
                        {till.actions?.reason && <p className="text-muted-foreground text-xs">{till.actions.reason}</p>}
                        <div className="flex justify-end gap-2">
                            <Button type="button" variant="outline" onClick={onClose}>
                                Cancel
                            </Button>
                            <Button
                                type="button"
                                variant="destructive"
                                disabled={
                                    removeMutation.isPending ||
                                    !selectedAssignment ||
                                    till.availability === 'IN_USE' ||
                                    (till.openShifts?.length || 0) > 0
                                }
                                onClick={() => selectedAssignment && removeMutation.mutate(selectedAssignment.id)}
                            >
                                {removeMutation.isPending ? 'Removing…' : 'Confirm Remove'}
                            </Button>
                        </div>
                    </div>
                )}
            </DialogContent>
        </Dialog>
    );
}

interface TillAssignmentHistoryDialogProps {
    till: TillDetails | null;
    open: boolean;
    onClose: () => void;
}

export function TillAssignmentHistoryDialog({ till, open, onClose }: TillAssignmentHistoryDialogProps) {
    const [status, setStatus] = useState<'ACTIVE' | 'DELETED'>('ACTIVE');
    const [page, setPage] = useState(0);
    const [search, setSearch] = useState('');
    const [history, setHistory] = useState<TillAssignment[]>([]);
    const [count, setCount] = useState(0);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const tillId = till?.id;
    const loadHistory = useCallback(
        async (nextStatus: 'ACTIVE' | 'DELETED', nextPage: number) => {
            if (!tillId) return;
            setLoading(true);
            setError('');
            try {
                const response = await getTillAssignmentHistory({
                    tillId,
                    status: nextStatus,
                    limit: PAGE_SIZE,
                    offset: nextPage * PAGE_SIZE,
                });
                setHistory(response.data.rows);
                setCount(response.data.count);
            } catch (requestError) {
                setError(apiMessage(requestError, 'Unable to load assignment history.'));
            } finally {
                setLoading(false);
            }
        },
        [tillId],
    );

    useEffect(() => {
        if (open && till?.id) {
            setStatus('ACTIVE');
            setPage(0);
            setSearch('');
            void loadHistory('ACTIVE', 0);
        }
    }, [open, till?.id, loadHistory]);

    const filteredHistory = history.filter((assignment) => {
        const query = search.trim().toLowerCase();
        if (!query) return true;
        return `${userName(assignment.user)} ${assignment.user?.staffNumber || ''}`.toLowerCase().includes(query);
    });

    return (
        <Dialog
            open={open}
            onOpenChange={(value) => {
                if (!value) {
                    setPage(0);
                    setSearch('');
                    setStatus('ACTIVE');
                    onClose();
                } else {
                    void loadHistory('ACTIVE', 0);
                }
            }}
        >
            <DialogContent className="sm:max-w-[700px]">
                <DialogHeader>
                    <DialogTitle>Assignments · {till?.name}</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                    <div className="flex flex-wrap items-center gap-2">
                        <Select
                            value={status}
                            onValueChange={(value) => {
                                const nextStatus = value as 'ACTIVE' | 'DELETED';
                                setStatus(nextStatus);
                                setPage(0);
                                void loadHistory(nextStatus, 0);
                            }}
                        >
                            <SelectTrigger className="w-[180px]">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="ACTIVE">Active assignments</SelectItem>
                                <SelectItem value="DELETED">Removed / replaced</SelectItem>
                            </SelectContent>
                        </Select>
                        <Input
                            className="max-w-xs"
                            placeholder="Search cashier / staff number"
                            value={search}
                            onChange={(event) => setSearch(event.target.value)}
                        />
                    </div>
                    {error && <p className="text-destructive text-sm">{error}</p>}
                    {loading ? (
                        <p className="text-muted-foreground py-6 text-center text-sm">Loading assignment history…</p>
                    ) : filteredHistory.length ? (
                        <div className="max-h-[50vh] overflow-auto rounded-md border">
                            <table className="w-full text-sm">
                                <thead className="bg-muted sticky top-0">
                                    <tr>
                                        <th className="p-2 text-left">Cashier</th>
                                        <th className="p-2 text-left">Status</th>
                                        <th className="p-2 text-left">Assigned</th>
                                        <th className="p-2 text-left">Updated / Removed</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredHistory.map((assignment) => (
                                        <tr key={assignment.id} className="border-t">
                                            <td className="p-2">
                                                {userName(assignment.user)}
                                                {assignment.user?.staffNumber
                                                    ? ` · Staff ${assignment.user.staffNumber}`
                                                    : ''}
                                            </td>
                                            <td className="p-2">{assignment.status || status}</td>
                                            <td className="p-2">
                                                {assignment.createdAt
                                                    ? new Date(assignment.createdAt).toLocaleString()
                                                    : '—'}
                                            </td>
                                            <td className="p-2">
                                                {assignment.deletedAt || assignment.updatedAt
                                                    ? new Date(
                                                          assignment.deletedAt || assignment.updatedAt || '',
                                                      ).toLocaleString()
                                                    : '—'}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    ) : (
                        <p className="text-muted-foreground py-6 text-center text-sm">No assignments found.</p>
                    )}
                    <div className="text-muted-foreground flex items-center justify-between text-sm">
                        <span>{count} assignments</span>
                        <div className="flex gap-2">
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                disabled={page === 0 || loading}
                                onClick={() => {
                                    const nextPage = page - 1;
                                    setPage(nextPage);
                                    void loadHistory(status, nextPage);
                                }}
                            >
                                Previous
                            </Button>
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                disabled={(page + 1) * PAGE_SIZE >= count || loading}
                                onClick={() => {
                                    const nextPage = page + 1;
                                    setPage(nextPage);
                                    void loadHistory(status, nextPage);
                                }}
                            >
                                Next
                            </Button>
                        </div>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
