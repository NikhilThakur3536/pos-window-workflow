import React, { ReactNode, useState, useEffect } from 'react';
import ImportModule from '@/components/import-sheets/import-module';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { Box, FileSpreadsheet, History, ShoppingCart, Store, Tag } from 'lucide-react';
import { hasPermission } from '@/components/permission-guards';
import useUsersPermissions from '@/components/permission-guards/useUsersPermissions';
import { SYSTEM_MODULES, SYSTEM_PERMISSIONS } from '@/lib/constant';
import { useRouter } from 'next/router';

export interface ImportGroup {
    name: string;
    icon: ReactNode;
    items: ImportGroupItem[];
}

export interface ImportGroupItem {
    module: string;
    route: string;
    hasImportPermission: boolean;
    url: string;

    detailsRoute?: string;
    customRoute?: string;
    fileFieldName?: string;
    showHistory?: boolean;
}

const DataImportCenter = () => {
    const userGroupPermissions = useUsersPermissions();
    const router = useRouter();


    const [isOfflineMode, setIsOfflineMode] = useState(false);

    useEffect(() => {
        const checkSystemMode = () => {
            const systemMode = localStorage.getItem('systemMode');
            setIsOfflineMode(systemMode === 'offline');
        };

        checkSystemMode();

        window.addEventListener('storage', checkSystemMode);

        return () => {
            window.removeEventListener('storage', checkSystemMode);
        };
    }, []);


    function hasImportPermission(code: string) {
        return hasPermission(userGroupPermissions, code, [SYSTEM_PERMISSIONS.CREATE]);
    }

    const importGroups: ImportGroup[] = [
        {
            name: 'Stock',
            icon: <ShoppingCart className="h-5 w-5 text-blue-500" />,
            items: [
                {
                    module: 'Company_Stock_Details',
                    route: 'companyStockDetail',
                    hasImportPermission: hasImportPermission(SYSTEM_MODULES.STOCK.MAINTENANCE.code),

                    url: '/stocks',
                    showHistory: true,
                },

                {
                    module: 'Company_Stock_Inventory',
                    route: 'companyStockInventory',
                    hasImportPermission: hasImportPermission(SYSTEM_MODULES?.STOCK.MAINTENANCE.STOCK_INVENTORY.code),

                    url: '/stocks/inventory',
                    showHistory: true,
                },

                {
                    module: 'Company_Stock_Pricing',
                    route: 'companyStockPricing',
                    hasImportPermission: hasImportPermission(SYSTEM_MODULES.STOCK.MAINTENANCE.STOCK_INVENTORY.code),

                    url: '/stocks/pricing',
                    showHistory: true,
                },
                {
                    module: 'GRV',
                    route: 'grv',
                    hasImportPermission: hasImportPermission(SYSTEM_MODULES.PROCESSING.GOODS_RECEIVING.code),

                    url: '/processing/goods-receiving',
                    showHistory: true,
                },

                {
                    module: 'Markup',
                    route: 'markup',
                    hasImportPermission: hasImportPermission(SYSTEM_MODULES.STOCK.MAINTENANCE.STOCK_INVENTORY.code),
                    customRoute: '/simple-pricing/import',
                    fileFieldName: 'file',

                    url: '/stocks',
                    detailsRoute: '/stocks/markup',
                    showHistory: true,
                },

                {
                    module: 'Stores_Stock_Quantity',
                    route: 'companyStoreStockQuantity',
                    hasImportPermission: hasImportPermission(SYSTEM_MODULES.STOCK.MAINTENANCE.STOCK_INVENTORY.code),
                    fileFieldName: 'file',

                    url: '/stocks',
                    detailsRoute: '/stocks/stores-stock-quantity',
                    showHistory: true,
                },
            ],
        },

        {
            name: 'Outlets & Users',
            icon: <Store className="h-5 w-5 text-orange-500" />,
            items: [
                {
                    module: 'Debtors',
                    route: 'companyDebtor',
                    hasImportPermission: hasImportPermission(SYSTEM_MODULES.DEBTORS.MAINTENANCE.code),

                    url: '/debtors/maintenance',
                    showHistory: true,
                },

                {
                    module: 'Creditors',
                    route: 'companyCreditor',
                    hasImportPermission: hasImportPermission(SYSTEM_MODULES.CREDITORS.MAINTENANCE.code),

                    url: '/creditors/maintenance',
                    showHistory: true,
                },
            ],
        },

        {
            name: 'Products & Categories',
            icon: <Box className="h-5 w-5 text-green-500" />,
            items: [
                {
                    module: 'Tax_Rates',
                    route: 'companyTaxRate',
                    hasImportPermission: hasImportPermission(
                        SYSTEM_MODULES.UTILITIES.SETUP.COMPANY_DETAILS.TAX_RATES.code,
                    ),

                    url: '/utilities/set-up/company-details',
                    showHistory: true,
                },
            ],
        },

        {
            name: 'Promotions & Discounts',
            icon: <Tag className="h-5 w-5 text-red-500" />,
            items: [
                {
                    module: 'Goods_Discount',
                    route: 'goodsDiscount',
                    hasImportPermission: hasImportPermission(SYSTEM_MODULES.PROCESSING.GOODS_DISCOUNT.code),
                    customRoute: '/goods-stock-qty-discounts/import',
                    fileFieldName: 'file',

                    url: '/processing/goods-discount',
                    showHistory: true,
                },

                {
                    module: 'Sales_Discount',
                    route: 'salesDiscount',
                    hasImportPermission: hasImportPermission(SYSTEM_MODULES.POINT_OF_SALE.SALES_DISCOUNT.code),
                    customRoute: '/sales-stock-qty-discounts/import',
                    fileFieldName: 'file',

                    url: '/point-of-sale/sales-discount',
                    showHistory: true,
                },

                {
                    module: 'Promotion_Wholesale',
                    route: 'simplePromotionWholesale',
                    hasImportPermission: hasImportPermission(SYSTEM_MODULES.POINT_OF_SALE.PROMOTIONS.code),

                    url: '/promotions',
                    showHistory: true,
                },

                {
                    module: 'Supplier_Deals',
                    route: 'supplierDeal',
                    hasImportPermission: hasImportPermission(SYSTEM_MODULES.PROCESSING.SUPPLIER_DEALS.code),

                    url: '/processing/supplier-deals',
                    showHistory: true,
                },

                {
                    module: 'Simple_Promotion_Retail',
                    route: 'simplePromotionRetail',
                    hasImportPermission: hasImportPermission(SYSTEM_MODULES.PROCESSING.SIMPLE_PROMOTION_RETAIL.code),

                    url: '/promotions',
                    showHistory: true,
                },
            ],
        },
    ];

    return (
        <div className="relative">
            <div className="!bg-white p-4">
                <div className="mb-6 flex items-center justify-between">
                    <div>
                        <h1 className="text-xl font-bold tracking-tight">Data Import Center</h1>
                        <p className="text-muted-foreground mt-1 text-sm">
                            Upload and manage your data sheets for various modules
                        </p>
                    </div>
                </div>

                <Separator className="my-3" />

                <Tabs defaultValue={importGroups[0].name.toLowerCase().replace(/\s+/g, '')}>
                    <TabsList className="mb-3 grid w-max grid-cols-4">
                        {importGroups.map((group, idx) => (
                            <TabsTrigger key={idx} value={group.name.toLowerCase().replace(/\s+/g, '')}>
                                <div className="flex items-center gap-2">
                                    {group.icon}
                                    <span>{group.name}</span>
                                </div>
                            </TabsTrigger>
                        ))}
                    </TabsList>

                    {importGroups.map((group, gIdx) => (
                        <TabsContent key={gIdx} value={group.name.toLowerCase().replace(/\s+/g, '')}>
                            <div className="grid grid-cols-3 gap-4 md:grid-cols-4 lg:grid-cols-5">
                                {group.items.map((sheet, idx) => (
                                    <Card key={idx} className="justify-between gap-0 overflow-hidden bg-gray-200 p-3">
                                        <CardHeader className="bg-muted p-2">
                                            <CardTitle>{sheet.module.replace(/_/g, ' ')}</CardTitle>
                                            <CardDescription className="text-xs">
                                                Import and manage {sheet.module.replace(/_/g, ' ').toLowerCase()} data
                                            </CardDescription>

                                            {sheet.showHistory ? (
                                                <Button
                                                    variant="outline"
                                                    onClick={() => {
                                                        if (sheet.url) {
                                                            router.push(
                                                                `${sheet.detailsRoute || sheet.url}/import-history`,
                                                            );
                                                        }
                                                    }}
                                                >
                                                    <History /> View History
                                                </Button>
                                            ) : null}
                                        </CardHeader>

                                        <CardContent className="bg-white p-0 py-2">
                                            <div className="flex items-center justify-center rounded-md p-2">
                                                <FileSpreadsheet className="text-muted-foreground h-10 w-10" />
                                            </div>
                                        </CardContent>

                                        <CardFooter className="mt-2 flex w-full justify-between p-0">
                                            <Button
                                                variant="outline"
                                                onClick={() => {
                                                    if (sheet.url) {
                                                        router.push(sheet.url);
                                                    }
                                                }}
                                            >
                                                View All
                                            </Button>

                                            <ImportModule
                                                module={sheet.module}
                                                route={sheet.route}
                                                hasPermission={sheet.hasImportPermission && !isOfflineMode}
                                                noLabel
                                                {...(sheet.customRoute && { customRoute: sheet.customRoute })}
                                                {...(sheet.fileFieldName && { fileFieldName: sheet.fileFieldName })}
                                            />
                                        </CardFooter>
                                    </Card>
                                ))}
                            </div>
                        </TabsContent>
                    ))}
                </Tabs>
            </div>
        </div>
    );
};

export default DataImportCenter;