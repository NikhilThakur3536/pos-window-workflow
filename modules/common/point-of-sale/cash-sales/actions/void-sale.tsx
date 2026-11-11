// import { Button } from '@/components/ui/button';
// import React, { ReactNode } from 'react';
// import ConfirmDialog from '@/components/confirm-dialog';
// import { CircleMinus } from 'lucide-react';

// interface VoidSaleProps {
//     onClick: () => void;
//     children: ReactNode;
// }

// const VoidSale = ({ onClick, children }: VoidSaleProps) => {
//     const VoidSaleButtonTrigger = (
//         <Button className="bg-red-500 text-white hover:bg-red-600">
//             <CircleMinus />
//             Void Sale
//         </Button>
//     );

//     return (
//         <ConfirmDialog
//             trigger={VoidSaleButtonTrigger}
//             title="Void Sale Confirmation"
//             description="Are you sure you want to void this sale? This action cannot be undone and all items in the cart will be removed."
//             onConfirm={onClick}
//             variant="destructive"
//         >
//             {children && children}
//         </ConfirmDialog>
//     );
// };

// export default VoidSale;
import { Button } from '@/components/ui/button';
import React, { ReactNode, useState } from 'react';
import ConfirmDialog from '@/components/confirm-dialog';
import { CircleMinus } from 'lucide-react';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select'; 
import { useGetSalesRepresentatives } from '@/api-queries/sales-representatives'; 
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';

interface VoidSaleProps {
    onClick: (data: { reason: string; representativeId: string | null }) => void;
    children?: ReactNode;
    defaultRepresentativeId?: string;
}

const VoidSale = ({ onClick, children, defaultRepresentativeId }: VoidSaleProps) => {
    const [voidSaleReason, setVoidSaleReason] = useState('');
    const [selectedRepId, setSelectedRepId] = useState<string | null>(defaultRepresentativeId || null);

    const { data: repsResponse, isLoading } = useGetSalesRepresentatives({
        limit: 100,   // Adjust as needed
        status: 'ACTIVE'
    });

    const salesRepresentatives = repsResponse?.data || [];

    const VoidSaleButtonTrigger = (
        <Button className="bg-red-500 text-white hover:bg-red-600">
            <CircleMinus />
            Void Sale
        </Button>
    );

    const handleConfirm = () => {
        onClick({
            reason: voidSaleReason.trim(),
            representativeId: selectedRepId,
        });
        // Reset form after confirm (optional)
        setVoidSaleReason('');
        setSelectedRepId(defaultRepresentativeId || null);
    };

    return (
        <ConfirmDialog
            trigger={VoidSaleButtonTrigger}
            title="Void Sale Confirmation"
            description="Are you sure you want to void this sale? This action cannot be undone and all items in the cart will be removed."
            onConfirm={handleConfirm}
            variant="destructive"
            // Disable confirm button if reason is empty (optional)
            // disabled={!voidSaleReason.trim()}
        >
            <div className="space-y-4 py-2">
                {/* Reason Field */}
                <div className="space-y-2">
                    <Label>Reason for Voiding the sale:</Label>
                    <Input
                        placeholder="Enter Reason"
                        value={voidSaleReason}
                        onChange={(e) => setVoidSaleReason(e.target.value)}
                    />
                </div>

                {/* Sales Representative Dropdown */}
                <div className="space-y-2">
                    <Label>Sales Representative</Label>
                    <Select 
                        value={selectedRepId || ''} 
                        onValueChange={setSelectedRepId}
                    >
                        <SelectTrigger>
                            <SelectValue placeholder="Select sales representative" />
                        </SelectTrigger>
                        <SelectContent>
                            {isLoading ? (
                                <SelectItem value="loading" disabled>Loading representatives...</SelectItem>
                            ) : (
                                salesRepresentatives.map((rep:any) => (
                                    <SelectItem key={rep.id} value={rep.id}>
                                        {rep.name} ({rep.repNumber})
                                    </SelectItem>
                                ))
                            )}
                        </SelectContent>
                    </Select>
                </div>

                {children}
            </div>
        </ConfirmDialog>
    );
};

export default VoidSale;