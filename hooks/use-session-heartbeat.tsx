import { useEffect } from 'react';
import { useAuthUser } from '@/stores/auth-user.store';
import { sendSessionHeartbeat } from '@/api-queries/user-monitoring/sessions';

export const useSessionHeartbeat = () => {
    const user = useAuthUser((state) => state.user);

    useEffect(() => {
        if (!user?.token) return;

        const sendHeartbeat = async () => {
            try {
                await sendSessionHeartbeat();
            } catch (error) {
                console.error('Heartbeat failed:', error);
            }
        };

        sendHeartbeat();
        const interval = setInterval(sendHeartbeat, 30000);

        return () => clearInterval(interval);
    }, [user?.token]);
};

export default useSessionHeartbeat;
