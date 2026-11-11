// import { useCallback, useEffect, useRef, useState } from 'react';
// import { useQueryClient } from '@tanstack/react-query';
// import { Button } from '@/components/ui/button';
// import { Input } from '@/components/ui/input';
// import { Label } from '@/components/ui/label';
// import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
// import { Fingerprint as FingerprintIcon, Loader2, CheckCircle2 } from 'lucide-react';
// import { toast } from 'sonner';
// import { useEnrollFingerprint } from '@/api-queries/fingerprint';

// interface EnrollFingerprintDialogProps {
//     open: boolean;
//     onClose: () => void;
//     userId: string;
//     userName: string;
// }

// const DEFAULT_DEVICE_NAME = 'Mantra MFS100';
// const ENROLL_SAMPLE_COUNT = 4;

// interface ScanProgress {
//     index: number;
//     total: number;
//     stage: string;
// }

// const EnrollFingerprintDialog = ({ open, onClose, userId, userName }: EnrollFingerprintDialogProps) => {
//     const [deviceName, setDeviceName] = useState(DEFAULT_DEVICE_NAME);
//     const [scanning, setScanning] = useState(false);
//     const [progress, setProgress] = useState<ScanProgress | null>(null);
//     const [capturedCount, setCapturedCount] = useState(0);
//     const queryClient = useQueryClient();
//     const progressCleanupRef = useRef<(() => void) | null>(null);

//     const { mutate: enroll, isPending } = useEnrollFingerprint();

//     useEffect(() => {
//         if (open) {
//             setDeviceName(DEFAULT_DEVICE_NAME);
//             setScanning(false);
//             setProgress(null);
//             setCapturedCount(0);
//         }
//     }, [open]);

//     useEffect(() => {
//         return () => {
//             progressCleanupRef.current?.();
//         };
//     }, []);

//     const handleEnroll = useCallback(() => {
//         setScanning(true);
//         setCapturedCount(0);
//         setProgress(null);

//         const api = (window as any).electronAPI;
//         const onProgress = (p: ScanProgress) => {
//             setProgress(p);
//             if (p.stage === 'captured') {
//                 setCapturedCount(p.index);
//             }
//         };

//         if (api?.onFingerprintEnrollProgress) {
//             api.onFingerprintEnrollProgress(onProgress);
//             progressCleanupRef.current = () => {
//                 api.removeFingerprintEnrollProgressListeners?.();
//             };
//         }

//         enroll(
//             { userId, userName, deviceName: deviceName.trim() || DEFAULT_DEVICE_NAME, sampleCount: ENROLL_SAMPLE_COUNT },
//             {
//                 onSuccess: async (res) => {
//                     progressCleanupRef.current?.();
//                     progressCleanupRef.current = null;
//                     if (res?.success) {
//                         toast.success('Fingerprint enrolled successfully');
//                         setScanning(false);
//                         setProgress(null);
//                         await queryClient.invalidateQueries({ queryKey: ['fingerprint', 'list'] });
//                         onClose();
//                     } else {
//                         toast.error(res?.error || 'Fingerprint enrollment failed');
//                         setScanning(false);
//                         setProgress(null);
//                     }
//                 },
//                 onError: (error: any) => {
//                     progressCleanupRef.current?.();
//                     progressCleanupRef.current = null;
//                     toast.error(error?.message || error?.response?.data?.message || 'Fingerprint enrollment failed');
//                     setScanning(false);
//                     setProgress(null);
//                 },
//             },
//         );
//     }, [userId, userName, deviceName, enroll, queryClient, onClose]);

//     const isActive = scanning || isPending;
//     const totalSamples = progress?.total || ENROLL_SAMPLE_COUNT;
//     const currentSample = progress?.index || 0;
//     const isDuplicate = progress?.stage === 'duplicate';

//     return (
//         <Dialog open={open} onOpenChange={onClose}>
//             <DialogContent className="sm:max-w-md">
//                 <DialogHeader>
//                     <DialogTitle>Enroll Fingerprint</DialogTitle>
//                     <DialogDescription>
//                         You will be asked to scan your finger{' '}
//                         <span className="font-medium text-foreground">{totalSamples} times</span> for{' '}
//                         <span className="font-medium text-foreground">{userName}</span>. Only a secure hash of the
//                         template is stored - the fingerprint image is never saved.
//                     </DialogDescription>
//                 </DialogHeader>

