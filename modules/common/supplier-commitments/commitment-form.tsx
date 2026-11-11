import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import SelectPopover from '@/components/select-popover';
import ApprovalDialog from '@/components/approval/ApprovalDialog';
import { toast } from 'sonner';
import { useCreditorList } from '@/api-queries/creditor';
import { useCompanyStockDetailsList } from '@/api-queries/company/stock-details';
import { useGetCategories } from '@/api-queries/categories';
import { useDebtorList } from '@/api-queries/debtor';
import { useGetWarehouses, type WarehouseDetails } from '@/api-queries/warehouse';
import { useGetSupplierDeals } from '@/api-queries/goods-receiving/supplier-deals';
import {
    useCreateSupplierCommitment,
    useUpdateSupplierCommitment,
    type SaveSupplierCommitmentInput,
    type SupplierCommitmentDetails,
} from '@/api-queries/goods-receiving/supplier-commitments';
import { useApprovalAction } from '@/hooks/use-approval-action';

interface CommitmentFormProps {
    open: boolean;
    onClose: () => void;
    editData: SupplierCommitmentDetails | null;
    onSaved: () => void;
}

interface CommitmentFormState {
    commitmentCode: string;
    name: string;
    companyCreditorId: string;
    companyStockDetailId: string;
    categoryId: string;
    companyDebtorId: string;
    companyWarehouseId: string;
    supplierDealId: string;
    periodStart: string;
    periodEnd: string;
    committedQuantity: string;
    committedValue: string;
    allowOverCommitment: boolean;
    notes: string;
}

const emptyForm: CommitmentFormState = {
    commitmentCode: '',
    name: '',
    companyCreditorId: '',
    companyStockDetailId: '',
    categoryId: '',
    companyDebtorId: '',
    companyWarehouseId: '',
    supplierDealId: '',
    periodStart: '',
    periodEnd: '',
    committedQuantity: '',
    committedValue: '',
    allowOverCommitment: false,
    notes: '',
};

const dateOnly = (value?: string | null) => (value ? String(value).slice(0, 10) : '');

