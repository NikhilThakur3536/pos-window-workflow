'use client';

import * as React from 'react';
import { Search } from 'lucide-react';
import * as Select from '@radix-ui/react-select';
import { ChevronDown, Check } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { UnderlineTabs } from './underline-tabs';
import { cn } from '@/lib/utils';
import type { ObjectProperty, PropertyValue } from './report-designer.types';

interface ObjectInspectorPanelProps {
    objectLabel: string;
    objectTypeLabel: string;
    properties: ObjectProperty[];
    onPropertyChange: (propertyId: string, value: PropertyValue) => void;
}

const INSPECTOR_TABS = [
    { value: 'properties', label: 'Properties' },
    { value: 'events', label: 'Events' },
    { value: 'favorites', label: 'Favorites' },
];

export function ObjectInspectorPanel({
    objectLabel,
    objectTypeLabel,
    properties,
    onPropertyChange,
}: ObjectInspectorPanelProps) {
    const [tab, setTab] = React.useState('properties');
    const [filter, setFilter] = React.useState('');

    const filtered = properties.filter((prop) =>
        prop.label.toLowerCase().includes(filter.toLowerCase()),
    );

    return (
        <div className="flex h-full flex-col border-t border-neutral-300">
            <div className="border-b border-neutral-300 bg-neutral-100 px-2 py-1 text-xs font-semibold text-neutral-700">
                Object Inspector
            </div>

            <div className="border-b border-neutral-300 bg-white px-2 py-1 text-xs">
                <span className="font-medium text-neutral-800">{objectLabel}</span>
                <span className="text-neutral-500">: {objectTypeLabel}</span>
            </div>

            <UnderlineTabs value={tab} onValueChange={setTab} tabs={INSPECTOR_TABS} size="sm" />

            {tab === 'properties' ? (
                <>
                    <div className="flex items-center gap-1 border-b border-neutral-300 px-2 py-1">
                        <Search className="h-3 w-3 text-neutral-400" />
                        <input
                            value={filter}
                            onChange={(event) => setFilter(event.target.value)}
                            placeholder="Filter properties"
                            className="w-full bg-transparent text-xs text-neutral-700 outline-none placeholder:text-neutral-400"
                        />
                    </div>
                    <ScrollArea className="flex-1">
                        <table className="w-full border-collapse text-xs">
                            <tbody>
                                {filtered.map((prop) => (
                                    <PropertyRow
                                        key={prop.id}
                                        property={prop}
                                        onChange={(value) => onPropertyChange(prop.id, value)}
                                    />
                                ))}
                            </tbody>
                        </table>
                    </ScrollArea>
                </>
            ) : (
                <div className="flex flex-1 items-center justify-center text-xs text-neutral-400">
                    No {tab} to show
                </div>
            )}
        </div>
    );
}

function PropertyRow({
    property,
    onChange,
}: {
    property: ObjectProperty;
    onChange: (value: PropertyValue) => void;
}) {
    return (
        <tr className="border-b border-neutral-100 odd:bg-white even:bg-neutral-50 hover:bg-blue-50">
            <td className="w-1/2 border-r border-neutral-200 px-2 py-1 align-middle text-neutral-600">
                {property.label}
            </td>
            <td className="px-2 py-0.5 align-middle">
                <PropertyEditor property={property} onChange={onChange} />
            </td>
        </tr>
    );
}

function PropertyEditor({
    property,
    onChange,
}: {
    property: ObjectProperty;
    onChange: (value: PropertyValue) => void;
}) {
    if (property.editor === 'boolean') {
        return (
            <button
                type="button"
                onClick={() => onChange(!property.value)}
                className={cn(
                    'w-full rounded-sm px-1 py-0.5 text-left font-medium',
                    property.value ? 'text-blue-700' : 'text-neutral-500',
                )}
            >
                {property.value ? 'True' : 'False'}
            </button>
        );
    }

    if (property.editor === 'enum' && property.options) {
        return (
            <Select.Root
                value={String(property.value)}
                onValueChange={(value) => onChange(value)}
            >
                <Select.Trigger className="flex w-full items-center justify-between rounded-sm px-1 py-0.5 text-neutral-800 hover:bg-neutral-100">
                    <Select.Value />
                    <Select.Icon>
                        <ChevronDown className="h-3 w-3 text-neutral-400" />
                    </Select.Icon>
                </Select.Trigger>
                <Select.Portal>
                    <Select.Content className="z-50 rounded-sm border border-neutral-300 bg-white shadow-lg">
                        <Select.Viewport className="p-1">
                            {property.options.map((option) => (
                                <Select.Item
                                    key={option}
                                    value={option}
                                    className="flex cursor-pointer items-center justify-between rounded-sm px-2 py-1 text-xs outline-none data-[highlighted]:bg-blue-100"
                                >
                                    <Select.ItemText>{option}</Select.ItemText>
                                    <Select.ItemIndicator>
                                        <Check className="h-3 w-3" />
                                    </Select.ItemIndicator>
                                </Select.Item>
                            ))}
                        </Select.Viewport>
                    </Select.Content>
                </Select.Portal>
            </Select.Root>
        );
    }

    return (
        <input
            defaultValue={String(property.value)}
            onBlur={(event) => onChange(event.target.value)}
            className="w-full rounded-sm bg-transparent px-1 py-0.5 text-neutral-800 outline-none focus:bg-white focus:ring-1 focus:ring-blue-400"
        />
    );
}
