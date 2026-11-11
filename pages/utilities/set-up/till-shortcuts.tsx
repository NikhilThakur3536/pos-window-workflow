import type { NextPageWithLayout } from '@/types/next-page.types';
import ShortcutManagement from '@/modules/common/shortcuts';

const TillShortcutsPage: NextPageWithLayout = () => {
    return <ShortcutManagement />;
};

TillShortcutsPage.layoutType = 'dashboard';

export default TillShortcutsPage;