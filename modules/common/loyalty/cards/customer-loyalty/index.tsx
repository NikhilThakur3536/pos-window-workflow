import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Edit, Trash2, Plus, User, CreditCard, Phone, QrCode, Star, Barcode, Wallet, Mail } from 'lucide-react';
import CustomerLoyaltyCardForm from './customer-loyalty-card-form';
import { TableHeaderToggle } from '@/components/table';
import { type ColumnDef } from '@tanstack/react-table';
import { PageLoader } from '@/components/custom-components/PageLoader';
import { DataTable } from '@/components/dynamic-table/data-table';
import {
    useGetCustomerLoyaltyCards,
    FilterProps,
    useRemoveCustomerLoyaltyCard,
    CustomerLoyaltyCardDetails,
} from '@/api-queries/loyalty/customer-cards';
import DeleteConfirmation from '@/components/custom-components/DeleteConfirmation';
import { toast } from 'sonner';
import { SYSTEM_MODULES, SYSTEM_PERMISSIONS } from '@/lib/constant';
import { hasPermission, ViewAccessDeniedDialog } from '@/components/permission-guards';
import useTableFilters from '@/components/list-only-table/use-table-filters';
import FilterActionButtons from '@/components/custom-components/filter-action-buttons';
import { Input } from '@/components/ui/input';
import useUsersPermissions from '@/components/permission-guards/useUsersPermissions';
import moment from 'moment';
import { Badge } from '@/components/ui/badge';

