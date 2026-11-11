'use client';

import { useState } from 'react';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table';

import { useGetCompanyRegions, useGetCompanySubRegions } from '@/api-queries/company-location';

const CompanySubRegionSection = () => {
  const [selectedRegionId, setSelectedRegionId] = useState('');

  const { data: regionsData, isLoading: isRegionsLoading } = useGetCompanyRegions();
  const regions = regionsData?.data?.rows || [];

  const { data: subRegionsData, isLoading: isSubRegionsLoading } = useGetCompanySubRegions({
    regionId: selectedRegionId,
  });
  const subRegions = subRegionsData?.data?.rows || [];

  return (
    <div className="space-y-4 p-4">
      <div className="max-w-sm">
        <Label className="mb-2 block text-sm font-medium">Region</Label>
        <Select value={selectedRegionId} onValueChange={setSelectedRegionId}>
          <SelectTrigger>
            <SelectValue placeholder={isRegionsLoading ? 'Loading regions...' : 'Select a region'} />
          </SelectTrigger>
          <SelectContent>
            {regions.map((region) => (
              <SelectItem key={region.id} value={region.id}>
                {region.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <p className="text-xs text-slate-500">
        Sub regions are managed at the domain level; the company view is read-only.
      </p>

      {!selectedRegionId ? (
        <p className="py-8 text-center text-sm text-slate-500">Select a region to view its sub regions.</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Code</TableHead>
              <TableHead>Sub Region Name</TableHead>
              <TableHead>Timezone</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isSubRegionsLoading ? (
              <TableRow>
                <TableCell colSpan={3} className="text-center text-sm text-slate-500">
                  Loading sub regions...
                </TableCell>
              </TableRow>
            ) : subRegions.length === 0 ? (
              <TableRow>
                <TableCell colSpan={3} className="text-center text-sm text-slate-500">
                  No sub regions found for this region.
                </TableCell>
              </TableRow>
            ) : (
              subRegions.map((subRegion) => (
                <TableRow key={subRegion.id}>
                  <TableCell className="font-medium">{subRegion.code}</TableCell>
                  <TableCell>{subRegion.name}</TableCell>
                  <TableCell>{subRegion.timezone}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      )}
    </div>
  );
};

export default CompanySubRegionSection;