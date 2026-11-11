'use client';

import { useGetCompanyLocationConfigurations } from '@/api-queries/company-location';

const CONFIG_FIELDS: { key: 'showRegion' | 'showSubRegion' | 'showCountry' | 'showState' | 'showDistrict' | 'showCity' | 'showArea'; label: string }[] = [
  { key: 'showRegion', label: 'Region' },
  { key: 'showSubRegion', label: 'Sub Region' },
  { key: 'showCountry', label: 'Country' },
  { key: 'showState', label: 'State' },
  { key: 'showDistrict', label: 'District' },
  { key: 'showCity', label: 'City' },
  { key: 'showArea', label: 'Area' },
];

const CompanyLocationConfigurationSection = () => {
  const { data, isLoading } = useGetCompanyLocationConfigurations();
  const configuration = data?.data?.rows?.[0];

  return (
    <div className="space-y-4 p-4">
      <p className="text-xs text-slate-500">
        This is the domain's location configuration, showing which levels of the hierarchy are enabled for your
        company. It is managed at the domain level, so this view is read-only.
      </p>

      {isLoading ? (
        <p className="py-8 text-center text-sm text-slate-500">Loading configuration...</p>
      ) : !configuration ? (
        <p className="py-8 text-center text-sm text-slate-500">No location configuration found.</p>
      ) : (
        <div className="grid max-w-md gap-4 rounded-lg border border-slate-200 p-6">
          {CONFIG_FIELDS.map(({ key, label }) => (
            <div key={key} className="flex items-center justify-between">
              <span className="text-sm font-medium text-slate-700">{label}</span>
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700">
                {configuration[key]}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default CompanyLocationConfigurationSection;