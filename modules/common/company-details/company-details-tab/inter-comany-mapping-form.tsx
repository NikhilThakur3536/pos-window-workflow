import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useGetCompanies } from '@/api-queries/company-details';
import { useGetUserGroups } from '@/api-queries/user-groups';
import { toast } from 'sonner';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Edit, Trash2, Plus, ArrowLeft, Building2 } from 'lucide-react';
import DeleteConfirmation from '@/components/custom-components/DeleteConfirmation';
import { InterCompanyTransfer } from '@/api-queries/company-details/multi-company';

interface Props {
    open: boolean;
    onClose: () => void;
    sourceCompanyId: string;
    sourceCompanyName?: string;
    mappings?: InterCompanyTransfer[];
    isMappingsLoading?: boolean;
    onCreate?: (data: { sourceCompanyId: string; destinationCompanyId: string; status: 'ACTIVE' | 'INACTIVE'; childPermissionGroupId: string }) => void;
    onUpdate?: (data: { id: string; destinationCompanyId: string; status: 'ACTIVE' | 'INACTIVE'; childPermissionGroupId: string }) => void;
    onDelete?: (id: string) => void;
    isCreating?: boolean;
    isUpdating?: boolean;
    isDeleting?: boolean;
}

const InterCompanyMappingForm = ({
    open,
    onClose,
    sourceCompanyId,
    sourceCompanyName,
    mappings = [],
    isMappingsLoading = false,
    onCreate,
    onUpdate,
    onDelete,
    isCreating = false,
    isUpdating = false,
    isDeleting = false,
}: Props) => {
    console.log("mappings",mappings)
    const [view, setView] = useState<'list' | 'form'>('list');
    const [editingMapping, setEditingMapping] = useState<InterCompanyTransfer | null>(null);
    const [destinationCompanyId, setDestinationCompanyId] = useState('');
    const [status, setStatus] = useState<'ACTIVE' | 'INACTIVE'>('ACTIVE');
    const [groupId, setGroupId] = useState('');
    const [deleteTarget, setDeleteTarget] = useState<InterCompanyTransfer | null>(null);

    const { data: companiesRes } = useGetCompanies({ limit: 100 });
    const { data: userGroupsRes, isLoading: isGroupsLoading } = useGetUserGroups({
        limit: 100,
        companyId: destinationCompanyId || undefined,
    });

    useEffect(() => {
        if (open) {
            setView('list');
            setEditingMapping(null);
        }
    }, [open, sourceCompanyId]);

    useEffect(() => {
        setGroupId('');
    }, [destinationCompanyId]);

    const companyNameById = (id: string) =>
        companiesRes?.data?.find((c: any) => c.id === id)?.companyName || 'Unknown company';

    const destinationCompanyName = (mapping: InterCompanyTransfer) =>
        mapping.destinationCompany?.companyName || companyNameById(mapping.destinationCompanyId);

    const groupNameById = (id?: string) =>
        userGroupsRes?.data?.find((g) => g.id === id)?.name || 'Unknown group';

    const availableDestinations =
        companiesRes?.data?.filter((c: any) => {
            if (c.id === sourceCompanyId) return false;
            const alreadyMapped = mappings.some(
                (m) => m.destinationCompanyId === c.id && m.id !== editingMapping?.id,
            );
            return !alreadyMapped;
        }) || [];

    const openAddForm = () => {
        setEditingMapping(null);
        setDestinationCompanyId('');
        setStatus('ACTIVE');
        setGroupId('');
        setView('form');
    };

    const openEditForm = (mapping: InterCompanyTransfer) => {
        setEditingMapping(mapping);
        setDestinationCompanyId(mapping.destinationCompanyId);
        setStatus(mapping.status);
        setGroupId(mapping.childPermissionGroupId || '');
        setView('form');
    };

    const handleSubmit = () => {
        if (!destinationCompanyId) {
            toast.error('Please select a destination company');
            return;
        }
        if (!groupId) {
            toast.error('Please select a user group');
            return;
        }
        if (editingMapping) {
            onUpdate?.({ id: editingMapping.id, destinationCompanyId, status, childPermissionGroupId:groupId });
        } else {
            onCreate?.({ sourceCompanyId, destinationCompanyId, status, childPermissionGroupId:groupId });
        }
        setView('list');
    };

    const handleConfirmDelete = () => {
        if (deleteTarget) {
            onDelete?.(deleteTarget.id);
            setDeleteTarget(null);
        }
    };

    return (
        <>
            <Dialog open={open} onOpenChange={onClose}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>
                            {view === 'form'
                                ? `${editingMapping ? 'Edit' : 'Create'} Inter-Company Mapping`
                                : 'Inter-Company Mappings'}
                        </DialogTitle>
                    </DialogHeader>

                    {view === 'list' ? (
                        <div className="space-y-4 py-2">
                            <div>
                                <Label>Source Company</Label>
                                <p className="font-medium">
                                    {sourceCompanyName || companyNameById(sourceCompanyId)}
                                </p>
                            </div>

                            <div className="flex items-center justify-between">
                                <Label>Destination Companies</Label>
                                <Button size="sm" onClick={openAddForm} className="flex items-center gap-1">
                                    <Plus className="h-3.5 w-3.5" />
                                    Add Mapping
                                </Button>
                            </div>

                            <div className="space-y-2 max-h-[320px] overflow-auto">
                                {isMappingsLoading ? (
                                    <p className="text-sm text-muted-foreground">Loading mappings...</p>
                                ) : mappings.length > 0 ? (
                                    mappings.map((mapping) => (
                                        <div
                                            key={mapping.id}
                                            className="flex items-center justify-between rounded-md border p-2"
                                        >
                                            <div className="flex items-center gap-2">
                                                <Building2 className="h-4 w-4 text-muted-foreground shrink-0" />
                                                <span className="text-sm font-medium">
                                                    {destinationCompanyName(mapping)}
                                                </span>
                                                <span className="text-xs text-muted-foreground">
                                                    ({groupNameById(mapping.childPermissionGroupId)})
                                                </span>
                                                <Badge variant={mapping.status === 'ACTIVE' ? 'default' : 'secondary'}>
                                                    {mapping.status === 'ACTIVE' ? 'Active' : 'Inactive'}
                                                </Badge>
                                            </div>
                                            <div className="flex items-center gap-1">
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    className="h-7 w-7 p-0"
                                                    onClick={() => openEditForm(mapping)}
                                                >
                                                    <Edit className="h-3.5 w-3.5" />
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    className="h-7 w-7 p-0 text-red-600 hover:bg-red-50 hover:text-red-700"
                                                    disabled={isDeleting}
                                                    onClick={() => setDeleteTarget(mapping)}
                                                >
                                                    <Trash2 className="h-3.5 w-3.5" />
                                                </Button>
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    <p className="text-sm text-muted-foreground">
                                        No mappings configured yet.
                                    </p>
                                )}
                            </div>

                            <div className="flex justify-end gap-2 pt-2">
                                <Button variant="outline" onClick={onClose}>
                                    Close
                                </Button>
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-4 py-4">
                            <Button
                                variant="ghost"
                                size="sm"
                                className="flex items-center gap-1 px-0 text-muted-foreground"
                                onClick={() => setView('list')}
                            >
                                <ArrowLeft className="h-3.5 w-3.5" />
                                Back to mappings
                            </Button>

                            <div>
                                <Label>Source Company</Label>
                                <p className="font-medium">
                                    {sourceCompanyName || companyNameById(sourceCompanyId)}
                                </p>
                            </div>

                            <div>
                                <Label>Destination Company</Label>
                                <Select value={destinationCompanyId} onValueChange={setDestinationCompanyId}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select destination company" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {availableDestinations.map((comp: any) => (
                                            <SelectItem key={comp.id} value={comp.id}>
                                                {comp.companyName}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div>
                                <Label>User Group</Label>
                                <Select
                                    value={groupId}
                                    onValueChange={setGroupId}
                                    disabled={!destinationCompanyId || isGroupsLoading}
                                >
                                    <SelectTrigger>
                                        <SelectValue
                                            placeholder={
                                                !destinationCompanyId
                                                    ? 'Select destination company first'
                                                    : isGroupsLoading
                                                      ? 'Loading groups...'
                                                      : 'Select user group'
                                            }
                                        />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {userGroupsRes?.data
                                            ?.filter((g) => g.status === 'ACTIVE')
                                            .map((group) => (
                                                <SelectItem key={group.id} value={group.id}>
                                                    {group.name}
                                                </SelectItem>
                                            ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div>
                                <Label>Status</Label>
                                <Select value={status} onValueChange={(v: 'ACTIVE' | 'INACTIVE') => setStatus(v)}>
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="ACTIVE">Active</SelectItem>
                                        <SelectItem value="INACTIVE">Inactive</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="flex justify-end gap-2">
                                <Button variant="outline" onClick={() => setView('list')}>
                                    Cancel
                                </Button>
                                <Button onClick={handleSubmit} disabled={isCreating || isUpdating}>
                                    {editingMapping
                                        ? isUpdating
                                            ? 'Updating...'
                                            : 'Update Mapping'
                                        : isCreating
                                          ? 'Creating...'
                                          : 'Create Mapping'}
                                </Button>
                            </div>
                        </div>
                    )}
                </DialogContent>
            </Dialog>

            <DeleteConfirmation
                open={!!deleteTarget}
                onClose={() => setDeleteTarget(null)}
                title={`Remove mapping to ${deleteTarget ? destinationCompanyName(deleteTarget) : ''}?`}
                description="This mapping will be soft-deactivated (DELETE /api/company/interCompanyTransfers/:id). Debtor visibility, invoicing, and inventory reporting for this destination will stop immediately."
                onConfirm={handleConfirmDelete}
            />
        </>
    );
};

export default InterCompanyMappingForm;