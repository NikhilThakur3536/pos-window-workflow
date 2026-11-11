import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import React, { useState } from 'react';
import { toast } from 'sonner';
import { SuspendedSaleCustomerSchema } from '@/api-queries/point-of-sale/suspended-sales';
import {
    useGetSalesRepresentativeList,
    SalesRepresentativeItem,
} from '@/api-queries/sales-rep'; 

import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';

interface SuspendSaleProps {
    onClick: (customerData: SuspendedSaleCustomerSchema, salesRep?: SalesRepresentativeItem) => void;
    isCartEmpty: number;
}

const SuspendSale = ({ onClick, isCartEmpty }: SuspendSaleProps) => {
    const [open, setOpen] = useState(false);
    const initialState = { customerName: '', customerPhoneNumber: '', representativeId:'' };
    const [customerData, setCustomerData] = useState<SuspendedSaleCustomerSchema>(initialState);
    const [errors, setErrors] = useState<SuspendedSaleCustomerSchema>(initialState);

    // New state for Sales Representative
    const [selectedSalesRep, setSelectedSalesRep] = useState<SalesRepresentativeItem | null>(null);

    // Fetch Sales Representatives
    const { data: repsData, isLoading: repsLoading } = useGetSalesRepresentativeList({});

    const salesReps = repsData?.data || [];

    const validatePhoneNumber = (customerPhoneNumber: string): boolean => {
        const cleanPhone = customerPhoneNumber.replace(/\D/g, '');

        if (cleanPhone.length < 10 || cleanPhone.length > 15) {
            return false;
        }

        const phonePattern = /^[\+]?[\s\-\(\)]?[\d\s\-\(\)]{10,}$/;
        return phonePattern.test(customerPhoneNumber);
    };

    const validateForm = (): boolean => {
        const newErrors: SuspendedSaleCustomerSchema = initialState;
        let isValid = true;

        if (!customerData.customerName.trim()) {
            newErrors.customerName = 'Customer name is required';
            isValid = false;
        } else if (customerData.customerName.trim().length < 2) {
            newErrors.customerName = 'Customer name must be at least 2 characters';
            isValid = false;
        }

        if (!customerData.customerPhoneNumber.trim()) {
            newErrors.customerPhoneNumber = 'Phone number is required';
            isValid = false;
        } else if (!validatePhoneNumber(customerData.customerPhoneNumber)) {
            newErrors.customerPhoneNumber = 'Please enter a valid phone number (10-15 digits)';
            isValid = false;
        }

        setErrors(newErrors);
        return isValid;
    };

    const handleCartEmptyError = () => {
        toast.error('Cart is empty. No items to suspend.');
        return;
    };

    const handleButtonClick = () => {
        setOpen(true);
    };

    const handleSuspend = () => {
        if (!validateForm()) {
            return;
        }

        const payload: SuspendedSaleCustomerSchema = {
        ...customerData,
        representativeId: selectedSalesRep?.id || '',
    };

        onClick(payload, selectedSalesRep || undefined);

        setOpen(false);
        setCustomerData(initialState);
        setErrors(initialState);
        setSelectedSalesRep(null);
    };

    const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        let value = e.target.value;
        value = value.replace(/[^0-9\s\-\(\)\+]/g, '');

        setCustomerData((prev) => ({ ...prev, customerPhoneNumber: value }));

        if (errors.customerPhoneNumber) {
            setErrors((prev) => ({ ...prev, customerPhoneNumber: '' }));
        }
    };

    const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setCustomerData((prev) => ({ ...prev, customerName: e.target.value }));

        if (errors.customerName) {
            setErrors((prev) => ({ ...prev, name: '' }));
        }
    };

    if (isCartEmpty === 0)
        return (
            <Button className="flex-1 bg-red-600 text-white hover:bg-red-700" size="lg" onClick={handleCartEmptyError}>
                Suspend
            </Button>
        );

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button className="flex-1 bg-red-600 text-white hover:bg-red-700" size="lg" onClick={handleButtonClick}>
                    Suspend
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle>Suspend Sale</DialogTitle>
                    <DialogDescription>Enter customer details to suspend this sale.</DialogDescription>
                </DialogHeader>

                <div className="grid gap-6">
                    <div className="flex items-start gap-4">
                        <Label htmlFor="customerName" className="mt-2 min-w-[120px] text-sm font-medium">
                            Customer Name:
                        </Label>
                        <div className="flex-1">
                            <Input
                                id="customerName"
                                value={customerData.customerName}
                                onChange={handleNameChange}
                                className={`${errors.customerName ? 'border-red-500' : ''}`}
                                placeholder="Enter customer name"
                            />
                            {errors.customerName && <p className="mt-1 text-xs text-red-500">{errors.customerName}</p>}
                        </div>
                    </div>
                    <div className="flex items-start gap-4">
                        <Label htmlFor="phoneNumber" className="mt-2 min-w-[120px] text-sm font-medium">
                            Phone Number:
                        </Label>
                        <div className="flex-1">
                            <Input
                                id="phoneNumber"
                                value={customerData.customerPhoneNumber}
                                onChange={handlePhoneChange}
                                className={`${errors.customerPhoneNumber ? 'border-red-500' : ''}`}
                                placeholder="Enter phone number"
                                type="tel"
                            />
                            {errors.customerPhoneNumber && (
                                <p className="mt-1 text-xs text-red-500">{errors.customerPhoneNumber}</p>
                            )}
                        </div>
                    </div>

                    {/* Sales Representative Dropdown */}
                    <div className="flex items-start gap-4">
                        <Label htmlFor="salesRep" className="mt-2 min-w-[120px] text-sm font-medium">
                            Sales Representative:
                        </Label>
                        <div className="flex-1">
                            <Select
                                value={selectedSalesRep?.id || ''}
                                onValueChange={(value) => {
                                    const rep = salesReps.find((r: SalesRepresentativeItem) => r.id === value);
                                    setSelectedSalesRep(rep || null);
                                }}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Select sales representative (optional)" />
                                </SelectTrigger>
                                <SelectContent>
                                    {repsLoading ? (
                                        <SelectItem value="all" disabled>
                                            Loading representatives...
                                        </SelectItem>
                                    ) : salesReps.length === 0 ? (
                                        <SelectItem value="no" disabled>
                                            No sales representatives available
                                        </SelectItem>
                                    ) : (
                                        salesReps.map((rep: SalesRepresentativeItem) => (
                                            <SelectItem key={rep.id} value={rep.id}>
                                                {rep.name} {rep.repNumber ? `(#${rep.repNumber})` : ''}
                                            </SelectItem>
                                        ))
                                    )}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                </div>

                <DialogFooter>
                    <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                        Cancel
                    </Button>
                    <Button type="button" onClick={handleSuspend} className="bg-red-600 hover:bg-red-700">
                        Suspend Sale
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};

export default SuspendSale;