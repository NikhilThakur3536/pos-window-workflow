'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import MandatoryField from '@/components/dynamic-form/mandatory-fields';
import SelectPopover from '@/components/select-popover';
import { useGetBankAccountTypes } from '@/api-queries/bank-account';
import { useGetCurrencies } from '@/api-queries/currency';
import {
    useCreateBankAccount,
    useUpdateBankAccount,
    useGetBankAccountById,
    type BankAccountCreateInput,
    type BankAccountDetails,
} from '@/api-queries/bank-account/bank-accounts';

type FormKey = keyof BankAccountCreateInput;
type FormState = Record<FormKey, string>;

const emptyForm: FormState = {
    code: '',
    name: '',
    bankName: '',
    accountNumber: '',
    accountHolder: '',
    branchCode: '',
    accountType: '',
    currencyCode: '',
};
const requiredFields: FormKey[] = ['code', 'name', 'bankName', 'accountNumber', 'accountHolder'];
const fieldLabels: Record<FormKey, string> = {
    code: 'Code',
    name: 'Account Name',
    bankName: 'Bank Name',
    accountNumber: 'Account Number',
    accountHolder: 'Account Holder',
    branchCode: 'Branch Code',
    accountType: 'Account Type',
    currencyCode: 'Currency Code',
};

const toForm = (row?: BankAccountDetails | null): FormState =>
    row
        ? {
              code: row.code ?? '',
              name: row.name ?? '',
              bankName: row.bankName ?? '',
              // Account number is always text (keeps leading zeros).
              accountNumber: String(row.accountNumber ?? ''),
              accountHolder: row.accountHolder ?? '',
              branchCode: row.branchCode ?? '',
              accountType: row.accountType ?? '',
              currencyCode: row.currencyCode ?? '',
          }
        : emptyForm;

interface Props {
    open: boolean;
    onClose: () => void;
    /** Row from the list; the full record is re-fetched via /get for view/edit. */
    editData: BankAccountDetails | null;
    readOnly?: boolean;
}

