import { User } from 'lucide-react';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
    const deviceType = process.env.NEXT_PUBLIC_APP_TYPE;

    return (
        <div className="flex min-h-screen items-center justify-center bg-gray-100 p-4">
            <div className="w-full max-w-md border border-gray-300 bg-white shadow-lg">
                {/* Window Title Bar */}
                <div className="flex items-center justify-between border-b border-gray-300 bg-gray-50 px-4 py-2">
                    <div className="flex items-center gap-2">
                        <div className="flex h-4 w-4 items-center justify-center rounded-sm bg-blue-500">
                            <User className="h-2.5 w-2.5 text-white" />
                        </div>
                        <span className="text-sm font-medium text-gray-700">
                            User Authentication ({deviceType === 'WAREHOUSE-USER' ? 'DC' : 'Retail'})
                        </span>
                    </div>
                    <div className="flex items-center gap-1">
                        {/* <button className="w-6 h-6 hover:bg-gray-200 flex items-center justify-center">
                            <Minus className="w-3 h-3 text-gray-600" />
                        </button>
                        <button className="w-6 h-6 hover:bg-gray-200 flex items-center justify-center">
                            <Square className="w-3 h-3 text-gray-600" />
                        </button>
                        <button className="w-6 h-6 hover:bg-red-500 hover:text-white flex items-center justify-center">
                            <X className="w-3 h-3" />
                        </button> */}
                    </div>
                </div>
                {children}
                <div className="border-t border-gray-300 bg-gray-50 px-4 py-2">
                    <div className="flex items-center justify-between text-xs text-gray-500">
                        <span>Ready</span>
                        <span>Secure Connection</span>
                    </div>
                </div>
            </div>
        </div>
    );
}