const CommitmentForm = ({ open, onClose, editData, onSaved }: CommitmentFormProps) => {
    const createMutation = useCreateSupplierCommitment();
    const updateMutation = useUpdateSupplierCommitment();
    const approval = useApprovalAction();

    const creditors = useCreditorList({ limit: 500 })?.data?.data?.rows || [];
    const stocks = useCompanyStockDetailsList({ limit: 500 })?.data?.data?.rows || [];
    const categories = useGetCategories({ limit: 500 })?.data?.data?.rows || [];
    const debtors = useDebtorList({ limit: 500 })?.data?.data?.rows || [];
    const deals = useGetSupplierDeals({ limit: 500 })?.data?.data?.rows || [];
    const rawWarehouses = (useGetWarehouses({ limit: 1000, offset: 0 })?.data?.data || []) as
        | WarehouseDetails[]
        | { count?: number; rows?: WarehouseDetails[] };
    const warehouses = Array.isArray(rawWarehouses) ? rawWarehouses : rawWarehouses?.rows || [];

    const [form, setForm] = useState<CommitmentFormState>(emptyForm);

    useEffect(() => {
        if (!open) return;
        setForm(
            editData
                ? {
                      commitmentCode: editData.commitmentCode || '',
                      name: editData.name || '',
                      companyCreditorId: editData.companyCreditorId || '',
                      companyStockDetailId: editData.companyStockDetailId || '',
                      categoryId: editData.categoryId || '',
                      companyDebtorId: editData.companyDebtorId || '',
                      companyWarehouseId: editData.companyWarehouseId || '',
                      supplierDealId: editData.supplierDealId || '',
                      periodStart: dateOnly(editData.periodStart),
                      periodEnd: dateOnly(editData.periodEnd),
                      committedQuantity:
                          editData.committedQuantity == null ? '' : String(editData.committedQuantity),
                      committedValue: editData.committedValue == null ? '' : String(editData.committedValue),
                      allowOverCommitment: !!editData.allowOverCommitment,
                      notes: editData.notes || '',
                  }
                : emptyForm,
        );
    }, [open, editData]);

    const set = <K extends keyof CommitmentFormState>(key: K, value: CommitmentFormState[K]) =>
        setForm((current) => ({ ...current, [key]: value }));

    const numberOrNull = (value: string) => {
        if (!value.trim()) return null;
        const parsed = Number(value);
        return Number.isFinite(parsed) ? parsed : null;
    };

    const handleSubmit = async () => {
        if (!form.commitmentCode.trim()) return toast.error('Commitment code is required');
        if (!form.name.trim()) return toast.error('Name is required');
        if (!form.companyCreditorId) return toast.error('Supplier is required');
        if (!form.periodStart) return toast.error('Period start is required');
        if (!form.periodEnd) return toast.error('Period end is required');
        if (!numberOrNull(form.committedQuantity) && !numberOrNull(form.committedValue)) {
            return toast.error('Enter a committed quantity or value');
        }

        const payload: SaveSupplierCommitmentInput = {
            ...(editData?.id ? { id: editData.id } : {}),
            commitmentCode: form.commitmentCode.trim(),
            name: form.name.trim(),
            companyCreditorId: form.companyCreditorId,
            companyStockDetailId: form.companyStockDetailId || null,
            categoryId: form.categoryId || null,
            companyDebtorId: form.companyDebtorId || null,
            companyWarehouseId: form.companyWarehouseId || null,
            supplierDealId: form.supplierDealId || null,
            periodStart: form.periodStart,
            periodEnd: form.periodEnd,
            committedQuantity: numberOrNull(form.committedQuantity),
            committedValue: numberOrNull(form.committedValue),
            allowOverCommitment: form.allowOverCommitment,
            notes: form.notes.trim() || null,
        };

        const mutation = editData?.id ? updateMutation : createMutation;
        await approval.run(async (approvalToken) => {
            const response = await mutation.mutateAsync({
                ...payload,
                ...(approvalToken ? { approvalToken } : {}),
            });
            if (response?.success === false) {
                toast.error(response.message || 'Supplier commitment could not be saved');
                return;
            }
            toast.success(editData?.id ? 'Supplier commitment updated' : 'Supplier commitment created');
            onSaved();
            onClose();
        }, editData?.id ? 'Update Supplier Commitment' : 'Create Supplier Commitment');
    };

    const isBusy = createMutation.isPending || updateMutation.isPending;

    return (
        <>
            <Dialog open={open} onOpenChange={(next) => !next && !isBusy && onClose()}>
                <DialogContent className="sm:max-w-3xl">
                    <DialogHeader>
                        <DialogTitle>
                            {editData ? 'Edit Supplier Commitment' : 'Create Supplier Commitment'}
                        </DialogTitle>
                        <DialogDescription>
                            Track committed purchase quantity or value for a supplier over a period.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="max-h-[70vh] space-y-4 overflow-y-auto pr-1">
                        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                            <div>
                                <Label>Commitment Code</Label>
                                <Input
                                    className="mt-1"
                                    value={form.commitmentCode}
                                    onChange={(event) => set('commitmentCode', event.target.value)}
                                    placeholder="COM-2026-001"
                                />
                            </div>
                            <div>
                                <Label>Name</Label>
                                <Input
                                    className="mt-1"
                                    value={form.name}
                                    onChange={(event) => set('name', event.target.value)}
                                    placeholder="Quarterly purchase commitment"
                                />
                            </div>
                            <div>
                                <Label>Supplier</Label>
                                <div className="mt-1">
                                    <SelectPopover
                                        title="Supplier"
                                        onlyTitle="Select supplier"
                                        selectedValue={form.companyCreditorId}
                                        options={creditors.map((creditor) => ({
                                            label: creditor.name,
                                            value: creditor.id,
                                        }))}
                                        onSelect={(value) => set('companyCreditorId', String(value || ''))}
                                    />
                                </div>
                            </div>
                            <div>
                                <Label>Supplier Deal (optional)</Label>
                                <div className="mt-1">
                                    <SelectPopover
                                        title="Supplier Deal"
                                        onlyTitle="No specific deal"
                                        selectedValue={form.supplierDealId}
                                        options={deals.map((deal) => ({
                                            label: deal.description || deal.unitCode || deal.id,
                                            value: deal.id,
                                        }))}
                                        onSelect={(value) => set('supplierDealId', String(value || ''))}
                                    />
                                </div>
                            </div>
                            <div>
                                <Label>Period Start</Label>
                                <Input
                                    type="date"
                                    className="mt-1"
                                    value={form.periodStart}
                                    onChange={(event) => set('periodStart', event.target.value)}
                                />
                            </div>
                            <div>
                                <Label>Period End</Label>
                                <Input
                                    type="date"
                                    className="mt-1"
                                    value={form.periodEnd}
                                    onChange={(event) => set('periodEnd', event.target.value)}
                                />
                            </div>
                            <div>
                                <Label>Committed Quantity</Label>
                                <Input
                                    type="number"
                                    min={0}
                                    className="mt-1"
                                    value={form.committedQuantity}
                                    onChange={(event) => set('committedQuantity', event.target.value)}
                                />
                            </div>
                            <div>
                                <Label>Committed Value</Label>
                                <Input
                                    type="number"
                                    min={0}
                                    step="0.01"
                                    className="mt-1"
                                    value={form.committedValue}
                                    onChange={(event) => set('committedValue', event.target.value)}
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                            <div>
                                <Label>Stock Item (optional)</Label>
                                <div className="mt-1">
                                    <SelectPopover
                                        title="Stock Item"
                                        onlyTitle="All stock items"
                                        selectedValue={form.companyStockDetailId}
                                        options={stocks.map((stock) => ({
                                            label: stock.description || stock.itemCode || stock.id,
                                            value: stock.id,
                                        }))}
                                        onSelect={(value) => set('companyStockDetailId', String(value || ''))}
                                    />
                                </div>
                            </div>
                            <div>
                                <Label>Category (optional)</Label>
                                <div className="mt-1">
                                    <SelectPopover
                                        title="Category"
                                        onlyTitle="All categories"
                                        selectedValue={form.categoryId}
                                        options={categories.map((category) => ({
                                            label: category.name,
                                            value: category.id,
                                        }))}
                                        onSelect={(value) => set('categoryId', String(value || ''))}
                                    />
                                </div>
                            </div>
                            <div>
                                <Label>Store (optional)</Label>
                                <div className="mt-1">
                                    <SelectPopover
                                        title="Store"
                                        onlyTitle="All stores"
                                        selectedValue={form.companyDebtorId}
                                        options={debtors.map((debtor) => ({
                                            label: debtor.name,
                                            value: debtor.id,
                                        }))}
                                        onSelect={(value) => set('companyDebtorId', String(value || ''))}
                                    />
                                </div>
                            </div>
                            <div>
                                <Label>Warehouse (optional)</Label>
                                <div className="mt-1">
                                    <SelectPopover
                                        title="Warehouse"
                                        onlyTitle="All warehouses"
                                        selectedValue={form.companyWarehouseId}
                                        options={warehouses.map((warehouse) => ({
                                            label: warehouse.warehouse || warehouse.name || warehouse.id,
                                            value: warehouse.id,
                                        }))}
                                        onSelect={(value) => set('companyWarehouseId', String(value || ''))}
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="flex items-center gap-2">
                            <Checkbox
                                id="allow-over-commitment"
                                checked={form.allowOverCommitment}
                                onCheckedChange={(checked) => set('allowOverCommitment', checked === true)}
                            />
                            <Label htmlFor="allow-over-commitment">Allow consumption above the commitment</Label>
                        </div>

                        <div>
                            <Label>Notes</Label>
                            <Textarea
                                className="mt-1"
                                rows={3}
                                value={form.notes}
                                onChange={(event) => set('notes', event.target.value)}
                            />
                        </div>
                    </div>

                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={onClose} disabled={isBusy}>
                            Cancel
                        </Button>
                        <Button type="button" onClick={handleSubmit} disabled={isBusy}>
                            {isBusy ? 'Saving…' : editData ? 'Update Commitment' : 'Create Commitment'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <ApprovalDialog
                open={approval.openApproval}
                onClose={approval.closeApproval}
                approvalRequestId={approval.approval?.approvalRequestId}
                allowedMethods={approval.approval?.allowedMethods}
                actionLabel={approval.approval?.actionLabel}
                approverGroupName={approval.approval?.approverGroupName}
                onApproved={approval.handleApproved}
            />
        </>
    );
};

export default CommitmentForm;
