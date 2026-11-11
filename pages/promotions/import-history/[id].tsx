import { NextPageWithLayout } from '@/types';
import PermissionGuard from '@/components/permission-guards/PermissionGuard';
import { SYSTEM_MODULES, SYSTEM_PERMISSIONS } from '@/lib/constant';
import ImportDetails from '@/modules/common/import-history/details';
import ImportLogs from '@/modules/common/import-history/logs';
import { useRouter } from 'next/router';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { IMPORT_HISTORY_TYPES } from '@/api-queries/import-history';

const Page: NextPageWithLayout = () => {
    const { query } = useRouter();
    const importBatchId = query['id'] as string;
    const [isLogs, setIsLogs] = useState(false);

    const btnChildHandler = (isLog: boolean) => (
        <Button variant="default" onClick={() => setIsLogs(isLog)} className="flex items-center gap-2">
            Show {isLog ? 'Logs' : 'Details'}
        </Button>
    );

    return (
        <PermissionGuard
            module={SYSTEM_MODULES?.STOCK.MAINTENANCE.code}
            permission={[SYSTEM_PERMISSIONS?.CREATE, SYSTEM_PERMISSIONS?.READ]}
        >
            {isLogs ? (
                <ImportLogs
                    importBatchId={importBatchId}
                    importType={IMPORT_HISTORY_TYPES?.PROMOTIONAL_PRICE_WHOLESALE}
                >
                    {btnChildHandler(false)}
                </ImportLogs>
            ) : (
                <ImportDetails
                    importBatchId={importBatchId}
                    importType={IMPORT_HISTORY_TYPES?.PROMOTIONAL_PRICE_WHOLESALE}
                >
                    {btnChildHandler(true)}
                </ImportDetails>
            )}
        </PermissionGuard>
    );
};

Page.layoutType = 'dashboard';

export default Page;
