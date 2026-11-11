import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { CloudUpload } from 'lucide-react';
import ImportSheetModal from './import-sheet-modal';
import { ViewAccessDeniedDialog } from '../permission-guards';

type ImportModuleProps = {
    module: string;
    route: string;
    noLabel?: boolean;
    hasPermission?: boolean;
    customRoute?: string;
    fileFieldName?: string;
    label?: string;
};

function ImportModule({ module, route, noLabel, hasPermission = true, customRoute, fileFieldName, label }: ImportModuleProps) {
    const [openImport, setOpenImport] = useState(false);
    const [isPermissionDeniedOpen, setIsPermissionDeniedOpen] = useState(false);

    function onCloseHandler() {
        setOpenImport(false);
    }

    const onClosePermissionDenied = () => {
        setIsPermissionDeniedOpen(false);
    };

    return (
        <>
            <Button
                className="hover:border-teal-500 hover:bg-white hover:text-teal-500"
                variant="outline"
                onClick={() => (hasPermission ? setOpenImport(true) : setIsPermissionDeniedOpen(true))}
            >
                <CloudUpload className="" size={16} strokeWidth={2} aria-hidden="true" />
                {label ?? `Import ${noLabel ? '' : module?.replace(/_/g, ' ')}`}

            </Button>

            {hasPermission
                ? openImport && (
                      <ImportSheetModal
                          open={openImport}
                          module={module}
                          route={route}
                          onClose={onCloseHandler}
                          customRoute={customRoute}
                          fileFieldName={fileFieldName}
                      />
                  )
                : isPermissionDeniedOpen && (
                      <ViewAccessDeniedDialog
                          open={isPermissionDeniedOpen}
                          onClose={onClosePermissionDenied}
                          options={{
                              description: `You don't have access to import the ${module?.toLowerCase()?.replace(/_/g, ' ')}.`,
                          }}
                      />
                  )}
        </>
    );
}

export default ImportModule;
