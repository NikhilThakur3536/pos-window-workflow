import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import AcceptHintActions from '@/components/custom-components/accept-hints-actions';
import { PlusIcon, PencilIcon, Trash2Icon } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { ListOnlyTable } from '@/components/list-only-table';

interface Department {
    id: string;
    name: string;
    description: string;
}

const StoreDepartments = () => {
    const [departments, setDepartments] = useState<Department[]>([
        {
            id: '1',
            name: 'Sales Department',
            description: 'Handles all sales inquiries and customer orders.',
        },
        {
            id: '2',
            name: 'Warehouse Operations',
            description: 'Manages inventory, shipping, and receiving.',
        },
        {
            id: '3',
            name: 'Customer Support',
            description: 'Provides assistance and resolves issues for customers.',
        },
    ]);
    const [showForm, setShowForm] = useState(false);
    const [editingDepartmentId, setEditingDepartmentId] = useState<string | null>(null);

    const { register, handleSubmit, reset } = useForm<Department>({
        defaultValues: {
            id: '',
            name: '',
            description: '',
        },
    });

    useEffect(() => {
        if (!showForm) {
            reset();
            setEditingDepartmentId(null);
        }
    }, [showForm, reset]);

    const columns = [
        { key: 'name', label: 'Name', className: 'text-sm' },
        { key: 'description', label: 'Description', className: 'text-sm' },
        {
            key: 'edit',
            label: 'Edit',
            className: 'text-center text-sm',
            render: (row: any) => (
                <Button type="button" variant="ghost" size="icon" className="w-full" onClick={() => openEditForm(row)}>
                    <PencilIcon className="h-4 w-4 text-gray-500" />
                </Button>
            ),
        },
        {
            key: 'delete',
            label: 'Delete',
            className: 'text-center text-sm',
            render: (row: any) => (
                <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="w-full"
                    onClick={() => handleDeleteDepartment(row.id)}
                >
                    <Trash2Icon className="h-4 w-4 text-red-500" />
                </Button>
            ),
        },
    ];

    const handleAddOrUpdateDepartment = (data: Department) => {
        if (editingDepartmentId) {
            setDepartments((prev) => prev.map((d) => (d.id === editingDepartmentId ? { ...data, id: d.id } : d)));
        } else {
            setDepartments((prev) => [...prev, { ...data, id: String(prev.length + 1) }]);
        }
        setShowForm(false);
    };

    const handleDeleteDepartment = (id: string) => {
        setDepartments((prev) => prev.filter((d) => d.id !== id));
        if (editingDepartmentId === id) {
            setShowForm(false);
            setEditingDepartmentId(null);
            reset();
        }
    };

    const openAddForm = () => {
        reset({ id: '', name: '', description: '' });
        setEditingDepartmentId(null);
        setShowForm(true);
    };

    const openEditForm = (department: Department) => {
        reset(department);
        setEditingDepartmentId(department.id);
        setShowForm(true);
    };

    const handleCancelForm = () => {
        setShowForm(false);
    };

    const handleShowHints = () => {
        console.log('Show Hints clicked for Store Departments');
    };

    const handleAccept = () => {
        console.log('Store Departments Accepted:', departments);
    };

    return (
        <div className="relative flex h-full overflow-hidden">
            <div className="absolute inset-0 bottom-16 overflow-auto p-2">
                {!showForm ? (
                    <>
                        <div className="mb-4 flex justify-end gap-2">
                            <Button type="button" onClick={openAddForm} className="h-8 text-sm">
                                <PlusIcon className="mr-2 h-4 w-4" /> Add
                            </Button>
                        </div>

                        <ListOnlyTable columns={columns} data={departments} />
                    </>
                ) : (
                    <div className="flex h-full items-center justify-center">
                        <Card className="min-w-[480px] gap-0 overflow-hidden py-0 pb-2">
                            <CardHeader className="sticky top-0 left-0 z-10 mb-2 flex items-center justify-between gap-0 bg-white px-4 py-2 shadow">
                                <CardTitle className="text-sm">
                                    {editingDepartmentId ? 'Edit Store' : 'Add New Store'}
                                </CardTitle>

                                <div className="flex gap-2">
                                    <Button type="button" variant="outline" onClick={handleCancelForm}>
                                        Cancel
                                    </Button>
                                    <Button type="submit">Save</Button>
                                </div>
                            </CardHeader>
                            <CardContent className="grid gap-2 p-4 py-2">
                                <form onSubmit={handleSubmit(handleAddOrUpdateDepartment)} className="grid gap-2">
                                    <div className="grid grid-cols-3 items-center gap-2">
                                        <Label htmlFor="name" className="text-sm">
                                            Name
                                        </Label>
                                        <Input id="name" {...register('name')} className="col-span-2 h-8" />
                                    </div>
                                    <div className="grid grid-cols-3 items-center gap-2">
                                        <Label htmlFor="description" className="text-sm">
                                            Description
                                        </Label>
                                        <Input
                                            id="description"
                                            {...register('description')}
                                            className="col-span-2 h-8"
                                        />
                                    </div>
                                </form>
                            </CardContent>
                        </Card>
                    </div>
                )}
            </div>

            <div className="absolute right-0 bottom-0 left-0">
                <AcceptHintActions onShowHints={handleShowHints} onAccept={handleAccept} />
            </div>
        </div>
    );
};

export default StoreDepartments;