//                 <div className="space-y-4 py-2">
//                     <div className="space-y-2">
//                         <Label htmlFor="device-name">Scanner device name</Label>
//                         <Input
//                             id="device-name"
//                             value={deviceName}
//                             onChange={(e) => setDeviceName(e.target.value)}
//                             placeholder={DEFAULT_DEVICE_NAME}
//                         />
//                     </div>

//                     {isActive && (
//                         <div className="flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed p-6 text-center">
//                             {progress?.stage === 'captured' && currentSample === totalSamples ? (
//                                 <CheckCircle2 className="h-10 w-10 text-green-500" />
//                             ) : (
//                                 <FingerprintIcon className="h-10 w-10 animate-pulse text-primary" />
//                             )}
//                             {progress ? (
//                                 <>
//                                     <div className="text-sm font-medium">
//                                         {isDuplicate
//                                             ? `Same finger read again - please lift and reposition`
//                                             : `Scan ${currentSample} of ${totalSamples}`}
//                                     </div>
//                                     {!isDuplicate && (
//                                         <div className="flex gap-1.5">
//                                             {Array.from({ length: totalSamples }, (_, i) => (
//                                                 <div
//                                                     key={i}
//                                                     className={`h-2 w-8 rounded-full transition-colors ${
//                                                         i < currentSample ? 'bg-green-500' : 'bg-muted'
//                                                     }`}
//                                                 />
//                                             ))}
//                                         </div>
//                                     )}
//                                     <div className="text-xs text-muted-foreground">
//                                         {isDuplicate
//                                             ? 'Lift your finger completely and place it again'
//                                             : 'Keep the finger still until the scan completes.'}
//                                     </div>
//                                 </>
//                             ) : (
//                                 <>
//                                     <div className="text-sm font-medium">Place your finger on the scanner...</div>
//                                     <div className="text-xs text-muted-foreground">
//                                         Scan 0 of {totalSamples} - Waiting for first touch.
//                                     </div>
//                                 </>
//                             )}
//                         </div>
//                     )}
//                 </div>

//                 <DialogFooter>
//                     <Button variant="outline" onClick={onClose} disabled={isActive}>
//                         Cancel
//                     </Button>
//                     <Button onClick={handleEnroll} disabled={isActive}>
//                         {isActive && <Loader2 className="h-4 w-4 animate-spin" />}
//                         {isActive ? (progress ? `Scanning... (${currentSample}/${totalSamples})` : 'Starting...') : 'Start Scan'}
//                     </Button>
//                 </DialogFooter>
//             </DialogContent>
//         </Dialog>
//     );
// };

