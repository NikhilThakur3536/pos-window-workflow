
import { FileSpreadsheet } from 'lucide-react';

export default function FileUploadLoader({
    percentage,
}: {
    percentage: number | null;
}) {
    return (
        <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-background/90 backdrop-blur-sm">
            <div className="relative">
                <div className="absolute inset-0 animate-ping rounded-full bg-primary/20" />

                <div className="relative flex h-24 w-24 items-center justify-center rounded-full border bg-background shadow-lg">
                    <FileSpreadsheet className="h-12 w-12 animate-bounce text-primary" />
                </div>
            </div>

            <h3 className="mt-6 text-lg font-semibold">
                Importing File...
            </h3>

            <p className="text-muted-foreground text-sm">
                Please wait while records are being processed
            </p>

            <div className="mt-4 h-2 w-72 overflow-hidden rounded-full bg-muted">
                <div
                    className="h-full transition-all duration-300"
                    style={{
                        width: `${percentage ?? 0}%`,
                        backgroundColor: 'currentColor',
                    }}
                />
            </div>

            <span className="mt-2 text-sm font-medium">
                {percentage ?? 0}%
            </span>
        </div>
    );
}