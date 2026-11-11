import { NextPageWithLayout } from '@/types';
import ReportDesignerPage from '@/modules/common/report-designer/ReportDesignerPage';
import { useRouter } from 'next/router';

const ReportDesignerRoute: NextPageWithLayout = () => {
    const router = useRouter();
    const reportId = Array.isArray(router.query['report-id'])
        ? router.query['report-id'][0]
        : router.query['report-id'] || '';

    return reportId ? <ReportDesignerPage reportId={reportId} /> : null;
};

ReportDesignerRoute.layoutType = 'dashboard';

export default ReportDesignerRoute;