// export default EnrollFingerprintDialog;
import { useCallback, useEffect, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Fingerprint as FingerprintIcon, Loader2, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';
import { useEnrollFingerprint } from '@/api-queries/fingerprint';

interface EnrollFingerprintDialogProps {
    open: boolean;
    onClose: () => void;
    userId: string;
    userName: string;
}

const DEFAULT_DEVICE_NAME = 'Mantra MFS100';
const ENROLL_SAMPLE_COUNT = 4;

interface ScanProgress {
    index: number;
    total: number;
    stage: string;
}

const EnrollFingerprintDialog = ({ open, onClose, userId, userName }: EnrollFingerprintDialogProps) => {
    const [deviceName, setDeviceName] = useState(DEFAULT_DEVICE_NAME);
    const [scanning, setScanning] = useState(false);
    const [progress, setProgress] = useState<ScanProgress | null>(null);
    const queryClient = useQueryClient();
    const progressCleanupRef = useRef<(() => void) | null>(null);

    const { mutate: enroll, isPending } = useEnrollFingerprint();

    useEffect(() => {
        if (open) {
            setDeviceName(DEFAULT_DEVICE_NAME);
            setScanning(false);
            setProgress(null);
        }
    }, [open]);

    useEffect(() => {
        return () => {
            progressCleanupRef.current?.();
        };
    }, []);

    const handleEnroll = useCallback(() => {
        setScanning(true);
        setProgress(null);

        const api = (window as any).electronAPI;
        const onProgress = (p: ScanProgress) => {
            setProgress(p);
        };

        if (api?.onFingerprintEnrollProgress) {
            api.onFingerprintEnrollProgress(onProgress);
            progressCleanupRef.current = () => {
                api.removeFingerprintEnrollProgressListeners?.();
            };
        }

        enroll(
            { userId, userName, deviceName: deviceName.trim() || DEFAULT_DEVICE_NAME, sampleCount: ENROLL_SAMPLE_COUNT },
            {
                onSuccess: async (res) => {
                    progressCleanupRef.current?.();
                    progressCleanupRef.current = null;
                    if (res?.success) {
                        toast.success('Fingerprint enrolled successfully');
                        setScanning(false);
                        setProgress(null);
                        await queryClient.invalidateQueries({ queryKey: ['fingerprint', 'list'] });
                        onClose();
                    } else {
                        toast.error(res?.error || 'Fingerprint enrollment failed');
                        setScanning(false);
                        setProgress(null);
                    }
                },
                onError: (error: any) => {
                    progressCleanupRef.current?.();
                    progressCleanupRef.current = null;
                    toast.error(error?.message || error?.response?.data?.message || 'Fingerprint enrollment failed');
                    setScanning(false);
                    setProgress(null);
                },
            },
        );
    }, [userId, userName, deviceName, enroll, queryClient, onClose]);

    const isActive = scanning || isPending;
    const totalSamples = progress?.total || ENROLL_SAMPLE_COUNT;
    const currentSample = progress?.index || 0;
    const isDuplicate = progress?.stage === 'duplicate';

    return (
        <Dialog open={open} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Enroll Fingerprint</DialogTitle>
                    <DialogDescription>
                        You will be asked to scan your finger{' '}
                        <span className="font-medium text-foreground">{totalSamples} times</span> for{' '}
                        <span className="font-medium text-foreground">{userName}</span>. Only a secure hash of the
                        template is stored - the fingerprint image is never saved.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-2">
                    <div className="space-y-2">
                        <Label htmlFor="device-name">Scanner device name</Label>
                        <Input
                            id="device-name"
                            value={deviceName}
                            onChange={(e) => setDeviceName(e.target.value)}
                            placeholder={DEFAULT_DEVICE_NAME}
                        />
                    </div>

                    {isActive && (
                        <div className="flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed p-6 text-center">
                            {progress?.stage === 'captured' && currentSample === totalSamples ? (
                                <CheckCircle2 className="h-10 w-10 text-green-500" />
                            ) : (
                                <FingerprintIcon className="h-10 w-10 animate-pulse text-primary" />
                            )}
                            {progress ? (
                                <>
                                    <div className="text-sm font-medium">
                                        {isDuplicate
                                            ? `Same finger read again - please lift and reposition`
                                            : `Scan ${currentSample} of ${totalSamples}`}
                                    </div>
                                    {!isDuplicate && (
                                        <div className="flex gap-1.5">
                                            {Array.from({ length: totalSamples }, (_, i) => (
                                                <div
                                                    key={i}
                                                    className={`h-2 w-8 rounded-full transition-colors ${
                                                        i < currentSample ? 'bg-green-500' : 'bg-muted'
                                                    }`}
                                                />
                                            ))}
                                        </div>
                                    )}
                                    <div className="text-xs text-muted-foreground">
                                        {isDuplicate
                                            ? 'Lift your finger completely and place it again'
                                            : 'Keep the finger still until the scan completes.'}
                                    </div>
                                </>
                            ) : (
                                <>
                                    <div className="text-sm font-medium">Place your finger on the scanner...</div>
                                    <div className="text-xs text-muted-foreground">
                                        Scan 0 of {totalSamples} - Waiting for first touch.
                                    </div>
                                </>
                            )}
                        </div>
                    )}
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={onClose} disabled={isActive}>
                        Cancel
                    </Button>
                    <Button onClick={handleEnroll} disabled={isActive}>
                        {isActive && <Loader2 className="h-4 w-4 animate-spin" />}
                        {isActive ? (progress ? `Scanning... (${currentSample}/${totalSamples})` : 'Starting...') : 'Start Scan'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};

export default EnrollFingerprintDialog;