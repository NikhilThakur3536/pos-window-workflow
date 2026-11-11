// import React, { ReactNode, useState, useRef } from 'react';
// import { useMutation } from '@tanstack/react-query';
// import { Button } from '@/components/ui/button';
// import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
// import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
// import { Separator } from '@/components/ui/separator';
// import { Box, FileSpreadsheet, History, Tag, TrendingUp, Upload } from 'lucide-react';
// import { useRouter } from 'next/router';
// import { useUploadImportFile, UploadImportFilePayload } from '@/api-queries/s3upload';
// import { toast } from 'sonner'; // or your toast library

// interface ImportItem {
//     title: string;
//     importType: string;
//     description: string;
//     icon: ReactNode;
//     group: string;
//     detailsRoute?: string;
//     historyRoute?: string;
// }

// const ImportModules: ImportItem[] = [
//     {
//         title: 'Markup',
//         importType: 'SIMPLE_PRICING',
//         description: 'Import simple pricing / markup data',
//         icon: <TrendingUp className="h-5 w-5 text-purple-500" />,
//         group: 'Pricing',
//         detailsRoute: '/stocks',
//         historyRoute: '/stocks/markup/import-history',
//     },
//     {
//         title: 'Pricing',
//         importType: 'COMPANY_STOCK_PRICING',
//         description: 'Import company stock pricing data',
//         icon: <TrendingUp className="h-5 w-5 text-blue-500" />,
//         group: 'Pricing',
//         detailsRoute: '/stocks',
//         historyRoute: '/stocks/pricing/import-history',
//     },
//     {
//         title: 'Promotion Wholesale',
//         importType: 'PROMOTIONAL_PRICE_WHOLESALE',
//         description: 'Import wholesale promotional pricing',
//         icon: <Tag className="h-5 w-5 text-orange-500" />,
//         group: 'Promotions',
//         detailsRoute: '/promotions',
//         historyRoute: '/promotions/import-history',
//     },
//     {
//         title: 'Promotion Retail',
//         importType: 'SIMPLE_PRICING_RETAIL',
//         description: 'Import retail promotional pricing',
//         icon: <Tag className="h-5 w-5 text-red-500" />,
//         group: 'Promotions',
//         detailsRoute: '/promotions',
//         historyRoute: '/promotions/import-history',
//     },
// ];

// const DataImportCenterNew = () => {
//     const router = useRouter();
//     const uploadMutation = useUploadImportFile();
//     const [uploadingFor, setUploadingFor] = useState<string | null>(null);
//     const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

//     const handleFileUpload = async (file: File, importType: string) => {
//         if (!file) return;

//         setUploadingFor(importType);

//         try {
//             const payload: UploadImportFilePayload = { importType, file };
//             const result = await uploadMutation.mutateAsync(payload);

//             if (result.success) {
//                 toast.success(`File uploaded successfully`);
//             } else {
//                 toast.error(result.message || 'Upload failed');
//             }
//         } catch (error: any) {
//             console.error(error);
//             toast.error(
//                 error?.response?.data?.message || 
//                 error?.message || 
//                 'Failed to upload file'
//             );
//         } finally {
//             setUploadingFor(null);
//             // Reset input
//             if (fileInputRefs.current[importType]) {
//                 fileInputRefs.current[importType]!.value = '';
//             }
//         }
//     };

//     const groups = [
//         {
//             name: 'Pricing',
//             icon: <TrendingUp className="h-5 w-5 text-blue-500" />,
//             items: ImportModules.filter(item => item.group === 'Pricing'),
//         },
//         {
//             name: 'Promotions',
//             icon: <Tag className="h-5 w-5 text-red-500" />,
//             items: ImportModules.filter(item => item.group === 'Promotions'),
//         },
//     ];

//     return (
//         <div className="!bg-white p-4">
//             <div className="mb-6 flex items-center justify-between">
//                 <div>
//                     <h1 className="text-xl font-bold tracking-tight">Data Sync Center</h1>
//                     <p className="text-muted-foreground mt-1 text-sm">
//                         Upload files for Markup, Pricing & Promotions
//                     </p>
//                 </div>
//             </div>

//             <Separator className="my-3" />

