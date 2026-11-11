import { useForm } from 'react-hook-form';
import { Textarea } from '@/components/ui/textarea';
import AcceptHintActions from '@/components/custom-components/accept-hints-actions';

interface SlipDetailsFormData {
    slipHeaderDetails?: string;
    slipFooterDetails?: string;
    laybyeContract?: string;
}

const SlipDetails = () => {
    const { register, handleSubmit } = useForm<SlipDetailsFormData>({
        defaultValues: {
            slipHeaderDetails: '',
            slipFooterDetails: '',
            laybyeContract: '',
        },
    });

    const onSubmit = (data: SlipDetailsFormData) => {
        console.log('Slip Data submitted:', data);
    };

    const handleShowHints = () => {
        console.log('Show Hints clicked for slip details');
    };

    const handleAccept = () => {
        handleSubmit(onSubmit)();
    };

    return (
        <form onSubmit={handleSubmit(onSubmit)} className="relative p-4 !py-0">
            <AcceptHintActions
                onShowHints={handleShowHints}
                onAccept={handleAccept}
                containerClassName="flex-none !p-0 !py-2 border-t-0"
            />

            <div className="flex h-[76vh] w-full gap-4">
                <div className="flex w-1/2 flex-col gap-4">
                    <div className="flex flex-1 flex-col border border-gray-300">
                        <div className="border-b border-gray-300 bg-gray-200 px-2 py-1 text-sm font-semibold">
                            Slip Header Detail
                        </div>
                        <Textarea
                            {...register('slipHeaderDetails')}
                            className="w-full flex-1 resize-none border-none bg-white outline-none"
                        />
                    </div>

                    <div className="flex flex-1 flex-col border border-gray-300">
                        <div className="border-b border-gray-300 bg-gray-200 px-2 py-1 text-sm font-semibold">
                            Slip Footer Detail
                        </div>
                        <Textarea
                            {...register('slipFooterDetails')}
                            className="w-full flex-1 resize-none border-none bg-white outline-none"
                        />
                    </div>
                </div>

                <div className="flex w-1/2 flex-col border border-gray-300">
                    <div className="border-b border-gray-300 bg-gray-200 px-2 py-1 text-sm font-semibold">
                        Laybye Contract
                    </div>
                    <Textarea
                        {...register('laybyeContract')}
                        className="w-full flex-1 resize-none border-none bg-white outline-none"
                    />
                </div>
            </div>
        </form>
    );
};

export default SlipDetails;
