'use client';

import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';

import CompanyCountryList from './country/list';
import CompanyStateSection from './state';
import CompanyDistrictSection from './district';
import CompanyCitySection from './city';
import CompanyAreaSection from './area';
import CompanyRegionSection from './region';
import CompanySubRegionSection from './sub-region';
import CompanyLocationConfigurationSection from './config';

const LocationManagementPage = () => {
  return (
    <div className="space-y-4">
      <div className="px-4 pt-4">
        <h1 className="text-2xl font-semibold">Location Management</h1>
        <p className="text-sm text-slate-500">
          Manage your company's location hierarchy - regions, sub regions, countries, states, districts, cities and
          areas. Domain-owned records are always visible; anything you add here is private to your company.
        </p>
      </div>

      <Tabs defaultValue="country" className="w-full">
        <TabsList className="mx-4 flex-wrap">
          <TabsTrigger value="region">Region</TabsTrigger>
          <TabsTrigger value="subRegion">Sub Region</TabsTrigger>
          <TabsTrigger value="country">Country</TabsTrigger>
          <TabsTrigger value="state">State</TabsTrigger>
          <TabsTrigger value="district">District</TabsTrigger>
          <TabsTrigger value="city">City</TabsTrigger>
          <TabsTrigger value="area">Area</TabsTrigger>
          <TabsTrigger value="configuration">Configuration</TabsTrigger>
        </TabsList>

        <TabsContent value="region">
          <CompanyRegionSection />
        </TabsContent>

        <TabsContent value="subRegion">
          <CompanySubRegionSection />
        </TabsContent>

        <TabsContent value="country">
          <CompanyCountryList />
        </TabsContent>

        <TabsContent value="state">
          <CompanyStateSection />
        </TabsContent>

        <TabsContent value="district">
          <CompanyDistrictSection />
        </TabsContent>

        <TabsContent value="city">
          <CompanyCitySection />
        </TabsContent>

        <TabsContent value="area">
          <CompanyAreaSection />
        </TabsContent>

        <TabsContent value="configuration">
          <CompanyLocationConfigurationSection />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default LocationManagementPage;