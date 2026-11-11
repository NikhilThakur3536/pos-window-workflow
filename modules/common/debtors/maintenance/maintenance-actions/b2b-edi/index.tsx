import { useForm, Controller } from 'react-hook-form';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import AcceptHintActions from '@/components/custom-components/accept-hints-actions';

interface B2BEDIFormData {
    b2bEdiType: 'Disabled' | 'Enabled';
    ediAccount?: string;
    website?: string;
    b2bPortal?: string;
    username?: string;
    password?: string;
    leadTime?: string;
    deliveryCycle?: string;
}

const B2BEDI = () => {
    const { register, handleSubmit, control } = useForm<B2BEDIFormData>({
        defaultValues: {
            b2bEdiType: 'Disabled',
            ediAccount: '',
            website: '',
            b2bPortal: '',
            username: '',
            password: '',
            leadTime: '',
            deliveryCycle: '',
        },
    });

    const onSubmit = (data: B2BEDIFormData) => {
        console.log('B2B / EDI Submitted:', data);
    };

    const handleShowHints = () => {
        console.log('Show Hints clicked for B2B / EDI');
    };

    const handleAccept = () => {
        handleSubmit(onSubmit)();
    };

    return (
        <div onSubmit={handleSubmit(onSubmit)} className="relative flex h-full overflow-hidden">
            <div className="absolute inset-0 bottom-16 overflow-auto">
                <div className="grid grid-cols-1 gap-3 p-2 lg:grid-cols-2">
                    <Card className="flex-1 gap-0 overflow-hidden py-0 pb-2">
                        <CardHeader className="mb-2 gap-0 bg-white px-4 py-1">
                            <CardTitle className="text-sm">B2B / EDI Parameters</CardTitle>
                        </CardHeader>
                        <CardContent className="grid gap-2 p-4 py-2">
                            <div className="grid grid-cols-3 items-center gap-2">
                                <Label htmlFor="b2bEdiType" className="text-sm">
                                    B2B / EDI Type
                                </Label>
                                <Controller
                                    name="b2bEdiType"
                                    control={control}
                                    render={({ field }) => (
                                        <Select onValueChange={field.onChange} value={field.value}>
                                            <SelectTrigger className="col-span-2 h-8 w-full">
                                                <SelectValue placeholder="Select type" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="Disabled">Disabled</SelectItem>
                                                <SelectItem value="Enabled">Enabled</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    )}
                                />
                            </div>
                            <div className="grid grid-cols-3 items-center gap-2">
                                <Label htmlFor="ediAccount" className="text-sm">
                                    EDI Account
                                </Label>
                                <Input id="ediAccount" {...register('ediAccount')} className="col-span-2 h-8" />
                            </div>
                            <div className="grid grid-cols-3 items-center gap-2">
                                <Label htmlFor="website" className="text-sm">
                                    Website
                                </Label>
                                <Input id="website" {...register('website')} className="col-span-2 h-8" />
                            </div>
                            <div className="grid grid-cols-3 items-center gap-2">
                                <Label htmlFor="b2bPortal" className="text-sm">
                                    B2B Portal
                                </Label>
                                <Input id="b2bPortal" {...register('b2bPortal')} className="col-span-2 h-8" />
                            </div>
                            <div className="grid grid-cols-3 items-center gap-2">
                                <Label htmlFor="username" className="text-sm">
                                    Username
                                </Label>
                                <Input id="username" {...register('username')} className="col-span-2 h-8" />
                            </div>
                            <div className="grid grid-cols-3 items-center gap-2">
                                <Label htmlFor="password" className="text-sm">
                                    Password
                                </Label>
                                <Input
                                    id="password"
                                    type="password"
                                    {...register('password')}
                                    className="col-span-2 h-8"
                                />
                            </div>
                            <div className="grid grid-cols-3 items-center gap-2">
                                <Label htmlFor="leadTime" className="text-sm">
                                    Lead Time
                                </Label>
                                <Input id="leadTime" {...register('leadTime')} className="col-span-2 h-8" />
                            </div>
                            <div className="grid grid-cols-3 items-center gap-2">
                                <Label htmlFor="deliveryCycle" className="text-sm">
                                    Delivery Cycle
                                </Label>
                                <Input id="deliveryCycle" {...register('deliveryCycle')} className="col-span-2 h-8" />
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>

            <div className="absolute right-0 bottom-0 left-0">
                <AcceptHintActions onShowHints={handleShowHints} onAccept={handleAccept} />
            </div>
        </div>
    );
};

export default B2BEDI;
