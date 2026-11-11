import { UserTypesType } from '@/api-queries/user';
import { UserGroupPermissionDetails } from '@/api-queries/user-groups/user-group-permissions';
import { hasPermission } from '@/components/permission-guards';
import { SYSTEM_MODULES, SYSTEM_PERMISSIONS } from '@/lib/constant';
import type { LucideIcon } from 'lucide-react';
import {
    ArrowRightLeft,
    Banknote,
    Landmark,
    BarChart,
    FileBarChart,
    Bell,
    Book,
    Calculator,
    CalendarClock,
    CalendarDays,
    Clock,
    CircleHelp,
    ClipboardCheck,
    ClipboardList,
    CreditCard,
    FileSearch,
    FileText,
    Fingerprint,
    HandCoins,
    LifeBuoy,
    Megaphone,
    MessageCircle,
    MonitorDot,
    Command,
    QrCode,
    Receipt,
    Settings,
    ShieldCheck,
    ShoppingCart,
    TruckElectricIcon,
    Truck,
    UserCog,
    UserX,
    Wallet,
    Wrench,
    ScrollText,
    RefreshCw,
    SlidersHorizontal,
    Store,
    Users,
    ShoppingCartIcon,
    BuildingIcon,
    Table,
    FileDown,
    FileUp,
    Archive,
    Database,
    File,
    Clipboard,
    Grid,
    Layers,
    Tags,
    Tag,
    User,
    Star,
    Award,
    NotepadText,
    ArrowLeftRight,
    Ruler,
    UsersRound,
    Notebook,
    Percent,
    Vault,
    TruckElectric,
    HelpCircle,
    Settings2,
    Barcode,
    DollarSign,
    Scale,
    PackageSearch,
    MapPin,
    Route,
    Send,
} from 'lucide-react';

export interface TopMenuItem {
    id: string;
    label: string;
    href?: string;
}

export interface SubmenuAction {
    label: string;
    href?: string;
    icon: LucideIcon;
    subMenuItems?: SubmenuAction[];
}

const COMPANY_CONTEXT_KEY = 'companyContext';

const getStoredCompanyContext = (): { isChildCompany?: boolean; [key: string]: any } | null => {
    if (typeof window === 'undefined') return null;
    try {
        const raw = localStorage.getItem(COMPANY_CONTEXT_KEY);
        return raw ? JSON.parse(raw) : null;
    } catch {
        return null;
    }
};

