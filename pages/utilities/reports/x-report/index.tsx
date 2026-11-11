
import UtlilityReport from '@/modules/common/Utilityreports'
import React from 'react'
import type { NextPageWithLayout } from '@/types/next-page.types';

const MastersPage: NextPageWithLayout = () => {
  return (

      <UtlilityReport type="x-report"/>

  )
}

MastersPage.layoutType = 'dashboard';

export default MastersPage;