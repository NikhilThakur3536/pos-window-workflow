import React from 'react';
import type { NextPageWithLayout } from '@/types/next-page.types';
// import UtlilityReport from '@/modules/common/Utilityreports';
import UtlilityReport from '@/modules/common/Utilityreports'

const MastersPage: NextPageWithLayout = () => {
  return (

      <UtlilityReport type="pos-report"/>
   
  )
}

MastersPage.layoutType = 'dashboard';

export default MastersPage;