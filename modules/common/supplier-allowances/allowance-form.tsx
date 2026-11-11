import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
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
import {
    SUPPLIER_ALLOWANCE_BASES,
    SUPPLIER_ALLOWANCE_TYPES,
    useCreateSupplierAllowance,
    useUpdateSupplierAllowance,
    type SaveSupplierAllowanceInput,
    type SupplierAllowanceBasis,
    type SupplierAllowanceDetails,
    type SupplierAllowanceType,
} from '@/api-queries/goods-receiving/supplier-allowances';
import { useApprovalAction } from '@/hooks/use-approval-action';

interface AllowanceFormProps {
    open: boolean;
    onClose: () => void;
    editData: SupplierAllowanceDetails | null;
    onSaved: () => void;
}

interface AllowanceFormState {
    allowanceCode: string;
    name: string;
    companyCreditorId: string;
    companyStockDetailId: string;
    categoryId: string;
    companyDebtorId: string;
    companyWarehouseId: string;
    allowanceType: SupplierAllowanceType;
    basis: SupplierAllowanceBasis;
    rate: string;
    thresholdQuantity: string;
    thresholdValue: string;
    effectiveFrom: string;
    effectiveTo: string;
    notes: string;
}

const emptyForm: AllowanceFormState = {
    allowanceCode: '',
    name: '',
    companyCreditorId: '',
    companyStockDetailId: '',
    categoryId: '',
    companyDebtorId: '',
    companyWarehouseId: '',
    allowanceType: 'REBATE',
    basis: 'PERCENTAGE',
    rate: '',
    thresholdQuantity: '',
    thresholdValue: '',
    effectiveFrom: '',
    effectiveTo: '',
    notes: '',
};

const dateOnly = (value?: string | null) => (value ? String(value).slice(0, 10) : '');

