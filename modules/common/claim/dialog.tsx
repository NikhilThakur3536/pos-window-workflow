'use client';

import { 
    Dialog, 
    DialogContent, 
    DialogHeader, 
    DialogTitle 
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { GoodsReceivingClaimDetails } from '@/api-queries/claims';
import moment from 'moment';

interface ClaimDetailDialogProps {
    claim: GoodsReceivingClaimDetails;
    open: boolean;
    onClose: () => void;
}

export default function ClaimDetailDialog({ claim, open, onClose }: ClaimDetailDialogProps) {
    const currencySymbol = '$'; 

    const totalClaimAmount = claim.items.reduce((sum, item) => {
        return sum + (item.quantity * item.unitClaimExclusive);
    }, 0);

    return (
        <Dialog open={open} onOpenChange={onClose}>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-3">
                        Goods Receiving Claim
                        <Badge variant="outline">{claim.supplierInvoiceNumber}</Badge>
                    </DialogTitle>
                </DialogHeader>

                <div className="space-y-8 py-4">
                    {/* Claim Information */}
                    <div>
                        <h3 className="text-lg font-semibold mb-4">Claim Information</h3>
                        <div className="grid grid-cols-2 gap-6 text-sm">
                            <div>
                                <p className="text-muted-foreground">Claim ID</p>
                                <p className="font-medium">{claim.id}</p>
                            </div>
                            <div>
                                <p className="text-muted-foreground">Claim Date</p>
                                <p>{moment(claim.claimDate).format('DD MMM YYYY')}</p>
                            </div>
                            <div>
                                <p className="text-muted-foreground">Supplier Invoice</p>
                                <p className="font-medium">{claim.supplierInvoiceNumber}</p>
                            </div>
                            <div>
                                <p className="text-muted-foreground">Original Invoice</p>
                                <p>{claim.originalSupplierInvoiceNumber || 'N/A'}</p>
                            </div>
                            <div>
                                <p className="text-muted-foreground">Creditor ID</p>
                                <p>{claim.companyCreditorId}</p>
                            </div>
                            <div>
                                <p className="text-muted-foreground">Source Type</p>
                                <p>{claim.sourceType}</p>
                            </div>
                            <div className="col-span-2">
                                <p className="text-muted-foreground">Claim Reason</p>
                                <p className="font-medium capitalize">{claim.claimReason}</p>
                            </div>
                        </div>
                    </div>

                    {claim.notes && (
                        <>
                            <Separator />
                            <div>
                                <h3 className="text-lg font-semibold mb-3">Notes</h3>
                                <div className="bg-muted p-4 rounded-lg text-sm">
                                    {claim.notes}
                                </div>
                            </div>
                        </>
                    )}

                    <Separator />

                    {/* Items Section */}
                    <div>
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-lg font-semibold">Claimed Items ({claim.items.length})</h3>
                            <div className="text-right">
                                <p className="text-sm text-muted-foreground">Total Claim Amount</p>
                                <p className="text-xl font-bold">
                                    {currencySymbol} {totalClaimAmount.toFixed(2)}
                                </p>
                            </div>
                        </div>

                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Item Code</TableHead>
                                    <TableHead>Description</TableHead>
                                    <TableHead className="text-right">Quantity</TableHead>
                                    <TableHead className="text-right">Unit Cost</TableHead>
                                    <TableHead className="text-right">Claim Amount (excl.)</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {claim.items.map((item, index) => {
                                    const lineTotal = item.quantity * item.unitClaimExclusive;
                                    return (
                                        <TableRow key={index}>
                                            <TableCell className="font-medium">{item.itemCode}</TableCell>
                                            <TableCell>{item.description}</TableCell>
                                            <TableCell className="text-right">{item.quantity}</TableCell>
                                            <TableCell className="text-right">
                                                {currencySymbol} {item.unitCost.toFixed(2)}
                                            </TableCell>
                                            <TableCell className="text-right font-medium">
                                                {currencySymbol} {lineTotal.toFixed(2)}
                                            </TableCell>
                                        </TableRow>
                                    );
                                })}
                            </TableBody>
                        </Table>
                    </div>

                    {/* Metadata */}
                    <div className="text-xs text-muted-foreground pt-4 border-t">
                        Created: {moment(claim.createdAt).format('DD MMM YYYY, hh:mm A')} | 
                        Last Updated: {moment(claim.updatedAt).format('DD MMM YYYY, hh:mm A')}
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}