export const getMenuData = (
    authUserType: UserTypesType | undefined,
    userGroupPermissions: UserGroupPermissionDetails[],
): {
    topMenuItems: TopMenuItem[];
    actionsByTabId: Record<string, SubmenuAction[]>;
} => {
    const isMenuPermission = (key: string) =>
        hasPermission(userGroupPermissions, key, [SYSTEM_PERMISSIONS.SHOW_IN_MENU]);
    const isAnyMenuPermission = (...keys: string[]) => keys.some((key) => isMenuPermission(key));

    // Replenishment automation is configured by company / admin users only.
    // Store (debtor) and warehouse logins keep their existing permitted order screens.
    const canSeeAutomationMenu =
        authUserType !== 'COMPANY-DEBTOR-USER' &&
        authUserType !== 'WAREHOUSE-USER' &&
        isMenuPermission(SYSTEM_MODULES.PROCESSING.REPLENISHMENT_RECOMMENDATIONS.AUTOMATION.code);

    const CASH_OFFICE_SUBMENU_CODES = [
        SYSTEM_MODULES.OPERATIONS.CASH_OFFICE.code,
        SYSTEM_MODULES.OPERATIONS.CASH_OFFICE.DASHBOARD.code,
        SYSTEM_MODULES.OPERATIONS.CASH_OFFICE.TILL_HANDOVERS.code,
        SYSTEM_MODULES.OPERATIONS.CASH_OFFICE.CASH_OFFICE_RECEIPTS.code,
        SYSTEM_MODULES.OPERATIONS.CASH_OFFICE.PAYMENT_COLLECTION.code,
        SYSTEM_MODULES.OPERATIONS.CASH_OFFICE.PAYMENTS_AND_TRANSFERS.code,
        SYSTEM_MODULES.OPERATIONS.CASH_OFFICE.BANK_DEPOSITS_AND_WITHDRAWALS.code,
        SYSTEM_MODULES.OPERATIONS.CASH_OFFICE.RECONCILIATION_AND_CLOSING.code,
        SYSTEM_MODULES.OPERATIONS.CASH_OFFICE.REPORTS.code,
        SYSTEM_MODULES.OPERATIONS.CASH_OFFICE.CONFIGURATION.code,
    ];
    const isCashOfficeMenuPermission = () => isAnyMenuPermission(...CASH_OFFICE_SUBMENU_CODES);

    const SYNCHRONIZATION_SUBMENU_CODES = [
        SYSTEM_MODULES.OPERATIONS.SYNCHRONIZATION.code,
        SYSTEM_MODULES.OPERATIONS.SYNCHRONIZATION.SYNC_MONITORING.code,
    ];
    const isSynchronizationMenuPermission = () => isAnyMenuPermission(...SYNCHRONIZATION_SUBMENU_CODES);

    const isOperationsMenuPermission = () =>
        isMenuPermission(SYSTEM_MODULES.OPERATIONS.code) ||
        isCashOfficeMenuPermission() ||
        isSynchronizationMenuPermission() ||
        assetsSubmenu.length > 0;

    const cashOfficeSubmenu: SubmenuAction[] = [
        ...(isMenuPermission(SYSTEM_MODULES.OPERATIONS.CASH_OFFICE.DASHBOARD.code)
            ? [{ label: 'Dashboard', href: '/operations/cash-office/dashboard', icon: Grid }]
            : []),
        ...(isMenuPermission(SYSTEM_MODULES.OPERATIONS.CASH_OFFICE.TILL_HANDOVERS.code)
            ? [{ label: 'Till Handovers', href: '/operations/cash-office/till-handovers', icon: ClipboardCheck }]
            : []),
        ...(isMenuPermission(SYSTEM_MODULES.OPERATIONS.CASH_OFFICE.CASH_OFFICE_RECEIPTS.code)
            ? [{ label: 'Cash Office Receipts', href: '/operations/cash-office/receipts', icon: Receipt }]
            : []),
        ...(isMenuPermission(SYSTEM_MODULES.OPERATIONS.CASH_OFFICE.PAYMENT_COLLECTION.code)
            ? [
                  {
                      label: 'Payment Collection',
                      href: '/operations/cash-office/payment-collection',
                      icon: HandCoins,
                  },
              ]
            : []),
        ...(isMenuPermission(SYSTEM_MODULES.OPERATIONS.CASH_OFFICE.PAYMENTS_AND_TRANSFERS.code)
            ? [
                  {
                      label: 'Payments and Transfers',
                      href: '/operations/cash-office/payments-transfers',
                      icon: ArrowRightLeft,
                  },
              ]
            : []),
        ...(isMenuPermission(SYSTEM_MODULES.OPERATIONS.CASH_OFFICE.BANK_DEPOSITS_AND_WITHDRAWALS.code)
            ? [
                  {
                      label: 'Bank Deposits & Withdrawals',
                      href: '/operations/cash-office/banking',
                      icon: Banknote,
                  },
              ]
            : []),
        ...(isMenuPermission(SYSTEM_MODULES.OPERATIONS.CASH_OFFICE.RECONCILIATION_AND_CLOSING.code)
            ? [
                  {
                      label: 'Reconciliation & Closing',
                      href: '/operations/cash-office/reconciliation',
                      icon: ClipboardList,
                  },
              ]
            : []),
        ...(isMenuPermission(SYSTEM_MODULES.OPERATIONS.CASH_OFFICE.REPORTS.code)
            ? [{ label: 'Reports', href: '/operations/cash-office/reports', icon: FileText }]
            : []),
        ...(isMenuPermission(SYSTEM_MODULES.OPERATIONS.CASH_OFFICE.CONFIGURATION.code)
            ? [{ label: 'Configuration', href: '/operations/cash-office/configuration', icon: Settings }]
            : []),
    ];

    const syncSubmenu: SubmenuAction[] = [
        ...(isMenuPermission(SYSTEM_MODULES.OPERATIONS.SYNCHRONIZATION.SYNC_MONITORING.code)
            ? [{ label: 'Sync Monitoring', href: '/operations/sync-monitoring', icon: RefreshCw }]
            : []),
    ];

    const assetsSubmenu: SubmenuAction[] = [
        ...(isMenuPermission(SYSTEM_MODULES.OPERATIONS.STORE_ASSETS_AND_MAINTENANCE.ASSET_REGISTER.code)
            ? [{ label: 'Asset Register', href: '/operations/assets/register', icon: Archive }]
            : []),
        ...(isMenuPermission(SYSTEM_MODULES.OPERATIONS.STORE_ASSETS_AND_MAINTENANCE.ASSET_EVENTS.code)
            ? [{ label: 'Asset Events & Maintenance', href: '/operations/assets/events', icon: Wrench }]
            : []),
    ];

    console.log('user permissions', userGroupPermissions);
    console.log('auth user type', authUserType);

    const companyContext = getStoredCompanyContext();
    const isChildCompany = companyContext?.isChildCompany === true;

    return {
        topMenuItems:
            authUserType === 'COMPANY-DEBTOR-USER'
                ? [
                      ...(isMenuPermission(SYSTEM_MODULES.PROCESSING.code)
                          ? [{ id: 'processing', label: 'Processing' }]
                          : []),
                      ...(isMenuPermission(SYSTEM_MODULES.DEBTORS.STATEMENTS.code)
                          ? [{ id: 'debtors', label: 'Debtors' }]
                          : []),
                      ...(isMenuPermission(SYSTEM_MODULES.STOCK.code) ? [{ id: 'stock', label: 'Stock' }] : []),
                      { id: 'utilities', label: 'Utilities' },
                      ...(isMenuPermission(SYSTEM_MODULES.POINT_OF_SALE.code)
                          ? [{ id: 'point-of-sale', label: 'Point of Sale' }]
                          : []),
                      ...(isOperationsMenuPermission() ? [{ id: 'operations', label: 'Operations' }] : []),
                  ]
                : [
                      ...(isMenuPermission(SYSTEM_MODULES.PROCESSING.code)
                          ? [{ id: 'processing', label: 'Processing' }]
                          : []),
                      ...(isMenuPermission(SYSTEM_MODULES.DEBTORS.code) ? [{ id: 'debtors', label: 'Debtors' }] : []),
                      ...(isMenuPermission(SYSTEM_MODULES.CREDITORS.code)
                          ? [{ id: 'creditors', label: 'Creditors' }]
                          : []),
                      ...(isMenuPermission(SYSTEM_MODULES.STOCK.code) ? [{ id: 'stock', label: 'Stock' }] : []),
                      //   { id: 'ledger', label: 'Ledger' },
                      { id: 'utilities', label: 'Utilities' },
                      ...(isMenuPermission(SYSTEM_MODULES.POINT_OF_SALE.code)
                          ? [{ id: 'point-of-sale', label: 'Point of Sale' }]
                          : []),
                      ...(isOperationsMenuPermission() ? [{ id: 'operations', label: 'Operations' }] : []),
                      //   { id: 'support', label: 'Support', href: '/' },
                      //   { id: 'windows', label: 'Windows', href: '/' },
                      //   { id: 'help', label: 'Help' },
                      //   { id: 'shortcuts', label: 'Shortcuts', href: '/' },
                  ],
        //@ts-ignore
        actionsByTabId:
            authUserType === 'COMPANY-DEBTOR-USER'
                ? // ------ COMPANY DEBTOR USER ---------
                  {
                      'processing': [
                          ...(isMenuPermission(SYSTEM_MODULES.PROCESSING.GOODS_RECEIVING.code) ||
                          isMenuPermission(SYSTEM_MODULES.PROCESSING.GOODS_RECEIVING.GRV_BARCODE_REVIEW.code)
                              ? [
                                    {
                                        label: 'Goods Receiving',
                                        icon: TruckElectricIcon,
                                        subMenuItems: [
                                            ...(isMenuPermission(SYSTEM_MODULES.PROCESSING.GOODS_RECEIVING.code)
                                                ? [
                                                      {
                                                          label: 'Goods Receiving',
                                                          href: '/processing/goods-receiving',
                                                          icon: TruckElectricIcon,
                                                      },
                                                  ]
                                                : []),
                                            ...(isMenuPermission(
                                                SYSTEM_MODULES.PROCESSING.GOODS_RECEIVING.GRV_BARCODE_REVIEW.code,
                                            )
                                                ? [
                                                      {
                                                          label: 'GRV Barcode Review',
                                                          href: '/processing/goods-receiving/grv-barcode-review',
                                                          icon: QrCode,
                                                      },
                                                  ]
                                                : []),
                                        ],
                                    },
                                ]
                              : []),
                          ...(isMenuPermission(SYSTEM_MODULES.PROCESSING.GOODS_RETURN.code)
                              ? [{ label: 'Goods Return', href: '/processing/goods-return', icon: FileDown }]
                              : []),
                          ...(isMenuPermission(SYSTEM_MODULES.PROCESSING.GOODS_DISCOUNT.code)
                              ? [{ label: 'Goods Discount', href: '/processing/goods-discount', icon: Percent }]
                              : []),
                          ...(isMenuPermission(SYSTEM_MODULES.PROCESSING.SUPPLIER_DEALS.code)
                              ? [
                                    {
                                        label: 'Supplier Deals',
                                        icon: HandCoins,
                                        subMenuItems: [
                                            {
                                                label: 'Supplier Deals',
                                                href: '/processing/supplier-deals',
                                                icon: HandCoins,
                                            },
                                            ...(isMenuPermission(
                                                SYSTEM_MODULES.PROCESSING.SUPPLIER_DEALS.SUPPLIER_DEAL_ALERTS.code,
                                            )
                                                ? [
                                                      {
                                                          label: 'Supplier Deal Alerts',
                                                          href: '/processing/supplier-deals/alerts',
                                                          icon: Bell,
                                                      },
                                                  ]
                                                : []),
                                        ],
                                    },
                                ]
                              : []),
                          ...(isMenuPermission(SYSTEM_MODULES.PROCESSING.COMPANY_DEBTOR_ORDERS.code) ||
                          isMenuPermission(SYSTEM_MODULES.PROCESSING.COMPANY_DEBTOR_ORDER_SETUP.code) ||
                          isMenuPermission(SYSTEM_MODULES.PROCESSING.DELIVERY_SCHEDULE.code) ||
                          isMenuPermission(SYSTEM_MODULES.PROCESSING.DISPATCH_AND_RECEIPT.code) ||
                          isMenuPermission(SYSTEM_MODULES.PROCESSING.STOCK_BATCH_ALLOCATION.code) ||
                          isMenuPermission(SYSTEM_MODULES.PROCESSING.AISLE_PICKLIST.code) ||
                          isMenuPermission(SYSTEM_MODULES.PROCESSING.PICKED_ORDERS.code) ||
                          isMenuPermission(SYSTEM_MODULES.PROCESSING.STORE_INVENTORY_SALES_CONFIGURATION.code) ||
                          isMenuPermission(SYSTEM_MODULES.PROCESSING.COMPANY_DEBTOR_ORDERS.OVER_SUPPLY_APPROVAL.code)
                              ? [
                                    {
                                        label: 'Company Debtor Orders',
                                        icon: ShoppingCart,
                                        subMenuItems: [
                                            ...(isMenuPermission(SYSTEM_MODULES.PROCESSING.COMPANY_DEBTOR_ORDERS.code)
                                                ? [
                                                      {
                                                          label: 'Company Debtor Orders',
                                                          href: '/processing/company-debtor-orders',
                                                          icon: ShoppingCart,
                                                      },
                                                  ]
                                                : []),
                                            ...(isMenuPermission(
                                                SYSTEM_MODULES.PROCESSING.COMPANY_DEBTOR_ORDER_SETUP.code,
                                            )
                                                ? [
                                                      {
                                                          label: 'Company Debtor Order Setup',
                                                          href: '/processing/company-debtor-orders/setup',
                                                          icon: Settings,
                                                      },
                                                  ]
                                                : []),
                                            ...(isMenuPermission(SYSTEM_MODULES.PROCESSING.DELIVERY_SCHEDULE.code)
                                                ? [
                                                      {
                                                          label: 'Delivery Schedule',
                                                          href: '/processing/company-debtor-orders/delivery-schedule',
                                                          icon: CalendarClock,
                                                      },
                                                  ]
                                                : []),
                                            ...(isMenuPermission(SYSTEM_MODULES.PROCESSING.DISPATCH_AND_RECEIPT.code)
                                                ? [
                                                      {
                                                          label: 'Dispatch & Receipt',
                                                          href: '/processing/company-debtor-orders/dispatch-receipt',
                                                          icon: Truck,
                                                      },
                                                  ]
                                                : []),
                                            ...(isMenuPermission(SYSTEM_MODULES.PROCESSING.STOCK_BATCH_ALLOCATION.code)
                                                ? [
                                                      {
                                                          label: 'Stock Batch Allocation',
                                                          href: '/processing/company-debtor-orders/stock-batch-allocation',
                                                          icon: PackageSearch,
                                                      },
                                                  ]
                                                : []),
                                            ...(isMenuPermission(SYSTEM_MODULES.PROCESSING.AISLE_PICKLIST.code)
                                                ? [
                                                      {
                                                          label: 'Aisle Picklist',
                                                          href: '/processing/company-debtor-orders/aisle-picklist',
                                                          icon: Route,
                                                      },
                                                  ]
                                                : []),
                                            ...(isMenuPermission(SYSTEM_MODULES.PROCESSING.PICKED_ORDERS.code)
                                                ? [
                                                      {
                                                          label: 'Picked Orders',
                                                          href: '/processing/company-debtor-orders/picked-orders',
                                                          icon: Receipt,
                                                      },
                                                  ]
                                                : []),
                                            ...(isMenuPermission(
                                                SYSTEM_MODULES.PROCESSING.STORE_INVENTORY_SALES_CONFIGURATION.code,
                                            )
                                                ? [
                                                      {
                                                          label: 'Store Inventory & Sales Configuration',
                                                          href: '/processing/company-debtor-orders/store-inventory-sales-configuration',
                                                          icon: SlidersHorizontal,
                                                      },
                                                  ]
                                                : []),
                                            ...(isMenuPermission(
                                                SYSTEM_MODULES.PROCESSING.COMPANY_DEBTOR_ORDERS.OVER_SUPPLY_APPROVAL
                                                    .code,
                                            )
                                                ? [
                                                      {
                                                          label: 'Over-supply Approvals',
                                                          href: '/processing/company-debtor-orders/over-supply-approvals',
                                                          icon: ShieldCheck,
                                                      },
                                                  ]
                                                : []),
                                        ],
                                    },
                                ]
                              : []),
                          //   ...(isMenuPermission(SYSTEM_MODULES.PROCESSING.GOODS_RECEIVING.code)
                          //   ? [
                          //         {
                          //             label: 'Good Receivings Claim',
                          //             href: '/processing/claim',
                          //             icon: TruckElectricIcon,
                          //         },
                          //     ]
                          //   : []),
                          ...(isMenuPermission(SYSTEM_MODULES.PROCESSING.PURCHASE_DEPARTMENT.code) ||
                          isMenuPermission(SYSTEM_MODULES.PROCESSING.PURCHASE_REQUESTS.code) ||
                          isMenuPermission(SYSTEM_MODULES.PROCESSING.SUPPLIER_QUOTATIONS.code) ||
                          isMenuPermission(SYSTEM_MODULES.PROCESSING.QUOTE_COMPARISON.code) ||
                          isMenuPermission(SYSTEM_MODULES.PROCESSING.PURCHASE_ORDERS.code) ||
                          isMenuPermission(SYSTEM_MODULES.PROCESSING.SUPPLIER_INVOICES.code)
                              ? [
                                    {
                                        label: 'Purchase Department',
                                        icon: ShoppingCart,
                                        subMenuItems: [
                                            ...(isMenuPermission(SYSTEM_MODULES.PROCESSING.PURCHASE_REQUESTS.code)
                                                ? [
                                                      {
                                                          label: 'Purchase Requests',
                                                          href: '/processing/purchase-orders/purchase-requests',
                                                          icon: ClipboardList,
                                                      },
                                                  ]
                                                : []),
                                            ...(isMenuPermission(SYSTEM_MODULES.PROCESSING.SUPPLIER_QUOTATIONS.code)
                                                ? [
                                                      {
                                                          label: 'Supplier Quotations',
                                                          href: '/processing/purchase-orders/supplier-quotations',
                                                          icon: FileText,
                                                      },
                                                  ]
                                                : []),
                                            ...(isMenuPermission(SYSTEM_MODULES.PROCESSING.QUOTE_COMPARISON.code)
                                                ? [
                                                      {
                                                          label: 'Quote Comparison',
                                                          href: '/processing/purchase-orders/quote-comparison',
                                                          icon: Scale,
                                                      },
                                                  ]
                                                : []),
                                            ...(isMenuPermission(SYSTEM_MODULES.PROCESSING.PURCHASE_ORDERS.code)
                                                ? [
                                                      {
                                                          label: 'Purchase Orders',
                                                          href: '/processing/purchase-orders',
                                                          icon: ClipboardCheck,
                                                      },
                                                  ]
                                                : []),
                                            ...(isMenuPermission(SYSTEM_MODULES.PROCESSING.SUPPLIER_INVOICES.code)
                                                ? [
                                                      {
                                                          label: 'Supplier Invoices',
                                                          href: '/processing/purchase-orders/supplier-invoices',
                                                          icon: Receipt,
                                                      },
                                                  ]
                                                : []),
                                        ],
                                    },
                                ]
                              : []),
                          ...(isMenuPermission(SYSTEM_MODULES.PROCESSING.REPLENISHMENT_RECOMMENDATIONS.code) ||
                          isMenuPermission(SYSTEM_MODULES.PROCESSING.REPLENISHMENT_RECOMMENDATIONS.POLICIES.code) ||
                          isMenuPermission(SYSTEM_MODULES.PROCESSING.REPLENISHMENT_RECOMMENDATIONS.SAVED_RUNS.code) ||
                          canSeeAutomationMenu
                              ? [
                                    {
                                        label: 'Replenishment Recommendations',
                                        icon: PackageSearch,
                                        subMenuItems: [
                                            ...(isMenuPermission(
                                                SYSTEM_MODULES.PROCESSING.REPLENISHMENT_RECOMMENDATIONS.code,
                                            )
                                                ? [
                                                      {
                                                          label: 'Recommendations',
                                                          href: '/processing/replenishment',
                                                          icon: PackageSearch,
                                                      },
                                                  ]
                                                : []),
                                            ...(isMenuPermission(
                                                SYSTEM_MODULES.PROCESSING.REPLENISHMENT_RECOMMENDATIONS.SAVED_RUNS.code,
                                            )
                                                ? [
                                                      {
                                                          label: 'Saved Runs',
                                                          href: '/processing/replenishment/history',
                                                          icon: ScrollText,
                                                      },
                                                  ]
                                                : []),
                                            ...(isMenuPermission(
                                                SYSTEM_MODULES.PROCESSING.REPLENISHMENT_RECOMMENDATIONS.POLICIES.code,
                                            )
                                                ? [
                                                      {
                                                          label: 'Policy Settings',
                                                          href: '/processing/replenishment/policies',
                                                          icon: Settings2,
                                                      },
                                                  ]
                                                : []),
                                            ...(canSeeAutomationMenu
                                                ? [
                                                      {
                                                          label: 'Automation',
                                                          href: '/processing/replenishment/automation',
                                                          icon: CalendarClock,
                                                      },
                                                  ]
                                                : []),
                                        ],
                                    },
                                ]
                              : []),
                          ...(isMenuPermission(SYSTEM_MODULES.PROCESSING.INVOICE_CHECKING.code) ||
                          isMenuPermission(SYSTEM_MODULES.PROCESSING.INVOICE_CHECKING.DISCREPANCY_REPORTS.code) ||
                          isMenuPermission(SYSTEM_MODULES.PROCESSING.INVOICE_CHECKING.DISCREPANCY_REASONS.code)
                              ? [
                                    {
                                        label: 'Invoice Checking',
                                        icon: FileSearch,
                                        subMenuItems: [
                                            ...(isMenuPermission(SYSTEM_MODULES.PROCESSING.INVOICE_CHECKING.code)
                                                ? [
                                                      {
                                                          label: 'Invoice Checks',
                                                          href: '/processing/invoice-checking',
                                                          icon: FileSearch,
                                                      },
                                                  ]
                                                : []),
                                            ...(isMenuPermission(
                                                SYSTEM_MODULES.PROCESSING.INVOICE_CHECKING.DISCREPANCY_REPORTS.code,
                                            )
                                                ? [
                                                      {
                                                          label: 'Discrepancy Reports',
                                                          href: '/processing/invoice-checking/discrepancy-reports',
                                                          icon: FileText,
                                                      },
                                                  ]
                                                : []),
                                            ...(isMenuPermission(
                                                SYSTEM_MODULES.PROCESSING.INVOICE_CHECKING.DISCREPANCY_REASONS.code,
                                            )
                                                ? [
                                                      {
                                                          label: 'Discrepancy Reasons',
                                                          href: '/processing/invoice-checking/discrepancy-reasons',
                                                          icon: ClipboardCheck,
                                                      },
                                                  ]
                                                : []),
                                        ],
                                    },
                                ]
                              : []),
                      ],
                      'debtors': [
                          ...(isMenuPermission(SYSTEM_MODULES.DEBTORS.ENQUIRIES.code) ||
                          isMenuPermission(SYSTEM_MODULES.DEBTORS.ENQUIRIES.DEBTOR_STATEMENTS.code) ||
                          isMenuPermission(SYSTEM_MODULES.DEBTORS.STATEMENTS.code)
                              ? [
                                    {
                                        label: 'Enquiries',
                                        icon: FileSearch,
                                        subMenuItems: [
                                            ...(isMenuPermission(SYSTEM_MODULES.DEBTORS.ENQUIRIES.code)
                                                ? [
                                                      {
                                                          label: 'Enquiries',
                                                          href: '/debtors/enquiries',
                                                          icon: HelpCircle,
                                                      },
                                                  ]
                                                : []),
                                            ...(isMenuPermission(
                                                SYSTEM_MODULES.DEBTORS.ENQUIRIES.DEBTOR_STATEMENTS.code,
                                            )
                                                ? [
                                                      {
                                                          label: 'Debtor Statements',
                                                          href: '/debtors/statements',
                                                          icon: ScrollText,
                                                      },
                                                  ]
                                                : []),
                                        ],
                                    },
                                ]
                              : []),
                      ],
                      'stock': [
                          ...(isMenuPermission(SYSTEM_MODULES.STOCK.MAINTENANCE.code)
                              ? [
                                    { label: 'View Stocks', href: '/stocks', icon: ShoppingCart },
                                    // ...(isChildCompany
                                    //     ? []
                                    //     : [{ label: 'Add Stock Item', href: '/stocks?action=true', icon: ClipboardCheck }]),
                                ]
                              : []),
                          ...(isMenuPermission(SYSTEM_MODULES.STOCK.MAINTENANCE.code) ||
                          isMenuPermission(SYSTEM_MODULES.STOCK.MAINTENANCE.STOCK_VARIANTS.code) ||
                          isMenuPermission(SYSTEM_MODULES.STOCK.MAINTENANCE.STOCK_RANGES.code) ||
                          isMenuPermission(SYSTEM_MODULES.STOCK.MAINTENANCE.STORE_CLASSIFICATION.code) ||
                          isMenuPermission(
                              SYSTEM_MODULES.STOCK.MAINTENANCE.STORE_CLASSIFICATION.STORE_CATEGORIES.code,
                          ) ||
                          isMenuPermission(
                              SYSTEM_MODULES.STOCK.MAINTENANCE.STORE_CLASSIFICATION.STORE_CATEGORY_ASSIGNMENTS.code,
                          ) ||
                          isMenuPermission(SYSTEM_MODULES.STOCK.MAINTENANCE.SKU_TAGS_MANAGEMENT.code)
                              ? [
                                    {
                                        label: 'Maintenance',
                                        icon: Wrench,
                                        subMenuItems: [
                                            ...(isMenuPermission(SYSTEM_MODULES.STOCK.MAINTENANCE.STOCK_VARIANTS.code)
                                                ? [
                                                      {
                                                          label: 'Stock Variants',
                                                          href: '/utilities/set-up/masters/stock-variants',
                                                          icon: Tags,
                                                      },
                                                  ]
                                                : []),
                                            ...(isMenuPermission(SYSTEM_MODULES.STOCK.MAINTENANCE.STOCK_RANGES.code)
                                                ? [
                                                      {
                                                          label: 'Stock Ranges',
                                                          href: '/utilities/set-up/masters/stock-ranges',
                                                          icon: Layers,
                                                      },
                                                  ]
                                                : []),
                                            ...(isMenuPermission(SYSTEM_MODULES.STOCK.MAINTENANCE.code)
                                                ? [
                                                      {
                                                          label: 'Stock Movements',
                                                          href: '/stocks/maintenance/stock-movements',
                                                          icon: ArrowLeftRight,
                                                      },
                                                  ]
                                                : []),
                                            ...(isMenuPermission(
                                                SYSTEM_MODULES.STOCK.MAINTENANCE.STORE_CLASSIFICATION.code,
                                            ) ||
                                            isMenuPermission(
                                                SYSTEM_MODULES.STOCK.MAINTENANCE.STORE_CLASSIFICATION.STORE_CATEGORIES
                                                    .code,
                                            ) ||
                                            isMenuPermission(
                                                SYSTEM_MODULES.STOCK.MAINTENANCE.STORE_CLASSIFICATION
                                                    .STORE_CATEGORY_ASSIGNMENTS.code,
                                            )
                                                ? [
                                                      {
                                                          label: 'Store Classification',
                                                          icon: BuildingIcon,
                                                          subMenuItems: [
                                                              ...(isMenuPermission(
                                                                  SYSTEM_MODULES.STOCK.MAINTENANCE.STORE_CLASSIFICATION
                                                                      .STORE_CATEGORIES.code,
                                                              )
                                                                  ? [
                                                                        {
                                                                            label: 'Store Categories',
                                                                            href: '/stocks/maintenance/store-categories',
                                                                            icon: Tags,
                                                                        },
                                                                    ]
                                                                  : []),
                                                              ...(isMenuPermission(
                                                                  SYSTEM_MODULES.STOCK.MAINTENANCE.STORE_CLASSIFICATION
                                                                      .STORE_CATEGORY_ASSIGNMENTS.code,
                                                              )
                                                                  ? [
                                                                        {
                                                                            label: 'Store Category Assignments',
                                                                            href: '/stocks/maintenance/store-category-assignments',
                                                                            icon: UsersRound,
                                                                        },
                                                                    ]
                                                                  : []),
                                                          ],
                                                      },
                                                  ]
                                                : []),
                                            ...(isMenuPermission(
                                                SYSTEM_MODULES.STOCK.MAINTENANCE.SKU_TAGS_MANAGEMENT.code,
                                            )
                                                ? [
                                                      {
                                                          label: 'SKU Tags Management',
                                                          href: '/stocks/maintenance/sku-tags-management',
                                                          icon: Tag,
                                                      },
                                                  ]
                                                : []),
                                            // ...(isMenuPermission(SYSTEM_MODULES.STOCK.MAINTENANCE.PACKAGING_BARCODES.code)
                                            //     ? [
                                            //           {
                                            //               label: 'Packaging Barcodes',
                                            //               href: '/inventory/packaging-barcodes',
                                            //               icon: Layers,
                                            //           },
                                            //       ]
                                            //     : []),
                                        ],
                                    },
                                ]
                              : []),
                          ...(isMenuPermission(SYSTEM_MODULES.STOCK.MAINTENANCE.STOCK_INVENTORY.code) ||
                          isMenuPermission(
                              SYSTEM_MODULES.STOCK.MAINTENANCE.STOCK_INVENTORY.PHYSICAL_STOCK_COUNT.code,
                          ) ||
                          isMenuPermission(
                              SYSTEM_MODULES.STOCK.MAINTENANCE.STOCK_INVENTORY.STOCK_COUNT_VARIANCE_LOG.code,
                          ) ||
                          isMenuPermission(SYSTEM_MODULES.STOCK.MAINTENANCE.STOCK_INVENTORY.PACKAGING_BARCODES.code) ||
                          isMenuPermission(SYSTEM_MODULES.STOCK.MAINTENANCE.STOCK_INVENTORY.WAREHOUSE_LOCATIONS.code)
                              ? [
                                    {
                                        label: 'Stock Inventory',
                                        icon: Archive,
                                        subMenuItems: [
                                            ...(isMenuPermission(SYSTEM_MODULES.STOCK.MAINTENANCE.STOCK_INVENTORY.code)
                                                ? [
                                                      {
                                                          label: 'Stock Inventory',
                                                          href: '/stocks/inventory',
                                                          icon: Archive,
                                                      },
                                                  ]
                                                : []),
                                            ...(isMenuPermission(
                                                SYSTEM_MODULES.STOCK.MAINTENANCE.STOCK_INVENTORY.PHYSICAL_STOCK_COUNT
                                                    .code,
                                            )
                                                ? [
                                                      {
                                                          label: 'Physical Stock Count',
                                                          href: '/stocks/inventory/physical-count',
                                                          icon: ClipboardList,
                                                      },
                                                  ]
                                                : []),
                                            ...(isMenuPermission(
                                                SYSTEM_MODULES.STOCK.MAINTENANCE.STOCK_INVENTORY
                                                    .STOCK_COUNT_VARIANCE_LOG.code,
                                            )
                                                ? [
                                                      {
                                                          label: 'Stock Count Variance Log',
                                                          href: '/stocks/inventory/stock-count-variance-log',
                                                          icon: ClipboardList,
                                                      },
                                                  ]
                                                : []),
                                            ...(isMenuPermission(
                                                SYSTEM_MODULES.STOCK.MAINTENANCE.STOCK_INVENTORY.PACKAGING_BARCODES
                                                    .code,
                                            )
                                                ? [
                                                      {
                                                          label: 'Packaging Barcodes',
                                                          href: '/stocks/inventory/packaging-barcodes',
                                                          icon: Barcode,
                                                      },
                                                  ]
                                                : []),
                                            ...(isMenuPermission(
                                                SYSTEM_MODULES.STOCK.MAINTENANCE.STOCK_INVENTORY.WAREHOUSE_LOCATIONS
                                                    .code,
                                            )
                                                ? [
                                                      {
                                                          label: 'Warehouse Locations',
                                                          href: '/stocks/inventory/warehouse-locations',
                                                          icon: MapPin,
                                                      },
                                                  ]
                                                : []),
                                        ],
                                    },
                                ]
                              : []),
                          ...(isMenuPermission(SYSTEM_MODULES.STOCK.MAINTENANCE.NST_MANAGEMENT.WORKSPACE.code) ||
                          isMenuPermission(SYSTEM_MODULES.STOCK.MAINTENANCE.NST_MANAGEMENT.RULES.code) ||
                          isMenuPermission(SYSTEM_MODULES.STOCK.MAINTENANCE.NST_MANAGEMENT.REPORTS.code)
                              ? [
                                    {
                                        label: 'Expiry & Damaged Stock',
                                        icon: Percent,
                                        subMenuItems: [
                                            ...(isMenuPermission(
                                                SYSTEM_MODULES.STOCK.MAINTENANCE.NST_MANAGEMENT.WORKSPACE.code,
                                            )
                                                ? [
                                                      {
                                                          label: 'Manage Expiry & Damaged Stock',
                                                          href: '/processing/nst',
                                                          icon: Percent,
                                                      },
                                                      {
                                                          label: 'Pending Approval',
                                                          href: '/processing/nst?filter=pending',
                                                          icon: Clock,
                                                      },
                                                      {
                                                          label: 'Near-Expiry Candidates',
                                                          href: '/processing/nst/candidates',
                                                          icon: CalendarClock,
                                                      },
                                                  ]
                                                : []),
                                            ...(isMenuPermission(
                                                SYSTEM_MODULES.STOCK.MAINTENANCE.NST_MANAGEMENT.RULES.code,
                                            )
                                                ? [
                                                      {
                                                          label: 'Expiry & Damaged Stock Rules',
                                                          href: '/processing/nst/rules',
                                                          icon: ShieldCheck,
                                                      },
                                                  ]
                                                : []),
                                            ...(isMenuPermission(
                                                SYSTEM_MODULES.STOCK.MAINTENANCE.NST_MANAGEMENT.REPORTS.code,
                                            )
                                                ? [
                                                      {
                                                          label: 'Expiry & Damaged Stock Reports',
                                                          href: '/processing/nst/report',
                                                          icon: BarChart,
                                                      },
                                                  ]
                                                : []),
                                        ],
                                    },
                                ]
                              : []),
                          ...(isMenuPermission(SYSTEM_MODULES.STOCK.CONTRACT_PRICE_MAINTENANCE.code)
                              ? [{ label: 'Contract Price Maintenance', href: '/stocks/contract-prices', icon: File }]
                              : []),
                        //   ...(isMenuPermission(SYSTEM_MODULES.STOCK.PRODUCT_PUBLICATION.code)
                        //       ? [{ label: 'Product Publication', href: '/stocks/product-publication', icon: Send }]
                        //       : []),
                          ...(isMenuPermission(SYSTEM_MODULES.STOCK.MAINTENANCE.SUPPLIER_PRICING.code)
                              ? [
                                    {
                                        label: 'Supplier Pricing',
                                        icon: Truck,
                                        subMenuItems: [
                                            {
                                                label: 'Supplier Pricing',
                                                href: '/stocks/supplier-pricing',
                                                icon: Truck,
                                            },
                                            ...(isMenuPermission(
                                                SYSTEM_MODULES.STOCK.MAINTENANCE.SUPPLIER_PRICING
                                                    .SUPPLIER_COST_COMPARISON.code,
                                            )
                                                ? [
                                                      {
                                                          label: 'Supplier Cost Comparison',
                                                          href: '/stocks/supplier-cost-comparison',
                                                          icon: Scale,
                                                      },
                                                  ]
                                                : []),
                                        ],
                                    },
                                ]
                              : []),
                          ...(isMenuPermission(SYSTEM_MODULES.STOCK.PRICE_MAINTENANCE.code)
                              ? [
                                    {
                                        label: 'Price Maintenance',
                                        icon: Settings2,
                                        subMenuItems: [
                                            ...(isMenuPermission(
                                                SYSTEM_MODULES.STOCK.PRICE_MAINTENANCE.DISCOUNT_AND_PRICING_MATRIX.code,
                                            )
                                                ? [
                                                      {
                                                          label: 'Discount & Pricing Matrix',
                                                          href: '/stocks/discount-and-pricing-matrix',
                                                          icon: Percent,
                                                      },
                                                  ]
                                                : []),
                                            ...(isMenuPermission(
                                                SYSTEM_MODULES.STOCK.PRICE_MAINTENANCE.COST_CONSISTENCY_RULES.code,
                                            )
                                                ? [
                                                      {
                                                          label: 'Cost Consistency Rules',
                                                          href: '/stocks/cost-consistency-rules',
                                                          icon: Scale,
                                                      },
                                                  ]
                                                : []),
                                        ],
                                    },
                                ]
                              : []),
                          ...(isMenuPermission(SYSTEM_MODULES.STOCK.MAINTENANCE.STOCK_INVENTORY.code)
                              ? [{ label: 'Inventory Summary', href: '/inventory-summary', icon: File }]
                              : []),
                      ],

                      'attendance': [],
                      'utilities': [
                          ...(isMenuPermission(SYSTEM_MODULES.UTILITIES.SETUP.code)
                              ? [
                                    {
                                        label: 'Set Up',
                                        icon: Settings,
                                        subMenuItems: [
                                            {
                                                label: 'User Group & Maintenance',
                                                href: '/utilities/set-up/user-group-maintenance',
                                                icon: Users,
                                            },
                                            ...(isMenuPermission(SYSTEM_MODULES.UTILITIES.SETUP.COMPANY_DETAILS.code)
                                                ? [
                                                      {
                                                          label: 'Company Details',
                                                          href: '/utilities/set-up/company-details',
                                                          icon: BuildingIcon,
                                                      },
                                                  ]
                                                : []),
                                            ...(isMenuPermission(SYSTEM_MODULES.UTILITIES.SETUP.DEFAULT_TABLES.code)
                                                ? [
                                                      {
                                                          label: 'Default Tables',
                                                          href: '/utilities/set-up/masters',
                                                          icon: Table,
                                                      },
                                                  ]
                                                : []),
                                            ...(isMenuPermission(
                                                SYSTEM_MODULES.UTILITIES.SETUP.DEFAULT_TABLES.TILLS.code,
                                            )
                                                ? [
                                                      {
                                                          label: 'Tills',
                                                          href: '/utilities/set-up/masters/tills',
                                                          icon: CreditCard,
                                                      },
                                                  ]
                                                : []),
                                            ...(isMenuPermission(
                                                SYSTEM_MODULES.UTILITIES.SETUP.STORE_SETUP
                                                    .STORE_INVENTORY_SALES_CONFIGURATION.code,
                                            )
                                                ? [
                                                      {
                                                          label: 'Store Setup',
                                                          icon: Store,
                                                          subMenuItems: [
                                                              {
                                                                  label: 'Store Inventory & Sales Configuration',
                                                                  href: '/utilities/set-up/store-inventory-sales-configuration',
                                                                  icon: SlidersHorizontal,
                                                              },
                                                          ],
                                                      },
                                                  ]
                                                : []),
                                            ...(isMenuPermission(
                                                SYSTEM_MODULES.UTILITIES.SETUP.MENU_ACCESS_AND_SECURITY.MENU_SETUP
                                                    .code ||
                                                    SYSTEM_MODULES.UTILITIES.SETUP.MENU_ACCESS_AND_SECURITY.MENU_ACCESS
                                                        .code ||
                                                    SYSTEM_MODULES.UTILITIES.SETUP.MENU_ACCESS_AND_SECURITY
                                                        .TILL_SHORTCUTS.code,
                                            )
                                                ? [
                                                      {
                                                          label: 'Menu Access & Security',
                                                          icon: ShieldCheck,
                                                          subMenuItems: [
                                                              ...(isMenuPermission(
                                                                  SYSTEM_MODULES.UTILITIES.SETUP
                                                                      .MENU_ACCESS_AND_SECURITY.MENU_SETUP.code,
                                                              )
                                                                  ? [
                                                                        {
                                                                            label: 'Menu Setup',
                                                                            href: '/utilities/set-up/menu-setup',
                                                                            icon: Settings2,
                                                                        },
                                                                    ]
                                                                  : []),
                                                              ...(isMenuPermission(
                                                                  SYSTEM_MODULES.UTILITIES.SETUP
                                                                      .MENU_ACCESS_AND_SECURITY.MENU_ACCESS.code,
                                                              )
                                                                  ? [
                                                                        {
                                                                            label: 'Menu Access',
                                                                            href: '/utilities/set-up/menu-access',
                                                                            icon: ShieldCheck,
                                                                        },
                                                                    ]
                                                                  : []),
                                                              ...(isMenuPermission(
                                                                  SYSTEM_MODULES.UTILITIES.SETUP
                                                                      .MENU_ACCESS_AND_SECURITY.TILL_SHORTCUTS.code,
                                                              )
                                                                  ? [
                                                                        {
                                                                            label: 'Till Shortcuts',
                                                                            href: '/utilities/set-up/till-shortcuts',
                                                                            icon: MonitorDot,
                                                                        },
                                                                    ]
                                                                  : []),
                                                          ],
                                                      },
                                                  ]
                                                : []),
                                        ],
                                    },
                                ]
                              : []),
                          ...(isAnyMenuPermission(
                              SYSTEM_MODULES.UTILITIES.USER_MONITORING?.code || '11100',
                              SYSTEM_MODULES.UTILITIES.USER_MONITORING?.USER_SESSIONS?.code || '11101',
                              SYSTEM_MODULES.UTILITIES.USER_MONITORING?.USER_ACTIVITY?.code || '11102',
                          )
                              ? [
                                    {
                                        label: 'User Monitoring',
                                        icon: MonitorDot,
                                        subMenuItems: [
                                            ...(isAnyMenuPermission(
                                                SYSTEM_MODULES.UTILITIES.USER_MONITORING?.USER_SESSIONS?.code || '11101',
                                                SYSTEM_MODULES.UTILITIES.USER_MONITORING?.code || '11100',
                                            )
                                                ? [
                                                      {
                                                          label: 'User Sessions',
                                                          href: '/utilities/user-monitoring/sessions',
                                                          icon: Users,
                                                      },
                                                  ]
                                                : []),
                                            ...(isAnyMenuPermission(
                                                SYSTEM_MODULES.UTILITIES.USER_MONITORING?.USER_ACTIVITY?.code || '11102',
                                                SYSTEM_MODULES.UTILITIES.USER_MONITORING?.code || '11100',
                                            )
                                                ? [
                                                      {
                                                          label: 'User Activity',
                                                          href: '/utilities/user-monitoring/activity',
                                                          icon: FileText,
                                                      },
                                                  ]
                                                : []),
                                        ],
                                    },
                                ]
                              : []),
                          ...(isAnyMenuPermission(
                              SYSTEM_MODULES.UTILITIES.ATTENDANCE?.code || '11103',
                              SYSTEM_MODULES.UTILITIES.ATTENDANCE?.ATTENDANCE_CLOCK?.code || '11104',
                              SYSTEM_MODULES.UTILITIES.ATTENDANCE?.ATTENDANCE_REPORTS?.code || '11105',
                          )
                              ? [
                                    {
                                        label: 'Attendance',
                                        icon: Clock,
                                        subMenuItems: [
                                            ...(isAnyMenuPermission(
                                                SYSTEM_MODULES.UTILITIES.ATTENDANCE?.ATTENDANCE_CLOCK?.code || '11104',
                                                SYSTEM_MODULES.UTILITIES.ATTENDANCE?.code || '11103',
                                            )
                                                ? [
                                                      {
                                                          label: 'Attendance Clock',
                                                          href: '/utilities/attendance/clock',
                                                          icon: Clock,
                                                      },
                                                  ]
                                                : []),
                                            ...(isAnyMenuPermission(
                                                SYSTEM_MODULES.UTILITIES.ATTENDANCE?.ATTENDANCE_REPORTS?.code || '11105',
                                                SYSTEM_MODULES.UTILITIES.ATTENDANCE?.code || '11103',
                                            )
                                                ? [
                                                      {
                                                          label: 'Attendance Reports',
                                                          href: '/utilities/attendance/reports',
                                                          icon: FileBarChart,
                                                      },
                                                  ]
                                                : []),
                                        ],
                                    },
                                ]
                              : []),
                          ...(isAnyMenuPermission(
                              SYSTEM_MODULES.UTILITIES.SUPERVISOR_DESK.code,
                              SYSTEM_MODULES.UTILITIES.SUPERVISOR_DESK.PENDING_REQUESTS.code,
                              SYSTEM_MODULES.UTILITIES.SUPERVISOR_DESK.MY_APPROVAL_HISTORY.code,
                          )
                              ? [
                                    {
                                        label: 'Supervisor Desk',
                                        icon: ClipboardCheck,
                                        subMenuItems: [
                                            ...(isAnyMenuPermission(
                                                SYSTEM_MODULES.UTILITIES.SUPERVISOR_DESK.code,
                                                SYSTEM_MODULES.UTILITIES.SUPERVISOR_DESK.PENDING_REQUESTS.code,
                                            )
                                                ? [
                                                      {
                                                          label: 'Pending Requests',
                                                          href: '/security/approvals/inbox',
                                                          icon: ClipboardCheck,
                                                      },
                                                  ]
                                                : []),
                                            ...(isAnyMenuPermission(
                                                SYSTEM_MODULES.UTILITIES.SUPERVISOR_DESK.code,
                                                SYSTEM_MODULES.UTILITIES.SUPERVISOR_DESK.MY_APPROVAL_HISTORY.code,
                                            )
                                                ? [
                                                      {
                                                          label: 'My Approval History',
                                                          href: '/security/approvals/history',
                                                          icon: ScrollText,
                                                      },
                                                  ]
                                                : []),
                                        ],
                                    },
                                ]
                              : []),
                          {
                              label: 'Fingerprint Enrollment',
                              href: '/security/fingerprint',
                              icon: Fingerprint,
                          },
                          // ...(isMenuPermission(SYSTEM_MODULES.UTILITIES.code)
                          //     ? [
                          //           {
                          //               label: 'Data Import Center',
                          //               href: '/utilities/data-import-center',
                          //               icon: Database,
                          //           },
                          //           {
                          //               label: 'File Drive',
                          //               href: '/utilities/file-drive',
                          //               icon: Database,
                          //           },
                          //           {
                          //               label: 'Settings',
                          //               href: '/utilities/settings',
                          //               icon: Settings2,
                          //           },
                          //       ]
                          //     : []),
                          ...(isMenuPermission(SYSTEM_MODULES.UTILITIES.BANK_ACCOUNTS.code)
                              ? [
                                    {
                                        label: 'Bank Accounts',
                                        href: '/utilities/bank-accounts',
                                        icon: Landmark,
                                    },
                                ]
                              : []),
                          ...(isMenuPermission(SYSTEM_MODULES.UTILITIES.LABELS.code)
                              ? [
                                    {
                                        label: 'Labels',
                                        href: '/utilities/labels',
                                        icon: Barcode,
                                    },
                                ]
                              : []),
                          ...(isMenuPermission(SYSTEM_MODULES.UTILITIES.PROGRAM_SHORTCUTS.code)
                              ? [
                                    {
                                        label: 'Program Shortcuts',
                                        href: '/utilities/program-shortcuts',
                                        icon: Command,
                                    },
                                ]
                              : []),
                          ...(isMenuPermission(
                              SYSTEM_MODULES.UTILITIES.SETUP.MODULE_PARAMETERS.USER_GROUP_AND_MAINTENANCE.USERS.code,
                          )
                              ? [
                                    {
                                        label: 'Tills Report',
                                        href: '/utilities/set-up/users-till-report',
                                        icon: Notebook,
                                    },
                                    {
                                        label: 'Company Safes',
                                        icon: Vault,
                                        subMenuItems: [
                                            {
                                                label: 'Safes',
                                                href: '/utilities/safes/company-safes',
                                                icon: Vault,
                                            },
                                            {
                                                label: 'Vendors',
                                                href: '/utilities/safes/vendors',
                                                icon: User,
                                            },
                                            {
                                                label: 'Transactions',
                                                href: '/utilities/safes/transactions',
                                                icon: ArrowLeftRight,
                                            },
                                        ],
                                    },
                                ]
                              : []),
                          {
                              label: 'Report',
                              icon: Notebook,
                              subMenuItems: [
                                  {
                                      label: 'X-Report',
                                      href: '/utilities/reports/x-report',
                                  },
                                  {
                                      label: 'Pos-Report',
                                      href: '/utilities/reports/pos-report',
                                  },
                              ],
                          },
                      ],

                      'point-of-sale': [
                          ...(isMenuPermission(SYSTEM_MODULES.POINT_OF_SALE.CASH_SALE.code)
                              ? [
                                    {
                                        label: 'Cash Sales',
                                        href: '/point-of-sale/cash-sales',
                                        icon: Banknote,
                                    },
                                ]
                              : []),
                          ...(isMenuPermission(SYSTEM_MODULES.POINT_OF_SALE.CASH_REFUND.code)
                              ? [
                                    {
                                        label: 'Cash Refund',
                                        href: '/point-of-sale/cash-refund',
                                        icon: ArrowLeftRight,
                                    },
                                ]
                              : []),

                          ...(isMenuPermission(SYSTEM_MODULES.POINT_OF_SALE.ACCOUNT_SALES.code) ||
                          isMenuPermission(SYSTEM_MODULES.POINT_OF_SALE.CASH_SALE.code)
                              ? [
                                    {
                                        label: 'View Sales',
                                        icon: ShoppingCartIcon,
                                        subMenuItems: [
                                            ...(isMenuPermission(SYSTEM_MODULES.POINT_OF_SALE.CASH_SALE.code)
                                                ? [
                                                      {
                                                          label: 'Cash Sales',
                                                          href: '/point-of-sale/cash-sales/view-sales',
                                                          icon: Banknote,
                                                      },
                                                  ]
                                                : []),
                                        ],
                                    },
                                ]
                              : []),

                          ...(isMenuPermission(SYSTEM_MODULES.POINT_OF_SALE.DEBTOR_INVOICING_ORDERS.code)
                              ? [
                                    {
                                        label: 'Debtor Invoicing Orders',
                                        href: '/point-of-sale/debtor-invoicing-orders',
                                        icon: FileText,
                                    },
                                ]
                              : []),
                          ...(isMenuPermission(SYSTEM_MODULES.POINT_OF_SALE.DEBTOR_INVOICING_ORDER_SETUP.code)
                              ? [
                                    {
                                        label: 'Debtor Invoicing Order Setup',
                                        href: '/point-of-sale/debtor-invoicing-orders/setup',
                                        icon: Settings,
                                    },
                                ]
                              : []),

                          ...(isMenuPermission(SYSTEM_MODULES.POINT_OF_SALE.CASH_UP.code)
                              ? [
                                    {
                                        label: 'Cash-Up',
                                        icon: Calculator,
                                        subMenuItems: [
                                            ...(process.env.NEXT_PUBLIC_CLIENT_TYPE === 'APP'
                                                ? []
                                                : [
                                                      {
                                                          label: 'Cash-Up',
                                                          href: '/point-of-sale/cash-up',
                                                          icon: Calculator,
                                                      },
                                                  ]),
                                            {
                                                label: 'My Shift / Cash-Up',
                                                href: '/point-of-sale/my-shift',
                                                icon: Clock,
                                            },
                                            ...(process.env.NEXT_PUBLIC_CLIENT_TYPE !== 'APP' &&
                                            (isMenuPermission(
                                                SYSTEM_MODULES.POINT_OF_SALE.CASH_UP.CASHUP_TENDERS.code,
                                            ) || isMenuPermission(SYSTEM_MODULES.POINT_OF_SALE.CASH_UP.code))
                                                ? [
                                                      {
                                                          label: 'Cash Tenders',
                                                          href: '/point-of-sale/cash-up/cash-tenders',
                                                          icon: Banknote,
                                                      },
                                                  ]
                                                : []),
                                        ],
                                    },
                                ]
                              : []),
                          ...(isMenuPermission(SYSTEM_MODULES.POINT_OF_SALE.CASH_UP_SALES_NON_BANKABLE.code)
                              ? [
                                    {
                                        label: 'Cash-Up Sales & Non-Bankable',
                                        href: '/point-of-sale/cash-up-sales',
                                        icon: BarChart,
                                    },
                                ]
                              : []),

                          ...(isMenuPermission(SYSTEM_MODULES.POINT_OF_SALE.DENOMINATIONS.code)
                              ? [
                                    {
                                        label: 'Denominations',
                                        href: '/point-of-sale/denominations',
                                        icon: Banknote,
                                    },
                                ]
                              : []),

                          ...(isMenuPermission(SYSTEM_MODULES.POINT_OF_SALE.TILL_MANAGEMENT_REPORTS.code)
                              ? [
                                    {
                                        label: 'Shifts',
                                        href: '/point-of-sale/shifts',
                                        icon: ArrowLeftRight,
                                    },
                                    {
                                        label: 'Till Management Report',
                                        href: '/point-of-sale/till-management-report',
                                        icon: FileBarChart,
                                    },
                                ]
                              : []),

                          ...(isMenuPermission(SYSTEM_MODULES.POINT_OF_SALE.TILL_TO_SAFE.code)
                              ? [
                                    {
                                        label: 'Till-to-Safe Transfer',
                                        href: '/point-of-sale/till-to-safe',
                                        icon: Vault,
                                    },
                                ]
                              : []),

                          ...(isMenuPermission(SYSTEM_MODULES.POINT_OF_SALE.LOYALTY_SETUP.code)
                              ? [
                                    {
                                        label: 'Loyalty',
                                        icon: UsersRound,
                                        subMenuItems: [
                                            {
                                                label: 'Memberships',
                                                href: '/loyalty/memberships',
                                                icon: Award,
                                            },
                                            {
                                                label: 'Cards',
                                                href: '/loyalty/cards',
                                                icon: CreditCard,
                                            },
                                            {
                                                label: 'Transactions',
                                                href: '/loyalty/transactions',
                                                icon: Wallet,
                                            },
                                            {
                                                label: 'Reports',
                                                href: '/loyalty/reports/transaction-summary',
                                                icon: NotepadText,
                                            },
                                        ],
                                    },
                                ]
                              : []),
                          ...(isMenuPermission(
                              SYSTEM_MODULES.POINT_OF_SALE.PROMOTIONS.DISCOUNT_OVERRIDE_NOTIFICATIONS.code,
                          )
                              ? [
                                    {
                                        label: 'Promotions',
                                        icon: Star,
                                        subMenuItems: [
                                            ...(isMenuPermission(SYSTEM_MODULES.POINT_OF_SALE.PROMOTIONS.code)
                                                ? [
                                                      {
                                                          label: 'Promotions',
                                                          href: '/promotions',
                                                          icon: Star,
                                                      },
                                                  ]
                                                : []),
                                            {
                                                label: 'Discount Override Notifications',
                                                href: '/promotions/discount-override-notifications',
                                                icon: Bell,
                                            },
                                        ],
                                    },
                                ]
                              : isMenuPermission(SYSTEM_MODULES.POINT_OF_SALE.PROMOTIONS.code)
                                ? [{ label: 'Promotions', href: '/promotions', icon: Star }]
                                : []),
                          ...(isMenuPermission(SYSTEM_MODULES.EFT_NOTIFICATION.code)
                              ? [
                                    {
                                        label: 'EFT Notifications',
                                        href: '/eft-notifications',
                                        icon: Bell,
                                    },
                                ]
                              : []),
                      ],
                      'operations': [
                          ...(isOperationsMenuPermission()
                              ? [
                                    {
                                        label: 'Cash Office',
                                        icon: Wallet,
                                        subMenuItems: cashOfficeSubmenu,
                                    },
                                ]
                              : []),
                          ...(isSynchronizationMenuPermission() && syncSubmenu.length
                              ? [
                                    {
                                        label: 'Synchronization',
                                        icon: RefreshCw,
                                        subMenuItems: syncSubmenu,
                                    },
                                ]
                              : []),
                          ...(assetsSubmenu.length
                              ? [
                                    {
                                        label: 'Store Assets & Maintenance',
                                        icon: Archive,
                                        subMenuItems: assetsSubmenu,
                                    },
                                ]
                              : []),
                      ],
                  }
                : {
                      'processing': [
                          ...(isMenuPermission(SYSTEM_MODULES.PROCESSING.GOODS_RECEIVING.code) ||
                          isMenuPermission(SYSTEM_MODULES.PROCESSING.GOODS_RECEIVING.GRV_BARCODE_REVIEW.code)
                              ? [
                                    {
                                        label: 'Goods Receiving',
                                        icon: TruckElectricIcon,
                                        subMenuItems: [
                                            ...(isMenuPermission(SYSTEM_MODULES.PROCESSING.GOODS_RECEIVING.code)
                                                ? [
                                                      {
                                                          label: 'Goods Receiving',
                                                          href: '/processing/goods-receiving',
                                                          icon: TruckElectricIcon,
                                                      },
                                                  ]
                                                : []),
                                            ...(isMenuPermission(
                                                SYSTEM_MODULES.PROCESSING.GOODS_RECEIVING.GRV_BARCODE_REVIEW.code,
                                            )
                                                ? [
                                                      {
                                                          label: 'GRV Barcode Review',
                                                          href: '/processing/goods-receiving/grv-barcode-review',
                                                          icon: QrCode,
                                                      },
                                                  ]
                                                : []),
                                        ],
                                    },
                                ]
                              : []),
                          ...(isMenuPermission(SYSTEM_MODULES.PROCESSING.GOODS_RETURN.code)
                              ? [{ label: 'Goods Return', href: '/processing/goods-return', icon: FileDown }]
                              : []),
                          ...(isMenuPermission(SYSTEM_MODULES.PROCESSING.DEBIT_NOTE.code)
                              ? [{ label: 'Debit Note', href: '/processing/debit-note', icon: FileDown }]
                              : []),
                          ...(isMenuPermission(SYSTEM_MODULES.PROCESSING.GOODS_DISCOUNT.code)
                              ? [{ label: 'Goods Discount', href: '/processing/goods-discount', icon: Percent }]
                              : []),
                          ...(isMenuPermission(SYSTEM_MODULES.PROCESSING.GOODS_DISCOUNT.code)
                              ? [{ label: 'Goods Receiving Claims', href: '/processing/claim', icon: DollarSign }]
                              : []),
                          ...(isMenuPermission(SYSTEM_MODULES.PROCESSING.SUPPLIER_DEALS.code)
                              ? [
                                    {
                                        label: 'Supplier Deals',
                                        icon: HandCoins,
                                        subMenuItems: [
                                            {
                                                label: 'Supplier Deals',
                                                href: '/processing/supplier-deals',
                                                icon: HandCoins,
                                            },
                                            ...(isMenuPermission(
                                                SYSTEM_MODULES.PROCESSING.SUPPLIER_DEALS.SUPPLIER_DEAL_ALERTS.code,
                                            )
                                                ? [
                                                      {
                                                          label: 'Supplier Deal Alerts',
                                                          href: '/processing/supplier-deals/alerts',
                                                          icon: Bell,
                                                      },
                                                  ]
                                                : []),
                                        ],
                                    },
                                ]
                              : []),
                          ...(isMenuPermission(SYSTEM_MODULES.PROCESSING.SUPPLIER_ALLOWANCES.code)
                              ? [
                                    {
                                        label: 'Supplier Allowances',
                                        href: '/processing/supplier-allowances',
                                        icon: Award,
                                    },
                                ]
                              : []),
                          ...(isMenuPermission(SYSTEM_MODULES.PROCESSING.SUPPLIER_COMMITMENTS.code)
                              ? [
                                    {
                                        label: 'Supplier Commitments',
                                        href: '/processing/supplier-commitments',
                                        icon: Receipt,
                                    },
                                ]
                              : []),
                          ...(isMenuPermission(SYSTEM_MODULES.PROCESSING.COMPANY_DEBTOR_ORDERS.code) ||
                          isMenuPermission(SYSTEM_MODULES.PROCESSING.COMPANY_DEBTOR_ORDER_SETUP.code) ||
                          isMenuPermission(SYSTEM_MODULES.PROCESSING.DELIVERY_SCHEDULE.code) ||
                          isMenuPermission(SYSTEM_MODULES.PROCESSING.DISPATCH_AND_RECEIPT.code) ||
                          isMenuPermission(SYSTEM_MODULES.PROCESSING.STOCK_BATCH_ALLOCATION.code) ||
                          isMenuPermission(SYSTEM_MODULES.PROCESSING.AISLE_PICKLIST.code) ||
                          isMenuPermission(SYSTEM_MODULES.PROCESSING.PICKED_ORDERS.code) ||
                          isMenuPermission(SYSTEM_MODULES.PROCESSING.STORE_INVENTORY_SALES_CONFIGURATION.code) ||
                          isMenuPermission(SYSTEM_MODULES.PROCESSING.COMPANY_DEBTOR_ORDERS.OVER_SUPPLY_APPROVAL.code)
                              ? [
                                    {
                                        label: 'Company Debtor Orders',
                                        icon: ShoppingCart,
                                        subMenuItems: [
                                            ...(isMenuPermission(SYSTEM_MODULES.PROCESSING.COMPANY_DEBTOR_ORDERS.code)
                                                ? [
                                                      {
                                                          label: 'Company Debtor Orders',
                                                          href: '/processing/company-debtor-orders',
                                                          icon: ShoppingCart,
                                                      },
                                                  ]
                                                : []),
                                            ...(isMenuPermission(
                                                SYSTEM_MODULES.PROCESSING.COMPANY_DEBTOR_ORDER_SETUP.code,
                                            )
                                                ? [
                                                      {
                                                          label: 'Company Debtor Order Setup',
                                                          href: '/processing/company-debtor-orders/setup',
                                                          icon: Settings,
                                                      },
                                                  ]
                                                : []),
                                            ...(isMenuPermission(SYSTEM_MODULES.PROCESSING.DELIVERY_SCHEDULE.code)
                                                ? [
                                                      {
                                                          label: 'Delivery Schedule',
                                                          href: '/processing/company-debtor-orders/delivery-schedule',
                                                          icon: CalendarClock,
                                                      },
                                                  ]
                                                : []),
                                            ...(isMenuPermission(SYSTEM_MODULES.PROCESSING.DISPATCH_AND_RECEIPT.code)
                                                ? [
                                                      {
                                                          label: 'Dispatch & Receipt',
                                                          href: '/processing/company-debtor-orders/dispatch-receipt',
                                                          icon: Truck,
                                                      },
                                                  ]
                                                : []),
                                            ...(isMenuPermission(SYSTEM_MODULES.PROCESSING.STOCK_BATCH_ALLOCATION.code)
                                                ? [
                                                      {
                                                          label: 'Stock Batch Allocation',
                                                          href: '/processing/company-debtor-orders/stock-batch-allocation',
                                                          icon: PackageSearch,
                                                      },
                                                  ]
                                                : []),
                                            ...(isMenuPermission(SYSTEM_MODULES.PROCESSING.AISLE_PICKLIST.code)
                                                ? [
                                                      {
                                                          label: 'Aisle Picklist',
                                                          href: '/processing/company-debtor-orders/aisle-picklist',
                                                          icon: Route,
                                                      },
                                                  ]
                                                : []),
                                            ...(isMenuPermission(SYSTEM_MODULES.PROCESSING.PICKED_ORDERS.code)
                                                ? [
                                                      {
                                                          label: 'Picked Orders',
                                                          href: '/processing/company-debtor-orders/picked-orders',
                                                          icon: Receipt,
                                                      },
                                                  ]
                                                : []),
                                            ...(isMenuPermission(
                                                SYSTEM_MODULES.PROCESSING.STORE_INVENTORY_SALES_CONFIGURATION.code,
                                            )
                                                ? [
                                                      {
                                                          label: 'Store Inventory & Sales Configuration',
                                                          href: '/processing/company-debtor-orders/store-inventory-sales-configuration',
                                                          icon: SlidersHorizontal,
                                                      },
                                                  ]
                                                : []),
                                            ...(isMenuPermission(
                                                SYSTEM_MODULES.PROCESSING.COMPANY_DEBTOR_ORDERS.OVER_SUPPLY_APPROVAL
                                                    .code,
                                            )
                                                ? [
                                                      {
                                                          label: 'Over-supply Approvals',
                                                          href: '/processing/company-debtor-orders/over-supply-approvals',
                                                          icon: ShieldCheck,
                                                      },
                                                  ]
                                                : []),
                                        ],
                                    },
                                ]
                              : []),
                          ...(isMenuPermission(SYSTEM_MODULES.PROCESSING.PURCHASE_DEPARTMENT.code) ||
                          isMenuPermission(SYSTEM_MODULES.PROCESSING.PURCHASE_REQUESTS.code) ||
                          isMenuPermission(SYSTEM_MODULES.PROCESSING.SUPPLIER_QUOTATIONS.code) ||
                          isMenuPermission(SYSTEM_MODULES.PROCESSING.QUOTE_COMPARISON.code) ||
                          isMenuPermission(SYSTEM_MODULES.PROCESSING.PURCHASE_ORDERS.code) ||
                          isMenuPermission(SYSTEM_MODULES.PROCESSING.SUPPLIER_INVOICES.code)
                              ? [
                                    {
                                        label: 'Purchase Department',
                                        icon: ShoppingCart,
                                        subMenuItems: [
                                            ...(isMenuPermission(SYSTEM_MODULES.PROCESSING.PURCHASE_REQUESTS.code)
                                                ? [
                                                      {
                                                          label: 'Purchase Requests',
                                                          href: '/processing/purchase-orders/purchase-requests',
                                                          icon: ClipboardList,
                                                      },
                                                  ]
                                                : []),
                                            ...(isMenuPermission(SYSTEM_MODULES.PROCESSING.SUPPLIER_QUOTATIONS.code)
                                                ? [
                                                      {
                                                          label: 'Supplier Quotations',
                                                          href: '/processing/purchase-orders/supplier-quotations',
                                                          icon: FileText,
                                                      },
                                                  ]
                                                : []),
                                            ...(isMenuPermission(SYSTEM_MODULES.PROCESSING.QUOTE_COMPARISON.code)
                                                ? [
                                                      {
                                                          label: 'Quote Comparison',
                                                          href: '/processing/purchase-orders/quote-comparison',
                                                          icon: Scale,
                                                      },
                                                  ]
                                                : []),
                                            ...(isMenuPermission(SYSTEM_MODULES.PROCESSING.PURCHASE_ORDERS.code)
                                                ? [
                                                      {
                                                          label: 'Purchase Orders',
                                                          href: '/processing/purchase-orders',
                                                          icon: ClipboardCheck,
                                                      },
                                                  ]
                                                : []),
                                            ...(isMenuPermission(SYSTEM_MODULES.PROCESSING.SUPPLIER_INVOICES.code)
                                                ? [
                                                      {
                                                          label: 'Supplier Invoices',
                                                          href: '/processing/purchase-orders/supplier-invoices',
                                                          icon: Receipt,
                                                      },
                                                  ]
                                                : []),
                                        ],
                                    },
                                ]
                              : []),
                          ...(isMenuPermission(SYSTEM_MODULES.PROCESSING.REPLENISHMENT_RECOMMENDATIONS.code) ||
                          isMenuPermission(SYSTEM_MODULES.PROCESSING.REPLENISHMENT_RECOMMENDATIONS.POLICIES.code) ||
                          isMenuPermission(SYSTEM_MODULES.PROCESSING.REPLENISHMENT_RECOMMENDATIONS.SAVED_RUNS.code) ||
                          canSeeAutomationMenu
                              ? [
                                    {
                                        label: 'Replenishment Recommendations',
                                        icon: PackageSearch,
                                        subMenuItems: [
                                            ...(isMenuPermission(
                                                SYSTEM_MODULES.PROCESSING.REPLENISHMENT_RECOMMENDATIONS.code,
                                            )
                                                ? [
                                                      {
                                                          label: 'Recommendations',
                                                          href: '/processing/replenishment',
                                                          icon: PackageSearch,
                                                      },
                                                  ]
                                                : []),
                                            ...(isMenuPermission(
                                                SYSTEM_MODULES.PROCESSING.REPLENISHMENT_RECOMMENDATIONS.SAVED_RUNS.code,
                                            )
                                                ? [
                                                      {
                                                          label: 'Saved Runs',
                                                          href: '/processing/replenishment/history',
                                                          icon: ScrollText,
                                                      },
                                                  ]
                                                : []),
                                            ...(isMenuPermission(
                                                SYSTEM_MODULES.PROCESSING.REPLENISHMENT_RECOMMENDATIONS.POLICIES.code,
                                            )
                                                ? [
                                                      {
                                                          label: 'Policy Settings',
                                                          href: '/processing/replenishment/policies',
                                                          icon: Settings2,
                                                      },
                                                  ]
                                                : []),
                                            ...(canSeeAutomationMenu
                                                ? [
                                                      {
                                                          label: 'Automation',
                                                          href: '/processing/replenishment/automation',
                                                          icon: CalendarClock,
                                                      },
                                                  ]
                                                : []),
                                        ],
                                    },
                                ]
                              : []),
                          ...(isMenuPermission(SYSTEM_MODULES.PROCESSING.INVOICE_CHECKING.code) ||
                          isMenuPermission(SYSTEM_MODULES.PROCESSING.INVOICE_CHECKING.DISCREPANCY_REPORTS.code) ||
                          isMenuPermission(SYSTEM_MODULES.PROCESSING.INVOICE_CHECKING.DISCREPANCY_REASONS.code)
                              ? [
                                    {
                                        label: 'Invoice Checking',
                                        icon: FileSearch,
                                        subMenuItems: [
                                            ...(isMenuPermission(SYSTEM_MODULES.PROCESSING.INVOICE_CHECKING.code)
                                                ? [
                                                      {
                                                          label: 'Invoice Checks',
                                                          href: '/processing/invoice-checking',
                                                          icon: FileSearch,
                                                      },
                                                  ]
                                                : []),
                                            ...(isMenuPermission(
                                                SYSTEM_MODULES.PROCESSING.INVOICE_CHECKING.DISCREPANCY_REPORTS.code,
                                            )
                                                ? [
                                                      {
                                                          label: 'Discrepancy Reports',
                                                          href: '/processing/invoice-checking/discrepancy-reports',
                                                          icon: FileText,
                                                      },
                                                  ]
                                                : []),
                                            ...(isMenuPermission(
                                                SYSTEM_MODULES.PROCESSING.INVOICE_CHECKING.DISCREPANCY_REASONS.code,
                                            )
                                                ? [
                                                      {
                                                          label: 'Discrepancy Reasons',
                                                          href: '/processing/invoice-checking/discrepancy-reasons',
                                                          icon: ClipboardCheck,
                                                      },
                                                  ]
                                                : []),
                                        ],
                                    },
                                ]
                              : []),
                      ],
                      'debtors': [
                          ...(isMenuPermission(SYSTEM_MODULES.DEBTORS.MAINTENANCE.code)
                              ? [{ label: 'Maintenance', href: '/debtors/maintenance', icon: UserCog }]
                              : []),
                          ...(isMenuPermission(SYSTEM_MODULES.DEBTORS.MASTERS.DEBTOR_GROUPS.code) ||
                          isMenuPermission(SYSTEM_MODULES.DEBTORS.MAINTENANCE.code)
                              ? [
                                    {
                                        label: 'Masters',
                                        icon: Users,
                                        subMenuItems: [
                                            {
                                                label: 'Debtor Groups',
                                                href: '/debtors/debtor-groups',
                                                icon: UsersRound,
                                            },
                                        ],
                                    },
                                ]
                              : []),
                          ...(isMenuPermission(SYSTEM_MODULES.DEBTORS.RECEIPTS.code) ||
                          isMenuPermission(SYSTEM_MODULES.DEBTORS.ALLOCATIONS.code) ||
                          isMenuPermission(SYSTEM_MODULES.DEBTORS.GROUP_ALLOCATION.code) ||
                          isMenuPermission(SYSTEM_MODULES.DEBTORS.GROUP_ALLOCATION_LOG.code) ||
                          isMenuPermission(SYSTEM_MODULES.DEBTORS.AGEING_AND_CREDIT_ALLOCATION.code)
                              ? [
                                    {
                                        label: 'Receipts & Allocations',
                                        icon: Wallet,
                                        subMenuItems: [
                                            ...(isMenuPermission(SYSTEM_MODULES.DEBTORS.RECEIPTS.code)
                                                ? [
                                                      {
                                                          label: 'Receipts',
                                                          href: '/debtors/receipts',
                                                          icon: Receipt,
                                                      },
                                                  ]
                                                : []),
                                            ...(isMenuPermission(SYSTEM_MODULES.DEBTORS.ALLOCATIONS.code)
                                                ? [
                                                      {
                                                          label: 'Allocations',
                                                          href: '/debtors/allocations',
                                                          icon: ArrowRightLeft,
                                                      },
                                                  ]
                                                : []),
                                            ...(isMenuPermission(SYSTEM_MODULES.DEBTORS.GROUP_ALLOCATION_LOG.code) ||
                                            isMenuPermission(SYSTEM_MODULES.DEBTORS.GROUP_ALLOCATION.code)
                                                ? [
                                                      {
                                                          label: 'Group Payment Allocation',
                                                          href: '/debtors/group-allocation',
                                                          icon: UsersRound,
                                                      },
                                                  ]
                                                : []),
                                            ...(isMenuPermission(SYSTEM_MODULES.DEBTORS.RECONCILIATION.code)
                                                ? [
                                                      {
                                                          label: 'Payment Reconciliation',
                                                          href: '/debtors/reconciliation',
                                                          icon: ArrowRightLeft,
                                                      },
                                                  ]
                                                : []),
                                            ...(isMenuPermission(
                                                SYSTEM_MODULES.DEBTORS.AGEING_AND_CREDIT_ALLOCATION.code,
                                            )
                                                ? [
                                                      {
                                                          label: 'Invoice Ageing & Credit Allocation',
                                                          href: '/debtors/ageing',
                                                          icon: Clock,
                                                      },
                                                  ]
                                                : []),
                                            ...(isMenuPermission(
                                                SYSTEM_MODULES.UTILITIES.SETUP.DEFAULT_TABLES.TILLS.code,
                                            )
                                                ? [
                                                      {
                                                          label: 'Tills',
                                                          href: '/utilities/set-up/masters/tills',
                                                          icon: CreditCard,
                                                      },
                                                  ]
                                                : []),
                                            ...(isMenuPermission(SYSTEM_MODULES.UTILITIES.SETUP.DEFAULT_TABLES.UOM.code)
                                                ? [
                                                      {
                                                          label: 'UOM',
                                                          href: '/utilities/set-up/masters/uom',
                                                          icon: Ruler,
                                                      },
                                                  ]
                                                : []),
                                        ],
                                    },
                                ]
                              : []),
                          // { label: 'Cash Deposits', href: '/', icon: Wallet },
                          // { label: 'Deposit Refunds', href: '/', icon: HandCoins },
                          // { label: 'Journals', href: '/', icon: Calculator },
                          ...(isMenuPermission(SYSTEM_MODULES.DEBTORS.TRANSACTIONS.code)
                              ? [{ label: 'Transactions', href: '/debtors/transactions', icon: CreditCard }]
                              : []),
                          ...(isMenuPermission(SYSTEM_MODULES.DEBTORS.ENQUIRIES.code) ||
                          isMenuPermission(SYSTEM_MODULES.DEBTORS.ENQUIRIES.DEBTOR_STATEMENTS.code)
                              ? [
                                    {
                                        label: 'Enquiries',
                                        icon: FileSearch,
                                        subMenuItems: [
                                            ...(isMenuPermission(SYSTEM_MODULES.DEBTORS.ENQUIRIES.code)
                                                ? [
                                                      {
                                                          label: 'Enquiries',
                                                          href: '/debtors/enquiries',
                                                          icon: HelpCircle,
                                                      },
                                                  ]
                                                : []),
                                            ...(isMenuPermission(
                                                SYSTEM_MODULES.DEBTORS.ENQUIRIES.DEBTOR_STATEMENTS.code,
                                            )
                                                ? [
                                                      {
                                                          label: 'Debtor Statements',
                                                          href: '/debtors/statements',
                                                          icon: ScrollText,
                                                      },
                                                  ]
                                                : []),
                                        ],
                                    },
                                ]
                              : []),
                          ...(isMenuPermission(SYSTEM_MODULES.DEBTORS.STATEMENTS.code)
                              ? [{ label: 'Statements', href: '/debtors/statements', icon: ScrollText }]
                              : []),
                          ...(isMenuPermission(SYSTEM_MODULES.DEBTORS.PRICE_MISMATCH_CREDIT_NOTE.code)
                              ? [
                                    {
                                        label: 'Price Mismatch Credit Notes',
                                        href: '/processing/price-mismatch-credit-note',
                                        icon: Percent,
                                    },
                                ]
                              : []),
                          ...(isMenuPermission(SYSTEM_MODULES.DEBTORS.TRANSACTIONS.code)
                              ? [{ label: 'Customer Relations', href: '/debtors/customer-relations', icon: Users }]
                              : []),
                          // { label: 'Enquiries', href: '/', icon: FileSearch },
                          // { label: 'Reports', href: '/', icon: BarChart },
                          // { label: 'Interest Charging', href: '/', icon: CreditCard },
                          // { label: 'Recurring Charges', href: '/', icon: RefreshCw },
                          // { label: 'Marketing', href: '/', icon: Megaphone },
                          // { label: 'Credit Control', href: '/', icon: ShieldCheck },
                          // { label: 'Notifications', href: '/', icon: Bell },
                          // { label: 'Close Debtor Period', href: '/', icon: UserX },
                          // { label: 'Month End', href: '/', icon: CalendarDays },
                      ],
                      'creditors': [
                          ...(isMenuPermission(SYSTEM_MODULES.CREDITORS.MAINTENANCE.code)
                              ? [{ label: 'Maintenance', href: '/creditors/maintenance', icon: UserCog }]
                              : []),
                          ...(isMenuPermission(SYSTEM_MODULES.CREDITORS.TRANSACTIONS.code)
                              ? [{ label: 'Transactions', href: '/creditors/transactions', icon: CreditCard }]
                              : []),
                          ...(isMenuPermission(SYSTEM_MODULES.CREDITORS.ENQUIRIES.code)
                              ? [{ label: 'Enquiries', href: '/creditors/enquiries', icon: HelpCircle }]
                              : []),
                          ...(isMenuPermission(SYSTEM_MODULES.CREDITORS.TRANSACTIONS.code)
                              ? [{ label: 'Customer Relations', href: '/creditors/customer-relations', icon: Users }]
                              : []),
                          // { label: 'Payments', href: '/', icon: Banknote },
                          // { label: 'Journals', href: '/', icon: Calculator },
                          // { label: 'Allocations', href: '/', icon: ArrowRightLeft },
                          // { label: 'Enquiries', href: '/', icon: FileSearch },
                          // { label: 'Reports', href: '/', icon: BarChart },
                          // { label: 'Payment Run and Reconciliation', href: '/', icon: FileText },
                          // { label: 'Close Creditor Period', href: '/', icon: UserX },
                          // { label: 'Month End', href: '/', icon: CalendarDays },
                      ],
                      'stock': [
                          ...(isMenuPermission(SYSTEM_MODULES.STOCK.MAINTENANCE.code)
                              ? [
                                    { label: 'View Stocks', href: '/stocks', icon: ShoppingCart },
                                    ...(isChildCompany
                                        ? []
                                        : [
                                              {
                                                  label: 'Add Stock Item',
                                                  href: '/stocks?action=true',
                                                  icon: ClipboardCheck,
                                              },
                                          ]),
                                ]
                              : []),
                          ...(isMenuPermission(SYSTEM_MODULES.STOCK.MAINTENANCE.code) ||
                          isMenuPermission(SYSTEM_MODULES.STOCK.MAINTENANCE.STOCK_VARIANTS.code) ||
                          isMenuPermission(SYSTEM_MODULES.STOCK.MAINTENANCE.STOCK_RANGES.code) ||
                          isMenuPermission(SYSTEM_MODULES.STOCK.MAINTENANCE.STORE_CLASSIFICATION.code) ||
                          isMenuPermission(
                              SYSTEM_MODULES.STOCK.MAINTENANCE.STORE_CLASSIFICATION.STORE_CATEGORIES.code,
                          ) ||
                          isMenuPermission(
                              SYSTEM_MODULES.STOCK.MAINTENANCE.STORE_CLASSIFICATION.STORE_CATEGORY_ASSIGNMENTS.code,
                          ) ||
                          isMenuPermission(SYSTEM_MODULES.STOCK.MAINTENANCE.SKU_TAGS_MANAGEMENT.code)
                              ? [
                                    {
                                        label: 'Maintenance',
                                        icon: Wrench,
                                        subMenuItems: [
                                            ...(isMenuPermission(SYSTEM_MODULES.STOCK.MAINTENANCE.STOCK_VARIANTS.code)
                                                ? [
                                                      {
                                                          label: 'Stock Variants',
                                                          href: '/utilities/set-up/masters/stock-variants',
                                                          icon: Tags,
                                                      },
                                                  ]
                                                : []),
                                            ...(isMenuPermission(SYSTEM_MODULES.STOCK.MAINTENANCE.STOCK_RANGES.code)
                                                ? [
                                                      {
                                                          label: 'Stock Ranges',
                                                          href: '/utilities/set-up/masters/stock-ranges',
                                                          icon: Layers,
                                                      },
                                                  ]
                                                : []),
                                            ...(isMenuPermission(SYSTEM_MODULES.STOCK.MAINTENANCE.code)
                                                ? [
                                                      {
                                                          label: 'Stock Movements',
                                                          href: '/stocks/maintenance/stock-movements',
                                                          icon: ArrowLeftRight,
                                                      },
                                                  ]
                                                : []),
                                            ...(isMenuPermission(
                                                SYSTEM_MODULES.STOCK.MAINTENANCE.STORE_CLASSIFICATION.code,
                                            ) ||
                                            isMenuPermission(
                                                SYSTEM_MODULES.STOCK.MAINTENANCE.STORE_CLASSIFICATION.STORE_CATEGORIES
                                                    .code,
                                            ) ||
                                            isMenuPermission(
                                                SYSTEM_MODULES.STOCK.MAINTENANCE.STORE_CLASSIFICATION
                                                    .STORE_CATEGORY_ASSIGNMENTS.code,
                                            )
                                                ? [
                                                      {
                                                          label: 'Store Classification',
                                                          icon: BuildingIcon,
                                                          subMenuItems: [
                                                              ...(isMenuPermission(
                                                                  SYSTEM_MODULES.STOCK.MAINTENANCE.STORE_CLASSIFICATION
                                                                      .STORE_CATEGORIES.code,
                                                              )
                                                                  ? [
                                                                        {
                                                                            label: 'Store Categories',
                                                                            href: '/stocks/maintenance/store-categories',
                                                                            icon: Tags,
                                                                        },
                                                                    ]
                                                                  : []),
                                                              ...(isMenuPermission(
                                                                  SYSTEM_MODULES.STOCK.MAINTENANCE.STORE_CLASSIFICATION
                                                                      .STORE_CATEGORY_ASSIGNMENTS.code,
                                                              )
                                                                  ? [
                                                                        {
                                                                            label: 'Store Category Assignments',
                                                                            href: '/stocks/maintenance/store-category-assignments',
                                                                            icon: UsersRound,
                                                                        },
                                                                    ]
                                                                  : []),
                                                          ],
                                                      },
                                                  ]
                                                : []),
                                            ...(isMenuPermission(
                                                SYSTEM_MODULES.STOCK.MAINTENANCE.SKU_TAGS_MANAGEMENT.code,
                                            )
                                               ? [
                                                      {
                                                          label: 'SKU Tags Management',
                                                          href: '/stocks/maintenance/sku-tags-management',
                                                          icon: Tag,
                                                      },
                                                  ]
                                                : []),
                                        ],
                                    },
                                ]
                              : []),
                          ...(isMenuPermission(SYSTEM_MODULES.STOCK.MAINTENANCE.STOCK_INVENTORY.code) ||
                          isMenuPermission(
                              SYSTEM_MODULES.STOCK.MAINTENANCE.STOCK_INVENTORY.STOCK_COUNT_VARIANCE_LOG.code,
                          ) ||
                          isMenuPermission(SYSTEM_MODULES.STOCK.MAINTENANCE.STOCK_INVENTORY.PACKAGING_BARCODES.code) ||
                          isMenuPermission(SYSTEM_MODULES.STOCK.MAINTENANCE.STOCK_INVENTORY.WAREHOUSE_LOCATIONS.code)
                              ? [
                                    {
                                        label: 'Stock Inventory',
                                        icon: Archive,
                                        subMenuItems: [
                                            ...(isMenuPermission(SYSTEM_MODULES.STOCK.MAINTENANCE.STOCK_INVENTORY.code)
                                                ? [
                                                      {
                                                          label: 'Stock Inventory',
                                                          href: '/stocks/inventory',
                                                          icon: Archive,
                                                      },
                                                  ]
                                                : []),
                                            ...(isMenuPermission(
                                                SYSTEM_MODULES.STOCK.MAINTENANCE.STOCK_INVENTORY
                                                    .STOCK_COUNT_VARIANCE_LOG.code,
                                            )
                                                ? [
                                                      {
                                                          label: 'Stock Count Variance Log',
                                                          href: '/stocks/inventory/stock-count-variance-log',
                                                          icon: ClipboardList,
                                                      },
                                                  ]
                                                : []),
                                            ...(isMenuPermission(
                                                SYSTEM_MODULES.STOCK.MAINTENANCE.STOCK_INVENTORY.PACKAGING_BARCODES
                                                    .code,
                                            )
                                                ? [
                                                      {
                                                          label: 'Packaging Barcodes',
                                                          href: '/stocks/inventory/packaging-barcodes',
                                                          icon: Barcode,
                                                      },
                                                  ]
                                                : []),
                                            ...(isMenuPermission(
                                                SYSTEM_MODULES.STOCK.MAINTENANCE.STOCK_INVENTORY.WAREHOUSE_LOCATIONS
                                                    .code,
                                            )
                                                ? [
                                                      {
                                                          label: 'Warehouse Locations',
                                                          href: '/stocks/inventory/warehouse-locations',
                                                          icon: MapPin,
                                                      },
                                                  ]
                                                : []),
                                        ],
                                    },
                                ]
                              : []),
                          ...(isMenuPermission(SYSTEM_MODULES.STOCK.MAINTENANCE.NST_MANAGEMENT.WORKSPACE.code) ||
                          isMenuPermission(SYSTEM_MODULES.STOCK.MAINTENANCE.NST_MANAGEMENT.RULES.code) ||
                          isMenuPermission(SYSTEM_MODULES.STOCK.MAINTENANCE.NST_MANAGEMENT.REPORTS.code)
                              ? [
                                    {
                                        label: 'Expiry & Damaged Stock',
                                        icon: Percent,
                                        subMenuItems: [
                                            ...(isMenuPermission(
                                                SYSTEM_MODULES.STOCK.MAINTENANCE.NST_MANAGEMENT.WORKSPACE.code,
                                            )
                                                ? [
                                                      {
                                                          label: 'Manage Expiry & Damaged Stock',
                                                          href: '/processing/nst',
                                                          icon: Percent,
                                                      },
                                                      {
                                                          label: 'Pending Approval',
                                                          href: '/processing/nst?filter=pending',
                                                          icon: Clock,
                                                      },
                                                      {
                                                          label: 'Near-Expiry Candidates',
                                                          href: '/processing/nst/candidates',
                                                          icon: CalendarClock,
                                                      },
                                                  ]
                                                : []),
                                            ...(isMenuPermission(
                                                SYSTEM_MODULES.STOCK.MAINTENANCE.NST_MANAGEMENT.RULES.code,
                                            )
                                                ? [
                                                      {
                                                          label: 'Expiry & Damaged Stock Rules',
                                                          href: '/processing/nst/rules',
                                                          icon: ShieldCheck,
                                                      },
                                                  ]
                                                : []),
                                            ...(isMenuPermission(
                                                SYSTEM_MODULES.STOCK.MAINTENANCE.NST_MANAGEMENT.REPORTS.code,
                                            )
                                                ? [
                                                      {
                                                          label: 'Expiry & Damaged Stock Reports',
                                                          href: '/processing/nst/report',
                                                          icon: BarChart,
                                                      },
                                                  ]
                                                : []),
                                        ],
                                    },
                                ]
                              : []),
                          ...(isMenuPermission(SYSTEM_MODULES.STOCK.MAINTENANCE.STOCK_INVENTORY.code)
                              ? [{ label: 'Inventory Summary', href: '/inventory-summary', icon: Archive }]
                              : []),
                          ...(isMenuPermission(SYSTEM_MODULES.STOCK.CONTRACT_PRICE_MAINTENANCE.code)
                              ? [{ label: 'Contract Price Maintenance', href: '/stocks/contract-prices', icon: File }]
                              : []),
                        //   ...(isMenuPermission(SYSTEM_MODULES.STOCK.PRODUCT_PUBLICATION.code)
                        //       ? [{ label: 'Product Publication', href: '/stocks/product-publication', icon: Send }]
                        //       : []),
                          ...(isMenuPermission(SYSTEM_MODULES.STOCK.MAINTENANCE.SUPPLIER_PRICING.code)
                              ? [
                                    {
                                        label: 'Supplier Pricing',
                                        icon: Truck,
                                        subMenuItems: [
                                            {
                                                label: 'Supplier Pricing',
                                                href: '/stocks/supplier-pricing',
                                                icon: Truck,
                                            },
                                            ...(isMenuPermission(
                                                SYSTEM_MODULES.STOCK.MAINTENANCE.SUPPLIER_PRICING
                                                    .SUPPLIER_COST_COMPARISON.code,
                                            )
                                                ? [
                                                      {
                                                          label: 'Supplier Cost Comparison',
                                                          href: '/stocks/supplier-cost-comparison',
                                                          icon: Scale,
                                                      },
                                                  ]
                                                : []),
                                        ],
                                    },
                                ]
                              : []),
                          ...(isMenuPermission(SYSTEM_MODULES.STOCK.PRICE_MAINTENANCE.code)
                              ? [
                                    {
                                        label: 'Price Maintenance',
                                        icon: Settings2,
                                        subMenuItems: [
                                            ...(isMenuPermission(
                                                SYSTEM_MODULES.STOCK.PRICE_MAINTENANCE.DISCOUNT_AND_PRICING_MATRIX.code,
                                            )
                                                ? [
                                                      {
                                                          label: 'Discount & Pricing Matrix',
                                                          href: '/stocks/discount-and-pricing-matrix',
                                                          icon: Percent,
                                                      },
                                                  ]
                                                : []),
                                            ...(isMenuPermission(
                                                SYSTEM_MODULES.STOCK.PRICE_MAINTENANCE.COST_CONSISTENCY_RULES.code,
                                            )
                                                ? [
                                                      {
                                                          label: 'Cost Consistency Rules',
                                                          href: '/stocks/cost-consistency-rules',
                                                          icon: Scale,
                                                      },
                                                  ]
                                                : []),
                                        ],
                                    },
                                ]
                              : []),
                          ...(isMenuPermission(SYSTEM_MODULES.STOCK.ENQUIRIES.code)
                              ? [{ label: 'Enquiries', href: '/stocks/enquiries', icon: HelpCircle }]
                              : []),
                      ],
                      //   'ledger': [
                      //       // { label: 'View Ledger', href: '/', icon: Book },
                      //       // { label: 'New Entry', href: '/', icon: FileText },
                      //   ],
                      ...(authUserType === 'WAREHOUSE-USER'
                          ? {}
                          : {
                                utilities: [
                                    {
                                        label: 'Set Up',
                                        icon: Settings,
                                        subMenuItems: [
                                            {
                                                label: 'User Group & Maintenance',
                                                href: '/utilities/set-up/user-group-maintenance',
                                                icon: Users,
                                            },
                                            ...(isMenuPermission(SYSTEM_MODULES.UTILITIES.SETUP.COMPANY_DETAILS.code)
                                                ? [
                                                      {
                                                          label: 'Company Details',
                                                          href: '/utilities/set-up/company-details',
                                                          icon: BuildingIcon,
                                                      },
                                                  ]
                                                : []),
                                            ...(isMenuPermission(SYSTEM_MODULES.UTILITIES.SETUP.DEFAULT_TABLES.code)
                                                ? [
                                                      {
                                                          label: 'Default Tables',
                                                          href: '/utilities/set-up/masters',
                                                          icon: Table,
                                                      },
                                                  ]
                                                : []),
                                            ...(isMenuPermission(
                                                SYSTEM_MODULES.UTILITIES.SETUP.DEFAULT_TABLES.TILLS.code,
                                            )
                                                ? [
                                                      {
                                                          label: 'Tills',
                                                          href: '/utilities/set-up/masters/tills',
                                                          icon: CreditCard,
                                                      },
                                                  ]
                                                : []),
                                            ...(isMenuPermission(
                                                SYSTEM_MODULES.UTILITIES.SETUP.STORE_SETUP
                                                    .STORE_INVENTORY_SALES_CONFIGURATION.code,
                                            )
                                                ? [
                                                      {
                                                          label: 'Store Setup',
                                                          icon: Store,
                                                          subMenuItems: [
                                                              {
                                                                  label: 'Store Inventory & Sales Configuration',
                                                                  href: '/utilities/set-up/store-inventory-sales-configuration',
                                                                  icon: SlidersHorizontal,
                                                              },
                                                          ],
                                                      },
                                                  ]
                                                : []),
                                            ...(isMenuPermission(
                                                SYSTEM_MODULES.UTILITIES.SETUP.MENU_ACCESS_AND_SECURITY.MENU_SETUP.code,
                                            ) ||
                                            isMenuPermission(
                                                SYSTEM_MODULES.UTILITIES.SETUP.MENU_ACCESS_AND_SECURITY.MENU_ACCESS
                                                    .code,
                                            ) ||
                                            isMenuPermission(
                                                SYSTEM_MODULES.UTILITIES.SETUP.MENU_ACCESS_AND_SECURITY.TILL_SHORTCUTS
                                                    .code,
                                            )
                                                ? [
                                                      {
                                                          label: 'Menu Access & Security',
                                                          icon: ShieldCheck,
                                                          subMenuItems: [
                                                              ...(isMenuPermission(
                                                                  SYSTEM_MODULES.UTILITIES.SETUP
                                                                      .MENU_ACCESS_AND_SECURITY.MENU_SETUP.code,
                                                              )
                                                                  ? [
                                                                        {
                                                                            label: 'Menu Setup',
                                                                            href: '/utilities/set-up/menu-setup',
                                                                            icon: Settings2,
                                                                        },
                                                                    ]
                                                                  : []),
                                                              ...(isMenuPermission(
                                                                  SYSTEM_MODULES.UTILITIES.SETUP
                                                                      .MENU_ACCESS_AND_SECURITY.MENU_ACCESS.code,
                                                              )
                                                                  ? [
                                                                        {
                                                                            label: 'Menu Access',
                                                                            href: '/utilities/set-up/menu-access',
                                                                            icon: ShieldCheck,
                                                                        },
                                                                    ]
                                                                  : []),
                                                              ...(isMenuPermission(
                                                                  SYSTEM_MODULES.UTILITIES.SETUP
                                                                      .MENU_ACCESS_AND_SECURITY.TILL_SHORTCUTS.code,
                                                              )
                                                                  ? [
                                                                        {
                                                                            label: 'Till Shortcuts',
                                                                            href: '/utilities/set-up/till-shortcuts',
                                                                            icon: MonitorDot,
                                                                        },
                                                                    ]
                                                                  : []),
                                                          ],
                                                      },
                                                  ]
                                                : []),
                                        ],
                                    },
                                    {
                              label: 'User Monitoring',
                              icon: MonitorDot,
                              subMenuItems: [
                                  {
                                      label: 'User Sessions',
                                      href: '/utilities/user-monitoring/sessions',
                                      icon: Users,
                                  },
                                  {
                                      label: 'User Activity',
                                      href: '/utilities/user-monitoring/activity',
                                      icon: FileText,
                                  },
                              ],
                          },
                          {
                              label: 'Attendance',
                              icon: Clock,
                              subMenuItems: [
                                  {
                                      label: 'Attendance Clock',
                                      href: '/utilities/attendance/clock',
                                      icon: Clock,
                                  },
                                  {
                                      label: 'Attendance Reports',
                                      href: '/utilities/attendance/reports',
                                      icon: FileBarChart,
                                  },
                              ],
                          },
                                    {
                                        label: 'Data Import Center',
                                        href: '/utilities/data-import-center',
                                        icon: Database,
                                    },
                                    {
                                        label: 'File Drive',
                                        href: '/utilities/file-drive',
                                        icon: Database,
                                    },
                                    {
                                        label: 'Labels',
                                        href: '/utilities/labels',
                                        icon: Barcode,
                                    },
                                    ...(isMenuPermission(SYSTEM_MODULES.UTILITIES.BANK_ACCOUNTS.code)
                                        ? [
                                              {
                                                  label: 'Bank Accounts',
                                                  href: '/utilities/bank-accounts',
                                                  icon: Landmark,
                                              },
                                          ]
                                        : []),
                                    ...(isMenuPermission(SYSTEM_MODULES.UTILITIES.PROGRAM_SHORTCUTS.code)
                                        ? [
                                              {
                                                  label: 'Program Shortcuts',
                                                  href: '/utilities/program-shortcuts',
                                                  icon: Command,
                                              },
                                          ]
                                        : []),
                                    {
                                        label: 'Settings',
                                        href: '/utilities/settings',
                                        icon: Settings2,
                                    },
                                    ...(isAnyMenuPermission(
                                        SYSTEM_MODULES.UTILITIES.SUPERVISOR_DESK.code,
                                        SYSTEM_MODULES.UTILITIES.SUPERVISOR_DESK.PENDING_REQUESTS.code,
                                        SYSTEM_MODULES.UTILITIES.SUPERVISOR_DESK.MY_APPROVAL_HISTORY.code,
                                    )
                                        ? [
                                              {
                                                  label: 'Supervisor Desk',
                                                  icon: ClipboardCheck,
                                                  subMenuItems: [
                                                      ...(isAnyMenuPermission(
                                                          SYSTEM_MODULES.UTILITIES.SUPERVISOR_DESK.code,
                                                          SYSTEM_MODULES.UTILITIES.SUPERVISOR_DESK.PENDING_REQUESTS.code,
                                                      )
                                                          ? [
                                                                {
                                                                    label: 'Pending Requests',
                                                                    href: '/security/approvals/inbox',
                                                                    icon: ClipboardCheck,
                                                                },
                                                            ]
                                                          : []),
                                                      ...(isAnyMenuPermission(
                                                          SYSTEM_MODULES.UTILITIES.SUPERVISOR_DESK.code,
                                                          SYSTEM_MODULES.UTILITIES.SUPERVISOR_DESK.MY_APPROVAL_HISTORY
                                                              .code,
                                                      )
                                                          ? [
                                                                {
                                                                    label: 'My Approval History',
                                                                    href: '/security/approvals/history',
                                                                    icon: ScrollText,
                                                                },
                                                            ]
                                                          : []),
                                                  ],
                                              },
                                          ]
                                        : []),
                                    {
                                        label: 'Fingerprint Enrollment',
                                        href: '/security/fingerprint',
                                        icon: Fingerprint,
                                    },
                                    // {
                                    //     label: 'File Upload Center',
                                    //     href: '/file-imports',
                                    //     icon: File,
                                    // },
                                    ...(isMenuPermission(
                                        SYSTEM_MODULES.UTILITIES.SETUP.MODULE_PARAMETERS.USER_GROUP_AND_MAINTENANCE
                                            .USERS.code,
                                    )
                                        ? [
                                              {
                                                  label: 'Tills Report',
                                                  href: '/utilities/set-up/users-till-report',
                                                  icon: Notebook,
                                              },
                                              {
                                                  label: 'Company Safes',
                                                  icon: Vault,
                                                  subMenuItems: [
                                                      {
                                                          label: 'Safes',
                                                          href: '/utilities/safes/company-safes',
                                                          icon: Vault,
                                                      },
                                                      {
                                                          label: 'Vendors',
                                                          href: '/utilities/safes/vendors',
                                                          icon: User,
                                                      },
                                                      {
                                                          label: 'Transactions',
                                                          href: '/utilities/safes/transactions',
                                                          icon: ArrowLeftRight,
                                                      },
                                                  ],
                                              },
                                              {
                                                  label: 'Report',
                                                  icon: Notebook,
                                                  subMenuItems: [
                                                      {
                                                          label: 'X-Report',
                                                          href: '/utilities/reports/x-report',
                                                      },
                                                      {
                                                          label: 'Pos-Report',
                                                          href: '/utilities/reports/pos-report',
                                                      },
                                                  ],
                                              },
                                          ]
                                        : []),
                                ],
                            }),
                      'point-of-sale': [
                          ...(isMenuPermission(SYSTEM_MODULES.POINT_OF_SALE.CASH_SALE.code)
                              ? [
                                    {
                                        label: 'Cash Sales',
                                        href: '/point-of-sale/cash-sales',
                                        icon: Banknote,
                                    },
                                ]
                              : []),
                          ...(isMenuPermission(SYSTEM_MODULES.POINT_OF_SALE.CASH_REFUND.code)
                              ? [
                                    {
                                        label: 'Cash Refund',
                                        href: '/point-of-sale/cash-refund',
                                        icon: ArrowLeftRight,
                                    },
                                ]
                              : []),
                          ...(isMenuPermission(SYSTEM_MODULES.POINT_OF_SALE.ACCOUNT_SALES.code)
                              ? [
                                    {
                                        label: 'Account Sales',
                                        href: '/point-of-sale/account-sales',
                                        icon: CreditCard,
                                    },
                                ]
                              : []),

                          ...(isMenuPermission(SYSTEM_MODULES.POINT_OF_SALE.ACCOUNT_SALES.code) ||
                          isMenuPermission(SYSTEM_MODULES.POINT_OF_SALE.CASH_SALE.code)
                              ? [
                                    {
                                        label: 'View Sales',
                                        icon: ShoppingCartIcon,
                                        subMenuItems: [
                                            ...(isMenuPermission(SYSTEM_MODULES.POINT_OF_SALE.CASH_SALE.code)
                                                ? [
                                                      {
                                                          label: 'Cash Sales',
                                                          href: '/point-of-sale/cash-sales/view-sales',
                                                          icon: Banknote,
                                                      },
                                                  ]
                                                : []),
                                            ...(isMenuPermission(SYSTEM_MODULES.POINT_OF_SALE.ACCOUNT_SALES.code)
                                                ? [
                                                      {
                                                          label: 'Account Sales',
                                                          href: '/point-of-sale/account-sales/view-sales/invoices',
                                                          icon: CreditCard,
                                                      },
                                                  ]
                                                : []),
                                        ],
                                    },
                                ]
                              : []),

                          ...(isMenuPermission(SYSTEM_MODULES.POINT_OF_SALE.CREDIT_NOTES.code)
                              ? [{ label: 'Credit Note', href: '/processing/credit-note', icon: FileUp }]
                              : []),
                          ...(isMenuPermission(SYSTEM_MODULES.POINT_OF_SALE.DEBTOR_INVOICING_ORDERS.code)
                              ? [
                                    {
                                        label: 'Debtor Invoicing Orders',
                                        href: '/point-of-sale/debtor-invoicing-orders',
                                        icon: FileText,
                                    },
                                ]
                              : []),
                          ...(isMenuPermission(SYSTEM_MODULES.POINT_OF_SALE.DEBTOR_INVOICING_ORDER_SETUP.code)
                              ? [
                                    {
                                        label: 'Debtor Invoicing Order Setup',
                                        href: '/point-of-sale/debtor-invoicing-orders/setup',
                                        icon: Settings,
                                    },
                                ]
                              : []),
                          //   ...(isMenuPermission(SYSTEM_MODULES.POINT_OF_SALE.POS_SETUP.code)
                          //       ? [
                          //             {
                          //                 label: 'POS Set Up',
                          //                 icon: Wrench,
                          //                 subMenuItems: [
                          //                     ...(isMenuPermission(
                          //                         SYSTEM_MODULES.POINT_OF_SALE.POS_SETUP.DEFAULT_SETTINGS.code,
                          //                     )
                          //                         ? [
                          //                               {
                          //                                   label: 'Default Settings',
                          //                                   href: '/point-of-sale/pos-set-up/default-settings',
                          //                                   icon: Settings,
                          //                               },
                          //                           ]
                          //                         : []),
                          //                     ...(isMenuPermission(
                          //                         SYSTEM_MODULES.POINT_OF_SALE.POS_SETUP.SLIP_DETAILS_AND_LAYBYE_CONTRACTS
                          //                             .code,
                          //                     )
                          //                         ? [
                          //                               {
                          //                                   label: 'Slip Details & Laybye Contracts',
                          //                                   href: '/point-of-sale/pos-set-up/slip-details',
                          //                                   icon: ScrollText,
                          //                               },
                          //                           ]
                          //                         : []),
                          //                     ...(isMenuPermission(
                          //                         SYSTEM_MODULES.POINT_OF_SALE.POS_SETUP.DEFAULT_SCAN_CODES.code,
                          //                     )
                          //                         ? [
                          //                               {
                          //                                   label: 'Define Scan Codes',
                          //                                   href: '/point-of-sale/pos-set-up/define-scan-codes',
                          //                                   icon: QrCode,
                          //                               },
                          //                           ]
                          //                         : []),
                          //                 ],
                          //             },
                          //         ]
                          //       : []),
                          ...(isMenuPermission(SYSTEM_MODULES.POINT_OF_SALE.SALES_REPORT.code)
                              ? [
                                    {
                                        label: 'Sales Report',
                                        icon: Clipboard,
                                        subMenuItems: [
                                            {
                                                label: 'Stock Wise Sales',
                                                href: '/point-of-sale/reports/stock-wise',
                                                icon: ShoppingCart,
                                            },
                                            {
                                                label: 'Category Wise Sales',
                                                href: '/point-of-sale/reports/category-wise',
                                                icon: Grid,
                                            },
                                            {
                                                label: 'Debtor Wise Sales',
                                                href: '/point-of-sale/reports/debtor-wise',
                                                icon: User,
                                            },
                                        ],
                                    },
                                ]
                              : []),
                          ...(isMenuPermission(SYSTEM_MODULES.POINT_OF_SALE.CASH_UP.code)
                              ? [
                                    {
                                        label: 'Cash-Up',
                                        icon: Calculator,
                                        subMenuItems: [
                                            ...(process.env.NEXT_PUBLIC_CLIENT_TYPE === 'APP'
                                                ? []
                                                : [
                                                      {
                                                          label: 'Cash-Up',
                                                          href: '/point-of-sale/cash-up',
                                                          icon: Calculator,
                                                      },
                                                  ]),
                                            {
                                                label: 'My Shift / Cash-Up',
                                                href: '/point-of-sale/my-shift',
                                                icon: Clock,
                                            },
                                            ...(process.env.NEXT_PUBLIC_CLIENT_TYPE !== 'APP' &&
                                            (isMenuPermission(
                                                SYSTEM_MODULES.POINT_OF_SALE.CASH_UP.CASHUP_TENDERS.code,
                                            ) || isMenuPermission(SYSTEM_MODULES.POINT_OF_SALE.CASH_UP.code))
                                                ? [
                                                      {
                                                          label: 'Cash Tenders',
                                                          href: '/point-of-sale/cash-up/cash-tenders',
                                                          icon: Banknote,
                                                      },
                                                  ]
                                                : []),
                                        ],
                                    },
                                ]
                              : []),
                          ...(isMenuPermission(SYSTEM_MODULES.POINT_OF_SALE.CASH_UP_SALES_NON_BANKABLE.code)
                              ? [
                                    {
                                        label: 'Cash-Up Sales & Non-Bankable',
                                        href: '/point-of-sale/cash-up-sales',
                                        icon: BarChart,
                                    },
                                ]
                              : []),

                          ...(isMenuPermission(SYSTEM_MODULES.POINT_OF_SALE.DENOMINATIONS.code)
                              ? [
                                    {
                                        label: 'Denominations',
                                        href: '/point-of-sale/denominations',
                                        icon: Banknote,
                                    },
                                ]
                              : []),

                          ...(isMenuPermission(SYSTEM_MODULES.POINT_OF_SALE.TILL_MANAGEMENT_REPORTS.code)
                              ? [
                                    {
                                        label: 'Shifts',
                                        href: '/point-of-sale/shifts',
                                        icon: ArrowLeftRight,
                                    },
                                    {
                                        label: 'Till Management Report',
                                        href: '/point-of-sale/till-management-report',
                                        icon: FileBarChart,
                                    },
                                ]
                              : []),

                          ...(isMenuPermission(SYSTEM_MODULES.POINT_OF_SALE.TILL_TO_SAFE.code)
                              ? [
                                    {
                                        label: 'Till-to-Safe Transfer',
                                        href: '/point-of-sale/till-to-safe',
                                        icon: Vault,
                                    },
                                ]
                              : []),

                          ...(isMenuPermission(SYSTEM_MODULES.POINT_OF_SALE.LOYALTY_SETUP.code)
                              ? [
                                    {
                                        label: 'Loyalty',
                                        icon: UsersRound,
                                        subMenuItems: [
                                            {
                                                label: 'Memberships',
                                                href: '/loyalty/memberships',
                                                icon: Award,
                                            },
                                            {
                                                label: 'Cards',
                                                href: '/loyalty/cards',
                                                icon: CreditCard,
                                            },
                                            {
                                                label: 'Transactions',
                                                href: '/loyalty/transactions',
                                                icon: Wallet,
                                            },
                                            {
                                                label: 'Reports',
                                                href: '/loyalty/reports/transaction-summary',
                                                icon: NotepadText,
                                            },
                                        ],
                                    },
                                ]
                              : []),
                          ...(isMenuPermission(
                              SYSTEM_MODULES.POINT_OF_SALE.PROMOTIONS.DISCOUNT_OVERRIDE_NOTIFICATIONS.code,
                          )
                              ? [
                                    {
                                        label: 'Promotions',
                                        icon: Star,
                                        subMenuItems: [
                                            ...(isMenuPermission(SYSTEM_MODULES.POINT_OF_SALE.PROMOTIONS.code)
                                                ? [
                                                      {
                                                          label: 'Promotions',
                                                          href: '/promotions',
                                                          icon: Star,
                                                      },
                                                  ]
                                                : []),
                                            {
                                                label: 'Discount Override Notifications',
                                                href: '/promotions/discount-override-notifications',
                                                icon: Bell,
                                            },
                                        ],
                                    },
                                ]
                              : isMenuPermission(SYSTEM_MODULES.POINT_OF_SALE.PROMOTIONS.code)
                                ? [{ label: 'Promotions', href: '/promotions', icon: Star }]
                                : []),
                          ...(isMenuPermission(SYSTEM_MODULES.POINT_OF_SALE.Z_REPORT.code)
                              ? [
                                    {
                                        label: 'Z-Report & Trading-Day Close',
                                        href: '/point-of-sale/z-report',
                                        icon: FileBarChart,
                                    },
                                ]
                              : []),
                          ...(isMenuPermission(SYSTEM_MODULES.POINT_OF_SALE.SALES_DISCOUNT.code)
                              ? [{ label: 'Sales Discount', href: '/point-of-sale/sales-discount', icon: Percent }]
                              : []),
                          ...(isMenuPermission(SYSTEM_MODULES.POINT_OF_SALE.SCHEDULED_PRICING.code)
                              ? [
                                    {
                                        label: 'Scheduled Pricing',
                                        href: '/point-of-sale/scheduled-pricing',
                                        icon: CalendarClock,
                                    },
                                ]
                              : []),
                          ...(isMenuPermission(SYSTEM_MODULES.POINT_OF_SALE.PRICING_POLICIES.code)
                              ? [
                                    {
                                        label: 'Pricing Policies',
                                        href: '/point-of-sale/pricing-policies',
                                        icon: ShieldCheck,
                                    },
                                ]
                              : []),
                          ...(isMenuPermission(SYSTEM_MODULES.EFT_NOTIFICATION.code)
                              ? [
                                    {
                                        label: 'EFT Notifications',
                                        href: '/eft-notifications',
                                        icon: Bell,
                                    },
                                ]
                              : []),
                      ],
                      'operations': [
                          ...(isOperationsMenuPermission()
                              ? [
                                    {
                                        label: 'Cash Office',
                                        icon: Wallet,
                                        subMenuItems: cashOfficeSubmenu,
                                    },
                                ]
                              : []),
                          ...(isSynchronizationMenuPermission() && syncSubmenu.length
                              ? [
                                    {
                                        label: 'Synchronization',
                                        icon: RefreshCw,
                                        subMenuItems: syncSubmenu,
                                    },
                                ]
                              : []),
                          ...(assetsSubmenu.length
                              ? [
                                    {
                                        label: 'Store Assets & Maintenance',
                                        icon: Archive,
                                        subMenuItems: assetsSubmenu,
                                    },
                                ]
                              : []),
                      ],
                      //   'support': [{ label: 'Help Center', href: '/', icon: LifeBuoy }],
                      //   'windows': [{ label: 'Open Window', href: '/', icon: MonitorDot }],
                      //   'help': [
                      //       { label: 'FAQ', href: '/', icon: CircleHelp },
                      //       { label: 'Contact', href: '/', icon: MessageCircle },
                      //   ],
                      //   'shortcuts': [{ label: 'My Shortcuts', href: '/', icon: ClipboardList }],
                  },
    };
};

export default getMenuData;
