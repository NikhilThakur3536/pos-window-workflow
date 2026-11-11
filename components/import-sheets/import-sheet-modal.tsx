import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Download, Upload, X } from 'lucide-react';
import { axiosFormDataInstance } from '@/api-queries';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import moment from 'moment-timezone';
import { HumanVerification } from '../human-verification';
import FileUploadLoader from '@/modules/common/hoc/file-loader';

type ImportSheetModalProps = {
    open: boolean;
    onClose: () => void;
    route: string;
    module: string;
    type?: string;
    customRoute?: string;
    fileFieldName?: string;
};

const ImportSheetModal = ({
    open,
    onClose,
    route,
    module,
    type = 'company',
    customRoute,
    fileFieldName,
}: ImportSheetModalProps) => {
    const [showVerification, setShowVerification] = useState(false);
    const [mathQuestion, setMathQuestion] = useState({ a: 0, b: 0 });
    const [mathAnswer, setMathAnswer] = useState('');

    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [percentage, setPercentage] = useState<number | null>(null);
    const [isUploading, setIsUploading] = useState<boolean>(false);
    const [response, setResponse] = useState<any>(null);
    const [isReloadRequired, setIsReloadRequired] = useState(false);

    const handleFileChange = (e: any) => {
        setSelectedFile(e.target.files[0]);
    };

    const uploadFile = async () => {
        const formData: any = new FormData();
        formData.append(fileFieldName || route, selectedFile);
        formData.append('timezone', moment.tz.guess());
        formData.append('isDirect', true);

        setIsUploading(true);

        const resData = await axiosFormDataInstance
            .post(`/${type}${customRoute || `/import/${route}`}`, formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
                onUploadProgress: (progressEvent: any) => {
                    const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
                    setPercentage(percentCompleted);
                },
            })
            .then((response) => {
                setIsUploading(false);
                return response;
            })
            .catch((error) => {
                toast.error(error?.response?.data?.error);
                setIsUploading(false);
            })
            .finally(() => setIsReloadRequired(true));

        const body = resData?.data;
        setResponse(body || null);
        if (body) {
            if (body.success) {
                toast.success(body.message || body.data?.message || 'Import completed successfully');
            } else {
                toast.error(body.error || body.message || 'Import failed. Check Import History for details.');
            }
        }
    };

    const onSubmit = async () => {
        if (!selectedFile) {
            toast.warning('Please select a file to upload');
            return;
        }

        if (!showVerification) {
            const a = Math.floor(Math.random() * 100);
            const b = Math.floor(Math.random() * 100);
            setMathQuestion({ a, b });
            setShowVerification(true);
            return;
        }

        if (Number(mathAnswer) !== mathQuestion.a + mathQuestion.b) {
            toast.error('Wrong answer');

            const a = Math.floor(Math.random() * 100);
            const b = Math.floor(Math.random() * 100);
            setMathQuestion({ a, b });
            setMathAnswer('');
            return;
        }

        await uploadFile();

        setShowVerification(false);
        setMathAnswer('');
    };

    const onReset = () => {
        setSelectedFile(null);
        setPercentage(null);
        setIsUploading(false);
        setResponse(null);
    };

    const onDownloadSample = () => {
        const url = `/import-sheets/${module?.toLowerCase()}_sample.xlsx`;
        const anchor = document.createElement('a');
        anchor.href = url;
        anchor.download = `${module?.replace(/_/g, ' ')} Sample Sheet.xlsx`;
        document.body.appendChild(anchor);
        anchor.click();
        document.body.removeChild(anchor);
    };

    const onCloseDialog = () => {
        if (isReloadRequired) {
            window.location.reload();
        }
        onClose();
        onReset();
    };

    return (
        <Dialog open={open} onOpenChange={onCloseDialog}>
            <DialogContent className="sm:max-w-fit-content">
                {isUploading && (
                    <FileUploadLoader percentage={percentage} />
                )}
                <DialogHeader>
                    <DialogTitle className="">{module?.replace(/_/g, ' ')} Import</DialogTitle>
                </DialogHeader>
                <div className="flex w-full flex-col gap-2">
                    <Label>Import Sheet *</Label>
                    <Input
                        onChange={handleFileChange}
                        id="import_sheet"
                        className="w-full"
                        type="file"
                        accept=".csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel"
                    />
                </div>
                {percentage !== null && (
                    <div>
                        {isUploading ? (
                            <p className="text-sm text-gray-500">
                                Please wait ... file is uploading <b className="font-medium">{percentage}%</b>
                            </p>
                        ) : (
                            <p className="text-sm text-gray-500">
                                File has been uploaded <b className="font-medium">{percentage}%</b>
                            </p>
                        )}
                    </div>
                )}

                {showVerification ? (
                    <HumanVerification
                        mathQuestion={mathQuestion}
                        mathAnswer={mathAnswer}
                        setMathAnswer={setMathAnswer}
                    />
                ) : (
                    <div className="space-y-1">
                        <Label className="text-muted-foreground">Response :-</Label>
                        <div>
                            <p className="text-muted-foreground text-sm">
                                #. Success Records : {response?.successRecords}
                            </p>
                            <p className="text-muted-foreground text-sm">
                                #. Failed Records : {response?.failedRecords}
                            </p>
                            {response?.status ? (
                                <p className="text-muted-foreground text-sm">#. Status : {response?.status}</p>
                            ) : null}
                            {response?.totalRows != null ? (
                                <p className="text-muted-foreground text-sm">#. Total Rows : {response?.totalRows}</p>
                            ) : null}
                        </div>
                        {Array.isArray(response?.errors) && response?.errors?.length > 0 && (
                            <div className="flex max-h-[170px] flex-col gap-2 overflow-y-auto border p-1">
                                {response?.errors?.map((error: any, index: number) => (
                                    <span key={index} className="text-muted-foreground text-xs">
                                        <b className="font-medium">Row {error?.rowNumber ?? error?.row}</b> :{' '}
                                        {error?.errorMessage || error?.errors?.toString()}
                                        {error?.errorCode ? (
                                            <b className="font-medium"> ({error?.errorCode})</b>
                                        ) : null}
                                    </span>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                <div className="flex justify-between gap-2">
                    <div>
                        <Button onClick={onDownloadSample} variant={'outline'} size={'sm'}>
                            <Download /> Download Sample
                        </Button>
                    </div>
                    <div className="flex gap-2">
                        <Button onClick={onReset} variant={'outline'} size={'sm'}>
                            <X /> Reset
                        </Button>
                        <Button onClick={onSubmit} size={'sm'}>
                            <Upload /> Import
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
};

export default ImportSheetModal;
