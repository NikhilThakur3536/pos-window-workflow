interface PlaceholderModuleProps {
    title: string;
    description?: string;
}

const PlaceholderModule = ({ title, description }: PlaceholderModuleProps) => (
    <div className="flex min-h-[60vh] items-center justify-center p-8">
        <div className="rounded-lg border border-dashed p-10 text-center">
            <h1 className="text-xl font-semibold">{title}</h1>
            <p className="mt-2 text-sm text-muted-foreground">
                {description ?? 'This module is not implemented yet.'}
            </p>
        </div>
    </div>
);

export default PlaceholderModule;