const CustomerLoyaltyCards = () => {
    const userGroupPermissions = useUsersPermissions();
    const [isPermissionDeniedOpen, setIsPermissionDeniedOpen] = useState(false);

    const [selectedItem, setSelectedItem] = useState<CustomerLoyaltyCardDetails | null>(null);
    const [isDeleteOpen, setIsDeleteOpen] = useState(false);

    const initialFilters = {
        search: '',
    };

    const {
        filters,
        setFilters,
        handleFilters,
        clearFilters,
        appliedFilters,
        showClearButton,
        pagination,
        setPagination,
    } = useTableFilters<FilterProps>(initialFilters);

    const query = useGetCustomerLoyaltyCards({
        limit: pagination.pageSize,
        offset: pagination.pageIndex * pagination.pageSize,
        ...(appliedFilters?.search ? { search: appliedFilters?.search } : {}),
    });
    const { data: customerLoyaltyCards, isLoading } = query;
    const totalRowCount = query?.data?.data?.count || 0;

    const columns: ColumnDef<CustomerLoyaltyCardDetails>[] = [
        {
            accessorKey: 'customer',
            header: (data) => <TableHeaderToggle {...data}>Customer Details</TableHeaderToggle>,
            cell: ({ row }) => {
                const customer = row.original.customer;
                const name = customer.name || 'N/A';
                const email = customer.email || 'N/A';
                const contact = customer.phone || 'N/A';
                return (
                    <div className="space-y-1">
                        <div className="flex items-center gap-2">
                            <User className="!h-4 !w-4" />
                            {name}
                        </div>
                        <div className="flex items-center gap-2">
                            <Phone className="!h-4 !w-4" /> {contact}
                        </div>
                        <div className="flex items-center gap-2">
                            <Mail className="!h-4 !w-4" /> {email}
                        </div>
                    </div>
                );
            },
        },
        {
            accessorKey: 'loyaltyCard',
            header: (data) => <TableHeaderToggle {...data}>Card Details</TableHeaderToggle>,
            cell: ({ row }) => {
                const card = row.original.loyaltyCard;
                const name = card.name;
                const cardNumber = card.cardNumber;
                const barcode = card.barcode || 'N/A';

                return (
                    <div className="space-y-1">
                        <div className="flex items-center gap-2">
                            <Wallet className="!h-4 !w-4" />
                            {name}
                        </div>
                        <div className="flex items-center gap-2">
                            <CreditCard className="!h-4 !w-4" /> {cardNumber}
                        </div>
                        <div className="flex items-center gap-2">
                            <Barcode className="!h-4 !w-4" /> {barcode}
                        </div>
                    </div>
                );
            },
        },
        {
            accessorKey: 'membership',
            header: (data) => <TableHeaderToggle {...data}>Membership Details</TableHeaderToggle>,
            cell: ({ row }) => {
                const membership = row.original.membership;
                const name = membership?.name;
                const code = membership?.code;

                return (
                    <div className="space-y-1">
                        <div className="flex items-center gap-2">
                            <Star className="!h-4 !w-4" />
                            {name}
                        </div>
                        <div className="flex items-center gap-2">
                            <QrCode className="!h-4 !w-4" /> {code}
                        </div>
                    </div>
                );
            },
        },
        {
            accessorKey: 'availablePoints',
            header: (data) => <TableHeaderToggle {...data}>Points</TableHeaderToggle>,
            cell: ({ row }) => {
                const availablePoints = row.original.availablePoints;
                const issueDate = row.original.issueDate;
                const expiryDate = row.original.expiryDate;

                return (
                    <div className="space-y-1">
                        <div className="flex items-center gap-2">
                            <div className="font-semibold">Available :</div>
                            <div className="font-bold text-green-700">{availablePoints || 0}</div>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="font-semibold">Issue Date :</div>
                            {issueDate ? moment(issueDate).format('DD/MM/YYYY') : 'N/A'}
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="font-semibold">Expiry Date :</div>
                            {expiryDate ? moment(expiryDate).format('DD/MM/YYYY') : 'N/A'}
                        </div>
                    </div>
                );
            },
        },
        {
            accessorKey: 'isExpired',
            header: 'Expiring Status',
            cell: ({ row }) => {
                const isExpired = row.original.isExpired;
                const expiryDate = row.original.expiryDate;

                let displayText = '';

                if (isExpired) {
                    displayText = 'Expired';
                } else {
                    const daysRemaining = moment(expiryDate).diff(moment(), 'days');
                    displayText = `Expiring in ${daysRemaining} day${daysRemaining !== 1 ? 's' : ''}`;
                }

                return (
                    <Badge className={isExpired ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'}>
                        {displayText}
                    </Badge>
                );
            },
        },
        {
            id: 'actions',
            header: ({}) => <div className="text-center">Actions</div>,
            cell: ({ row }) => (
                <div className="flex items-center justify-center gap-1">
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                            if (
                                hasPermission(userGroupPermissions, SYSTEM_MODULES.POINT_OF_SALE.LOYALTY_SETUP.code, [
                                    SYSTEM_PERMISSIONS.UPDATE,
                                ])
                            ) {
                                e.stopPropagation();
                                onEditData(row.original);
                            } else {
                                setIsPermissionDeniedOpen(true);
                                return;
                            }
                        }}
                        className="h-8 w-8 p-0"
                    >
                        <Edit className="h-4 w-4" />
                    </Button>

                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                            if (
                                hasPermission(userGroupPermissions, SYSTEM_MODULES.POINT_OF_SALE.LOYALTY_SETUP.code, [
                                    SYSTEM_PERMISSIONS.DELETE,
                                ])
                            ) {
                                e.preventDefault();
                                setSelectedItem(row.original);
                                setIsDeleteOpen(true);
                            } else {
                                setIsPermissionDeniedOpen(true);
                                return;
                            }
                        }}
                        className="h-8 w-8 p-0 text-red-600 hover:bg-red-50 hover:text-red-700"
                    >
                        <Trash2 className="h-4 w-4" />
                    </Button>
                </div>
            ),
        },
    ];

    const [open, setOpen] = useState(false);
    const [editData, setEditData] = useState<CustomerLoyaltyCardDetails | null>(null);

    const onAddData = () => {
        setEditData(null);
        setSelectedItem(null);
        setOpen(true);
    };

    const onEditData = (data: CustomerLoyaltyCardDetails) => {
        setEditData(data);
        setSelectedItem(null);
        setOpen(true);
    };

    const onClose = () => {
        setEditData(null);
        setSelectedItem(null);
        setOpen(false);
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') handleApplyFilters();
    };

    const handleClearSearch = () => {
        clearFilters();
    };

    const handleApplyFilters = () => {
        handleFilters(filters);
    };

    const { mutate: removeCompany } = useRemoveCustomerLoyaltyCard();

    const handleDelete = () => {
        if (selectedItem?.id)
            removeCompany(selectedItem?.id, {
                onSuccess: () => {
                    setSelectedItem(null);
                    toast.success('Customer Card deleted successfully');
                },
                onError: (error) => {
                    // @ts-ignore
                    toast.error(error?.response.data.message || 'Internal Server Error!');
                },
            });
    };

    const onClosePermissionDenied = () => {
        setIsPermissionDeniedOpen(false);
    };

    return (
        <PageLoader isLoading={isLoading}>
            <div className="space-y-2 p-3">
                <DataTable
                    query={query}
                    data={customerLoyaltyCards?.data?.rows || []}
                    columns={columns}
                    pagination={pagination}
                    setPagination={setPagination}
                    totalRowCount={totalRowCount}
                >
                    <div className="flex items-center justify-between">
                        <div className="flex w-full items-center gap-2">
                            <Input
                                placeholder="Search by customer or card name..."
                                value={filters.search || ''}
                                onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                                onKeyDown={handleKeyDown}
                                className="!max-w-sm"
                            />
                            <FilterActionButtons
                                onApplyFilters={handleApplyFilters}
                                onClearClick={handleClearSearch}
                                showClearButton={showClearButton}
                            />
                        </div>
                        <Button
                            onClick={() => {
                                if (
                                    hasPermission(
                                        userGroupPermissions,
                                        SYSTEM_MODULES.POINT_OF_SALE.LOYALTY_SETUP.code,
                                        [SYSTEM_PERMISSIONS.CREATE],
                                    )
                                ) {
                                    onAddData();
                                } else {
                                    setIsPermissionDeniedOpen(true);
                                    return;
                                }
                            }}
                            className="flex items-center gap-2"
                        >
                            <Plus className="h-4 w-4" />
                            Add Customer Card
                        </Button>
                    </div>
                </DataTable>

                <CustomerLoyaltyCardForm open={open} onClose={onClose} editData={editData} key={editData?.id || null} />

                <DeleteConfirmation
                    open={isDeleteOpen}
                    onClose={() => setIsDeleteOpen(false)}
                    title="Are you sure you want to delete customer loyalty card"
                    onConfirm={handleDelete}
                />
            </div>

            <ViewAccessDeniedDialog
                open={isPermissionDeniedOpen}
                onClose={onClosePermissionDenied}
                options={{ description: "You don't have access to add/update the loyalty modules." }}
            />
        </PageLoader>
    );
};

export default CustomerLoyaltyCards;