//             <Tabs defaultValue="pricing">
//                 <TabsList className="mb-3 grid w-max grid-cols-2">
//                     {groups.map((group, idx) => (
//                         <TabsTrigger 
//                             key={idx} 
//                             value={group.name.toLowerCase()}
//                         >
//                             <div className="flex items-center gap-2">
//                                 {group.icon}
//                                 <span>{group.name}</span>
//                             </div>
//                         </TabsTrigger>
//                     ))}
//                 </TabsList>

//                 {groups.map((group, gIdx) => (
//                     <TabsContent key={gIdx} value={group.name.toLowerCase()}>
//                         <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
//                             {group.items.map((item) => (
//                                 <Card 
//                                     key={item.importType} 
//                                     className="overflow-hidden border bg-white shadow-sm hover:shadow-md transition-all"
//                                 >
//                                     <CardHeader className="bg-muted/50 p-4">
//                                         <div className="flex items-start justify-between">
//                                             <div>
//                                                 <CardTitle className="text-lg">{item.title}</CardTitle>
//                                                 <CardDescription className="text-sm mt-1">
//                                                     {item.description}
//                                                 </CardDescription>
//                                             </div>
//                                             {item.icon}
//                                         </div>
//                                     </CardHeader>

//                                     {/* <CardContent className="p-6 flex flex-col items-center justify-center border-y">
//                                         <FileSpreadsheet className="h-16 w-16 text-muted-foreground mb-4" />
//                                         <p className="text-sm text-muted-foreground text-center">
//                                             Drop your Excel/CSV file here or click Upload
//                                         </p>
//                                     </CardContent> */}

//                                     <CardFooter className="p-4 flex flex-col gap-3">
//                                         <input
//                                             ref={(el) => { fileInputRefs.current[item.importType] = el; }}
//                                             type="file"
//                                             accept=".xlsx,.xls,.csv"
//                                             className="hidden"
//                                             onChange={(e) => {
//                                                 const file = e.target.files?.[0];
//                                                 if (file) handleFileUpload(file, item.importType);
//                                             }}
//                                         />

//                                         <Button 
//                                             className="w-full gap-2"
//                                             disabled={uploadMutation.isPending && uploadingFor === item.importType}
//                                             onClick={() => fileInputRefs.current[item.importType]?.click()}
//                                         >
//                                             <Upload className="h-4 w-4" />
//                                             {uploadMutation.isPending && uploadingFor === item.importType 
//                                                 ? 'Uploading...' 
//                                                 : 'Upload File'}
//                                         </Button>

//                                         <div className="flex gap-2 w-full">
//                                             {item.detailsRoute && (
//                                                 <Button
//                                                     variant="outline"
//                                                     className="flex-1"
//                                                     onClick={() => router.push(item.detailsRoute!)}
//                                                 >
//                                                     View All
//                                                 </Button>
//                                             )}

//                                             {item.historyRoute && (
//                                                 <Button
//                                                     variant="outline"
//                                                     className="flex-1"
//                                                     onClick={() => router.push(item.historyRoute!)}
//                                                 >
//                                                     <History className="mr-2 h-4 w-4" />
//                                                     History
//                                                 </Button>
//                                             )}
//                                         </div>
//                                     </CardFooter>
//                                 </Card>
//                             ))}
//                         </div>
//                     </TabsContent>
//                 ))}
//             </Tabs>
//         </div>
//     );
// };

// export default DataImportCenterNew;
import React, { ReactNode, useState, useRef, useEffect } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { Box, FileSpreadsheet, History, Tag, TrendingUp, Upload, Wifi, WifiOff } from 'lucide-react';
import { useRouter } from 'next/router';
import { useUploadImportFile, UploadImportFilePayload } from '@/api-queries/s3upload';
import { toast } from 'sonner'; // or your toast library

interface ImportItem {
    title: string;
    importType: string;
    description: string;
    icon: ReactNode;
    group: string;
    detailsRoute?: string;
    historyRoute?: string;
}

