'use client';

import AcceptHintActions from '@/components/custom-components/accept-hints-actions';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Form } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { cn } from '@/lib/utils';
import { Edit, Plus, Save, Trash2 } from 'lucide-react';
import { ReactNode, useState } from 'react';
import { useForm } from 'react-hook-form';

interface Supplier {
    account: string;
    name: string;
    stockCode: string;
    grvDate: string;
    grvCost: number;
}

export default function StockItemSupplier({ stockId, backButton }: { stockId: string; backButton?: ReactNode }) {
    //   const [stockId] = useQueryState('stockId', { defaultValue: '' });
    //   const stockDetails = useCompanyStockDetailById(stockId);
    return <StockItemSupplierWrapper stockId={stockId} backButton={backButton} />;
}

function StockItemSupplierWrapper({ stockId, backButton }: { stockId: string; backButton?: ReactNode }) {
    const [suppliers] = useState<Supplier[]>([
        {
            account: '822',
            name: 'creditor2',
            stockCode: '',
            grvDate: 'Not Recent',
            grvCost: 0,
        },
        {
            account: 'CREDITOR1',
            name: 'CREDITOR1',
            stockCode: '',
            grvDate: 'Not Recent',
            grvCost: 0,
        },
    ]);

    const form = useForm({
        defaultValues: {
            suppliers: [
                {
                    account: '822',
                    name: 'creditor2',
                    stockCode: '',
                    grvDate: 'Not Recent',
                    grvCost: 0,
                },
                {
                    account: 'CREDITOR1',
                    name: 'CREDITOR1',
                    stockCode: '',
                    grvDate: 'Not Recent',
                    grvCost: 0,
                },
            ],
        },
    });

    const { handleSubmit } = form;

    const onSubmit = (data: any) => {
        console.log('Form submitted:', data);
        // Handle form submission here
        // fn.mutate(data, {
        //     onSuccess: (data) => {
        //         console.log('Data:', data);
        //     },
        // });
    };

    const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(suppliers[0]);

    const handleShowHints = () => {
        console.log('Show Hints clicked for default settings');
    };

    const handleAccept = () => {
        handleSubmit(onSubmit)();
    };

    return (
        <Form {...form}>
            <AcceptHintActions
                onShowHints={handleShowHints}
                onAccept={handleAccept}
                containerClassName="flex-none !p-0 border-t-0 absolute right-0 top-0"
                SaveButtonIcon={Save}
                saveButtonTitle="Save"
            >
                {backButton ? backButton : null}
            </AcceptHintActions>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <Card>
                    <CardHeader className="bg-gray-100 py-2">
                        <CardTitle className="text-sm font-medium text-gray-700">Stock Items Suppliers</CardTitle>
                    </CardHeader>
                    <CardContent className="min-h-20 p-0">
                        {/* Suppliers Table */}
                        <div className="border-b">
                            <Table>
                                <TableHeader>
                                    <TableRow className="bg-gray-50">
                                        <TableHead className="text-xs font-medium">Supplier Account</TableHead>
                                        <TableHead className="text-xs font-medium">Supplier Name</TableHead>
                                        <TableHead className="text-xs font-medium">Supplier Stock Code</TableHead>
                                        <TableHead className="text-xs font-medium">GRV Date</TableHead>
                                        <TableHead className="text-right text-xs font-medium">GRV Cost</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {suppliers.map((supplier, index) => (
                                        <TableRow
                                            key={index}
                                            className={cn(
                                                `cursor-pointer hover:bg-blue-50`,
                                                selectedSupplier?.account === supplier.account ? 'bg-blue-100' : '',
                                            )}
                                            onClick={() => setSelectedSupplier(supplier)}
                                        >
                                            <TableCell className="text-xs">{supplier.account}</TableCell>
                                            <TableCell className="text-xs">{supplier.name}</TableCell>
                                            <TableCell className="text-xs">{supplier.stockCode}</TableCell>
                                            <TableCell className="text-xs">{supplier.grvDate}</TableCell>
                                            <TableCell className="text-right text-xs">{supplier.grvCost}</TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>

                        {/* Note */}
                        <div className="bg-blue-50 px-4 py-2 text-center">
                            <span className="text-xs text-blue-600">Main Supplier is marked in blue</span>
                        </div>

                        {/* Supplier Details Form */}
                        <div className="bg-gray-50 p-4">
                            <div className="grid grid-cols-3 gap-6">
                                {/* Left Column */}
                                <div className="space-y-4">
                                    <div className="grid grid-cols-2 items-center gap-2">
                                        <Label className="text-right text-xs font-medium">Account</Label>
                                        <span className="text-xs">{selectedSupplier?.account || '822'}</span>
                                    </div>

                                    <div className="grid grid-cols-2 items-center gap-2">
                                        <Label className="text-right text-xs font-medium">Account Name</Label>
                                        <span className="text-xs">{selectedSupplier?.name || 'creditor2'}</span>
                                    </div>

                                    <div className="grid grid-cols-2 items-center gap-2">
                                        <Label className="text-right text-xs font-medium">Address Details</Label>
                                        <Input className="h-8 text-xs" />
                                    </div>

                                    <div className="grid grid-cols-2 items-center gap-2">
                                        <Label className="text-right text-xs font-medium">
                                            Delivery Address Details
                                        </Label>
                                        <div className="space-y-1">
                                            <Input className="h-8 text-xs" />
                                            <Input className="h-8 text-xs" />
                                        </div>
                                    </div>
                                </div>

                                {/* Middle Column */}
                                <div className="space-y-4">
                                    <div className="grid grid-cols-2 items-center gap-2">
                                        <Label className="text-right text-xs font-medium">Telephone 1</Label>
                                        <Input className="h-8 text-xs" />
                                    </div>

                                    <div className="grid grid-cols-2 items-center gap-2">
                                        <Label className="text-right text-xs font-medium">Telephone 2</Label>
                                        <Input className="h-8 text-xs" />
                                    </div>

                                    <div className="grid grid-cols-2 items-center gap-2">
                                        <Label className="text-right text-xs font-medium">Cellphone</Label>
                                        <Input className="h-8 text-xs" />
                                    </div>

                                    <div className="grid grid-cols-2 items-center gap-2">
                                        <Label className="text-right text-xs font-medium">Email</Label>
                                        <Input className="h-8 text-xs" />
                                    </div>

                                    <div className="grid grid-cols-2 items-center gap-2">
                                        <Label className="text-right text-xs font-medium">B2B Account</Label>
                                        <Input className="h-8 text-xs" />
                                    </div>

                                    <div className="grid grid-cols-2 items-center gap-2">
                                        <Label className="text-right text-xs font-medium">B2B Website</Label>
                                        <Input className="h-8 text-xs" />
                                    </div>

                                    <div className="grid grid-cols-2 items-center gap-2">
                                        <Label className="text-right text-xs font-medium">Leadtime</Label>
                                        <span className="text-xs text-gray-500">Not Specified</span>
                                    </div>

                                    <div className="grid grid-cols-2 items-center gap-2">
                                        <Label className="text-right text-xs font-medium">Delivery Cycle</Label>
                                        <span className="text-xs text-gray-500">Not Specified</span>
                                    </div>
                                </div>

                                {/* Right Column */}
                                <div className="space-y-4">
                                    <div className="grid grid-cols-2 items-center gap-2">
                                        <Label className="text-right text-xs font-medium">Main Supplier</Label>
                                        <Select>
                                            <SelectTrigger className="h-8 text-xs">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="yes">Yes</SelectItem>
                                                <SelectItem value="no">No</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    <div className="grid grid-cols-2 items-center gap-2">
                                        <Label className="text-right text-xs font-medium">Supplier&apos;s Code</Label>
                                        <Input className="h-8 text-xs" />
                                    </div>

                                    <div className="grid grid-cols-2 items-center gap-2">
                                        <Label className="text-right text-xs font-medium">MDR Supplier ID</Label>
                                        <Input className="h-8 text-xs" />
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex justify-center gap-4 bg-gray-100 p-4">
                            <Button variant="outline" size="sm" className="flex items-center gap-2 bg-transparent">
                                <Plus className="h-4 w-4" />
                                Add
                            </Button>
                            <Button variant="outline" size="sm" className="flex items-center gap-2 bg-transparent">
                                <Edit className="h-4 w-4" />
                                Edit
                            </Button>
                            <Button variant="outline" size="sm" className="flex items-center gap-2 bg-transparent">
                                <Trash2 className="h-4 w-4" />
                                Delete
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            </form>
        </Form>
    );
}
