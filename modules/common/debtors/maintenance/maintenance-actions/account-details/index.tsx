import React, { useCallback, useRef, useState } from 'react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import AccountInformation from './account-details-actions/account-information';
import PaymentSettings from './account-details-actions/payment-settings';
import AdditionalInformation from './account-details-actions/additional-information';
import { CompanyDebtor, CompanyDebtorBankingInfo, CompanyDebtorSetting } from '@/types';

type CreateExtras = {
    bankingInfo?: Partial<CompanyDebtorBankingInfo>;
    settings?: Partial<CompanyDebtorSetting>;
};

const AccountDetails = ({ debtor, onClose }: { debtor: CompanyDebtor | null; onClose: () => void }) => {
    const createExtrasRef = useRef<CreateExtras>({});
    const createSubmitRef = useRef<(() => void) | null>(null);

    const handleBankingInfoDraft = useCallback((bankingInfo: Partial<CompanyDebtorBankingInfo>) => {
        createExtrasRef.current.bankingInfo = bankingInfo;
    }, []);

    const handleSettingsDraft = useCallback((settings: Partial<CompanyDebtorSetting>) => {
        createExtrasRef.current.settings = settings;
    }, []);

    const handleCreateSubmitReady = useCallback((submit: (() => void) | null) => {
        createSubmitRef.current = submit;
    }, []);

    const handleCreateFromAnyTab = useCallback(() => {
        createSubmitRef.current?.();
    }, []);

    // Radix unmounts inactive TabsContent by default, which threw away the
    // react-hook-form instance (and any typed values) of the tab being left.
    // The tabs are controlled and every panel is force-mounted, so panels are
    // only hidden instead of destroyed and edits survive tab switching.
    const [activeTab, setActiveTab] = useState('information');

    const accountDetailsMenu = [
        { value: 'information', label: 'Account Information' },
        { value: 'payment', label: 'Payment Settings' },
        { value: 'additional', label: 'Additional Information' },
    ];

    return (
        <Tabs value={activeTab} onValueChange={setActiveTab} className="relative flex h-full">
            <TabsList className="flex h-7 flex-none rounded-none border-b border-gray-200 bg-gray-50 p-0">
                {accountDetailsMenu.map((tab) => (
                    <TabsTrigger
                        key={tab.value}
                        value={tab.value}
                        className="cursor-pointer rounded-none px-3 text-[12px] font-medium text-gray-600 transition-colors hover:bg-gray-100 data-[state=active]:bg-white data-[state=active]:font-semibold data-[state=active]:text-gray-900"
                    >
                        {tab.label}
                    </TabsTrigger>
                ))}
            </TabsList>

            <div className="absolute top-9 bottom-0 w-full">
                <TabsContent
                    value="information"
                    forceMount
                    className={cn('h-full', activeTab !== 'information' && 'hidden')}
                >
                    <AccountInformation
                        debtor={debtor}
                        onClose={onClose}
                        createExtrasRef={createExtrasRef}
                        onCreateSubmitReady={handleCreateSubmitReady}
                    />
                </TabsContent>

                <TabsContent
                    value="payment"
                    forceMount
                    className={cn('h-full', activeTab !== 'payment' && 'hidden')}
                >
                    <PaymentSettings
                        debtor={debtor}
                        onClose={onClose}
                        createMode={!debtor}
                        onDraftChange={handleBankingInfoDraft}
                        onAccept={!debtor ? handleCreateFromAnyTab : undefined}
                    />
                </TabsContent>

                <TabsContent
                    value="additional"
                    forceMount
                    className={cn('h-full', activeTab !== 'additional' && 'hidden')}
                >
                    <AdditionalInformation
                        debtor={debtor}
                        onClose={onClose}
                        createMode={!debtor}
                        onDraftChange={handleSettingsDraft}
                        onAccept={!debtor ? handleCreateFromAnyTab : undefined}
                    />
                </TabsContent>
            </div>
        </Tabs>
    );
};

export default AccountDetails;
