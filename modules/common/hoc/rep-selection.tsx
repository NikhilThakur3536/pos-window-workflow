import { useState, Dispatch, SetStateAction } from 'react';
import { Input } from '@/components/ui/input';
import { XIcon } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { RepDialog } from './rep-dialog';
import { SalesRepresentativeDetails } from '@/api-queries/sales-representatives';

interface RepSelectionProps {
    selectedRep: SalesRepresentativeDetails | null;
    onSelectRep: Dispatch<SetStateAction<SalesRepresentativeDetails | null>>;
    isOnline: boolean;
}

export function RepSelection({ selectedRep, onSelectRep, isOnline }: RepSelectionProps) {
    const [isDialogOpen, setIsDialogOpen] = useState(false);

    const handleSelectRep = (rep: SalesRepresentativeDetails) => {
        onSelectRep(rep);
    };

    return (
        <>
            <div className="relative flex items-center gap-2">
                <Label htmlFor="rep" className="w-24 text-right">
                    Rep:
                </Label>
                <Input
                    id="rep"
                    value={selectedRep ? `${selectedRep?.name} - ${selectedRep?.repNumber}` : ''}
                    readOnly
                    onClick={() => setIsDialogOpen(true)}
                    className="flex-1 cursor-pointer"
                />

                {selectedRep && (
                    <XIcon
                        onClick={() => onSelectRep(null)}
                        className="absolute top-1/2 right-1 h-4 w-4 -translate-y-1/2 cursor-pointer text-red-500"
                    />
                )}
            </div>

            {isDialogOpen && (
                <RepDialog
                    isOpen={isDialogOpen}
                    onClose={() => setIsDialogOpen(false)}
                    onSelectRep={handleSelectRep}
                    isOnline={isOnline}
                    key={`${isOnline}`}
                />
            )}
        </>
    );
}
