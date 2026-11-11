export const APP_VERSION = '1.0.6';
// const getApiBaseUrl() = 'https://desktopretail.infoware.xyz';
// // const getApiBaseUrl() = 'http://localhost:3000';

export const getApiBaseUrl = () => {
    if (typeof window === 'undefined') {
        return 'https://desktopretail.infoware.xyz';
    }

    const systemMode = localStorage.getItem('systemMode');

    if (systemMode === 'offline') {
        return 'http://localhost:3000';
    }

    return 'https://desktopretail.infoware.xyz';
};

// export const getApiBaseUrl() = getApiBaseUrl();

const AUTH_TOKEN_KEY = 'pos_auth_token';

export { AUTH_TOKEN_KEY };

// Tenders Type

export const TENDER_TYPES = {
    CASH: 'CASH',
    CARD: 'CARD',
    CREDIT_CARD: 'CREDIT_CARD',
    CHEQUE: 'CHEQUE',
    COUPON: 'COUPON',
    VOUCHER: 'VOUCHER',
    DEBIT_CARD: 'DEBIT_CARD',
    EFT: 'EFT',
};

export const DISCOUNT_TYPES = {
    FIXED: 'FIXED_AMOUNT',
    PERCENTAGE: 'PERCENTAGE',
};

// Bank Account Types
export const bankAccountTypes = ['Current', 'Savings', 'Cash Credit', 'Overdraft (OD)', 'NRE', 'NRO'] as const;

// Permissions

export const SYSTEM_PERMISSIONS = {
    CREATE: 'canCreate',
    READ: 'canAccess',
    UPDATE: 'canUpdate',
    DELETE: 'canDelete',
    SHOW_IN_MENU: 'showInMenu',
} as const;

// Modules