const ImportModules: ImportItem[] = [
    {
        title: 'Markup',
        importType: 'SIMPLE_PRICING',
        description: 'Import simple pricing / markup data',
        icon: <TrendingUp className="h-5 w-5 text-purple-500" />,
        group: 'Pricing',
        detailsRoute: '/stocks',
        historyRoute: '/stocks/markup/import-history',
    },
    {
        title: 'Pricing',
        importType: 'COMPANY_STOCK_PRICING',
        description: 'Import company stock pricing data',
        icon: <TrendingUp className="h-5 w-5 text-blue-500" />,
        group: 'Pricing',
        detailsRoute: '/stocks',
        historyRoute: '/stocks/pricing/import-history',
    },
    {
        title: 'Promotion Wholesale',
        importType: 'PROMOTIONAL_PRICE_WHOLESALE',
        description: 'Import wholesale promotional pricing',
        icon: <Tag className="h-5 w-5 text-orange-500" />,
        group: 'Promotions',
        detailsRoute: '/promotions',
        historyRoute: '/promotions/import-history',
    },
    {
        title: 'Promotion Retail',
        importType: 'SIMPLE_PRICING_RETAIL',
        description: 'Import retail promotional pricing',
        icon: <Tag className="h-5 w-5 text-red-500" />,
        group: 'Promotions',
        detailsRoute: '/promotions',
        historyRoute: '/promotions/import-history',
    },
];

