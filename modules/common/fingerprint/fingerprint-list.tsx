import { useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import ConfirmDialog from '@/components/confirm-dialog';
import { PageLoader } from '@/components/custom-components/PageLoader';
import { Fingerprint as FingerprintIcon, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import {
    FingerprintCredential,
    useListFingerprints,
    useRemoveFingerprint,
} from '@/api-queries/fingerprint';

interface FingerprintListProps {
    userId: string;
}

const FingerprintList = ({ userId }: FingerprintListProps) => {
    const queryClient = useQueryClient();
    const { data, isLoading, isError, error, refetch } = useListFingerprints(userId);
    const credentials = data || [];

    const [selectedItem, setSelectedItem] = useState<FingerprintCredential | null>(null);
    const [isDeleteOpen, setIsDeleteOpen] = useState(false);

    const { mutate: removeCredential } = useRemoveFingerprint();

    const handleDelete = () => {
        if (!selectedItem) return;
        removeCredential(selectedItem.id, {
            onSuccess: async (res) => {
                if (res?.success) {
                    toast.success('Fingerprint removed successfully');
                    await queryClient.invalidateQueries({ queryKey: ['fingerprint', 'list', userId] });
                    setSelectedItem(null);
                    setIsDeleteOpen(false);
                } else {
                    toast.error(res?.error || 'Failed to remove fingerprint');
                }
            },
            onError: (error: any) => {
                toast.error(error?.message || error?.response?.data?.message || 'Failed to remove fingerprint');
            },
        });
    };

    return (
        <PageLoader isLoading={isLoading}>
            {isError ? (
                <div className="flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed p-10 text-center">
                    <FingerprintIcon className="h-10 w-10 text-red-500" />
                    <div className="text-sm font-medium">Could not load fingerprints</div>
                    <div className="text-xs text-muted-foreground">
                        {(error as Error)?.message || 'Try again. Fingerprint features require the desktop app.'}
                    </div>
                    <Button variant="outline" size="sm" onClick={() => refetch()} className="mt-2">
                        Retry
                    </Button>
                </div>
            ) : credentials.length === 0 ? (
                <div className="flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed p-10 text-center">
                    <FingerprintIcon className="h-10 w-10 text-muted-foreground" />
                    <div className="text-sm font-medium">No fingerprints enrolled</div>
                    <div className="text-xs text-muted-foreground">Enroll a fingerprint to allow scanner-based login.</div>
                </div>
            ) : (
                <div className="overflow-hidden rounded-lg border">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Scanner</TableHead>
                                <TableHead>Device ID</TableHead>
                                <TableHead>Type</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead>Enrolled At</TableHead>
                                <TableHead>Last Verified</TableHead>
                                <TableHead className="text-center">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {credentials.map((cred) => (
                                <TableRow key={cred.id}>
                                    <TableCell className="font-medium">{cred.deviceName || 'N/A'}</TableCell>
                                    <TableCell className="text-xs text-muted-foreground">{cred.deviceId || 'N/A'}</TableCell>
                                    <TableCell>{cred.biometricType || 'FINGERPRINT'}</TableCell>
                                    <TableCell>
                                        <Badge variant={cred.status === 'ACTIVE' ? 'default' : 'secondary'} className="text-xs">
                                            {cred.status || 'ACTIVE'}
                                        </Badge>
                                    </TableCell>
                                    <TableCell>
                                        {cred.enrolledAt ? new Date(cred.enrolledAt).toLocaleString() : 'N/A'}
                                    </TableCell>
                                    <TableCell>
                                        {cred.lastVerifiedAt ? new Date(cred.lastVerifiedAt).toLocaleString() : 'Never'}
                                    </TableCell>
                                    <TableCell className="text-center">
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            className="h-8 w-8 p-0 text-red-600 hover:bg-red-50 hover:text-red-700"
                                            onClick={() => {
                                                setSelectedItem(cred);
                                                setIsDeleteOpen(true);
                                            }}
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>
            )}

            {isDeleteOpen && (
                <ConfirmDialog
                    open={isDeleteOpen}
                    setOpen={setIsDeleteOpen}
                    title="Are you sure you want to remove this fingerprint?"
                    description={`This will remove the fingerprint enrolled on "${selectedItem?.deviceName || 'this scanner'}".`}
                    confirmBtnTitle="Remove"
                    onConfirm={handleDelete}
                />
            )}
        </PageLoader>
    );
};

export default FingerprintList;