const AllowanceForm = ({ open, onClose, editData, onSaved }: AllowanceFormProps) => {
    const createMutation = useCreateSupplierAllowance();
    const updateMutation = useUpdateSupplierAllowance();
    const approval = useApprovalAction();

    const creditors = useCreditorList({ limit: 500 })?.data?.data?.rows || [];
    const stocks = useCompanyStockDetailsList({ limit: 500 })?.data?.data?.rows || [];
    const categories = useGetCategories({ limit: 500 })?.data?.data?.rows || [];
    const debtors = useDebtorList({ limit: 500 })?.data?.data?.rows || [];
    const rawWarehouses = (useGetWarehouses({ limit: 1000, offset: 0 })?.data?.data || []) as
        | WarehouseDetails[]
        | { count?: number; rows?: WarehouseDetails[] };
    const warehouses = Array.isArray(rawWarehouses) ? rawWarehouses : rawWarehouses?.rows || [];

    const [form, setForm] = useState<AllowanceFormState>(emptyForm);

    useEffect(() => {
        if (!open) return;
        setForm(
            editData
                ? {
                      allowanceCode: editData.allowanceCode || '',
                      name: editData.name || '',
                      companyCreditorId: editData.companyCreditorId || '',
                      companyStockDetailId: editData.companyStockDetailId || '',
                      categoryId: editData.categoryId || '',
                      companyDebtorId: editData.companyDebtorId || '',
                      companyWarehouseId: editData.companyWarehouseId || '',
                      allowanceType: editData.allowanceType || 'REBATE',
                      basis: editData.basis || 'PERCENTAGE',
                      rate: editData.rate == null ? '' : String(editData.rate),
                      thresholdQuantity:
                          editData.thresholdQuantity == null ? '' : String(editData.thresholdQuantity),
                      thresholdValue: editData.thresholdValue == null ? '' : String(editData.thresholdValue),
                      effectiveFrom: dateOnly(editData.effectiveFrom),
                      effectiveTo: dateOnly(editData.effectiveTo),
                      notes: editData.notes || '',
                  }
                : emptyForm,
        );
    }, [open, editData]);

    const set = <K extends keyof AllowanceFormState>(key: K, value: AllowanceFormState[K]) =>
        setForm((current) => ({ ...current, [key]: value }));

    const numberOrNull = (value: string) => {
        if (!value.trim()) return null;
        const parsed = Number(value);
        return Number.isFinite(parsed) ? parsed : null;
    };

    const handleSubmit = async () => {
        if (!form.allowanceCode.trim()) return toast.error('Allowance code is required');
        if (!form.name.trim()) return toast.error('Name is required');
        if (!form.companyCreditorId) return toast.error('Supplier is required');
        if (!form.effectiveFrom) return toast.error('Effective from date is required');
        if (!form.effectiveTo) return toast.error('Effective to date is required');
        if (form.rate.trim() === '' || !Number.isFinite(Number(form.rate))) {
            return toast.error('Rate is required');
        }

        const payload: SaveSupplierAllowanceInput = {
            ...(editData?.id ? { id: editData.id } : {}),
            allowanceCode: form.allowanceCode.trim(),
            name: form.name.trim(),
            companyCreditorId: form.companyCreditorId,
            companyStockDetailId: form.companyStockDetailId || null,
            categoryId: form.categoryId || null,
            companyDebtorId: form.companyDebtorId || null,
            companyWarehouseId: form.companyWarehouseId || null,
            allowanceType: form.allowanceType,
            basis: form.basis,
            rate: Number(form.rate),
            thresholdQuantity: numberOrNull(form.thresholdQuantity),
            thresholdValue: numberOrNull(form.thresholdValue),
            effectiveFrom: form.effectiveFrom,
            effectiveTo: form.effectiveTo,
            notes: form.notes.trim() || null,
        };

        const mutation = editData?.id ? updateMutation : createMutation;
        await approval.run(async (approvalToken) => {
            const response = await mutation.mutateAsync({
                ...payload,
                ...(approvalToken ? { approvalToken } : {}),
            });
            if (response?.success === false) {
                toast.error(response.message || 'Supplier allowance could not be saved');
                return;
            }
            toast.success(editData?.id ? 'Supplier allowance updated' : 'Supplier allowance created');
            onSaved();
            onClose();
        }, editData?.id ? 'Update Supplier Allowance' : 'Create Supplier Allowance');
    };

    const isBusy = createMutation.isPending || updateMutation.isPending;

    return (
        <>
            <Dialog open={open} onOpenChange={(next) => !next && !isBusy && onClose()}>
                <DialogContent className="sm:max-w-3xl">
                    <DialogHeader>
                        <DialogTitle>{editData ? 'Edit Supplier Allowance' : 'Create Supplier Allowance'}</DialogTitle>
                        <DialogDescription>
                            Configure supplier rebates and incentives. GRV rebates are calculated automatically.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="max-h-[70vh] space-y-4 overflow-y-auto pr-1">
                        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                            <div>
                                <Label>Allowance Code</Label>
                                <Input
                                    className="mt-1"
                                    value={form.allowanceCode}
                                    onChange={(event) => set('allowanceCode', event.target.value)}
                                    placeholder="REBATE-2026-01"
                                />
                            </div>
                            <div>
                                <Label>Name</Label>
                                <Input
                                    className="mt-1"
                                    value={form.name}
                                    onChange={(event) => set('name', event.target.value)}
                                    placeholder="Annual supplier rebate"
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
                                <Label>Allowance Type</Label>
                                <div className="mt-1">
                                    <SelectPopover
                                        title="Allowance Type"
                                        onlyTitle="Select type"
                                        selectedValue={form.allowanceType}
                                        options={SUPPLIER_ALLOWANCE_TYPES.map((type) => ({
                                            label: type.replace(/_/g, ' '),
                                            value: type,
                                        }))}
                                        onSelect={(value) =>
                                            set('allowanceType', String(value || 'REBATE') as SupplierAllowanceType)
                                        }
                                    />
                                </div>
                            </div>
                            <div>
                                <Label>Basis</Label>
                                <div className="mt-1">
                                    <SelectPopover
                                        title="Basis"
                                        onlyTitle="Select basis"
                                        selectedValue={form.basis}
                                        options={SUPPLIER_ALLOWANCE_BASES.map((basis) => ({
                                            label: basis.replace(/_/g, ' '),
                                            value: basis,
                                        }))}
                                        onSelect={(value) =>
                                            set('basis', String(value || 'PERCENTAGE') as SupplierAllowanceBasis)
                                        }
                                    />
                                </div>
                            </div>
                            <div>
                                <Label>Rate</Label>
                                <Input
                                    type="number"
                                    min={0}
                                    step="0.01"
                                    className="mt-1"
                                    value={form.rate}
                                    onChange={(event) => set('rate', event.target.value)}
                                />
                            </div>
                            <div>
                                <Label>Threshold Quantity</Label>
                                <Input
                                    type="number"
                                    min={0}
                                    className="mt-1"
                                    value={form.thresholdQuantity}
                                    onChange={(event) => set('thresholdQuantity', event.target.value)}
                                />
                            </div>
                            <div>
                                <Label>Threshold Value</Label>
                                <Input
                                    type="number"
                                    min={0}
                                    step="0.01"
                                    className="mt-1"
                                    value={form.thresholdValue}
                                    onChange={(event) => set('thresholdValue', event.target.value)}
                                />
                            </div>
                            <div>
                                <Label>Effective From</Label>
                                <Input
                                    type="date"
                                    className="mt-1"
                                    value={form.effectiveFrom}
                                    onChange={(event) => set('effectiveFrom', event.target.value)}
                                />
                            </div>
                            <div>
                                <Label>Effective To</Label>
                                <Input
                                    type="date"
                                    className="mt-1"
                                    value={form.effectiveTo}
                                    onChange={(event) => set('effectiveTo', event.target.value)}
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
                            {isBusy ? 'Saving…' : editData ? 'Update Allowance' : 'Create Allowance'}
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

export default AllowanceForm;
