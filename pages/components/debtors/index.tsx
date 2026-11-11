import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { CheckCircle, FileText, RefreshCw, Settings } from 'lucide-react';
import { useState } from 'react';
import { NextPageWithLayout } from '@/types/next-page.types';

const DebtorReceiptPage: NextPageWithLayout = () => {
    const [receiptData, setReceiptData] = useState({
        receivedFrom: '',
        name: '',
        address: '',
        receiptDate: '28/07/2025',
        referenceNumber: '',
        narrative2nd: '',
        rep: '0',
        sumOf: '0.00',
        discount: '0.00',
        taxType: '',
        actualCreditOnAccount: '0.00',
    });

    const [balanceDetails, setBalanceDetails] = useState({
        current: '',
        days30: '',
        days60: '',
        days90: '',
        days120: '',
        days150: '',
        days180: '',
        paymentsUnallocated: '',
        total: '',
        dateLastPayment: '',
        amountLastPayment: '',
        settlementDiscountPercent: '',
        settlementDiscountAmount: '',
    });

    const [lastReceiptDetails] = useState({
        accountNumber: '848',
        lastReceiptNumber: '7',
        receiptDate: '28/07/2025',
        amount: 'R 5,000.00',
    });

    return (
        <div className="min-h-screen bg-gray-100">
            <div className="p-4">
                <div className="grid grid-cols-12 gap-4">
                    <div className="col-span-9"></div>
                    <div className="col-span-3">
                        <div className="border border-gray-400 bg-gray-200 p-3">
                            <h3 className="mb-3 bg-gray-300 px-2 py-1 text-sm font-medium text-gray-700">
                                Last Receipt Details
                            </h3>
                            <div className="space-y-2">
                                <div className="grid grid-cols-2 gap-2 text-xs">
                                    <Label className="text-gray-600">Account Number</Label>
                                    <span className="text-right">{lastReceiptDetails.accountNumber}</span>
                                </div>
                                <div className="grid grid-cols-2 gap-2 text-xs">
                                    <Label className="text-gray-600">Last Receipt Number</Label>
                                    <span className="text-right">{lastReceiptDetails.lastReceiptNumber}</span>
                                </div>
                                <div className="grid grid-cols-2 gap-2 text-xs">
                                    <Label className="text-gray-600">Receipt date</Label>
                                    <span className="text-right">{lastReceiptDetails.receiptDate}</span>
                                </div>
                                <div className="grid grid-cols-2 gap-2 text-xs">
                                    <Label className="text-gray-600">Amount</Label>
                                    <span className="text-right font-medium">{lastReceiptDetails.amount}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Main Form Section */}
                <div className="mt-6 grid grid-cols-2 gap-4">
                    {/* Receipt Section */}
                    <div className="border border-gray-400 bg-gray-200 p-4">
                        <h3 className="mb-4 bg-gray-300 px-2 py-1 text-sm font-medium text-gray-700">Receipt</h3>
                        <div className="space-y-4">
                            <div className="grid grid-cols-3 items-center gap-2">
                                <Label className="text-xs text-gray-600">Received From</Label>
                                <div className="col-span-2">
                                    <Select>
                                        <SelectTrigger className="h-7 bg-white text-xs">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="customer1">Customer 1</SelectItem>
                                            <SelectItem value="customer2">Customer 2</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>

                            <div className="grid grid-cols-3 items-center gap-2">
                                <Label className="text-xs text-gray-600">Name</Label>
                                <div className="col-span-2">
                                    <Input
                                        className="h-7 bg-white text-xs"
                                        value={receiptData.name}
                                        onChange={(e) => setReceiptData({ ...receiptData, name: e.target.value })}
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-3 items-start gap-2">
                                <Label className="mt-1 text-xs text-gray-600">Address</Label>
                                <div className="col-span-2">
                                    <Textarea
                                        className="resize-none bg-white text-xs"
                                        rows={4}
                                        value={receiptData.address}
                                        onChange={(e) => setReceiptData({ ...receiptData, address: e.target.value })}
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-3 items-center gap-2">
                                <Label className="text-xs text-gray-600">Receipt date</Label>
                                <div className="col-span-2">
                                    <Select>
                                        <SelectTrigger className="h-7 bg-white text-xs">
                                            <SelectValue placeholder={receiptData.receiptDate} />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="28/07/2025">28/07/2025</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>

                            <div className="grid grid-cols-3 items-center gap-2">
                                <Label className="text-xs text-gray-600">Reference Number</Label>
                                <div className="col-span-2">
                                    <Input
                                        className="h-7 bg-white text-xs"
                                        value={receiptData.referenceNumber}
                                        onChange={(e) =>
                                            setReceiptData({ ...receiptData, referenceNumber: e.target.value })
                                        }
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-3 items-center gap-2">
                                <Label className="text-xs text-gray-600">2nd Narrative</Label>
                                <div className="col-span-2">
                                    <Input
                                        className="h-7 bg-white text-xs"
                                        value={receiptData.narrative2nd}
                                        onChange={(e) =>
                                            setReceiptData({ ...receiptData, narrative2nd: e.target.value })
                                        }
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-3 items-center gap-2">
                                <Label className="text-xs text-gray-600">Rep</Label>
                                <div className="col-span-2">
                                    <Select>
                                        <SelectTrigger className="h-7 bg-white text-xs">
                                            <SelectValue placeholder="0" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="0">0</SelectItem>
                                            <SelectItem value="1">1</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>

                            {/* Local Currency Section */}
                            <div className="mt-4 bg-gray-300 p-3">
                                <Label className="mb-2 block text-xs text-gray-600">Local Currency</Label>
                                <div className="space-y-2">
                                    <div className="grid grid-cols-3 items-center gap-2">
                                        <Label className="text-xs text-gray-600">The Sum Of</Label>
                                        <div className="col-span-2 text-right">
                                            <span className="text-xs">{receiptData.sumOf}</span>
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-5 items-center gap-2">
                                        <Label className="text-xs text-gray-600">Discount</Label>
                                        <div className="text-right">
                                            <span className="text-xs">{receiptData.discount}</span>
                                        </div>
                                        <Label className="text-xs text-gray-600">Tax Type</Label>
                                        <div className="col-span-2">
                                            <Select>
                                                <SelectTrigger className="h-6 bg-white text-xs">
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="vat">VAT</SelectItem>
                                                    <SelectItem value="exempt">Exempt</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-3 items-center gap-2">
                                        <Label className="text-xs text-gray-600">Actual Credit On Account</Label>
                                        <div className="col-span-2 text-right">
                                            <span className="text-xs">{receiptData.actualCreditOnAccount}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Balance Details Section */}
                    <div className="border border-gray-400 bg-gray-200 p-4">
                        <h3 className="mb-4 bg-gray-300 px-2 py-1 text-sm font-medium text-gray-700">
                            Balance Details
                        </h3>
                        <div className="space-y-3">
                            {[
                                { label: 'Current', key: 'current' },
                                { label: '30 Days', key: 'days30' },
                                { label: '60 Days', key: 'days60' },
                                { label: '90 Days', key: 'days90' },
                                { label: '120 Days', key: 'days120' },
                                { label: '150 Days', key: 'days150' },
                                { label: '180 Days', key: 'days180' },
                            ].map((item) => (
                                <div key={item.key} className="grid grid-cols-3 items-center gap-2">
                                    <Label className="text-xs text-gray-600">{item.label}</Label>
                                    <div className="col-span-2">
                                        <Input
                                            className="h-7 bg-white text-xs"
                                            value={balanceDetails[item.key as keyof typeof balanceDetails]}
                                            onChange={(e) =>
                                                setBalanceDetails({
                                                    ...balanceDetails,
                                                    [item.key]: e.target.value,
                                                })
                                            }
                                        />
                                    </div>
                                </div>
                            ))}

                            <div className="grid grid-cols-3 items-center gap-2">
                                <Label className="text-xs text-gray-600">Payments Unallocated</Label>
                                <div className="col-span-2">
                                    <Input
                                        className="h-7 bg-white text-xs"
                                        value={balanceDetails.paymentsUnallocated}
                                        onChange={(e) =>
                                            setBalanceDetails({
                                                ...balanceDetails,
                                                paymentsUnallocated: e.target.value,
                                            })
                                        }
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-3 items-center gap-2">
                                <Label className="text-xs font-medium text-gray-600">Total</Label>
                                <div className="col-span-2">
                                    <Input
                                        className="h-7 bg-white text-xs font-medium"
                                        value={balanceDetails.total}
                                        onChange={(e) =>
                                            setBalanceDetails({ ...balanceDetails, total: e.target.value })
                                        }
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-3 items-center gap-2">
                                <Label className="text-xs text-gray-600">Date Last Payment</Label>
                                <div className="col-span-2">
                                    <Input
                                        className="h-7 bg-white text-xs"
                                        value={balanceDetails.dateLastPayment}
                                        onChange={(e) =>
                                            setBalanceDetails({ ...balanceDetails, dateLastPayment: e.target.value })
                                        }
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-3 items-center gap-2">
                                <Label className="text-xs text-gray-600">Amount Last Payment</Label>
                                <div className="col-span-2">
                                    <Input
                                        className="h-7 bg-white text-xs"
                                        value={balanceDetails.amountLastPayment}
                                        onChange={(e) =>
                                            setBalanceDetails({ ...balanceDetails, amountLastPayment: e.target.value })
                                        }
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-3 items-center gap-2">
                                <Label className="text-xs text-gray-600">Settlement Discount %</Label>
                                <div className="col-span-2">
                                    <Input
                                        className="h-7 bg-white text-xs"
                                        value={balanceDetails.settlementDiscountPercent}
                                        onChange={(e) =>
                                            setBalanceDetails({
                                                ...balanceDetails,
                                                settlementDiscountPercent: e.target.value,
                                            })
                                        }
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-3 items-center gap-2">
                                <Label className="text-xs text-gray-600">Settlement Discount Amount</Label>
                                <div className="col-span-2">
                                    <Input
                                        className="h-7 bg-white text-xs"
                                        value={balanceDetails.settlementDiscountAmount}
                                        onChange={(e) =>
                                            setBalanceDetails({
                                                ...balanceDetails,
                                                settlementDiscountAmount: e.target.value,
                                            })
                                        }
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Bottom Navigation */}
                <div className="mt-8 flex justify-center gap-8">
                    <Button
                        variant="outline"
                        className="flex h-16 w-32 flex-col items-center gap-2 bg-white hover:bg-gray-50"
                    >
                        <Settings className="h-6 w-6 text-gray-600" />
                        <span className="text-xs">Account Maintenance</span>
                    </Button>

                    <Button
                        variant="outline"
                        className="flex h-16 w-32 flex-col items-center gap-2 bg-white hover:bg-gray-50"
                    >
                        <RefreshCw className="h-6 w-6 text-gray-600" />
                        <span className="text-xs">Re-Allocate Payments</span>
                    </Button>

                    <Button
                        variant="outline"
                        className="flex h-16 w-32 flex-col items-center gap-2 bg-white hover:bg-gray-50"
                    >
                        <FileText className="h-6 w-6 text-gray-600" />
                        <span className="text-xs">View Details</span>
                    </Button>

                    <Button className="flex h-16 w-32 flex-col items-center gap-2 bg-green-600 hover:bg-green-700">
                        <CheckCircle className="h-6 w-6 text-white" />
                        <span className="text-xs text-white">Process</span>
                    </Button>
                </div>
            </div>
        </div>
    );
};

DebtorReceiptPage.layoutType = 'dashboard';

export default DebtorReceiptPage;