const BankAccountForm = ({ open, onClose, editData, readOnly = false }: Props) => {
    const createMut = useCreateBankAccount();
    const updateMut = useUpdateBankAccount();
    const getQuery = useGetBankAccountById(open ? editData?.id : undefined);
    const record = getQuery.data?.data ?? null;

    // Account type dropdown (bankAccountType/all). The DESCRIPTION is displayed and saved - never the UUID.
    const typesQuery = useGetBankAccountTypes({ status: 'ACTIVE', limit: 200, offset: 0 });
    const typeRows = typesQuery.data?.data?.rows || [];

    // Currency dropdown from the currency master; the currency CODE (e.g. ZAR) is saved.
    const currencyQuery = useGetCurrencies({ status: 'ACTIVE', limit: 200, offset: 0 });
    const currencyRows = currencyQuery.data?.data?.rows || [];

    const [form, setForm] = useState<FormState>(toForm(editData));
    const [errors, setErrors] = useState<Partial<Record<FormKey, string>>>({});

    useEffect(() => {
        if (!open) return;
        setErrors({});
        setForm(toForm(record ?? editData));
    }, [open, editData, record]);

    const isEditing = !!editData;
    const busy = createMut.isPending || updateMut.isPending;

    const set = (key: FormKey, value: string) => {
        setForm((prev) => ({ ...prev, [key]: value }));
        setErrors((prev) => ({ ...prev, [key]: undefined }));
    };

    const validate = () => {
        const next: Partial<Record<FormKey, string>> = {};
        requiredFields.forEach((key) => {
            if (!form[key].trim()) next[key] = `${fieldLabels[key]} is required`;
        });
        if (form.currencyCode.trim() && !/^[A-Za-z]{3}$/.test(form.currencyCode.trim()))
            next.currencyCode = 'Use a 3-letter currency code, e.g. ZAR';
        setErrors(next);
        return Object.keys(next).length === 0;
    };

    const onError = (error: any) => toast.error(error?.response?.data?.message || 'Internal Server Error!');

    const handleSubmit = () => {
        if (readOnly || !validate()) return;
        const values = (Object.keys(form) as FormKey[]).reduce(
            (acc, key) => ({
                ...acc,
                [key]: key === 'currencyCode' ? form[key].trim().toUpperCase() : form[key].trim(),
            }),
            {} as FormState,
        );

        if (isEditing && editData) {
            const original = toForm(record ?? editData);
            // Send only the changed fields together with id.
            const changed = (Object.keys(values) as FormKey[]).filter((key) => values[key] !== original[key].trim());
            if (!changed.length) return toast.info('No changes to save');
            const payload = changed.reduce((acc, key) => ({ ...acc, [key]: values[key] }), {
                id: editData.id,
            } as { id: string } & Partial<BankAccountCreateInput>);
            updateMut.mutate(payload, {
                onSuccess: (res) => {
                    if (res?.success === false) return toast.error(res.message || 'Update failed');
                    toast.success('Bank account updated successfully');
                    onClose();
                },
                onError,
            });
            return;
        }

        const payload: BankAccountCreateInput = {
            code: values.code,
            name: values.name,
            bankName: values.bankName,
            accountNumber: values.accountNumber,
            accountHolder: values.accountHolder,
            ...(values.branchCode ? { branchCode: values.branchCode } : {}),
            ...(values.accountType ? { accountType: values.accountType } : {}),
            ...(values.currencyCode ? { currencyCode: values.currencyCode } : {}),
        };
        createMut.mutate(payload, {
            onSuccess: (res) => {
                if (res?.success === false) return toast.error(res.message || 'Creation failed');
                toast.success('Bank account created successfully');
                onClose();
            },
            onError,
        });
    };

    const field = (key: FormKey, placeholder: string, maxLength: number, upper = false) => (
        <div className="space-y-1">
            <Label htmlFor={`ba-${key}`}>
                {fieldLabels[key]} {requiredFields.includes(key) && !readOnly && <MandatoryField />}
            </Label>
            <Input
                id={`ba-${key}`}
                value={form[key]}
                placeholder={placeholder}
                maxLength={maxLength}
                disabled={readOnly || busy}
                onChange={(e) => set(key, upper ? e.target.value.toUpperCase() : e.target.value)}
            />
            {errors[key] && <p className="text-xs text-red-600">{errors[key]}</p>}
        </div>
    );

    return (
        <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
            <DialogContent className="sm:max-w-[620px]">
                <DialogHeader>
                    <DialogTitle>
                        {readOnly ? 'View Bank Account' : isEditing ? 'Edit Bank Account' : 'Create Bank Account'}
                    </DialogTitle>
                    <DialogDescription>
                        {isEditing && !readOnly
                            ? 'Bank name and account number cannot be changed once the account is used in a Cash Office transaction. Deactivate it and create a replacement instead.'
                            : 'Bank accounts are used for Cash Office bank deposits and withdrawals.'}
                    </DialogDescription>
                </DialogHeader>

                <div className="grid grid-cols-2 gap-4 py-2">
                    {field('code', 'BANK-01', 50)}
                    {field('name', 'Main Business Account', 150)}
                    {field('bankName', 'Example Bank', 150)}
                    {field('accountNumber', '0012345678', 50)}
                    {field('accountHolder', 'Company legal name', 150)}
                    {field('branchCode', '123456', 50)}
                    <div className="space-y-1">
                        <Label>{fieldLabels.accountType}</Label>
                        <SelectPopover
                            title="Account Type"
                            onlyTitle="Select account type"
                            wrapperClass="min-w-0"
                            disabled={readOnly || busy}
                            selectedValue={form.accountType}
                            options={(() => {
                                const names = typeRows.map((t) => t.description || t.code);
                                // Keep an existing/legacy value selectable even if it is not in the list.
                                if (form.accountType && !names.includes(form.accountType)) names.unshift(form.accountType);
                                return [...new Set(names)].map((n) => ({ value: n, label: n }));
                            })()}
                            onSelect={(val) => set('accountType', val ? String(val) : '')}
                        />
                    </div>
                    <div className="space-y-1">
                        <Label>{fieldLabels.currencyCode}</Label>
                        <SelectPopover
                            title="Currency"
                            onlyTitle="Select currency"
                            wrapperClass="min-w-0"
                            disabled={readOnly || busy}
                            selectedValue={form.currencyCode}
                            options={(() => {
                                const opts = currencyRows.map((c) => ({
                                    value: c.code,
                                    label: c.name ? `${c.code} - ${c.name}` : c.code,
                                }));
                                // Keep an existing/legacy value selectable even if it is not in the master.
                                if (form.currencyCode && !opts.some((o) => o.value === form.currencyCode))
                                    opts.unshift({ value: form.currencyCode, label: form.currencyCode });
                                return opts;
                            })()}
                            onSelect={(val) => set('currencyCode', val ? String(val) : '')}
                        />
                        {errors.currencyCode && <p className="text-xs text-red-600">{errors.currencyCode}</p>}
                    </div>
                </div>

                <div className="flex justify-end gap-3">
                    <Button type="button" variant="outline" onClick={onClose}>
                        {readOnly ? 'Close' : 'Cancel'}
                    </Button>
                    {!readOnly && (
                        <Button type="button" className="bg-blue-600 hover:bg-blue-700" disabled={busy} onClick={handleSubmit}>
                            {busy ? 'Saving...' : isEditing ? 'Update' : 'Create'}
                        </Button>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
};

export default BankAccountForm;
