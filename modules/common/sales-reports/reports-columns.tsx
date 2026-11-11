import {
    DebtorWiseType,
    ReportsType,
    SalesReportColumnsType,
    StockWiseType,
    CategoryWiseType,
} from '@/api-queries/reports';
import { useAuthUser } from '@/stores/auth-user.store';
import { type ColumnDef } from '@tanstack/react-table';

const getReportsColumns = (type: ReportsType): ColumnDef<SalesReportColumnsType>[] => {
    const currencySymbol = useAuthUser((state) => state.currency?.symbol) || 'R';

    const avgColumn: ColumnDef<SalesReportColumnsType> =
        type === 'debtorWiseSales'
            ? {
                  accessorKey: 'averageOrderValue',
                  header: 'Avg. Order Value',
                  cell: ({ row }) => {
                      const data = row.original as DebtorWiseType;
                      return (
                          <div>
                              {currencySymbol} {data.averageOrderValue?.toFixed(2)}
                          </div>
                      );
                  },
              }
            : {
                  accessorKey: 'averageSellingPrice',
                  header: 'Avg. Selling Price',
                  cell: ({ row }) => {
                      const data = row.original as StockWiseType | CategoryWiseType;
                      return (
                          <div>
                              {currencySymbol} {data.averageSellingPrice?.toFixed(2)}
                          </div>
                      );
                  },
              };

    const baseColumns: ColumnDef<SalesReportColumnsType>[] = [
        avgColumn,
        {
            accessorKey: 'invoicing',
            header: 'Invoices',
            cell: ({ row }) => (
                <div>
                    <div>
                        <span className="font-semibold">Amount : </span>
                        {currencySymbol} {row.original.invoiceValue?.toFixed(2)}
                    </div>
                    <div>
                        <span className="font-semibold">Quantity : </span> {row.original.invoiceQuantity}
                    </div>
                </div>
            ),
        },
        {
            accessorKey: 'cashSales',
            header: 'Cash Sales',
            cell: ({ row }) => (
                <div>
                    <div>
                        <span className="font-semibold">Amount : </span>
                        {currencySymbol} {row.original.posValue?.toFixed(2)}
                    </div>
                    <div>
                        <span className="font-semibold">Quantity : </span> {row.original.posQuantity}
                    </div>
                </div>
            ),
        },
        {
            accessorKey: 'total',
            header: 'Total',
            cell: ({ row }) => (
                <div>
                    <div>
                        <span className="font-semibold">Amount : </span>
                        {currencySymbol} {row.original.totalSalesValue?.toFixed(2)}
                    </div>
                    <div>
                        <span className="font-semibold">Quantity : </span> {row.original.totalQuantitySold}
                    </div>
                </div>
            ),
        },
    ];

    if (type === 'categoryWiseSales') {
        const categoryColumn: ColumnDef<CategoryWiseType> = {
            accessorKey: 'Category',
            header: 'Category',
            cell: ({ row }) => {
                const rowData = row.original;
                return (
                    <div>
                        <div>
                            <span className="font-semibold">Name : </span> {rowData.categoryName}
                        </div>
                        <div>
                            <span className="font-semibold">Code : </span> {rowData.categoryCode}
                        </div>
                    </div>
                );
            },
        };

        return [categoryColumn as ColumnDef<SalesReportColumnsType>, ...baseColumns];
    }

    if (type === 'debtorWiseSales') {
        const debtorColumn: ColumnDef<DebtorWiseType> = {
            accessorKey: 'debtor',
            header: 'Debtor',
            cell: ({ row }) => {
                const rowData = row.original;
                return (
                    <div>
                        <div>
                            <span className="font-semibold">Name : </span> {rowData.debtorName}
                        </div>
                        <div>
                            <span className="font-semibold">Account No. : </span> {rowData.accountNumber}
                        </div>
                    </div>
                );
            },
        };

        return [debtorColumn as ColumnDef<SalesReportColumnsType>, ...baseColumns];
    }

    if (type === 'stockWiseSales') {
        const stockColumn: ColumnDef<StockWiseType> = {
            accessorKey: 'stock',
            header: 'Stock',
            cell: ({ row }) => {
                const rowData = row.original;
                return (
                    <div>
                        <div>
                            <span className="font-semibold">Name : </span> {rowData.description}
                        </div>
                        <div>
                            <span className="font-semibold">Item Code : </span> {rowData.itemCode}
                        </div>
                    </div>
                );
            },
        };

        return [stockColumn as ColumnDef<SalesReportColumnsType>, ...baseColumns];
    }

    return baseColumns;
};

export default getReportsColumns;
