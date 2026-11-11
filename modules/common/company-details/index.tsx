import React from 'react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import CompanyDetailsTab from './company-details-tab';
import TaxRates from './tax-rates';
import PermissionGuard from '@/components/permission-guards/PermissionGuard';
import { SYSTEM_MODULES, SYSTEM_PERMISSIONS } from '@/lib/constant';

const CompanyDetails = () => {
    const CompanyDetailsMenu = [
        { value: 'company-details', label: 'Company Details' },
        { value: 'tax-rates', label: 'Tax Rates' },
    ];

    return (
        <div>
            <Tabs defaultValue="company-details" className="flex flex-1 flex-col px-4 py-3">
                <TabsList className="flex h-7 flex-none rounded-none border-b border-gray-200 bg-gray-50 p-0">
                    {CompanyDetailsMenu.map((tab) => (
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
                    <TabsContent value="company-details" className="h-full overflow-hidden">
                        <PermissionGuard
                            module={SYSTEM_MODULES?.UTILITIES.SETUP.COMPANY_DETAILS.COMPANY_DETAILS.code}
                            permission={[SYSTEM_PERMISSIONS?.READ]}
                        >
                            <CompanyDetailsTab />
                        </PermissionGuard>
                    </TabsContent>

                    <TabsContent value="tax-rates" className="h-full overflow-hidden">
                        <PermissionGuard
                            module={SYSTEM_MODULES?.UTILITIES.SETUP.COMPANY_DETAILS.TAX_RATES.code}
                            permission={[SYSTEM_PERMISSIONS?.READ]}
                        >
                            <TaxRates />
                        </PermissionGuard>
                    </TabsContent>
                </div>
            </Tabs>
        </div>
    );
};

export default CompanyDetails;
