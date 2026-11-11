// import { useEffect } from 'react';

// interface BarcodeScannerProps {
//     onScan: (code: string) => void;
//     active?: boolean;
// }

// export default function BarcodeScanner({ onScan, active = false }: BarcodeScannerProps) {
//     useEffect(() => {
//         if (!active) return;

//         let barcode = '';
//         let timeoutId: NodeJS.Timeout;

//         const handleKeyDown = (e: KeyboardEvent) => {
//             console.group('Barcode Scanner Event');

//             console.log('Raw Event:', e);
//             console.log('Key:', e.key);
//             console.log('Code:', e.code);
//             console.log('KeyCode:', e.keyCode);
//             console.log('Which:', e.which);
//             console.log('Current Barcode Before:', JSON.stringify(barcode));
//             console.log('Focused Element:', document.activeElement);
//             if (timeoutId) clearTimeout(timeoutId);

//             if (e.key === 'Enter') {
//                 console.log('Enter detected');
//                 if (barcode) {
//                     const scannedValue = barcode.trim();

//                     console.log('Final Barcode:', scannedValue);
//                     console.log(
//                         'Final Barcode JSON:',
//                         JSON.stringify(scannedValue)
//                     );  
//                     console.log('Length:', scannedValue.length);
//                     onScan(barcode.trim());
//                     barcode = '';
//                 }else{
//                     console.log('Enter received but barcode empty');
//                 }   
//                 return;
//             }

//             if (/^[a-zA-Z0-9-_]$/.test(e.key)) {
//                 barcode += e.key;
//                 console.log(
//                     'Barcode Updated:',
//                     JSON.stringify(barcode)
//                 );
//                 console.log(
//                     'Barcode Length:',
//                     barcode.length
//                 );
//             }else {
//                 console.log(
//                     'Ignored Key:',
//                     JSON.stringify(e.key)
//                 );
//             }

//             timeoutId = setTimeout(() => (barcode = ''), 300);
//         };

//         window.addEventListener('keydown', handleKeyDown, { capture: true });

//         return () => {
//             window.removeEventListener('keydown', handleKeyDown, { capture: true });
//             if (timeoutId) clearTimeout(timeoutId);
//         };
//     }, [active,onScan]);

//     return null;
// }

// import { useEffect } from 'react';

// interface BarcodeScannerProps {
//     onScan: (code: string) => void;
//     active?: boolean;
// }

// export default function BarcodeScanner({
//     onScan,
//     active = false,
// }: BarcodeScannerProps) {
//     useEffect(() => {
//         if (!active) return;

//         let barcode = '';
//         let timeoutId: NodeJS.Timeout;

//         const completeScan = (source: 'enter' | 'timeout') => {
//             const scannedValue = barcode.trim();

//             if (!scannedValue) return;

//             console.log('Scan Source:', source);
//             console.log('Final Barcode:', scannedValue);
//             console.log(
//                 'Final Barcode JSON:',
//                 JSON.stringify(scannedValue)
//             );
//             console.log('Length:', scannedValue.length);

//             onScan(scannedValue);

//             barcode = '';
//         };

//         const handleKeyDown = (e: KeyboardEvent) => {
//             if (timeoutId) {
//                 clearTimeout(timeoutId);
//             }

//             console.log('Key:', e.key);

//             if (e.key === 'Enter') {
//                 completeScan('enter');
//                 return;
//             }

//             if (/^[a-zA-Z0-9-_]$/.test(e.key)) {
//                 barcode += e.key;

//                 console.log(
//                     'Barcode Updated:',
//                     JSON.stringify(barcode)
//                 );
//                 console.log(
//                     'Barcode Length:',
//                     barcode.length
//                 );
//             }

//             timeoutId = setTimeout(() => {
//                 completeScan('timeout');
//             }, 100);
//         };

//         window.addEventListener('keydown', handleKeyDown, {
//             capture: true,
//         });

//         return () => {
//             window.removeEventListener('keydown', handleKeyDown, {
//                 capture: true,
//             });

//             if (timeoutId) {
//                 clearTimeout(timeoutId);
//             }
//         };
//     }, [active, onScan]);

//     return null;
// }

import { useEffect } from 'react';

interface BarcodeScannerProps {
    onScan: (code: string) => void;
    active?: boolean;
}

export default function BarcodeScanner({
    onScan,
    active = false,
}: BarcodeScannerProps) {
    useEffect(() => {
        if (!active) return;

        let barcode = '';
        let firstKeyTime = 0;
        let lastKeyTime = 0;
        let timeoutId: NodeJS.Timeout;

        const reset = () => {
            barcode = '';
            firstKeyTime = 0;
            lastKeyTime = 0;
        };

        const completeScan = () => {
            const scannedValue = barcode.trim();

            if (!scannedValue) {
                reset();
                return;
            }

            const totalTime = lastKeyTime - firstKeyTime;

            const averageKeyTime =
                barcode.length > 1
                    ? totalTime / (barcode.length - 1)
                    : 999;

            const isScannerInput =
                barcode.length >= 2 &&
                averageKeyTime < 60;

            if (isScannerInput) {
                console.log(
                    'Barcode detected:',
                    scannedValue
                );

                onScan(scannedValue);
            }

            reset();
        };

        const handleKeyDown = (e: KeyboardEvent) => {
            const target = e.target as HTMLElement;

            const isTyping =
                target instanceof HTMLInputElement ||
                target instanceof HTMLTextAreaElement ||
                target instanceof HTMLSelectElement ||
                target.isContentEditable;

            if (isTyping) {
                return;
            }

            const now = Date.now();

            if (!firstKeyTime) {
                firstKeyTime = now;
            }

            lastKeyTime = now;

            if (timeoutId) {
                clearTimeout(timeoutId);
            }

            if (e.key === 'Enter') {
                completeScan();
                return;
            }

            // NST labels scan as NST:<stockDispositionId>, so ':' is a valid label char.
            if (/^[a-zA-Z0-9-_:]$/.test(e.key)) {
                barcode += e.key;
            }

            timeoutId = setTimeout(() => {
                completeScan();
            }, 70);
        };

        window.addEventListener(
            'keydown',
            handleKeyDown,
            true
        );

        return () => {
            window.removeEventListener(
                'keydown',
                handleKeyDown,
                true
            );

            if (timeoutId) {
                clearTimeout(timeoutId);
            }
        };
    }, [active, onScan]);

    return null;
}