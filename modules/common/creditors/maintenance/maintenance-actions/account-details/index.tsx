import React, { useCallback, useRef, useState } from 'react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import AccountInformation from './account-details-actions/account-information';
import PaymentSettings from './account-details-actions/payment-settings';
import AdditionalInformation from './account-details-actions/additional-information';
import { UpdatedCompanyCreditor } from '@/types';
import { cn } from '@/lib/utils';

type CreateExtras = {
    bankingInfo?: Record<string, unknown>;
    settings?: Record<string, unknown>;
};

const AccountDetails = ({ creditor, onClose }: { creditor: UpdatedCompanyCreditor | null; onClose: () => void }) => {
    const [activeTab, setActiveTab] = useState('information');
    const createExtrasRef = useRef<CreateExtras>({});
    const createSubmitRef = useRef<(() => void) | null>(null);

    const handleBankingInfoDraft = useCallback((bankingInfo: Record<string, unknown>) => {
        createExtrasRef.current.bankingInfo = bankingInfo;
    }, []);

    const handleSettingsDraft = useCallback((settings: Record<string, unknown>) => {
        createExtrasRef.current.settings = settings;
    }, []);

    const handleCreateSubmitReady = useCallback((submit: (() => void) | null) => {
        createSubmitRef.current = submit;
    }, []);

    const handleCreateFromAnyTab = useCallback(() => {
        createSubmitRef.current?.();
    }, []);

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
                        creditor={creditor}
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
                        creditor={creditor}
                        onClose={onClose}
                        createMode={!creditor}
                        onDraftChange={handleBankingInfoDraft}
                        onAccept={!creditor ? handleCreateFromAnyTab : undefined}
                    />
                </TabsContent>

                <TabsContent
                    value="additional"
                    forceMount
                    className={cn('h-full', activeTab !== 'additional' && 'hidden')}
                >
                    <AdditionalInformation
                        creditor={creditor}
                        onClose={onClose}
                        createMode={!creditor}
                        onDraftChange={handleSettingsDraft}
                        onAccept={!creditor ? handleCreateFromAnyTab : undefined}
                    />
                </TabsContent>
            </div>
        </Tabs>
    );
};

export default AccountDetails;
