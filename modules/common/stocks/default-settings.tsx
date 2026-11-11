'use client';

import { useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';

import {
  useGetCompanyDefaultSettingsOnesList,
  useUpdateCompanyDefaultSettingsOnes,
  CompanyDefaultSettingsOnes,
} from '@/api-queries/company-settings';

export default function DefaultSettingsOnesPage() {
  const queryClient = useQueryClient();

  const { data, isLoading } =
    useGetCompanyDefaultSettingsOnesList(true, {
      page: 1,
      limit: 100,
      search: '',
      sortBy: 'createdAt',
      sortOrder: 'DESC',
    });

  const { updateCompanyDefaultSettingsOnesMutation } =
    useUpdateCompanyDefaultSettingsOnes();

  const [items, setItems] = useState<CompanyDefaultSettingsOnes[]>([]);

  /* sync API data to local state */
  useEffect(() => {
    if (data?.data?.rows) {
      setItems(data.data.rows);
    }
  }, [data]);

  /* toggle handler */
  const handleToggle = async (item: CompanyDefaultSettingsOnes) => {
    const updated = items.map((i) =>
      i.id === item.id ? { ...i, value: !i.value } : i
    );

    setItems(updated);

    await updateCompanyDefaultSettingsOnesMutation({
      id: item.id,
      value: Boolean(!item.value),
      status: item.status,
    });

    queryClient.invalidateQueries();
  };

  if (isLoading) {
    return <div className="p-6">Loading settings...</div>;
  }

  return (
    <div className="p-6">
      {/* HEADER */}
      <div className="mb-4">
        <h1 className="text-xl font-semibold">
          Default Settings
        </h1>
        <p className="text-sm text-gray-500">
          Toggle system configurations
        </p>
      </div>

      {/* SETTINGS GRID */}
      <div className="border rounded-lg bg-white p-4">
        <div className="grid grid-cols-3 gap-3">
          {items.map((item) => (
            <label
              key={item.id}
              className="flex items-center gap-2 p-2 hover:bg-gray-50 rounded cursor-pointer"
            >
              <input
                type="checkbox"
                checked={item.value}
                onChange={() => handleToggle(item)}
                className="w-4 h-4"
              />

              <span className="text-sm">
                {item.settingOne?.name || item.id}
              </span>
            </label>
          ))}
        </div>
      </div>
    </div>
  );
}