import React from 'react';
import { CloudOff } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

interface OfflineFetchDataErrorProps {
    message?: string;
}

const OfflineFetchDataError: React.FC<OfflineFetchDataErrorProps> = ({ message }) => {
    return (
        <Card className="bg-muted flex w-full flex-col items-center justify-center text-center">
            <CardHeader className="flex flex-col items-center justify-center">
                <CloudOff size={48} className="text-destructive" />
                <CardTitle className="mt-4 text-lg">{message || 'No internet connection'}</CardTitle>
            </CardHeader>
            <CardContent>
                <CardDescription>Please connect to the internet to see the list.</CardDescription>
            </CardContent>
        </Card>
    );
};

export default OfflineFetchDataError;
