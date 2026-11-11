import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Archive, Check, Edit, FileText, Import, Plus, Settings, Trash2 } from 'lucide-react';
import { useState } from 'react';
import type { NextPageWithLayout } from '@/types/next-page.types';

const Invoicing: NextPageWithLayout = () => {
    const [lineItems, setLineItems] = useState([
        {
            id: 1,
            code: '',
            description: '',
            taxRate: '',
            type: '',
            unitPrice: '',
            qty: '',
            disc: '',
            gp: '',
            markup: '',
            total: '0.00',
        },
    ]);

    const addLineItem = () => {
        const newItem = {
            id: lineItems.length + 1,
            code: '',
            description: '',
            taxRate: '',
            type: '',
            unitPrice: '',
            qty: '',
            disc: '',
            gp: '',
            markup: '',
            total: '0.00',
        };
        setLineItems([...lineItems, newItem]);
    };

    const removeLineItem = (id: number) => {
        setLineItems(lineItems.filter((item) => item.id !== id));
    };

    return (
        <div className="min-h-screen bg-gray-100">
            <div className="space-y-4 p-4">
                <div className="grid grid-cols-12 gap-4">
                    <div className="col-span-2 border border-gray-300 bg-gray-50 p-3">
                        <h3 className="mb-3 bg-gray-200 px-2 py-1 text-sm font-medium text-gray-700">
                            Account Details
                        </h3>
                        <div className="space-y-3">
                            <div>
                                <Label htmlFor="accountNo" className="text-xs text-gray-600">
                                    Account No
                                </Label>
                                <div className="flex gap-1">
                                    <Select>
                                        <SelectTrigger className="">
                                            <SelectValue placeholder="Select" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="001">001</SelectItem>
                                            <SelectItem value="002">002</SelectItem>
                                        </SelectContent>
                                    </Select>
                                    <Button size="sm" variant="outline" className="h-7 w-8 bg-transparent p-0">
                                        <FileText className="h-3 w-3" />
                                    </Button>
                                </div>
                            </div>
                            <div>
                                <Label className="text-xs text-gray-600">Name and Address Details</Label>
                                <Select>
                                    <SelectTrigger className="">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="default">Default</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-1">
                                <Input className="" />
                                <Input className="" />
                                <Input className="" />
                            </div>
                            <div className="grid grid-cols-2 gap-1">
                                <div>
                                    <Label className="text-xs text-gray-600">Tel</Label>
                                    <Input className="" />
                                </div>
                                <div>
                                    <Label className="text-xs text-gray-600">Email</Label>
                                    <Input className="" />
                                </div>
                            </div>
                            <div>
                                <Label className="text-xs text-gray-600">Tax</Label>
                                <Input className="" />
                            </div>
                            <div className="text-center">
                                <Label className="text-xs text-gray-600">Invoice Disc %</Label>
                                <div className="text-sm font-medium">0.00</div>
                            </div>
                        </div>
                    </div>

                    <div className="col-span-3 border border-gray-300 bg-gray-50 p-3">
                        <h3 className="mb-3 bg-gray-200 px-2 py-1 text-sm font-medium text-gray-700">
                            Invoice Details
                        </h3>
                        <div className="space-y-3">
                            <div>
                                <Label htmlFor="invoiceDate" className="text-xs text-gray-600">
                                    Invoice Date
                                </Label>
                                <Select>
                                    <SelectTrigger className="">
                                        <SelectValue placeholder="24/07/2025" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="24/07/2025">24/07/2025</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div>
                                <Label className="text-xs text-gray-600">Delivery Method</Label>
                                <Input className="" />
                            </div>
                            <div>
                                <Label className="text-xs text-gray-600">Order Number</Label>
                                <Input className="" />
                            </div>
                            <div>
                                <Label className="text-xs text-gray-600">Rep Number</Label>
                                <Select>
                                    <SelectTrigger className="">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="rep1">Rep 1</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div>
                                <Label className="text-xs text-gray-600">Invoice Memo</Label>
                                <Input className="" />
                            </div>
                            <div>
                                <Label className="text-xs text-gray-600">Delivery Note No</Label>
                                <Input className="" />
                            </div>
                        </div>
                    </div>

                    <div className="col-span-2 border border-gray-300 bg-gray-50 p-3">
                        <h3 className="mb-3 bg-gray-200 px-2 py-1 text-sm font-medium text-gray-700">
                            Additional Details
                        </h3>
                        <div className="space-y-3">
                            <div>
                                <Label className="text-xs text-gray-600">Store Department</Label>
                                <Select>
                                    <SelectTrigger className="">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="dept1">Department 1</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div>
                                <Label className="text-xs text-gray-600">Source Document</Label>
                                <Input className="" value="Not Applicable" readOnly />
                            </div>
                        </div>
                    </div>
                    <div className="col-span-2"></div>
                    {/* Totals */}
                    <div className="col-span-3 border border-gray-300 bg-gray-50 p-3">
                        <h3 className="mb-3 bg-gray-200 px-2 py-1 text-sm font-medium text-gray-700">Totals</h3>
                        <div className="space-y-3">
                            <div>
                                <Label className="mb-2 block text-xs text-gray-600">Invoice Inclusive</Label>
                                <RadioGroup defaultValue="yes" className="flex gap-4">
                                    <div className="flex items-center space-x-1">
                                        <RadioGroupItem value="yes" id="yes" className="h-3 w-3" />
                                        <Label htmlFor="yes" className="text-xs">
                                            Yes
                                        </Label>
                                    </div>
                                    <div className="flex items-center space-x-1">
                                        <RadioGroupItem value="no" id="no" className="h-3 w-3" />
                                        <Label htmlFor="no" className="text-xs">
                                            No
                                        </Label>
                                    </div>
                                </RadioGroup>
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                                <Label className="text-xs text-gray-600">Warehouse</Label>
                                <Select>
                                    <SelectTrigger className="">
                                        <SelectValue placeholder="001" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="001">001</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                                <Label className="text-xs text-gray-600">Internal Order No</Label>
                                <Input className="" />
                            </div>
                            <div className="space-y-2">
                                <div className="grid grid-cols-2 gap-2 text-xs">
                                    <span className="text-gray-600">Document GP %</span>
                                    <span className="text-right">0.0</span>
                                </div>
                                <div className="grid grid-cols-2 gap-2 text-xs">
                                    <span className="text-gray-600">Goods Total</span>
                                    <span className="text-right">0.0</span>
                                </div>
                                <div className="grid grid-cols-2 gap-2 text-xs">
                                    <span className="text-gray-600">Discount Amt</span>
                                    <span className="text-right">0.0</span>
                                </div>
                                <div className="grid grid-cols-2 gap-2 text-xs">
                                    <span className="text-gray-600">Tax Amount</span>
                                    <span className="text-right">0.0</span>
                                </div>
                                <div className="grid grid-cols-2 gap-2 text-xs">
                                    <span className="text-gray-600">Total Quantity</span>
                                    <span className="text-right">0.0</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Line Items Table */}
                <div className="border border-gray-300 bg-white">
                    <div className="flex items-center justify-between border-b border-gray-300 bg-gray-100 px-3 py-2">
                        <span className="text-sm font-medium text-gray-700">Line Items</span>
                        <Button size="sm" onClick={addLineItem} className="h-6 px-2">
                            <Plus className="mr-1 h-3 w-3" />
                            Add
                        </Button>
                    </div>

                    {/* Table Header */}
                    <div className="grid grid-cols-12 gap-1 border-b border-gray-300 bg-gray-50 px-2 py-1 text-xs font-medium text-gray-700">
                        <div className="col-span-1">Code</div>
                        <div className="col-span-3">Description</div>
                        <div className="col-span-1">Tax Rate</div>
                        <div className="col-span-1">Type</div>
                        <div className="col-span-1">Unit Price</div>
                        <div className="col-span-1">Qty</div>
                        <div className="col-span-1">Disc %</div>
                        <div className="col-span-1">GP</div>
                        <div className="col-span-1">Markup</div>
                        <div className="col-span-1">Total</div>
                    </div>

                    {/* Table Rows */}
                    <div className="min-h-[200px]">
                        {lineItems.map((item) => (
                            <div
                                key={item.id}
                                className="grid grid-cols-12 gap-1 border-b border-gray-200 px-2 py-1 hover:bg-gray-50"
                            >
                                <Input className="col-span-1" value={item.code} />
                                <Input className="col-span-3" value={item.description} />
                                <Input className="col-span-1" value={item.taxRate} />
                                <Input className="col-span-1" value={item.type} />
                                <Input className="col-span-1" value={item.unitPrice} />
                                <Input className="col-span-1" value={item.qty} />
                                <Input className="col-span-1" value={item.disc} />
                                <Input className="col-span-1" value={item.gp} />
                                <Input className="col-span-1" value={item.markup} />
                                <div className="col-span-1 flex items-center justify-between">
                                    <span className="text-xs">{item.total}</span>
                                    <Button
                                        size="sm"
                                        variant="ghost"
                                        onClick={() => removeLineItem(item.id)}
                                        className="h-4 w-4 p-0 hover:bg-red-100"
                                    >
                                        <Trash2 className="h-3 w-3 text-red-500" />
                                    </Button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Bottom Summary and Actions */}
                <div className="flex items-end justify-between">
                    {/* Summary Totals */}
                    <div className="w-48 border border-gray-300 bg-gray-50 p-3">
                        <div className="space-y-1 text-xs">
                            <div className="flex justify-between">
                                <span>Subtotal:</span>
                                <span>0.00</span>
                            </div>
                            <div className="flex justify-between">
                                <span>Tax:</span>
                                <span>0.00</span>
                            </div>
                            <div className="flex justify-between">
                                <span>Discount:</span>
                                <span>0.00</span>
                            </div>
                            <div className="flex justify-between border-t pt-1 font-medium">
                                <span>Total:</span>
                                <span>0.00</span>
                            </div>
                        </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex gap-2">
                        <Button size="sm" variant="outline" className="h-8 bg-transparent">
                            <Import className="mr-1 h-4 w-4" />
                            Import
                        </Button>
                        <Button size="sm" variant="outline" className="h-8 bg-transparent">
                            <Edit className="mr-1 h-4 w-4" />
                            EZ Form Desc
                        </Button>
                        <Button size="sm" variant="outline" className="h-8 bg-transparent">
                            <FileText className="mr-1 h-4 w-4" />
                            Fill Item Details
                        </Button>
                        <Button size="sm" variant="outline" className="h-8 bg-transparent">
                            <Settings className="mr-1 h-4 w-4" />
                            Amendments
                        </Button>
                        <Button size="sm" variant="outline" className="h-8 bg-transparent">
                            <FileText className="mr-1 h-4 w-4" />
                            Document Details
                        </Button>
                        <Button size="sm" variant="outline" className="h-8 bg-transparent">
                            <Archive className="mr-1 h-4 w-4" />
                            Archive
                        </Button>
                        <Button size="sm" className="h-8 bg-green-600 hover:bg-green-700">
                            <Check className="mr-1 h-4 w-4" />
                            Finish
                        </Button>
                        <Button size="sm" variant="outline" className="h-8 bg-transparent">
                            Fill Process A-F
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
};

Invoicing.layoutType = 'dashboard';

export default Invoicing;
