import { Input } from '@/components/ui/input';

type CostLevelsInputProps = {
    id: string | undefined;
    costLevelsList: Array<{ id: string; name: string }>;
};

export default function CostLevelsCombobox({ id, costLevelsList }: CostLevelsInputProps) {
    const selectedType = costLevelsList.find((type) => type.id === id);

    return <Input type="text" readOnly value={selectedType?.name || ''} className="h-7 w-full text-xs" />;
}
