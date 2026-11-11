import { NextPageWithLayout } from '@/types';
import { ReportDesignerHome } from '@/modules/common/report-designer/ReportDesignerHome';

const ReportDesignerIndex: NextPageWithLayout = () => <ReportDesignerHome />;

ReportDesignerIndex.layoutType = 'dashboard';

export default ReportDesignerIndex;
