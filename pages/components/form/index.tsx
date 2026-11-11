import { DynamicForm } from '@/components/dynamic-form';
import { FormConfig } from '@/types/form.types';
import { useState } from 'react';

const journalEntryConfig = {
    id: 'journal-entry-form',
    title: 'Journal Entry',
    description: 'Create a new journal entry for accounting records',
    layout: 'grid',
    submitAction: 'createJournalEntry',
    sections: [
        {
            id: 'journal-details',
            title: 'Journal Details',
            gridColumns: 2,
            fields: [
                {
                    id: 'accountNumber',
                    type: 'select',
                    label: 'Account Number',
                    placeholder: 'Select account number',
                    required: true,
                    defaultValue: '',
                    options: [
                        { value: 'ACC001', label: 'Cash - ACC001' },
                        { value: 'ACC002', label: 'Accounts Receivable - ACC002' },
                        { value: 'ACC003', label: 'Inventory - ACC003' },
                        { value: 'ACC004', label: 'Accounts Payable - ACC004' },
                    ],
                    validation: {
                        rules: [{ type: 'required', message: 'Account number is required' }],
                    },
                },
                {
                    id: 'journalDate',
                    type: 'date',
                    label: 'Journal Date',
                    required: true,
                    defaultValue: 'today',
                    validation: {
                        rules: [{ type: 'required', message: 'Journal date is required' }],
                    },
                },
                {
                    id: 'transactionType',
                    type: 'select',
                    label: 'Transaction Type',
                    required: true,
                    options: [
                        { value: 'DR', label: 'Debit' },
                        { value: 'CR', label: 'Credit' },
                    ],
                    validation: {
                        rules: [{ type: 'required', message: 'Transaction type is required' }],
                    },
                },
                {
                    id: 'amount',
                    type: 'currency',
                    label: 'Amount',
                    required: true,
                    validation: {
                        rules: [
                            { type: 'required', message: 'Amount is required' },
                            { type: 'min', value: 0.01, message: 'Amount must be greater than 0' },
                        ],
                    },
                },
                {
                    id: 'reference',
                    type: 'text',
                    label: 'Reference Number',
                    placeholder: 'Enter reference number',
                    conditional: {
                        field: 'transactionType',
                        operator: 'equals',
                        value: 'DR',
                    },
                },
                {
                    id: 'description',
                    type: 'textarea',
                    label: 'Description',
                    placeholder: 'Enter transaction description',
                    value: '600',
                    gridColumn: '2',
                    validation: {
                        rules: [{ type: 'max', value: 500, message: 'Description must be less than 500 characters' }],
                    },
                },
            ],
        },
        {
            id: 'additional-details',
            title: 'Additional Details',
            conditional: {
                field: 'amount',
                operator: 'greater_than',
                value: 1000,
            },
            fields: [
                {
                    id: 'transactions',
                    type: 'array',
                    label: 'Transactions',
                    required: true,
                    arrayConfig: {
                        minItems: 2,
                        maxItems: 10,
                        addButtonText: 'Add Transaction',
                        itemTitle: 'Transaction',
                        itemSchema: [
                            {
                                id: 'accountNumber',
                                type: 'select',
                                label: 'Account',
                                required: true,
                                options: [
                                    { value: 'ACC001', label: 'Cash - ACC001' },
                                    { value: 'ACC002', label: 'Accounts Receivable - ACC002' },
                                    { value: 'ACC003', label: 'Inventory - ACC003' },
                                    { value: 'ACC004', label: 'Accounts Payable - ACC004' },
                                    { value: 'ACC005', label: 'Sales Revenue - ACC005' },
                                    { value: 'ACC006', label: 'Cost of Goods Sold - ACC006' },
                                ],
                                validation: {
                                    rules: [{ type: 'required', message: 'Account is required' }],
                                },
                            },
                            {
                                id: 'transactionType',
                                type: 'select',
                                label: 'Type',
                                required: true,
                                options: [
                                    { value: 'DR', label: 'Debit' },
                                    { value: 'CR', label: 'Credit' },
                                ],
                                validation: {
                                    rules: [{ type: 'required', message: 'Transaction type is required' }],
                                },
                            },
                            {
                                id: 'amount',
                                type: 'currency',
                                label: 'Amount',
                                required: true,
                                validation: {
                                    rules: [
                                        { type: 'required', message: 'Amount is required' },
                                        { type: 'min', value: 0.01, message: 'Amount must be greater than 0' },
                                    ],
                                },
                            },
                            {
                                id: 'description',
                                type: 'text',
                                label: 'Line Description',
                                placeholder: 'Transaction description',
                                gridColumn: '2',
                            },
                        ],
                    },
                    validation: {
                        rules: [{ type: 'required', message: 'At least one transaction is required' }],
                    },
                },
            ],
        },
    ],
};

export default function FormPage() {
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (data: Record<string, any>) => {
        setLoading(true);

        try {
            // Simulate API call
            await new Promise((resolve) => setTimeout(resolve, 2000));

            console.log('Journal entry submitted:', data);
            alert('Journal entry created successfully!');
        } catch (error) {
            console.error('Error submitting journal entry:', error);
            alert('Error creating journal entry');
        } finally {
            setLoading(false);
        }
    };
    return (
        <div>
            <DynamicForm config={journalEntryConfig as FormConfig} onSubmit={handleSubmit} loading={loading} />
        </div>
    );
}
