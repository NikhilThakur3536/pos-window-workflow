import { useNetworkStore } from '@/stores/network.store';
import React from 'react';
import { Button } from '../ui/button';
import { Download } from 'lucide-react';

const ExportSheets = ({
    downloadCSV,
    title = '',
    size = 'default',
}: {
    downloadCSV: () => void;
    title?: string;
    size?: 'default' | 'sm' | 'lg' | 'icon' | 'link';
}) => {
    const isOnline = useNetworkStore((state) => state.online);

    return isOnline ? (
        <Button onClick={downloadCSV} variant="outline" size={size}>
            <Download /> Export {title}
        </Button>
    ) : null;
};

export default ExportSheets;
