import { useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { FileText, Landmark, CalendarDays, WalletCards, SlidersHorizontal, UserRound, RefreshCw } from 'lucide-react';
import useTableFilters from '@/components/list-only-table/use-table-filters';
import FilterActionButtons from '@/components/custom-components/filter-action-buttons';
import TableDateFilter from '@/components/table/table-date-filter';
import SelectPopover from '@/components/select-popover';
import { useDebtorList } from '@/api-queries/debtor';
import { useAuthUser } from '@/stores/auth-user.store';
import useUsersPermissions from '@/components/permission-guards/useUsersPermissions';
import { hasPermission } from '@/components/permission-guards';
import { SYSTEM_MODULES, SYSTEM_PERMISSIONS } from '@/lib/constant';
import StatementTab from './statement-tab';
import TransactionsTab from './transactions-tab';
import AgeAnalysisTab from './age-analysis-tab';
import AccountSummaryTab from './account-summary-tab';
import AdjustmentsTab from './adjustments-tab';
import { StatementFilters } from './shared';

const Statements = () => {
    const router = useRouter();
    const userType = useAuthUser((state) => state.user?.userType);
    const loggedInDebtorName = useAuthUser((state) => state.user?.companyDebtor?.name);
    const isCompanyDebtorUser = userType === 'COMPANY-DEBTOR-USER';
    const userGroupPermissions = useUsersPermissions();

    const hasCreate = hasPermission(userGroupPermissions, SYSTEM_MODULES.DEBTORS.STATEMENTS.code, [
        SYSTEM_PERMISSIONS.CREATE,
    ]);
    const hasUpdate = hasPermission(userGroupPermissions, SYSTEM_MODULES.DEBTORS.STATEMENTS.code, [
        SYSTEM_PERMISSIONS.UPDATE,
    ]);
    const hasDelete = hasPermission(userGroupPermissions, SYSTEM_MODULES.DEBTORS.STATEMENTS.code, [
        SYSTEM_PERMISSIONS.DELETE,
    ]);

    const {
        filters,
        setFilters,
        handleFilters,
        clearFilters,
        appliedFilters,
        showClearButton,
    } = useTableFilters<StatementFilters>({
        companyDebtorId: '',
        fromDate: '',
        toDate: '',
        includeCashSales: true,
    });

    const { data: debtorsData } = useDebtorList({ limit: 1000 });

    const activeCompanyDebtorId = isCompanyDebtorUser ? '' : appliedFilters.companyDebtorId;

    const debtorName = useMemo(() => {
        if (isCompanyDebtorUser) return loggedInDebtorName;
        const selected = debtorsData?.data?.rows?.find((debtor) => debtor.id === appliedFilters.companyDebtorId);
        return selected ? `${selected.name}${selected.accountNumber ? ` (${selected.accountNumber})` : ''}` : '';
    }, [isCompanyDebtorUser, loggedInDebtorName, debtorsData, appliedFilters.companyDebtorId]);

    const goToDebtors = () => router.push('/debtors/maintenance');

    return (
        <div className="m-6 space-y-3">
            <div className="rounded-md border bg-white p-4">
                <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                    <div>
                        <h2 className="text-xl font-semibold">Debtor Statements</h2>
                        <p className="text-muted-foreground text-sm">Full statements, ledger, age analysis and account adjustments</p>
                    </div>
                    {debtorName && (
                        <Badge variant="secondary" className="gap-1.5 border-transparent px-3 py-1">
                            <UserRound className="h-3.5 w-3.5" />
                            {debtorName}
                        </Badge>
                    )}
                </div>

                <div className="flex flex-wrap items-end gap-2">
                    {isCompanyDebtorUser ? (
                        <div className="flex h-8 items-center gap-2 rounded-md border bg-muted/40 px-3 text-xs">
                            <UserRound className="h-4 w-4 text-muted-foreground" />
                            <span className="font-medium">{loggedInDebtorName || 'Logged-in debtor'}</span>
                            <span className="text-muted-foreground">(your own account is used)</span>
                        </div>
                    ) : (
                        <SelectPopover
                            title="Debtor"
                            options={
                                debtorsData?.data?.rows?.map((debtor) => ({
                                    value: debtor.id,
                                    label: `${debtor.name || ''}${debtor.accountNumber ? ` (${debtor.accountNumber})` : ''}`,
                                })) || []
                            }
                            selectedValue={filters.companyDebtorId}
                            onSelect={(value) => setFilters({ ...filters, companyDebtorId: value || '' })}
                            wrapperClass="min-w-[240px]"
                        />
                    )}

                    <TableDateFilter filters={filters} setFilters={setFilters} />

                    <label className="flex h-8 cursor-pointer items-center gap-2 rounded-md border bg-white px-3 text-xs font-medium">
                        <Switch
                            checked={filters.includeCashSales}
                            onCheckedChange={(checked) => setFilters({ ...filters, includeCashSales: checked })}
                        />
                        Include Cash Sales
                    </label>

                    <FilterActionButtons
                        onApplyFilters={() =>
                            handleFilters(
                                isCompanyDebtorUser ? { ...filters, companyDebtorId: '' } : filters,
                            )
                        }
                        onClearClick={clearFilters}
                        showClearButton={showClearButton}
                    />
                </div>
            </div>

            {!activeCompanyDebtorId && !isCompanyDebtorUser ? (
                <div className="rounded-md border bg-white p-10 text-center">
                    <Landmark className="mx-auto mb-3 h-10 w-10 text-muted-foreground" />
                    <h3 className="text-base font-semibold">Select a debtor to view statements</h3>
                    <p className="text-muted-foreground mx-auto mt-1 max-w-md text-sm">
                        Please select a debtor above and click Apply to generate the statement, ledger, age analysis, account
                        summary and adjustments for that account.
                    </p>
                    {/* <Button variant="outline" className="mt-4" onClick={goToDebtors}>
                        Go to Debtor Maintenance
                    </Button> */}
                </div>
            ) : (
                <Tabs defaultValue="statement" className="w-full">
                    <TabsList className="h-auto w-full flex-wrap justify-start gap-1 rounded-lg p-1">
                        <TabsTrigger value="statement" className="gap-1.5">
                            <FileText className="h-4 w-4" /> Full Statement
                        </TabsTrigger>
                        <TabsTrigger value="transactions" className="gap-1.5">
                            <WalletCards className="h-4 w-4" /> Transactions
                        </TabsTrigger>
                        <TabsTrigger value="age-analysis" className="gap-1.5">
                            <CalendarDays className="h-4 w-4" /> Age Analysis
                        </TabsTrigger>
                        <TabsTrigger value="account-summary" className="gap-1.5">
                            <Landmark className="h-4 w-4" /> Account Summary
                        </TabsTrigger>
                        <TabsTrigger value="adjustments" className="gap-1.5">
                            <SlidersHorizontal className="h-4 w-4" /> Adjustments
                        </TabsTrigger>
                    </TabsList>

                    <TabsContent value="statement">
                        <StatementTab
                            filters={{ ...appliedFilters, companyDebtorId: activeCompanyDebtorId }}
                            debtorName={debtorName || loggedInDebtorName}
                            isCompanyDebtorUser={isCompanyDebtorUser}
                        />
                    </TabsContent>

                    <TabsContent value="transactions">
                        <TransactionsTab filters={{ ...appliedFilters, companyDebtorId: activeCompanyDebtorId }} />
                    </TabsContent>

                    <TabsContent value="age-analysis">
                        <AgeAnalysisTab filters={{ ...appliedFilters, companyDebtorId: activeCompanyDebtorId }} />
                    </TabsContent>

                    <TabsContent value="account-summary">
                        <AccountSummaryTab filters={{ ...appliedFilters, companyDebtorId: activeCompanyDebtorId }} />
                    </TabsContent>

                    <TabsContent value="adjustments">
                        <AdjustmentsTab
                            filters={{ ...appliedFilters, companyDebtorId: activeCompanyDebtorId }}
                            isCompanyDebtorUser={isCompanyDebtorUser}
                            hasCreate={hasCreate}
                            hasUpdate={hasUpdate}
                            hasDelete={hasDelete}
                        />
                    </TabsContent>
                </Tabs>
            )}

            <div className="flex items-center justify-end">
                <Button
                    variant="outline"
                    size="sm"
                    className="h-7 text-xs"
                    onClick={() => router.refresh()}
                >
                    <RefreshCw className="mr-1 h-3.5 w-3.5" />
                    Refresh
                </Button>
            </div>
        </div>
    );
};

export default Statements;