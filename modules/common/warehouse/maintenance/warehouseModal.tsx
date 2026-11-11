import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2 } from 'lucide-react';

import WarehouseAccountDetails from './maintenance-actions/warehouse-account-details';

interface WarehouseModalProps {
    isOpen: boolean;
    onClose: () => void;
    warehouse: any;
    isLoading?: boolean;
}

const WarehouseMaintenanceMenu = [
    {
        value: 'account',
        label: 'Warehouse Details',
    },
];

export default function WarehouseModal({
    isOpen,
    onClose,
    warehouse,
    isLoading = false,
}: WarehouseModalProps) {
    const isEditMode = !!warehouse;

    const title = isEditMode
        ? 'Update Warehouse'
        : 'Add New Warehouse';

    return (
        <Dialog
            open={isOpen}
            onOpenChange={(open) => {
                if (!open) onClose();
            }}
        >
            <DialogContent className="flex h-[65vh] w-[80vw] !max-w-none flex-col gap-2 overflow-hidden p-0">
                <DialogHeader className="flex-none px-4 py-2">
                    <div className="flex items-center justify-between">
                        <DialogTitle className="text-lg font-semibold">
                            {title}
                        </DialogTitle>
                    </div>
                </DialogHeader>

                <Tabs
                    defaultValue="account"
                    className="flex flex-1 flex-col px-4"
                >
                    <TabsList className="flex h-7 flex-none rounded-none border-b border-gray-200 bg-gray-50 p-0">
                        {WarehouseMaintenanceMenu.map((tab) => (
                            <TabsTrigger
                                key={tab.value}
                                value={tab.value}
                                className="cursor-pointer rounded-none px-3 text-[12px] font-medium text-gray-600 transition-colors hover:bg-gray-100 data-[state=active]:bg-white data-[state=active]:font-semibold data-[state=active]:text-gray-900"
                            >
                                {tab.label}
                            </TabsTrigger>
                        ))}
                    </TabsList>

                    <div className="mt-2 flex h-full flex-1 flex-col">
                        <TabsContent
                            value="account"
                            className="h-full overflow-hidden"
                        >
                            {isLoading ? (
                                <div className="flex h-full items-center justify-center">
                                    <Loader2 className="h-5 w-5 animate-spin" />
                                </div>
                            ) : (
                                <WarehouseAccountDetails
                                    warehouse={warehouse}
                                    onClose={onClose}
                                />
                            )}
                        </TabsContent>
                    </div>
                </Tabs>
            </DialogContent>
        </Dialog>
    );
}