const DataImportCenterNew = () => {
    const router = useRouter();
    const uploadMutation = useUploadImportFile();
    const [uploadingFor, setUploadingFor] = useState<string | null>(null);
    const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

    // ----------------- Offline Mode Gate Start -----------------

    const [isOfflineMode, setIsOfflineMode] = useState(false);

    useEffect(() => {
        const checkSystemMode = () => {
            const systemMode = localStorage.getItem('systemMode');
            setIsOfflineMode(systemMode === 'offline');
        };

        checkSystemMode();

        window.addEventListener('storage', checkSystemMode);

        return () => {
            window.removeEventListener('storage', checkSystemMode);
        };
    }, []);

    const handleSwitchToOnline = () => {
        localStorage.setItem('systemMode', 'online');
        window.location.reload();
    };

    // ----------------- Offline Mode Gate End -----------------

    const handleFileUpload = async (file: File, importType: string) => {
        if (!file) return;

        setUploadingFor(importType);

        try {
            const payload: UploadImportFilePayload = { importType, file };
            const result = await uploadMutation.mutateAsync(payload);

            if (result.success) {
                toast.success(`File uploaded successfully`);
            } else {
                toast.error(result.message || 'Upload failed');
            }
        } catch (error: any) {
            console.error(error);
            toast.error(
                error?.response?.data?.message || 
                error?.message || 
                'Failed to upload file'
            );
        } finally {
            setUploadingFor(null);
            // Reset input
            if (fileInputRefs.current[importType]) {
                fileInputRefs.current[importType]!.value = '';
            }
        }
    };

    const groups = [
        {
            name: 'Pricing',
            icon: <TrendingUp className="h-5 w-5 text-blue-500" />,
            items: ImportModules.filter(item => item.group === 'Pricing'),
        },
        {
            name: 'Promotions',
            icon: <Tag className="h-5 w-5 text-red-500" />,
            items: ImportModules.filter(item => item.group === 'Promotions'),
        },
    ];

    return (
        <div className="relative">
            <div className={`!bg-white p-4 transition-all duration-500 ${isOfflineMode ? 'pointer-events-none blur-sm select-none' : ''}`}>
                <div className="mb-6 flex items-center justify-between">
                    <div>
                        <h1 className="text-xl font-bold tracking-tight">Data Sync Center</h1>
                        <p className="text-muted-foreground mt-1 text-sm">
                            Upload files for Markup, Pricing & Promotions
                        </p>
                    </div>
                </div>

                <Separator className="my-3" />

                <Tabs defaultValue="pricing">
                    <TabsList className="mb-3 grid w-max grid-cols-2">
                        {groups.map((group, idx) => (
                            <TabsTrigger 
                                key={idx} 
                                value={group.name.toLowerCase()}
                            >
                                <div className="flex items-center gap-2">
                                    {group.icon}
                                    <span>{group.name}</span>
                                </div>
                            </TabsTrigger>
                        ))}
                    </TabsList>

                    {groups.map((group, gIdx) => (
                        <TabsContent key={gIdx} value={group.name.toLowerCase()}>
                            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                                {group.items.map((item) => (
                                    <Card 
                                        key={item.importType} 
                                        className="overflow-hidden border bg-white shadow-sm hover:shadow-md transition-all"
                                    >
                                        <CardHeader className="bg-muted/50 p-4">
                                            <div className="flex items-start justify-between">
                                                <div>
                                                    <CardTitle className="text-lg">{item.title}</CardTitle>
                                                    <CardDescription className="text-sm mt-1">
                                                        {item.description}
                                                    </CardDescription>
                                                </div>
                                                {item.icon}
                                            </div>
                                        </CardHeader>

                                        {/* <CardContent className="p-6 flex flex-col items-center justify-center border-y">
                                            <FileSpreadsheet className="h-16 w-16 text-muted-foreground mb-4" />
                                            <p className="text-sm text-muted-foreground text-center">
                                                Drop your Excel/CSV file here or click Upload
                                            </p>
                                        </CardContent> */}

                                        <CardFooter className="p-4 flex flex-col gap-3">
                                            <input
                                                ref={(el) => { fileInputRefs.current[item.importType] = el; }}
                                                type="file"
                                                accept=".xlsx,.xls,.csv"
                                                className="hidden"
                                                onChange={(e) => {
                                                    const file = e.target.files?.[0];
                                                    if (file) handleFileUpload(file, item.importType);
                                                }}
                                            />

                                            <Button 
                                                className="w-full gap-2"
                                                disabled={uploadMutation.isPending && uploadingFor === item.importType}
                                                onClick={() => fileInputRefs.current[item.importType]?.click()}
                                            >
                                                <Upload className="h-4 w-4" />
                                                {uploadMutation.isPending && uploadingFor === item.importType 
                                                    ? 'Uploading...' 
                                                    : 'Upload File'}
                                            </Button>

                                            <div className="flex gap-2 w-full">
                                                {item.detailsRoute && (
                                                    <Button
                                                        variant="outline"
                                                        className="flex-1"
                                                        onClick={() => router.push(item.detailsRoute!)}
                                                    >
                                                        View All
                                                    </Button>
                                                )}

                                                {item.historyRoute && (
                                                    <Button
                                                        variant="outline"
                                                        className="flex-1"
                                                        onClick={() => router.push(item.historyRoute!)}
                                                    >
                                                        <History className="mr-2 h-4 w-4" />
                                                        History
                                                    </Button>
                                                )}
                                            </div>
                                        </CardFooter>
                                    </Card>
                                ))}
                            </div>
                        </TabsContent>
                    ))}
                </Tabs>
            </div>

            {isOfflineMode && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center">
                    <style>{`
                        @keyframes offlineOverlayFadeIn {
                            0% { opacity: 0; }
                            100% { opacity: 1; }
                        }
                        @keyframes offlineModalIn {
                            0% { opacity: 0; transform: scale(0.85) translateY(24px); }
                            60% { opacity: 1; transform: scale(1.03) translateY(-4px); }
                            100% { opacity: 1; transform: scale(1) translateY(0); }
                        }
                        @keyframes offlinePulseRing {
                            0% { box-shadow: 0 0 0 0 rgba(239,68,68,0.45); }
                            70% { box-shadow: 0 0 0 18px rgba(239,68,68,0); }
                            100% { box-shadow: 0 0 0 0 rgba(239,68,68,0); }
                        }
                        .offline-overlay-fade-in { animation: offlineOverlayFadeIn 0.4s ease-out forwards; }
                        .offline-modal-in { animation: offlineModalIn 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
                        .offline-pulse-icon { animation: offlinePulseRing 2s infinite; }
                    `}</style>

                    <div className="offline-overlay-fade-in absolute inset-0 bg-black/50 backdrop-blur-md" />

                    <div className="offline-modal-in relative z-10 w-full max-w-md rounded-2xl bg-white p-8 shadow-2xl">
                        <div className="flex flex-col items-center gap-4 text-center">
                            <div className="offline-pulse-icon flex h-16 w-16 items-center justify-center rounded-full bg-red-100">
                                <WifiOff className="h-8 w-8 text-red-500" />
                            </div>

                            <h2 className="text-xl font-bold text-gray-900">You're Offline</h2>

                            <p className="text-sm text-muted-foreground">
                                You need to switch to online mode to perform operations in this module.
                            </p>

                            <Button
                                className="mt-2 w-full gap-2 bg-blue-600 transition-transform duration-200 hover:scale-[1.02] hover:bg-blue-700 active:scale-95"
                                onClick={handleSwitchToOnline}
                            >
                                <Wifi className="h-4 w-4" />
                                Switch to Online Mode
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default DataImportCenterNew;