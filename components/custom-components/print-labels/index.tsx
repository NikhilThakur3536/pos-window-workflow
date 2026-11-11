import { useRef } from 'react';
import { createPortal } from 'react-dom';
import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';

export interface StockPrintLabelItem {
    code: string;
    description: string;
    price: number;
    company: string;
}

interface Props {
    open: boolean;
    onClose: () => void;
    labels: StockPrintLabelItem[];
}

function LabelCell({ item }: { item: StockPrintLabelItem }) {
    return (
        <div
            style={{
                border: '1px solid #d1d5db',
                padding: '10px 12px',
                fontFamily: '"Courier New", Courier, monospace',
                fontSize: '11px',
                lineHeight: '1.7',
                backgroundColor: '#fff',
                minHeight: '80px',
                overflow: 'hidden',
            }}
        >
            <div>
                <strong>Code:</strong> {item.code}
            </div>
            <div style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                <strong>Description:</strong> {item.description}
            </div>
            <div>
                <strong>Price (Inc):</strong> ₹ {item.price.toFixed(2)}
            </div>
            <div style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                <strong>Company:</strong> {item.company}
            </div>
        </div>
    );
}

export function StockPrintLabels({ open, onClose, labels }: Props) {
    const printAreaRef = useRef<HTMLDivElement>(null);

    if (!open) return null;

    const handlePrint = () => {
        const printWindow = window.open('', '_blank', 'width=900,height=700');
        if (!printWindow) return;
        printWindow.document.write(`
            <html><head><title>Label Printing</title>
            <style>
                * { margin: 0; padding: 0; box-sizing: border-box; }
                body { background: white; padding: 16px; }
                .grid { display: grid; grid-template-columns: repeat(3, 1fr); }
                .cell { border: 1px solid #d1d5db; padding: 10px 12px; font-family: "Courier New", monospace; font-size: 11px; line-height: 1.7; break-inside: avoid; }
                @media print { @page { margin: 10mm; } }
            </style></head><body>
            <div class="grid">
                ${labels
                    .map(
                        (item) => `
                    <div class="cell">
                        <div><strong>Code:</strong> ${item.code}</div>
                        <div><strong>Description:</strong> ${item.description}</div>
                        <div><strong>Price (Inc):</strong> ₹ ${item.price.toFixed(2)}</div>
                        <div><strong>Company:</strong> ${item.company}</div>
                    </div>
                `,
                    )
                    .join('')}
            </div>
            </body></html>
        `);
        printWindow.document.close();
        printWindow.focus();
        setTimeout(() => {
            printWindow.print();
            printWindow.close();
        }, 300);
    };

    return createPortal(
        <>
            <div
                onClick={onClose}
                style={{
                    position: 'fixed',
                    inset: 0,
                    backgroundColor: 'rgba(0,0,0,0.5)',
                    zIndex: 9998,
                }}
            />

            <div
                style={{
                    position: 'fixed',
                    top: '50%',
                    left: '50%',
                    transform: 'translate(-50%, -50%)',
                    zIndex: 9999,
                    width: '80vw',
                    maxWidth: '860px',
                    maxHeight: '90vh',
                    background: '#fff',
                    borderRadius: '8px',
                    boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
                    display: 'flex',
                    flexDirection: 'column',
                    padding: '20px',
                    boxSizing: 'border-box',
                }}
            >
                <div
                    style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        marginBottom: '14px',
                    }}
                >
                    <span style={{ fontSize: '15px', fontWeight: 600 }}>Label Printing Preview</span>
                    <button
                        onClick={onClose}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '2px' }}
                    >
                        <X size={18} />
                    </button>
                </div>

                <div
                    style={{
                        flex: 1,
                        overflowY: 'auto',
                        overflowX: 'hidden',
                        background: '#e5e7eb',
                        border: '1px solid #d1d5db',
                        borderRadius: '4px',
                        padding: '12px',
                        minHeight: 0,
                    }}
                >
                    <div
                        ref={printAreaRef}
                        style={{
                            width: '100%',
                            background: '#fff',
                            display: 'grid',
                            gridTemplateColumns: 'repeat(3, 1fr)',
                            boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
                        }}
                    >
                        {labels.map((item, i) => (
                            <LabelCell key={i} item={item} />
                        ))}
                    </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', paddingTop: '16px' }}>
                    <Button variant="outline" onClick={onClose}>
                        Close
                    </Button>
                    <Button onClick={handlePrint} style={{ backgroundColor: '#2563eb', color: '#fff' }}>
                        Print
                    </Button>
                </div>
            </div>
        </>,
        document.body,
    );
}
