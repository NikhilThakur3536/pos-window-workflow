import { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Loader2, Save, X, Trash2, Plus } from 'lucide-react';
import { useCompanyStockPricingTypeList } from '@/api-queries/company/stock-pricing-type';
import { LabelType, useCreateLabelTemplate } from '@/api-queries/barcode';
import { useUpdateLabelTemplate } from '@/api-queries/barcode'; // Added for edit

type LabelTemplateFormData = {
    name: string;
    labelType: LabelType;
    pricingTypeId: string;
    paperWidth: number;
    paperHeight: number;
    active: boolean;
};

type Element = Record<string, any>;

const DEFAULT_FORM_DATA: LabelTemplateFormData = {
    name: '',
    labelType: 'PRICE',
    pricingTypeId: '',
    paperWidth: 80,
    paperHeight: 40,
    active: true,
};

const DEFAULT_ELEMENT: Element = {
    type: '',
    x: "",
    y: "",
    width: "",
    height: "",
};

const ELEMENT_SCHEMA: Record<string, string[]> = {
    description: ['x', 'y', 'width', 'height', 'fontSize', 'uppercase', 'lineHeight'],
    packSize: ['prefix', 'x', 'y', 'width', 'fontSize'],
    packDescription: ['prefix', 'x', 'y', 'width', 'fontSize'],
    date: ['x', 'y', 'width', 'fontSize'],
    barcodeText: ['prefix', 'x', 'y', 'width', 'fontSize'],
    barcode: ['x', 'y', 'width', 'height'],
    unitPrice: ['prefix', 'suffix', 'x', 'y', 'width', 'fontSize', 'suffixFontSize', 'bold'],
    price: ['prefix', 'suffix', 'x', 'y', 'width', 'height', 'fontSize', 'suffixFontSize', 'suffixGap'],
};
const FIELD_PLACEHOLDERS: Record<string, string> = {
    x: 'Enter X Position',
    y: 'Enter Y Position',
    width: 'Enter Width',
    height: 'Enter Height',
    fontSize: 'Enter Font Size',
    suffixFontSize: 'Enter Suffix Font Size',
    lineHeight: 'Enter Line Height',
    suffixGap: 'Enter Suffix Gap',
    prefix: 'Enter Prefix Text',
    suffix: 'Enter Suffix Text',
    uppercase: 'Uppercase (true/false)',
    bold: 'Bold (true/false)',
};

