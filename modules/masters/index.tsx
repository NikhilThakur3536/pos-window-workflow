import React, { useState } from 'react';
import Link from 'next/link';
import { CreditCard, Building, Store, Settings, TicketPercent, Grid, Tags, Warehouse,Building2,Type,Languages,Receipt,MapPin,Users,FileText, Layers, UserRound, Coins, Wallet, Ruler } from 'lucide-react';
import { Input } from '@/components/ui/input';

const MastersList = () => {
    const allItems = [
        { name: 'Tills', href: '/utilities/set-up/masters/tills', icon: CreditCard },
        { name: 'Payment Methods', href: '/utilities/set-up/masters/payment-methods', icon: Wallet },
        { name: 'Stock Variants', href: '/utilities/set-up/masters/stock-variants', icon: Tags },
        { name: 'Pricing Types', href: '/utilities/set-up/masters/pricing-types', icon: TicketPercent },
        { name: 'Categories & Sub Categories', href: '/utilities/set-up/masters/categories', icon: Grid },
        { name: 'Stock Ranges', href: '/utilities/set-up/masters/stock-ranges', icon: Layers },
        { name: 'Price Variant Groups', href: '/utilities/set-up/masters/price-variant-groups/sell-price', icon: Tags },
        { name: 'Warehouse', href: '/utilities/set-up/masters/warehouse', icon: Warehouse },
        { name: 'Bank Account Types', href: '/utilities/set-up/masters/bank-account', icon: Building2 },
        { name: 'Character Set', href: '/utilities/set-up/masters/character-set', icon: Type },
        { name: 'Company Tax', href: '/utilities/set-up/masters/company-tax', icon: Receipt },
        { name: 'Language', href: '/utilities/set-up/masters/language', icon: Languages },
        { name: 'Currency', href: '/utilities/set-up/masters/currency', icon: Coins },
        { name: 'Location', href: '/utilities/set-up/masters/location', icon: MapPin },
        { name: 'Tax Agency', href: '/utilities/set-up/masters/tax-agency', icon: Building },
        { name: 'Tax Registration', href: '/utilities/set-up/masters/tax-registration', icon: FileText },
        { name: 'User Type', href: '/utilities/set-up/masters/user-type', icon: Users },
        { name: 'Sales Representative', href: '/utilities/set-up/masters/sales-rep', icon: UserRound },
        { name: 'Source Documents', href: '/utilities/set-up/masters/source-documents', icon: FileText },
        { name: 'State', href: '/utilities/set-up/masters/state', icon: MapPin },
        // { name: 'Stock Categories', href: '/utilities/set-up/masters/stock-categories', icon: Layers },
        { name: 'Store Department', href: '/utilities/set-up/masters/store-department', icon: Building2 },
        { name: 'Units of Measure', href: '/utilities/set-up/masters/uom', icon: Ruler },
    ];

    const [search, setSearch] = useState('');

    const filteredItems = allItems.filter((item) => item.name.toLowerCase().includes(search.toLowerCase()));

    const columns = 5;
    const totalWithPlaceholders = Math.max(Math.ceil(filteredItems.length / columns) * columns, columns);

    return (
        <div className="m-6">
            <div className="mb-4 flex items-center justify-between">
                <h2 className="text-lg font-semibold text-gray-800">Default Tables</h2>
                <Input
                    type="text"
                    placeholder="Search masters..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="w-64 rounded border p-2 text-sm"
                />
            </div>

            <nav className="rounded-lg border bg-white shadow-sm">
                <ul className="grid grid-cols-5">
                    {filteredItems.length === 0 ? (
                        <li className="col-span-5 p-6 text-center text-gray-500">No master found</li>
                    ) : (
                        Array.from({ length: totalWithPlaceholders }).map((_, idx) => {
                            const item = filteredItems[idx];

                            return (
                                <li key={idx} className={`flex border-r border-b last:border-r-0`}>
                                    {item ? (
                                        <Link
                                            href={item.href}
                                            className="flex flex-1 items-center gap-2 p-2 transition hover:bg-gray-50"
                                        >
                                            <item.icon className="h-5 w-5 text-gray-600" />
                                            <span className="text-sm font-medium text-gray-800">{item.name}</span>
                                        </Link>
                                    ) : (
                                        <div className="flex flex-1 p-4" />
                                    )}
                                </li>
                            );
                        })
                    )}
                </ul>
            </nav>
        </div>
    );
};

export default MastersList;
