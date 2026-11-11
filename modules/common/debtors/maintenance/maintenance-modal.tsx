import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import { useState } from 'react';
import AccountDetails from './maintenance-actions/account-details';
import MultipleContacts from './maintenance-actions/mutilple-contacts';
import RecurringCharges from './maintenance-actions/recurring-charges';
import B2BEDI from './maintenance-actions/b2b-edi';
import StoreDepartments from './maintenance-actions/store-departments';
import { Loader2 } from 'lucide-react';

interface MaintenanceModalProps {
    isOpen: boolean;
    onClose: () => void;
    debtor: any;
    isLoading: boolean;
}

const DebtorMaintenanceMenu = [
    { value: 'account', label: 'Account Details' },
    // { value: 'contacts', label: 'Multiple Contacts/Delivery Addresses' },
    // { value: 'recurring', label: 'Recurring Charges' },
    // { value: 'b2b', label: 'B2B / EDI' },
    // { value: 'departments', label: 'Store Departments' },
];

export default function MaintenanceModal({ isOpen, onClose, debtor, isLoading }: MaintenanceModalProps) {
    const isEditMode = !!debtor;
    const title = isEditMode ? 'Update Debtor' : 'Add New Debtor';

    // Panels are force-mounted (and only hidden) so that switching tabs never
    // discards work already typed into another tab.
    const [activeTab, setActiveTab] = useState('account');

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="flex h-[95vh] w-[80vw] !max-w-none flex-col gap-2 overflow-hidden p-0">
                <DialogHeader className="flex-none px-4 py-2">
                    <div className="flex items-center justify-between">
                        <DialogTitle className="text-lg font-semibold">{title}</DialogTitle>
                    </div>
                </DialogHeader>

                <Tabs
                    value={activeTab}
                    onValueChange={setActiveTab}
                    className="flex flex-1 flex-col px-4"
                >
                    <TabsList className="flex h-7 flex-none rounded-none border-b border-gray-200 bg-gray-50 p-0">
                        {DebtorMaintenanceMenu.map((tab) => (
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
                            forceMount
                            className={cn('h-full overflow-hidden', activeTab !== 'account' && 'hidden')}
                        >
                            {isLoading ? (
                                <div className="flex h-full items-center justify-center">
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                </div>
                            ) : (
                                <AccountDetails debtor={debtor} onClose={onClose} />
                            )}
                        </TabsContent>

                        <TabsContent
                            value="contacts"
                            forceMount
                            className={cn('h-full overflow-hidden', activeTab !== 'contacts' && 'hidden')}
                        >
                            <MultipleContacts />
                        </TabsContent>
                        <TabsContent
                            value="recurring"
                            forceMount
                            className={cn('h-full overflow-hidden', activeTab !== 'recurring' && 'hidden')}
                        >
                            <RecurringCharges />
                        </TabsContent>
                        <TabsContent
                            value="b2b"
                            forceMount
                            className={cn('h-full overflow-hidden', activeTab !== 'b2b' && 'hidden')}
                        >
                            <B2BEDI />
                        </TabsContent>
                        <TabsContent
                            value="departments"
                            forceMount
                            className={cn('h-full overflow-hidden', activeTab !== 'departments' && 'hidden')}
                        >
                            <StoreDepartments />
                        </TabsContent>
                    </div>
                </Tabs>
            </DialogContent>
        </Dialog>
    );
}