const LabelTemplateForm = ({ editingTemplate, onClose, open }: any) => {
    const isEdit = !!editingTemplate;

    const [formData, setFormData] = useState<LabelTemplateFormData>(DEFAULT_FORM_DATA);
    const [elements, setElements] = useState<Element[]>([]);
    const [newElement, setNewElement] = useState<Element>(DEFAULT_ELEMENT);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const createMutation = useCreateLabelTemplate();
    const updateMutation = useUpdateLabelTemplate(); 
    const { data: pricingList } = useCompanyStockPricingTypeList({});

    const elementFields = useMemo(() => {
        if (!newElement.type) return [];
        return ELEMENT_SCHEMA[newElement.type] || ['x', 'y', 'width'];
    }, [newElement.type]);

    useEffect(() => {
        if (!open) return;

        if (editingTemplate) {
            setFormData({
                name: editingTemplate.name || '',
                labelType: editingTemplate.labelType || 'PRICE',
                pricingTypeId: editingTemplate.pricingTypeId || '',
                paperWidth: editingTemplate.paperWidth || 80,
                paperHeight: editingTemplate.paperHeight || 40,
                active: editingTemplate.active ?? true,
            });

            setElements(editingTemplate.templateJson?.elements || []);
        } else {
            setFormData(DEFAULT_FORM_DATA);
            setElements([]);
        }
    }, [open, editingTemplate]);

    if (!open) return null;

    const handleFormChange = (field: keyof LabelTemplateFormData, value: any) => {
        setFormData((prev) => ({ ...prev, [field]: value }));
    };

    const handleElementChange = (field: string, value: any) => {
        setNewElement((prev) => ({ ...prev, [field]: value }));
    };

    const addElement = () => {
        if (!newElement.type) return;
        setElements((prev) => [...prev, newElement]);
        setNewElement(DEFAULT_ELEMENT);
    };

    const removeElement = (index: number) => {
        setElements((prev) => prev.filter((_, i) => i !== index));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);

        try {
            const payload = {
                ...formData,
                templateJson: {
                    elements,
                },
            };

            if (isEdit) {
                await updateMutation.mutateAsync({
                    id: editingTemplate.id,
                    ...payload,
                });
            } else {
                await createMutation.mutateAsync(payload);
            }

            onClose(true); 
        } catch (err) {
            console.error(err);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <Card className="w-full max-w-5xl max-h-[95vh] overflow-auto flex flex-col">
                <CardHeader className="flex flex-row items-center justify-between border-b">
                    <CardTitle>{isEdit ? 'Edit Label Template' : 'Create Label Template'}</CardTitle>
                    <Button variant="ghost" size="icon" onClick={onClose}>
                        <X className="h-5 w-5" />
                    </Button>
                </CardHeader>

                <form onSubmit={handleSubmit}>
                    <CardContent className="space-y-6">

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-3">
                                <Label>Name</Label>
                                <Input
                                    placeholder="Enter template name"
                                    value={formData.name}
                                    onChange={(e) => handleFormChange('name', e.target.value)}
                                />
                            </div>

                            <div className="space-y-3">
                                <Label>Pricing Type</Label>
                                <Select
                                    value={formData.pricingTypeId}
                                    onValueChange={(v) => handleFormChange('pricingTypeId', v)}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {pricingList?.data?.rows?.map((p: any) => (
                                            <SelectItem key={p.id} value={p.id}>
                                                {p.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        <Separator />

                        <div className="space-y-4">
                            <h2 className="font-semibold">Elements</h2>

                            <div className="grid grid-cols-5 gap-2">
                                <Select
                                    value={newElement.type}
                                    onValueChange={(v) => handleElementChange('type', v)}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Type" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {Object.keys(ELEMENT_SCHEMA).map((t) => (
                                            <SelectItem key={t} value={t}>
                                                {t}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>

                                {elementFields.map((field) => (
                                    <Input
                                        key={field}
                                        placeholder={FIELD_PLACEHOLDERS[field] || `Enter ${field}`}
                                        type={typeof newElement[field] === 'number' ? 'number' : 'text'}
                                        value={newElement[field] ?? ''}
                                        onChange={(e) =>
                                            handleElementChange(
                                                field,
                                                typeof newElement[field] === 'number'
                                                    ? Number(e.target.value)
                                                    : e.target.value
                                            )
                                        }
                                    />
                                ))}

                                <Button type="button" onClick={addElement}>
                                    <Plus className="w-4 h-4" />
                                </Button>
                            </div>

                            <div className="space-y-2">
                                {elements.map((el, idx) => (
                                    <div
                                        key={idx}
                                        className="flex items-center justify-between border p-2 rounded"
                                    >
                                        <div className="text-sm">
                                            {el.type} — x:{el.x}, y:{el.y}, w:{el.width}
                                        </div>
                                        <Button
                                            type="button"
                                            variant="destructive"
                                            size="sm"
                                            onClick={() => removeElement(idx)}
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </Button>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <Separator />

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <Label>Width</Label>
                                <Input
                                    type="number"
                                    value={formData.paperWidth}
                                    onChange={(e) =>
                                        handleFormChange('paperWidth', Number(e.target.value))
                                    }
                                />
                            </div>

                            <div>
                                <Label>Height</Label>
                                <Input
                                    type="number"
                                    value={formData.paperHeight}
                                    onChange={(e) =>
                                        handleFormChange('paperHeight', Number(e.target.value))
                                    }
                                />
                            </div>
                        </div>

                        <div className="flex items-center justify-between">
                            <Label>Active</Label>
                            <Switch
                                checked={formData.active}
                                onCheckedChange={(v) => handleFormChange('active', v)}
                            />
                        </div>
                    </CardContent>

                    <div className="p-4 flex justify-end gap-3 border-t">
                        <Button type="button" variant="outline" onClick={onClose}>
                            Cancel
                        </Button>

                        <Button type="submit" disabled={isSubmitting}>
                            {isSubmitting ? (
                                <Loader2 className="animate-spin w-4 h-4" />
                            ) : (
                                <Save className="w-4 h-4" />
                            )}
                            {isEdit ? 'Update' : 'Create'}
                        </Button>
                    </div>
                </form>
            </Card>
        </div>
    );
};

export default LabelTemplateForm;