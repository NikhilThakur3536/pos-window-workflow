import { Button } from '@/components/ui/button';
import { CreditCard } from 'lucide-react';
import React, { useCallback, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';

interface CreditChargeProps {
    onConfirmClick: (orderNumber: string) => void;
}

const CreditCharge = ({ onConfirmClick }: CreditChargeProps) => {
    const [isCreditChargeModalOpen, setIsCreditChargeModalOpen] = useState(false);

    const [orderNumber, setOrderNumber] = useState<string>('');
    const [errors, setErrors] = useState<string>('');

    const handleOpenCreditChargeModal = useCallback(() => {
        setIsCreditChargeModalOpen(true);
    }, []);

    const validateForm = (): boolean => {
        let err: string = '';
        let isValid = true;

        if (!orderNumber.trim()) {
            err = 'Order number is required';
            isValid = false;
        }
        setErrors(err);
        return isValid;
    };

    const handleConfirmCreditCharge = () => {
        validateForm();

        onConfirmClick(orderNumber);
        setIsCreditChargeModalOpen(false);
    };

    return (
        <>
            <Button
                variant="outline"
                size="lg"
                onClick={handleOpenCreditChargeModal}
                className="ml-2 flex items-center gap-2"
            >
                <CreditCard className="!h-5 !w-5" />
                Credit Charge
            </Button>

            <Dialog open={isCreditChargeModalOpen} onOpenChange={setIsCreditChargeModalOpen}>
                <DialogContent className="sm:max-w-[425px]">
                    <DialogHeader>
                        <DialogTitle>Credit Charge</DialogTitle>
                    </DialogHeader>

                    <div>
                        <Label htmlFor="orderNumber" className="mb-1 min-w-[120px] text-sm font-medium">
                            Please Enter Order Number:
                        </Label>
                        <div>
                            <Input
                                id="orderNumber"
                                value={orderNumber}
                                onChange={(e) => setOrderNumber(e.target.value)}
                                className={`${errors ? 'border-red-500' : ''}`}
                                placeholder="Enter order number"
                            />
                            {errors && <p className="mt-1 text-xs text-red-500">{errors}</p>}
                        </div>
                    </div>

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsCreditChargeModalOpen(false)}>
                            Cancel
                        </Button>
                        <Button onClick={handleConfirmCreditCharge}>Confirm</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
};

export default CreditCharge;
