import NavigationBar from '@/components/custom-components/navigation-bar';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSub,
    DropdownMenuSubContent,
    DropdownMenuSubTrigger,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Menubar, MenubarMenu, MenubarTrigger } from '@/components/ui/menubar';
import getMenuData from '@/data/menu-data';
import { cn } from '@/lib/utils';
import Link from 'next/link';
import { useRouter } from 'next/router';
import type React from 'react';
import { useEffect, useRef, useState } from 'react';
import { useAuthUser } from '@/stores/auth-user.store';
import UserActions from './user-actions';
import { APP_VERSION } from '@/lib/constant';
import useUsersPermissions from '@/components/permission-guards/useUsersPermissions';
import { PageLoader } from '../PageLoader';
import ConfirmDialog from '@/components/confirm-dialog';
import TillShortcutHandler from '@/modules/common/shortcuts/till-shortcut-handler';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
    const router = useRouter();
    const isAuthenticated = useAuthUser((state) => state.isLoggedIn);
    const isElectronApp = process.env.NEXT_PUBLIC_IS_ELECTRON_APP === 'true';

    const authUserType = useAuthUser((state) => state.user?.userType);
    const userGroupPermissions = useUsersPermissions();

    const [MENU_DATA, setMenuData] = useState<ReturnType<typeof getMenuData> | null>(null);

    useEffect(() => {
        if (authUserType && userGroupPermissions) {
            setMenuData(getMenuData(authUserType, userGroupPermissions));
        }
    }, [authUserType, userGroupPermissions]);

    const [hasMounted, setHasMounted] = useState(false);
    useEffect(() => {
        setHasMounted(true);
    }, []);

    useEffect(() => {
        if (!hasMounted) return;
        if (!isAuthenticated) router.replace('/auth/login');
    }, [isAuthenticated, hasMounted, router]);

    const [activeTabId, setActiveTabId] = useState<string | null>(MENU_DATA?.topMenuItems[0]?.id || null);
    const [isSubmenuOpen, setIsSubmenuOpen] = useState(false);

    const currentTabActions = MENU_DATA && activeTabId ? MENU_DATA?.actionsByTabId[activeTabId] || [] : [];

    useEffect(() => {
        const path = router.pathname;

        for (const tabId in MENU_DATA?.actionsByTabId) {
            const actions = MENU_DATA?.actionsByTabId[tabId];

            for (const action of actions) {
                if (action.href === path) return setActiveTabId(tabId);

                if (action.subMenuItems) {
                    // Sub menus can nest (Stock > Maintenance > Store Classification > ...), so
                    // check every level for a match rather than only the first.
                    const containsPath = (items: typeof action.subMenuItems): boolean =>
                                        items.some(
                                            (subItem) =>
                                                subItem.href === path || containsPath(subItem.subMenuItems || []),
                                        );

                    if (containsPath(action.subMenuItems)) return setActiveTabId(tabId);
                }
            }
        }

        setIsSubmenuOpen(false);
        setActiveTabId(null);
    }, [router.pathname]);

    const [confirm, setConfirm] = useState(false);

    useEffect(() => {
        const path = router.pathname;
        const handleEsc = (event: KeyboardEvent) => {
            if (event.key === 'Escape' && isElectronApp) {
                setConfirm(true);
            }
        };

        window.addEventListener('keydown', handleEsc);

        return () => {
            window.removeEventListener('keydown', handleEsc);
        };
    }, [router.pathname]);

    const menubarRef = useRef<HTMLDivElement>(null);
    const dropdownContentRefs = useRef<Set<HTMLElement>>(new Set());

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            const target = event.target as Node;
            if ((target as HTMLElement).closest('a')) return;
            const clickedInside =
                (menubarRef.current && menubarRef.current.contains(target)) ||
                Array.from(dropdownContentRefs.current).some((el) => el.contains(target));

            if (!clickedInside) setIsSubmenuOpen(false);
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    if (!hasMounted) return null;

    const deviceType = process.env.NEXT_PUBLIC_APP_TYPE;

    return (
        <PageLoader isLoading={!hasMounted || !MENU_DATA}>
            <div className="min-h-screen bg-gray-100">
                <div className="border-b border-gray-300 bg-white">
                    <div className="flex items-center justify-between bg-slate-600 px-4 py-2 text-white">
                        <div className="flex items-center gap-4">
                            <div className="flex items-center gap-2">
                                <img src="/assets/images/onetouch-logo.jpg" className="!h-6 rounded-full" />

                                <span className="font-medium">
                                    {deviceType === 'WAREHOUSE-USER' ? 'DC' : 'RETAIL'} SAAS -{' '}
                                    <b className="text-[#ED8D68]">{APP_VERSION}</b>
                                </span>
                            </div>
                        </div>
                        <UserActions />
                    </div>
                    {isElectronApp && <NavigationBar />}
                    <div className="relative">
                        <div
                            ref={menubarRef}
                            className="overflow-x-auto border-b border-gray-300 bg-gray-100 px-4 py-1 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
                        >
                            <Menubar className="h-auto border-0 bg-transparent p-0 py-1 shadow-none">
                                {MENU_DATA?.topMenuItems?.map((item) => {
                                    const handleClick = () => {
                                        if (activeTabId === item.id) {
                                            setIsSubmenuOpen((prev) => !prev);
                                        } else {
                                            setActiveTabId(item.id);
                                            setIsSubmenuOpen(true);
                                        }
                                    };
                                    return (
                                        <MenubarMenu key={item.id}>
                                            {item.href ? (
                                                <MenubarTrigger
                                                    className={cn(
                                                        `cursor-pointer border px-4 py-1 text-sm font-medium whitespace-nowrap transition-colors duration-200`,
                                                        activeTabId === item.id
                                                            ? 'relative z-10 -mb-px rounded-t-md border-gray-300 bg-[#E0EEF9] text-blue-800'
                                                            : 'rounded-md border-transparent bg-transparent text-gray-700 hover:bg-gray-200',
                                                    )}
                                                    asChild
                                                    onClick={handleClick}
                                                >
                                                    <Link href={item.href || '#'}>{item.label}</Link>
                                                </MenubarTrigger>
                                            ) : (
                                                <MenubarTrigger
                                                    className={cn(
                                                        `cursor-pointer border px-4 py-1 text-sm font-medium whitespace-nowrap transition-colors duration-200`,
                                                        activeTabId === item.id
                                                            ? 'relative z-10 -mb-px rounded-t-md border-gray-300 bg-[#E0EEF9] text-blue-800'
                                                            : 'rounded-md border-transparent bg-transparent text-gray-700 hover:bg-gray-200',
                                                    )}
                                                    onClick={handleClick}
                                                >
                                                    {item.label}
                                                </MenubarTrigger>
                                            )}
                                        </MenubarMenu>
                                    );
                                })}
                            </Menubar>
                        </div>
                        {isSubmenuOpen && activeTabId && (
                            <div className="absolute top-12 right-0 left-0 z-30 flex items-start space-x-2 overflow-x-auto bg-[#E0EEF9] px-4 py-1 shadow-inner [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
                                {currentTabActions.map((action) => {
                                    const Icon = action.icon;
                                    const isActive =
                                        (action.href && router.pathname === action.href) ||
                                        (action.subMenuItems &&
                                            action.subMenuItems.some((subItem) =>
                                                subItem.href === router.pathname ||
                                                subItem.subMenuItems?.some(
                                                    (nested) => nested.href === router.pathname,
                                                ),
                                            ));

                                    const content = (
                                        <>
                                            {Icon && (
                                                <Icon
                                                    className={`h-6 w-6 flex-shrink-0 ${isActive ? 'text-white' : 'text-blue-800'}`}
                                                />
                                            )}
                                            <span
                                                key={action.label}
                                                className={`mt-0.5 w-full text-center text-[11px] leading-tight font-bold [overflow-wrap:anywhere] ${
                                                    isActive ? 'text-white' : 'text-blue-800'
                                                }`}
                                            >
                                                {action.label}
                                            </span>
                                            {action.subMenuItems && (
                                                <span
                                                    className={`mt-1 ml-1 inline-block ${
                                                        isActive ? 'border-t-white' : 'border-t-blue-800'
                                                    }`}
                                                    style={{
                                                        width: 0,
                                                        height: 0,
                                                        borderLeft: '6px solid transparent',
                                                        borderRight: '6px solid transparent',
                                                        borderTopWidth: '6px',
                                                    }}
                                                ></span>
                                            )}
                                        </>
                                    );

                                    const itemClasses = cn(
                                        'flex w-[80px] flex-shrink-0 cursor-pointer flex-col items-center justify-start overflow-hidden rounded-md p-1.5 transition-colors duration-150',
                                        isActive ? 'bg-blue-600' : 'hover:bg-blue-200',
                                    );

                                    if (action.subMenuItems) {
                                        return (
                                            <DropdownMenu key={action.label}>
                                                <DropdownMenuTrigger asChild>
                                                    <div className={itemClasses}>{content}</div>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent
                                                    ref={(node) => {
                                                        if (node) {
                                                            dropdownContentRefs.current.add(node);
                                                        }
                                                    }}
                                                    className="min-w-[150px]"
                                                    align="start"
                                                    sideOffset={5}
                                                >
                                                    {action.subMenuItems.map((subItem) => {
                                                        const SubIcon = subItem.icon;
                                                        const isSubItemActive = router.pathname === subItem.href;

                                                        // Menus can nest more than one level deep (e.g.
                                                        // Stock > Maintenance > Store Classification > Store
                                                        // Categories), so a sub item with its own children is
                                                        // rendered as a sub-dropdown rather than a plain link.
                                                        if (subItem.subMenuItems?.length) {
                                                            return (
                                                                <DropdownMenuSub key={subItem.label}>
                                                                    <DropdownMenuSubTrigger className="flex cursor-pointer items-center gap-2">
                                                                        {SubIcon && <SubIcon className="h-4 w-4" />}
                                                                        {subItem.label}
                                                                    </DropdownMenuSubTrigger>
                                                                    <DropdownMenuSubContent className="min-w-[150px]">
                                                                        {subItem.subMenuItems.map((nestedItem) => {
                                                                            const NestedIcon = nestedItem.icon;
                                                                            const isNestedActive =
                                                                                router.pathname === nestedItem.href;
                                                                            return (
                                                                                <DropdownMenuItem
                                                                                    key={nestedItem.label}
                                                                                    asChild
                                                                                >
                                                                                    <Link
                                                                                        href={nestedItem.href || '#'}
                                                                                        className={cn(
                                                                                            'flex cursor-pointer items-center gap-2',
                                                                                            isNestedActive
                                                                                                ? 'bg-blue-100 text-blue-800'
                                                                                                : '',
                                                                                        )}
                                                                                        onClick={() =>
                                                                                            setIsSubmenuOpen(false)
                                                                                        }
                                                                                    >
                                                                                        {NestedIcon && (
                                                                                            <NestedIcon className="h-4 w-4" />
                                                                                        )}
                                                                                        {nestedItem.label}
                                                                                    </Link>
                                                                                </DropdownMenuItem>
                                                                            );
                                                                        })}
                                                                    </DropdownMenuSubContent>
                                                                </DropdownMenuSub>
                                                            );
                                                        }

                                                        return (
                                                            <DropdownMenuItem key={subItem.label} asChild>
                                                                <Link
                                                                    href={subItem.href || '#'}
                                                                    className={cn(
                                                                        `flex cursor-pointer items-center gap-2`,
                                                                        isSubItemActive
                                                                            ? 'bg-blue-100 text-blue-800'
                                                                            : '',
                                                                    )}
                                                                    onClick={() => setIsSubmenuOpen(false)}
                                                                >
                                                                    {SubIcon && <SubIcon className="h-4 w-4" />}
                                                                    {subItem.label}
                                                                </Link>
                                                            </DropdownMenuItem>
                                                        );
                                                    })}
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        );
                                    } else if (action.href) {
                                        return (
                                            <Link
                                                key={action.label}
                                                href={action.href || '#'}
                                                className={itemClasses}
                                                onClick={() => setIsSubmenuOpen(false)}
                                            >
                                                {content}
                                            </Link>
                                        );
                                    }
                                    return null;
                                })}
                            </div>
                        )}
                    </div>
                </div>
                <TillShortcutHandler />
                {children}
            </div>

            {confirm ? (
                <ConfirmDialog
                    open={confirm}
                    setOpen={setConfirm}
                    title="Are you sure you want to exit?"
                    description="You will be redirected to home page once confirmed."
                    onConfirm={() => {
                        setConfirm(false);
                        if (router.pathname !== '/') {
                            router.push('/');
                        } else {
                            (window as any)?.electronAPI.exitApp();
                        }
                    }}
                    confirmBtnTitle="Yes"
                    variant="destructive"
                />
            ) : null}
        </PageLoader>
    );
}
