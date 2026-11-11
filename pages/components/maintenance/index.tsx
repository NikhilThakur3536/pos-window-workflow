import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Calculator, Edit, FileText, Filter, Grid3X3, Printer, Search, Settings, User } from 'lucide-react';
import { useState } from 'react';
import type { NextPageWithLayout } from '@/types/next-page.types';

const Maintenance: NextPageWithLayout = () => {
    const [currentPage, setCurrentPage] = useState<'quote' | 'purchase'>('quote');

    return (
        <div>
            <div className="border-b border-gray-300 bg-gray-100 p-4">
                <div className="flex gap-2">
                    <Button
                        onClick={() => setCurrentPage('quote')}
                        variant={currentPage === 'quote' ? 'default' : 'outline'}
                    >
                        Quote Maintenance
                    </Button>
                    <Button
                        onClick={() => setCurrentPage('purchase')}
                        variant={currentPage === 'purchase' ? 'default' : 'outline'}
                    >
                        Purchase Maintenance
                    </Button>
                </div>
            </div>

            {currentPage === 'quote' && <QuoteMaintenance />}
            {currentPage === 'purchase' && <PurchaseMaintenance />}
        </div>
    );
};

function PurchaseMaintenance() {
    const [sortOrder, setSortOrder] = useState('default');
    const [layoutNo, setLayoutNo] = useState('layout1');

    const purchases = [
        {
            id: 'PO1',
            documentNumber: 'PO1',
            orderNo: '0004545',
            name: 'Debtor2',
            account: 'ACC001',
            startDate: '04/07/2025',
            invoicedDate: '04/07/2025',
            changedDate: '04/07/2025',
            total: '575.00',
            totalProcessed: '0.00',
            status: 'not-invoiced',
        },
    ];

    return (
        <div className="bg-gray-100">
            <div className="flex">
                <div className="w-80 border-r border-gray-300 bg-gray-50 p-4">
                    <div className="border border-gray-300 bg-white p-3">
                        <div className="mb-3 flex items-center justify-between">
                            <h3 className="text-sm font-medium text-gray-700">Available Filters</h3>
                            <Button size="sm" variant="outline" className="h-6 bg-transparent px-2 text-xs">
                                Clear Filter
                            </Button>
                        </div>
                        <div className="space-y-2">
                            <Input placeholder="Filter purchases..." className="h-7 text-xs" />
                        </div>
                    </div>
                    <div className="mt-4 grid grid-cols-2 gap-4">
                        <div className="border border-gray-300 bg-white p-3">
                            <h3 className="mb-3 text-sm font-medium text-gray-700">Sort Order</h3>
                            <RadioGroup value={sortOrder} onValueChange={setSortOrder} className="space-y-2">
                                <div className="flex items-center space-x-2">
                                    <RadioGroupItem value="default" id="default" className="h-3 w-3" />
                                    <Label htmlFor="default" className="text-xs">
                                        Default
                                    </Label>
                                </div>
                                <div className="flex items-center space-x-2">
                                    <RadioGroupItem value="account" id="account" className="h-3 w-3" />
                                    <Label htmlFor="account" className="text-xs">
                                        Account
                                    </Label>
                                </div>
                                <div className="flex items-center space-x-2">
                                    <RadioGroupItem value="account-name" id="account-name" className="h-3 w-3" />
                                    <Label htmlFor="account-name" className="text-xs">
                                        Account Name
                                    </Label>
                                </div>
                                <div className="flex items-center space-x-2">
                                    <RadioGroupItem value="document" id="document" className="h-3 w-3" />
                                    <Label htmlFor="document" className="text-xs">
                                        Document
                                    </Label>
                                </div>
                                <div className="flex items-center space-x-2">
                                    <RadioGroupItem value="order-number" id="order-number" className="h-3 w-3" />
                                    <Label htmlFor="order-number" className="text-xs">
                                        Order Number
                                    </Label>
                                </div>
                                <div className="flex items-center space-x-2">
                                    <RadioGroupItem value="invoiced-date" id="invoiced-date" className="h-3 w-3" />
                                    <Label htmlFor="invoiced-date" className="text-xs">
                                        Invoiced Date
                                    </Label>
                                </div>
                                <div className="flex items-center space-x-2">
                                    <RadioGroupItem value="changed-date" id="changed-date" className="h-3 w-3" />
                                    <Label htmlFor="changed-date" className="text-xs">
                                        Changed Date
                                    </Label>
                                </div>
                                <div className="flex items-center space-x-2">
                                    <RadioGroupItem value="int-order-num" id="int-order-num" className="h-3 w-3" />
                                    <Label htmlFor="int-order-num" className="text-xs">
                                        Int. Order Num
                                    </Label>
                                </div>
                                <div className="flex items-center space-x-2">
                                    <RadioGroupItem value="document-type" id="document-type" className="h-3 w-3" />
                                    <Label htmlFor="document-type" className="text-xs">
                                        Document Type
                                    </Label>
                                </div>
                            </RadioGroup>
                        </div>
                        <div className="border border-gray-300 bg-white p-3">
                            <h3 className="mb-3 text-sm font-medium text-gray-700">Select Layout</h3>
                            <RadioGroup value={layoutNo} onValueChange={setLayoutNo} className="space-y-2">
                                {[1, 2, 3, 4, 5, 6].map((num) => (
                                    <div key={num} className="flex items-center space-x-2">
                                        <RadioGroupItem
                                            value={`layout${num}`}
                                            id={`sales-layout${num}`}
                                            className="h-3 w-3"
                                        />
                                        <Label htmlFor={`sales-layout${num}`} className="text-xs">
                                            Sales Orders - Layout {num}
                                        </Label>
                                    </div>
                                ))}
                            </RadioGroup>
                        </div>
                    </div>
                    <div className="mt-4 border border-gray-300 bg-white p-3">
                        <h3 className="mb-3 text-sm font-medium text-gray-700">Legend</h3>
                        <div className="space-y-2">
                            <div className="flex items-center gap-2">
                                <div className="h-3 w-3 rounded bg-blue-500"></div>
                                <span className="text-xs">Not Invoiced</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <div className="h-3 w-3 rounded bg-yellow-500"></div>
                                <span className="text-xs">Partially Invoiced</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <div className="h-3 w-3 rounded bg-green-500"></div>
                                <span className="text-xs">Fully Invoiced</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <div className="h-3 w-3 rounded bg-red-500"></div>
                                <span className="text-xs">Locked by User</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right Panel - Data Grid */}
                <div className="flex-1 p-4">
                    {/* Grid Header */}
                    <div className="mb-4 border border-gray-300 bg-white">
                        <div className="border-b border-gray-300 bg-gray-100 px-3 py-2">
                            <span className="text-sm font-medium text-gray-700">Data - Multiselect [OFF]</span>
                        </div>

                        {/* Column Headers */}
                        <div className="grid grid-cols-9 gap-1 bg-pink-500 px-3 py-2 text-sm font-medium text-white">
                            <div>Document Number</div>
                            <div>Order No</div>
                            <div>Name</div>
                            <div>Account</div>
                            <div>Start Date</div>
                            <div>Invoiced Date</div>
                            <div>Changed Date</div>
                            <div>Total</div>
                            <div>Total Processed</div>
                        </div>

                        {/* Data Rows */}
                        <div className="min-h-[400px] bg-white">
                            {purchases.map((purchase) => (
                                <div
                                    key={purchase.id}
                                    className="grid grid-cols-9 gap-1 border-b border-gray-200 px-3 py-2 text-sm hover:bg-gray-50"
                                >
                                    <div className="flex items-center gap-2">
                                        <div className="h-3 w-3 rounded bg-blue-500"></div>
                                        {purchase.documentNumber}
                                    </div>
                                    <div>{purchase.orderNo}</div>
                                    <div>{purchase.name}</div>
                                    <div>{purchase.account}</div>
                                    <div>{purchase.startDate}</div>
                                    <div>{purchase.invoicedDate}</div>
                                    <div>{purchase.changedDate}</div>
                                    <div className="text-right">{purchase.total}</div>
                                    <div className="text-right">{purchase.totalProcessed}</div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Bottom Toolbar */}
                    <div className="border border-gray-300 bg-gray-100 p-2">
                        <div className="flex flex-wrap items-center gap-2">
                            <Button size="sm" variant="outline" className="h-8 bg-white">
                                <Grid3X3 className="mr-1 h-4 w-4" />
                                Select Visible Fields
                            </Button>
                            <Button size="sm" variant="outline" className="h-8 bg-white">
                                <FileText className="mr-1 h-4 w-4" />
                                Export
                            </Button>
                            <Button size="sm" variant="outline" className="h-8 bg-white">
                                <Filter className="mr-1 h-4 w-4" />
                                Filter
                            </Button>
                            <Button size="sm" variant="outline" className="h-8 bg-white">
                                <Search className="mr-1 h-4 w-4" />
                                Search
                            </Button>
                            <Button size="sm" variant="outline" className="h-8 bg-white">
                                <User className="mr-1 h-4 w-4" />
                                User Data
                            </Button>
                            <Button size="sm" variant="outline" className="h-8 bg-white">
                                <Calculator className="mr-1 h-4 w-4" />
                                Processing
                            </Button>
                            <Button size="sm" variant="outline" className="h-8 bg-white">
                                <FileText className="mr-1 h-4 w-4" />
                                Report Options
                            </Button>
                            <Button size="sm" variant="outline" className="h-8 bg-white">
                                <Edit className="mr-1 h-4 w-4" />
                                Remarks
                            </Button>
                            <Button size="sm" variant="outline" className="h-8 bg-white">
                                <Settings className="mr-1 h-4 w-4" />
                                Auto Generate
                            </Button>
                            <Button size="sm" variant="outline" className="h-8 bg-white">
                                <Grid3X3 className="mr-1 h-4 w-4" />
                                Multiselect
                            </Button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

function QuoteMaintenance() {
    const [sortOrder, setSortOrder] = useState('default');
    const [layoutNo, setLayoutNo] = useState('layout1');
    const quotes = [
        {
            id: 'Q001',
            quoteNo: 'Q001',
            account: 'ACC001',
            company: 'ABC Company Ltd',
            quoteDate: '15/07/2025',
            invoiceDate: '20/07/2025',
            orderNumber: 'ORD001',
            total: '1,250.00',
        },
        {
            id: 'Q002',
            quoteNo: 'Q002',
            account: 'ACC002',
            company: 'XYZ Corporation',
            quoteDate: '16/07/2025',
            invoiceDate: '',
            orderNumber: 'ORD002',
            total: '875.50',
        },
    ];

    return (
        <div className="bg-gray-100">
            <div className="flex">
                <div className="w-80 border-r border-gray-300 bg-gray-50 p-4">
                    <div className="border border-gray-300 bg-white p-3">
                        <div className="mb-3 flex items-center justify-between">
                            <h3 className="text-sm font-medium text-gray-700">Available Filters</h3>
                            <Button size="sm" variant="outline" className="h-6 bg-transparent px-2 text-xs">
                                Clear Filter
                            </Button>
                        </div>
                        <div className="space-y-2">
                            <Input placeholder="Filter quotes..." className="h-7 text-xs" />
                        </div>
                    </div>
                    <div className="mt-4 grid grid-cols-2 gap-4">
                        <div className="border border-gray-300 bg-white p-3">
                            <h3 className="mb-3 text-sm font-medium text-gray-700">Sort Order</h3>
                            <RadioGroup value={sortOrder} onValueChange={setSortOrder} className="space-y-2">
                                <div className="flex items-center space-x-2">
                                    <RadioGroupItem value="default" id="default" className="h-3 w-3" />
                                    <Label htmlFor="default" className="text-xs">
                                        Default
                                    </Label>
                                </div>
                                <div className="flex items-center space-x-2">
                                    <RadioGroupItem value="account" id="account" className="h-3 w-3" />
                                    <Label htmlFor="account" className="text-xs">
                                        Account
                                    </Label>
                                </div>
                                <div className="flex items-center space-x-2">
                                    <RadioGroupItem value="quote-no" id="quote-no" className="h-3 w-3" />
                                    <Label htmlFor="quote-no" className="text-xs">
                                        Quote No
                                    </Label>
                                </div>
                                <div className="flex items-center space-x-2">
                                    <RadioGroupItem value="date" id="date" className="h-3 w-3" />
                                    <Label htmlFor="date" className="text-xs">
                                        Date
                                    </Label>
                                </div>
                                <div className="flex items-center space-x-2">
                                    <RadioGroupItem value="name" id="name" className="h-3 w-3" />
                                    <Label htmlFor="name" className="text-xs">
                                        Name
                                    </Label>
                                </div>
                                <div className="flex items-center space-x-2">
                                    <RadioGroupItem value="order-number" id="order-number" className="h-3 w-3" />
                                    <Label htmlFor="order-number" className="text-xs">
                                        Order Number
                                    </Label>
                                </div>
                            </RadioGroup>
                        </div>
                        <div className="border border-gray-300 bg-white p-3">
                            <h3 className="mb-3 text-sm font-medium text-gray-700">Use Layout No</h3>
                            <RadioGroup value={layoutNo} onValueChange={setLayoutNo} className="space-y-2">
                                {[1, 2, 3, 4, 5, 6].map((num) => (
                                    <div key={num} className="flex items-center space-x-2">
                                        <RadioGroupItem
                                            value={`layout${num}`}
                                            id={`layout${num}`}
                                            className="h-3 w-3"
                                        />
                                        <Label htmlFor={`layout${num}`} className="text-xs">
                                            Quotes - Layout {num}
                                        </Label>
                                    </div>
                                ))}
                            </RadioGroup>
                        </div>
                    </div>
                </div>
                <div className="flex-1 p-4">
                    <div className="mb-4 border border-gray-300 bg-white">
                        <div className="border-b border-gray-300 bg-gray-100 px-3 py-2">
                            <span className="text-sm font-medium text-gray-700">Quotes - Multiselect [OFF]</span>
                        </div>
                        <div className="grid grid-cols-7 gap-1 bg-pink-500 px-3 py-2 text-sm font-medium text-white">
                            <div>Quote No</div>
                            <div>Account</div>
                            <div>Company</div>
                            <div>Quote Date</div>
                            <div>Invoice Date</div>
                            <div>Order Number</div>
                            <div>Total</div>
                        </div>
                        <div className="min-h-[400px] bg-white">
                            {quotes.map((quote) => (
                                <div
                                    key={quote.id}
                                    className="grid grid-cols-7 gap-1 border-b border-gray-200 px-3 py-2 text-sm hover:bg-gray-50"
                                >
                                    <div>{quote.quoteNo}</div>
                                    <div>{quote.account}</div>
                                    <div>{quote.company}</div>
                                    <div>{quote.quoteDate}</div>
                                    <div>{quote.invoiceDate}</div>
                                    <div>{quote.orderNumber}</div>
                                    <div className="text-right">{quote.total}</div>
                                </div>
                            ))}
                        </div>
                    </div>
                    <div className="border border-gray-300 bg-gray-100 p-2">
                        <div className="flex flex-wrap items-center gap-2">
                            <Button size="sm" variant="outline" className="h-8 bg-white">
                                <Grid3X3 className="mr-1 h-4 w-4" />
                                Select Visible Fields
                            </Button>
                            <Button size="sm" variant="outline" className="h-8 bg-white">
                                <User className="mr-1 h-4 w-4" />
                                User Fields
                            </Button>
                            <Button size="sm" variant="outline" className="h-8 bg-white">
                                <Filter className="mr-1 h-4 w-4" />
                                Filter
                            </Button>
                            <Button size="sm" variant="outline" className="h-8 bg-white">
                                <Search className="mr-1 h-4 w-4" />
                                Search
                            </Button>
                            <Button size="sm" variant="outline" className="h-8 bg-white">
                                <FileText className="mr-1 h-4 w-4" />
                                Reports
                            </Button>
                            <Button size="sm" variant="outline" className="h-8 bg-white">
                                <Calculator className="mr-1 h-4 w-4" />
                                Precalculations
                            </Button>
                            <Button size="sm" variant="outline" className="h-8 bg-white">
                                <FileText className="mr-1 h-4 w-4" />
                                Report Options
                            </Button>
                            <Button size="sm" variant="outline" className="h-8 bg-white">
                                <Printer className="mr-1 h-4 w-4" />
                                Print
                            </Button>
                            <Button size="sm" variant="outline" className="h-8 bg-white">
                                <Edit className="mr-1 h-4 w-4" />
                                Remarks
                            </Button>
                            <Button size="sm" variant="outline" className="h-8 bg-white">
                                <Settings className="mr-1 h-4 w-4" />
                                Auto Generate
                            </Button>
                            <Button size="sm" variant="outline" className="h-8 bg-white">
                                <Grid3X3 className="mr-1 h-4 w-4" />
                                Multiselect
                            </Button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

Maintenance.layoutType = 'dashboard';

export default Maintenance;
