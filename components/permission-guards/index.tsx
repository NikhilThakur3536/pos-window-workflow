import { UserGroupPermissionDetails } from '@/api-queries/user-groups/user-group-permissions';
import { AlertCircle, ShieldX } from 'lucide-react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { SYSTEM_MODULES } from '@/lib/constant';
import { cn } from '@/lib/utils';

export const hasPermission = (
    modulePermissions: UserGroupPermissionDetails[] | undefined | null,
    moduleCode: string,
    permissions: string[],
    isAnd: boolean = false,
    isAllowedCondition: boolean = false,
): boolean => {
    if (modulePermissions === null || isAllowedCondition) {
        return true;
    }

    if (!modulePermissions || modulePermissions.length === 0) {
        return false;
    }

    const module = modulePermissions.find((m) => m.moduleCode === moduleCode);

    if (!module) {
        return false;
    }

    return isAnd
        ? permissions.every((permission) => {
              switch (permission) {
                  case 'canAccess':
                      return module.canAccess;
                  case 'canCreate':
                      return module.canCreate;
                  case 'canUpdate':
                      return module.canUpdate;
                  case 'canDelete':
                      return module.canDelete;
                  case 'showInMenu':
                      return module.showInMenu;
                  default:
                      return false;
              }
          })
        : permissions.some((permission) => {
              switch (permission) {
                  case 'canAccess':
                      return module.canAccess;
                  case 'canCreate':
                      return module.canCreate;
                  case 'canUpdate':
                      return module.canUpdate;
                  case 'canDelete':
                      return module.canDelete;
                  case 'showInMenu':
                      return module.showInMenu;
                  default:
                      return false;
              }
          });
};

// Debtor groups are a master of the debtor record, so anyone who can maintain a debtor
// implicitly maintains their groups. DEBTOR_GROUPS (10011) is checked first; DEBTOR
// MAINTENANCE (10100) is the fallback until the child code is issued. Keeping this in one
// place stops the menu, the route guard and the action buttons from disagreeing.
export const hasDebtorGroupPermission = (
    modulePermissions: UserGroupPermissionDetails[] | undefined | null,
    permissions: string[],
): boolean => {
    if (modulePermissions === null) return true;
    return (
        hasPermission(modulePermissions, SYSTEM_MODULES.DEBTORS.MASTERS.DEBTOR_GROUPS.code, permissions) ||
        hasPermission(modulePermissions, SYSTEM_MODULES.DEBTORS.MAINTENANCE.code, permissions)
    );
};

const isElectronApp = process.env.NEXT_PUBLIC_IS_ELECTRON_APP === 'true';

export interface ViewAccessDeniedOptions {
    height?: string;
    title?: string;
    description?: string;
    showContactAdmin?: boolean;
}

interface ViewAccessDeniedProps {
    options?: ViewAccessDeniedOptions;
}

const defaultOptions: ViewAccessDeniedOptions = {
    height: isElectronApp ? 'h-[calc(100vh-141px)]' : 'h-[calc(100vh-103px)]',
    title: 'Access Denied',
    description: "You don't have permission to access this section.",
    showContactAdmin: true,
};

export default function ViewAccessDenied({ options = {} }: ViewAccessDeniedProps) {
    const { height } = { ...defaultOptions, ...options };
    return (
        <div
            className={cn(
                'flex w-full items-center justify-center bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50',
                height,
            )}
        >
            <div className="rounded-3xl border border-white/40 bg-white/60 shadow-2xl backdrop-blur-md transition-all duration-300 hover:scale-102 hover:bg-white/70">
                <ViewAccessDeniedCard options={options} />
            </div>
        </div>
    );
}

export function ViewAccessDeniedCard({ options = {} }: ViewAccessDeniedProps) {
    const { title, description, showContactAdmin } = { ...defaultOptions, ...options };
    return (
        <div className="flex max-w-md flex-col items-center gap-8 p-8 text-center">
            <div className="rounded-full border-2 border-red-300/50 bg-gradient-to-br from-red-100 to-pink-100 p-6 transition-all duration-300 hover:shadow-lg">
                <ShieldX className="h-16 w-16 text-red-500" />
            </div>

            <div className="space-y-4">
                <h2 className="bg-gradient-to-r from-gray-800 to-gray-900 bg-clip-text text-3xl font-bold tracking-tight text-transparent">
                    {title}
                </h2>
                <p className="!text-[14.5px] leading-relaxed text-gray-600">{description}</p>

                {showContactAdmin && (
                    <div className="mt-6 flex items-center justify-center rounded-xl border border-amber-200/50 bg-gradient-to-r from-amber-100 to-orange-100 p-4 text-amber-700 transition-all duration-200 hover:shadow-md">
                        <AlertCircle className="mr-2 h-5 w-5 flex-shrink-0" />
                        <span className="text-sm font-medium">Please contact your administrator for access</span>
                    </div>
                )}
            </div>

            <div className="absolute -top-4 -right-4 h-20 w-20 rounded-full bg-gradient-to-br from-blue-200/30 to-purple-200/30 blur-xl"></div>
            <div className="absolute -bottom-6 -left-6 h-24 w-24 rounded-full bg-gradient-to-br from-pink-200/30 to-red-200/30 blur-xl"></div>
        </div>
    );
}

type ViewAccessDeniedDialogProps = ViewAccessDeniedProps & {
    open: boolean;
    onClose: () => void;
};

export function ViewAccessDeniedDialog({ open, onClose, options = {} }: ViewAccessDeniedDialogProps) {
    return (
        <Dialog open={open} onOpenChange={onClose}>
            <DialogContent>
                <ViewAccessDeniedCard options={options} />
            </DialogContent>
        </Dialog>
    );
}
