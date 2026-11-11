import { useState, useCallback, Dispatch, SetStateAction } from 'react';
import { Button } from '@/components/ui/button';
import { type CompanyCreditor } from '@/types';
import { ChevronDownIcon, UserIcon, XIcon } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { DebtorDialog } from '../../hoc/debtor-dialog';

interface DebtorSelectionProps {
    selectedDebtor: CompanyCreditor | null;
    onSelectDebtor: Dispatch<SetStateAction<CompanyCreditor | null>>;
    isOnline: boolean;
}

export function DebtorSelection({ selectedDebtor, onSelectDebtor, isOnline }: DebtorSelectionProps) {
    const [isDialogOpen, setIsDialogOpen] = useState(false);

    const handleSelectDebtor = (debtor: CompanyCreditor) => {
        onSelectDebtor(debtor);
    };

    const handleRemoveDebtor = useCallback(
        (e: React.MouseEvent) => {
            e.stopPropagation();
            onSelectDebtor(null);
        },
        [onSelectDebtor],
    );

    return (
        <>
            <Label
                htmlFor="customer-select"
                className="cursor-pointer text-sm font-medium whitespace-nowrap"
                onClick={() => setIsDialogOpen(true)}
            >
                <UserIcon className="h-6 w-6" />
                Customer:
            </Label>

            <div
                id="customer-select"
                className="border-input bg-background ring-offset-background placeholder:text-muted-foreground focus:ring-ring relative flex flex-1 cursor-pointer items-center justify-between rounded-md border px-3 py-2 text-sm focus:ring-2 focus:ring-offset-2 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50"
                onClick={() => setIsDialogOpen(true)}
            >
                <span className="flex-1 truncate">
                    {selectedDebtor
                        ? `${selectedDebtor.accountNumber} ${selectedDebtor.name ? ':' : ''} ${selectedDebtor.name}`
                        : 'None Selected'}
                </span>
                {selectedDebtor ? (
                    <Button
                        variant="ghost"
                        size="icon"
                        className="text-muted-foreground h-6 w-6 hover:text-red-500"
                        onClick={handleRemoveDebtor}
                    >
                        <XIcon className="ml-2" />
                        <span className="sr-only">Remove Customer</span>
                    </Button>
                ) : (
                    <ChevronDownIcon className="ml-2 h-5 w-5 opacity-50" />
                )}
            </div>

            {isDialogOpen && (
                <DebtorDialog
                    isOpen={isDialogOpen}
                    onClose={() => setIsDialogOpen(false)}
                    onSelectDebtor={handleSelectDebtor}
                    isOnline={isOnline}
                    key={`${isOnline}`}
                />
            )}
        </>
    );
}
