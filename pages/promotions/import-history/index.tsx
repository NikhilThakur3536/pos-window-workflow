import { NextPageWithLayout } from '@/types';
import PermissionGuard from '@/components/permission-guards/PermissionGuard';
import { SYSTEM_MODULES, SYSTEM_PERMISSIONS } from '@/lib/constant';
import ImportHistory from '@/modules/common/import-history';
import { IMPORT_HISTORY_TYPES } from '@/api-queries/import-history';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';


const Page: NextPageWithLayout = () => {
    return (
        <PermissionGuard module={SYSTEM_MODULES?.STOCK.MAINTENANCE.code} permission={[SYSTEM_PERMISSIONS?.CREATE]}>
            {/* <ImportHistory importType={IMPORT_HISTORY_TYPES?.PROMOTIONAL_PRICE_WHOLESALE} /> */}
            <Tabs
                defaultValue="PROMOTIONAL_PRICE_WHOLESALE"
                className="w-full"
            >
                <TabsList className="mb-4">
                    <TabsTrigger value="PROMOTIONAL_PRICE_WHOLESALE">
                        Promotional Price Wholesale
                    </TabsTrigger>

                    <TabsTrigger value="SIMPLE_PRICING_RETAIL">
                        Simple Pricing Retail
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="PROMOTIONAL_PRICE_WHOLESALE">
                    <ImportHistory
                        importType={
                            IMPORT_HISTORY_TYPES?.PROMOTIONAL_PRICE_WHOLESALE
                        }
                    />
                </TabsContent>

                <TabsContent value="SIMPLE_PRICING_RETAIL">
                    <ImportHistory
                        importType={
                            IMPORT_HISTORY_TYPES?.SIMPLE_PRICING_RETAIL
                        }
                    />
                </TabsContent>
            </Tabs>
        </PermissionGuard>
    );
};

Page.layoutType = 'dashboard';

export default Page;
