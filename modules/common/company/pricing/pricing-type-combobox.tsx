type PricingTypeInputProps = {
    id: string | undefined;
    pricingTypesList: Array<{ id: string; name: string }>;
};

export default function PricingTypeCombobox({ id, pricingTypesList }: PricingTypeInputProps) {
    const selectedType = pricingTypesList.find((type) => type.id === id);

    return (
        <input
            type="text"
            readOnly
            value={selectedType?.name || ''}
            className="border-input flex h-9 w-full cursor-default rounded-md border bg-transparent px-3 py-1 text-sm shadow-sm transition-colors"
        />
    );
}
