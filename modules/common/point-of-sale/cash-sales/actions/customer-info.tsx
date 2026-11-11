import { Button } from '@/components/ui/button';
import { UserIcon } from 'lucide-react';
import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import CustomerDetailsForm from './customer-details-form';
import { CashSaleCustomerSchema } from '@/api-queries/point-of-sale/cash-sales';

interface CustomerInfoProps {
    onSubmit: (data: CashSaleCustomerSchema) => void;
}

const CustomerInfo = ({ onSubmit }: CustomerInfoProps) => {
    const [isDialogOpen, setIsDialogOpen] = useState(false);

    const handleFormSubmit = (data: CashSaleCustomerSchema) => {
        onSubmit(data);
        setIsDialogOpen(false);
    };

    return (
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
                <Button>
                    <UserIcon className="h-4 w-4" />
                    Customer Info
                </Button>
            </DialogTrigger>
            <DialogContent className="overflow-hidden p-0">
                <DialogHeader className="p-4 pb-0">
                    <DialogTitle>Customer Info</DialogTitle>
                </DialogHeader>

                <CustomerDetailsForm onSubmit={handleFormSubmit} onCancel={() => setIsDialogOpen(false)} />
            </DialogContent>
        </Dialog>
    );
};

export default CustomerInfo;
