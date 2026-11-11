import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Printer, X, Download } from 'lucide-react';
import { toast } from 'sonner';
import { usePrintLabel } from '@/api-queries/barcode';

interface LabelPreviewDialogProps {
    data: any; // Adjust type based on your preview API response
    templateName?: string;
    onClose: () => void;
}

const LabelPreviewDialog = ({ data, templateName, onClose }: LabelPreviewDialogProps) => {
    const [isPrinting, setIsPrinting] = useState(false);
    const printMutation = usePrintLabel();

    // Assuming preview API returns { labels: Array<{ imageUrl?: string; html?: string; ... }> }
    const previewLabels = data?.labels || data?.data?.labels || data || [];

    const handlePrintFromPreview = async () => {
        if (!data?.templateId) {
            toast.error("Cannot print", { description: "Template ID is missing." });
            return;
        }

        setIsPrinting(true);

        try {
            await printMutation.mutateAsync({
                templateId: data.templateId,
                companyStockDetailIds: data.companyStockDetailIds || [],
                copies: 1,
            });

            toast.success("Print Queued", {
                description: "Label has been sent to printer queue.",
            });
            onClose();
        } catch (error: any) {
            toast.error("Print Failed", {
                description: error?.response?.data?.message || "Failed to print labels.",
            });
        } finally {
            setIsPrinting(false);
        }
    };

    const handleDownload = (label: any, index: number) => {
        // Placeholder for download logic (if image URL is available)
        if (label.imageUrl) {
            const link = document.createElement('a');
            link.href = label.imageUrl;
            link.download = `label-${index + 1}.png`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            toast.success("Downloading label...");
        } else {
            toast.error("Download not available", {
                description: "No image URL available for this label.",
            });
        }
    };

    return (
        <Dialog open={true} onOpenChange={onClose}>
            <DialogContent className="max-w-5xl max-h-[95vh] overflow-hidden flex flex-col p-0">
                <DialogHeader className="px-6 py-4 border-b">
                    <div className="flex items-center justify-between">
                        <DialogTitle className="flex items-center gap-2">
                            Label Preview
                            {templateName && <Badge variant="outline">{templateName}</Badge>}
                        </DialogTitle>
                        <Button variant="ghost" size="icon" onClick={onClose}>
                            <X className="h-5 w-5" />
                        </Button>
                    </div>
                </DialogHeader>

                <div className="flex-1 overflow-auto p-6 bg-muted/30">
                    {previewLabels.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full py-20 text-center">
                            <div className="text-6xl mb-4">🖼️</div>
                            <h3 className="text-xl font-semibold">No Preview Available</h3>
                            <p className="text-muted-foreground mt-2">
                                The preview could not be generated for this template.
                            </p>
                        </div>
                    ) : (
                        <div className="space-y-8">
                            {previewLabels.map((label: any, index: number) => (
                                <div key={index} className="flex flex-col items-center">
                                    <div className="mb-3 flex items-center gap-3 w-full max-w-md">
                                        <Badge variant="secondary">Label {index + 1}</Badge>
                                        {label.stockDetail && (
                                            <span className="text-sm text-muted-foreground">
                                                {label.stockDetail.name || label.stockDetail.sku}
                                            </span>
                                        )}
                                    </div>

                                    {/* Preview Container - Adjust based on your API response */}
                                    <div className="border-2 border-dashed border-gray-300 bg-white shadow-sm rounded-lg overflow-hidden">
                                        {label.imageUrl ? (
                                            <img
                                                src={label.imageUrl}
                                                alt={`Label ${index + 1}`}
                                                className="max-h-[420px] w-auto object-contain"
                                            />
                                        ) : label.html ? (
                                            <div
                                                dangerouslySetInnerHTML={{ __html: label.html }}
                                                className="p-8"
                                            />
                                        ) : (
                                            <div className="p-12 text-center bg-gray-50">
                                                <p className="text-muted-foreground">Preview not available in image format</p>
                                                <pre className="mt-4 text-xs bg-gray-100 p-4 rounded text-left overflow-auto">
                                                    {JSON.stringify(label, null, 2)}
                                                </pre>
                                            </div>
                                        )}
                                    </div>

                                    <div className="flex gap-3 mt-4">
                                        <Button
                                            variant="outline"
                                            onClick={() => handleDownload(label, index)}
                                            className="gap-2"
                                        >
                                            <Download className="h-4 w-4" />
                                            Download
                                        </Button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                <div className="border-t p-4 flex justify-between items-center bg-background">
                    <div className="text-sm text-muted-foreground">
                        Total Labels: <strong>{previewLabels.length}</strong>
                    </div>

                    <div className="flex gap-3">
                        <Button variant="outline" onClick={onClose}>
                            Close
                        </Button>
                        <Button
                            onClick={handlePrintFromPreview}
                            disabled={isPrinting || previewLabels.length === 0}
                            className="gap-2"
                        >
                            {isPrinting ? (
                                <>Processing...</>
                            ) : (
                                <>
                                    <Printer className="h-4 w-4" />
                                    Print Now
                                </>
                            )}
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
};

export default LabelPreviewDialog;