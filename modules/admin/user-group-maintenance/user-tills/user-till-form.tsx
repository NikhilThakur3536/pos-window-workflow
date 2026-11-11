import moment from 'moment-timezone';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Form, FormItem, FormField, FormControl, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

// APIs & Types
import { UserTillDetails, UserTillCreateSchema, userTillCreateSchema } from '@/api-queries/user/user-tills';
import { zodResolverCoerced as zodResolver } from '@/utils/zod-coerced';
import { toast } from 'sonner';
import {
    createTillAssignment,
    CreateTillAssignmentInput,
    useGetEligibleTillsForUser,
} from '@/api-queries/masters/tills';
import { AxiosError } from 'axios';
import { apiUrls } from '@/api-queries';
import { getApiKey } from '@/utils/helpers';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

interface UserTillFormProps {
    open: boolean;
    onClose: () => void;
    editData: UserTillDetails | null;
    userId: string;
    userType: string;
    companyDebtorId?: string;
    canManageAssignments: boolean;
}

const UserTillForm = ({ open, editData, onClose, userId, canManageAssignments }: UserTillFormProps) => {
    const queryClient = useQueryClient();
    const [reason, setReason] = useState('');
    const [confirmOpen, setConfirmOpen] = useState(false);

    const isEditing = !!editData;

    // Assignment and reassignment both go through tillAssign/create. The API never
    // accepts a userId/tillId change through tillAssign/update, and calling create
    // with the same till/user pair is safe: the backend returns the existing active
    // assignment instead of creating a duplicate.
    const form = useForm<UserTillCreateSchema>({
        resolver: zodResolver(userTillCreateSchema),
        defaultValues: {
            tillId: editData?.tillId || '',
            userId,
            timezone: moment.tz.guess(),
        },
    });

    const { handleSubmit, control, formState, watch } = form;
    const selectedTillId = watch('tillId');
    const eligibleQuery = useGetEligibleTillsForUser(userId, open);
    const eligibleTills = eligibleQuery.data?.data.rows || [];
    const selectedTill = eligibleTills.find((till) => till.id === selectedTillId);
    const needsConfirmation = !!selectedTill?.requiresReassignment;
    const assignmentMutation = useMutation({
        mutationFn: createTillAssignment,
        onSuccess: async (response) => {
            if (!response.success) {
                toast.error(response.message || 'Till assignment failed.');
                return;
            }
            toast.success(isEditing ? 'Till assignment updated.' : 'Till assigned successfully.');
            await Promise.all([
                queryClient.invalidateQueries({ queryKey: [getApiKey(apiUrls.userTills)] }),
                queryClient.invalidateQueries({ queryKey: [getApiKey(apiUrls.masters.tills)] }),
                queryClient.invalidateQueries({ queryKey: ['eligible-tills-for-user', userId] }),
            ]);
            form.reset();
            setReason('');
            setConfirmOpen(false);
            onClose();
        },
        onError: async (error) => {
            const axiosError = error as AxiosError<{ message?: string; code?: string }>;
            const message = axiosError.response?.data?.message || 'Till assignment failed.';
            const code = axiosError.response?.data?.code;
            if (
                code === 'TILL_ASSIGNMENT_CHANGED' ||
                code === 'TILL_AVAILABILITY_CHANGED' ||
                /availability (has )?changed/i.test(message)
            ) {
                await Promise.all([
                    queryClient.invalidateQueries({ queryKey: [getApiKey(apiUrls.userTills)] }),
                    queryClient.invalidateQueries({ queryKey: [getApiKey(apiUrls.masters.tills)] }),
                    queryClient.invalidateQueries({ queryKey: ['eligible-tills-for-user', userId] }),
                ]);
                toast.error(message, { description: 'Assignments were refreshed. Review and confirm again.' });
                setConfirmOpen(false);
                return;
            }
            if (code === 'TILL_IN_USE') {
                toast.error(message, { description: 'Cash-up and cashier handover must finish first.' });
                return;
            }
            if (code === 'TILL_ASSIGNMENT_CONFLICT') {
                toast.error(message, { description: 'Resolve the conflicting assignments explicitly first.' });
                return;
            }
            if (code === 'TILL_ROSTER_ACTIVE') {
                toast.error(message, { description: 'Update the standing assignment in Staff Roster first.' });
                return;
            }
            toast.error(message);
        },
    });

    function onSubmit() {
        if (!canManageAssignments) {
            toast.error('The current permissions do not allow this till assignment change.');
            return;
        }
        if (!selectedTill) {
            toast.error('Select an eligible till for this cashier.');
            return;
        }
        if (selectedTill.canAssign === false) {
            toast.error(selectedTill.reason || 'This till is not available for this cashier.');
            return;
        }
        if (needsConfirmation && !reason.trim()) {
            toast.error('Enter a reason for reassignment.');
            return;
        }
        if (needsConfirmation) {
            setConfirmOpen(true);
            return;
        }
        saveAssignment();
    }

    function saveAssignment() {
        if (!selectedTill || selectedTill.canAssign === false || (needsConfirmation && !reason.trim())) return;
        const payload: CreateTillAssignmentInput = {
            tillId: selectedTill.id,
            userId,
            expectedAssignmentId: selectedTill.expectedAssignmentId ?? null,
            expectedUserAssignmentId: selectedTill.expectedUserAssignmentId ?? null,
            ...(needsConfirmation ? { reason: reason.trim() } : {}),
        };
        assignmentMutation.mutate(payload);
    }

    function onOpenChange() {
        form.reset();
        setReason('');
        setConfirmOpen(false);
        onClose();
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[540px]">
                <DialogHeader>
                    <DialogTitle>{isEditing ? 'Reassign Till' : 'Assign New Till'}</DialogTitle>
                </DialogHeader>

                <Form {...form}>
                    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                        <div className="flex-1">
                            <FormField
                                control={control}
                                name="tillId"
                                render={({ field }) => (
                                    <FormItem className="flex-grow">
                                        <FormControl>
                                            <Select onValueChange={field.onChange} value={field.value}>
                                                <SelectTrigger className="border-input !h-10 rounded-md border bg-white px-2 py-1">
                                                    <SelectValue placeholder="Assign a till" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {eligibleTills.map((till) => (
                                                        <SelectItem
                                                            key={till.id}
                                                            value={till.id}
                                                            disabled={till.canAssign === false}
                                                        >
                                                            {till.name} ({till.tillNumber})
                                                            {till.canAssign === false && till.reason
                                                                ? ` — ${till.reason}`
                                                                : ''}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </FormControl>
                                        <FormMessage className="!-mt-2 !text-xs" />
                                    </FormItem>
                                )}
                            />
                            {isEditing && (
                                <p className="text-muted-foreground text-xs">
                                    Reassigning moves this cashier to the selected till. The current assignment is only
                                    replaced once the new till has no open cashier session.
                                </p>
                            )}
                            {eligibleQuery.isError && (
                                <p className="text-destructive text-xs">
                                    {(eligibleQuery.error as AxiosError<{ message?: string }>).response?.data
                                        ?.message || 'Unable to load eligible tills.'}
                                </p>
                            )}
                            {eligibleTills.length === 0 && !eligibleQuery.isLoading && !eligibleQuery.isError && (
                                <p className="text-muted-foreground text-xs">
                                    {eligibleQuery.data?.data.reason ||
                                        'No eligible tills are available for this cashier.'}
                                </p>
                            )}
                            {selectedTill?.reason && (
                                <p
                                    className={`text-xs ${selectedTill.canAssign === false ? 'text-destructive' : 'text-muted-foreground'}`}
                                >
                                    {selectedTill.reason}
                                </p>
                            )}
                            {needsConfirmation && (
                                <p className="text-sm text-amber-900">
                                    This assignment will replace an existing till assignment.
                                </p>
                            )}
                            <div className="space-y-2">
                                <Label htmlFor="profile-till-assignment-reason">
                                    Reason{needsConfirmation ? ' (required)' : ' (optional)'}
                                </Label>
                                <Textarea
                                    id="profile-till-assignment-reason"
                                    value={reason}
                                    onChange={(event) => setReason(event.target.value)}
                                    maxLength={500}
                                    placeholder="Why is this cashier being assigned?"
                                />
                            </div>
                        </div>

                        <div className="flex justify-end gap-3">
                            <Button type="button" variant="outline" onClick={onClose}>
                                Cancel
                            </Button>
                            <Button
                                type="submit"
                                className="bg-blue-600 hover:bg-blue-700"
                                disabled={
                                    assignmentMutation.isPending ||
                                    formState.isSubmitting ||
                                    !canManageAssignments ||
                                    !selectedTill ||
                                    selectedTill.canAssign === false ||
                                    eligibleQuery.isLoading
                                }
                            >
                                {assignmentMutation.isPending
                                    ? 'Saving...'
                                    : isEditing
                                      ? 'Reassign Till'
                                      : 'Assign Till'}
                            </Button>
                        </div>
                    </form>
                </Form>
                <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
                    <DialogContent className="sm:max-w-[480px]">
                        <DialogHeader>
                            <DialogTitle>Confirm assignment replacement</DialogTitle>
                        </DialogHeader>
                        <p className="text-sm">
                            {selectedTill?.name} has an assignment that will be replaced. Continue?
                        </p>
                        <div className="flex justify-end gap-2">
                            <Button type="button" variant="outline" onClick={() => setConfirmOpen(false)}>
                                Cancel
                            </Button>
                            <Button
                                type="button"
                                variant="destructive"
                                disabled={
                                    assignmentMutation.isPending ||
                                    !selectedTill ||
                                    selectedTill.canAssign === false ||
                                    !reason.trim()
                                }
                                onClick={saveAssignment}
                            >
                                Confirm Replacement
                            </Button>
                        </div>
                    </DialogContent>
                </Dialog>
            </DialogContent>
        </Dialog>
    );
};

export default UserTillForm;