export const SYSTEM_MODULES = {
    PROCESSING: {
        code: '50500',
        MAINTENANCE: { code: '50501' },
        GOODS_RETURN: { code: '50502' },
        GOODS_RECEIVING: {
            code: '50503',
            GRV_BARCODE_REVIEW: { code: '50517' },
        },
        RECEIPTS: { code: '50504' },
        GOODS_DISCOUNT: { code: '50505' },
        DEBIT_NOTE: { code: '50506' },
        SUPPLIER_DEALS: {
            code: '50520',
            SUPPLIER_DEAL_ALERTS: { code: '50521' },
        },
        SUPPLIER_ALLOWANCES: { code: '50528' },
        SUPPLIER_COMMITMENTS: { code: '50529' },
        SIMPLE_PROMOTION_RETAIL: { code: '50507' },
        PURCHASE_DEPARTMENT: { code: '50570' },
        PURCHASE_REQUESTS: { code: '50571' },
        SUPPLIER_QUOTATIONS: { code: '50572' },
        QUOTE_COMPARISON: { code: '50573' },
        PURCHASE_ORDERS: { code: '50519' },
        SUPPLIER_INVOICES: { code: '50574' },
        INVOICE_CHECKING: {
            code: '50509',
            DISCREPANCY_REPORTS: { code: '50515' },
            DISCREPANCY_REASONS: { code: '50516' },
        },
        COMPANY_DEBTOR_ORDERS: {
            code: '50510',
            // Supervisor/Admin approval of warehouse allocation above the ordered quantity.
            OVER_SUPPLY_APPROVAL: { code: '50527' },
        },
        COMPANY_DEBTOR_ORDER_SETUP: { code: '50511' },
        DELIVERY_SCHEDULE: { code: '50512' },
        DISPATCH_AND_RECEIPT: { code: '50513' },
        STOCK_BATCH_ALLOCATION: { code: '50514' },
        REPLENISHMENT_RECOMMENDATIONS: {
            // Module code from spec 3060 (Processing -> Replenishment Recommendations).
            // Security actions map onto module + submodules as follows:
            //   REPLENISHMENT_VIEW          -> code (READ)
            //   REPLENISHMENT_CALCULATE     -> code (CREATE)  — preview + save run
            //   REPLENISHMENT_POLICY_MANAGE -> POLICIES (CREATE/UPDATE/DELETE)
            //   REPLENISHMENT_APPROVE       -> APPROVAL (CREATE)
            //   REPLENISHMENT_CONVERT       -> CONVERSION (CREATE)
            //   REPLENISHMENT_AUTOMATION    -> AUTOMATION (READ) — schedules + history,
            //                                   AUTOMATION (CREATE) — create / edit /
            //                                   enable / disable / retry
            code: '50560',
            POLICIES: { code: '50562' },
            SAVED_RUNS: { code: '50561' },
            AUTOMATION: { code: '50563' },
            APPROVAL: { code: '50525' },
            CONVERSION: { code: '50526' },
        },
        AISLE_PICKLIST: { code: '50518' },
        PICKED_ORDERS: { code: '50522' },
        STORE_INVENTORY_SALES_CONFIGURATION: { code: '50575' },
    },
    POINT_OF_SALE: {
        code: '80000',
        ACCOUNT_SALES: { code: '50600' },
        CASH_SALE: { code: '80200' },
        CASH_REFUND: { code: '80300' },
        CASH_UP: {
            code: '80600',
            // Cash-up lifecycle actions. Each is a child module so a user group can be
            // granted a subset (e.g. a cashier may manage+submit but never approve).
            CASHUP_MANAGE: { code: '80601' },
            CASHUP_SUBMIT: { code: '80602' },
            CASHUP_APPROVE: { code: '80603' },
            // Read-only cash tender breakdown per till (submenu under Cash-Up).
            CASHUP_TENDERS: { code: '80604' },
        },
        CASH_UP_SALES_NON_BANKABLE: { code: '3048' },
        DENOMINATIONS: { code: '80630' },
        TILL_TO_SAFE: { code: '80610' },
        TILL_MANAGEMENT_REPORTS: { code: '80620' },
        SHIFTS: { code: '80620' },
        Z_REPORT: { code: '80640' },
        DEBTOR_INVOICING_ORDERS: { code: '80650' },
        DEBTOR_INVOICING_ORDER_SETUP: { code: '80660' },
        CREDIT_NOTES: { code: '50650' },
        POS_SETUP: {
            code: '120000',
            SLIP_DETAILS_AND_LAYBYE_CONTRACTS: { code: '82700' },
            DEFAULT_SCAN_CODES: { code: '83000' },
            DEFAULT_SETTINGS: { code: '82800' },
        },
        SALES_REPORT: {
            code: '60000',
            STOCK_WISE_SALES: { code: '60010' },
            CATEGORY_WISE_SALES: { code: '60020' },
            DEBTOR_WISE_SALES: { code: '60030' },
        },
        PROMOTIONS: {
            code: '80400',
            PROMOTION_RULES: { code: '80410' },
            QUANTITY_PROMOTIONS: { code: '80411' },
            PRICE_DISCOUNT_LIMITS: { code: '80412' },
            DISCOUNT_OVERRIDE_NOTIFICATIONS: { code: '80413' },
        },
        SALES_DISCOUNT: { code: '80500' },
        SCHEDULED_PRICING: { code: '30230' },
        PRICING_POLICIES: { code: '80412' },
        LOYALTY_SETUP: {
            code: '70000',
        },
    },
    UTILITIES: {
        code: '11000',
        SETUP: {
            code: '40000',
            TENDER_SETUP: { code: '60500' },
            COMPANY_DETAILS: {
                code: '60100',
                TAX_RATES: {
                    code: '60800',
                },
                COMPANY_DETAILS: {
                    code: '60850',
                },
            },
            DEFAULT_TABLES: {
                code: '100000',
                TILLS: {
                    code: '100010',
                },
                PRICING_TYPES: {
                    code: '100020',
                },
                STOCK_CATEGORIES: { code: '100030' },
                STOCK_SUB_CATEGORIES: { code: '100040' },
                SELL_PRICE_VARIANT_GROUPS: { code: '100050' },
                COST_PRICE_VARIANT_GROUPS: { code: '100060' },
                WAREHOUSE: { code: '100070' },
                CURRENCY: { code: '100080' },
                STOCK_RANGES: { code: '100090' },
                STOCK_VARIANTS: { code: '100100' },
                UOM: { code: '100120' },
            },
            STORE_SETUP: {
                code: '100110',
                STORE_INVENTORY_SALES_CONFIGURATION: { code: '100111' },
            },
            MENU_ACCESS_AND_SECURITY: {
                code: '90000',
                MENU_SETUP: { code: '110880' },
                MENU_ACCESS: { code: '11085' },
                TILL_SHORTCUTS: { code: '90003' },
            },
            MODULE_PARAMETERS: {
                code: '60200',
                USER_GROUP_AND_MAINTENANCE: {
                    code: '60600',
                    USER_GROUPS: { code: '60650' },
                    USERS: { code: '60700' },
                    USER_GROUP_SETTINGS: { code: '60750' },
                },
            },
        },
        BANK_ACCOUNTS: { code: '11198' },
        LABELS: {
            code: '11030',
        },
        PROGRAM_SHORTCUTS: { code: '30180' },
        SUPERVISOR_DESK: {
            code: '11090',
            PENDING_REQUESTS: { code: '11091' },
            MY_APPROVAL_HISTORY: { code: '11092' },
        },
        USER_MONITORING: {
            code: '11100',
            USER_SESSIONS: { code: '11101' },
            USER_ACTIVITY: { code: '11102' },
        },
        ATTENDANCE: {
            code: '11103',
            ATTENDANCE_CLOCK: { code: '11104' },
            ATTENDANCE_REPORTS: { code: '11105' },
        },
    },
    STOCK: {
        code: '30000',
        CONTRACT_PRICE_MAINTENANCE: { code: '31800' },
        CONTRACT: { code: '31801' },
        MAINTENANCE: {
            code: '30100',
            STOCK_INVENTORY: {
                code: '30150',
                PHYSICAL_STOCK_COUNT: { code: '30151' },
                STOCK_COUNT_VARIANCE_LOG: { code: '30152' },
                PACKAGING_BARCODES: { code: '30154' },
                WAREHOUSE_LOCATIONS: { code: '30153' },
            },
            NST_MANAGEMENT: {
                code: '30160',
                WORKSPACE: { code: '30161' },
                RULES: { code: '30162' },
                REPORTS: { code: '30163' },
            },
            SUPPLIER_PRICING: {
                code: '30170',
                SUPPLIER_COST_COMPARISON: { code: '30171' },
            },
            STORE_CLASSIFICATION: {
                code: '30175',
                STORE_CATEGORIES: { code: '30176' },
                STORE_CATEGORY_ASSIGNMENTS: { code: '30177' },
            },
            SKU_TAGS_MANAGEMENT: { code: '30182' },
            STOCK_VARIANTS: { code: '30190' },
            STOCK_RANGES: { code: '30191' },
            PACKAGING_BARCODES: { code: '30154' },
        },
        PRICE_MAINTENANCE: {
            code: '30200',
            DISCOUNT_AND_PRICING_MATRIX: { code: '30210' },
            COST_CONSISTENCY_RULES: { code: '30220' },
            SCHEDULED_PRICES: { code: '30230' },
        },
        ENQUIRIES: { code: '30300' },
        PRODUCT_PUBLICATION: { code: '30240' },
    },
    CREDITORS: {
        code: '20000',
        MAINTENANCE: { code: '20100' },
        ALLOCATIONS: { code: '20500' },
        TRANSACTIONS: { code: '20600' },
        ENQUIRIES: { code: '20700' },
        PAYMENTS: { code: '20200' },
        PAYMENT_RUN_AND_RECONCILIATION: { code: '21200' },
    },
    DEBTORS: {
        code: '10000',
        MAINTENANCE: { code: '10100' },
        MASTERS: {
            code: '10010',
            // 3022 - Debtor groups are the master that group payment allocation
            // resolves from, so debtors must be assignable to one.
            DEBTOR_GROUPS: { code: '10011' },
        },
        RECEIPTS: { code: '10200' },
        ALLOCATIONS: { code: '10300' },
        TRANSACTIONS: { code: '10400' },
        ENQUIRIES: {
            code: '10500',
            DEBTOR_STATEMENTS: { code: '10510' },
        },
        STATEMENTS: { code: '10550' },
        GROUP_ALLOCATION: { code: '10600' },
        GROUP_ALLOCATION_LOG: { code: '10610' },
        RECONCILIATION: { code: '10620' },
        AGEING_AND_CREDIT_ALLOCATION: { code: '10630' },
        PRICE_MISMATCH_CREDIT_NOTE: { code: '10640' },
    },
    SECURITY: {
        code: '40010',
        GROUP_ACTIONS: { code: '40011' },
        ACTION_POLICY: { code: '40012' },
        APPROVALS: { code: '40013' },
        APPROVAL_REPORT: { code: '40014' },
    },
    EFT_NOTIFICATION: {
        code: '98000',
    },
    OPERATIONS: {
        code: '90000',
        SYNCHRONIZATION: {
            code: '90100',
            SYNC_MONITORING: { code: '90110' },
        },
        CASH_OFFICE: {
            code: '90050',
            DASHBOARD: { code: '90051' },
            TILL_HANDOVERS: { code: '90052' },
            CASH_OFFICE_RECEIPTS: { code: '90053' },
            PAYMENTS_AND_TRANSFERS: { code: '90054' },
            BANK_DEPOSITS_AND_WITHDRAWALS: { code: '90055' },
            RECONCILIATION_AND_CLOSING: { code: '90056' },
            REPORTS: { code: '90057' },
            CONFIGURATION: { code: '90058' },
            SESSION_OPEN: { code: '90050' },
            PAYMENT_COLLECTION: { code: '90060' },
        },
        STORE_ASSETS_AND_MAINTENANCE: {
            code: '90200',
            ASSET_REGISTER: { code: '90210' },
            ASSET_EVENTS: { code: '90220' },
        },
    },
} as const;

export const COLOR_CODES_FOR_INVOICE_FORMS = {
    INVOICE: 'bg-blue-50',
    SALE_ORDER: 'bg-green-50',
    QUOTATION: 'bg-orange-50',
    GRV: 'bg-amber-50',
    DEBIT_NOTE: 'bg-pink-50',
    CREDIT_NOTE: 'bg-red-50',
    DEBTOR_RECEIPTS: 'bg-gray-50',
} as const;

// Stock Maintenance Permissions
export const STOCK_MAINTENANCE_PERMISSIONS = {
    STORE_CATEGORY_MANAGE: 'STORE_CATEGORY_MANAGE',
    STORE_CATEGORY_ASSIGN: 'STORE_CATEGORY_ASSIGN',
    STOCK_ITEM_TAG_MANAGE: 'STOCK_ITEM_TAG_MANAGE',
} as const;
