import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import type { UserGroupDetails } from '@/api-queries/user-groups';
import Security from '@/modules/common/security';

interface UserGroupSecurityProps {
    selectedUserGroup: UserGroupDetails;
    onSecurityClose: () => void;
}

const UserGroupSecurity = ({ selectedUserGroup, onSecurityClose }: UserGroupSecurityProps) => {
    return (
        <div className="space-y-4 px-2">
            <div className="flex items-center justify-between">
                <h1 className="my-2 text-2xl text-balance">Security Actions for {selectedUserGroup?.name}</h1>

                <Button className="d-flex items-center gap-2" variant="secondary" onClick={onSecurityClose}>
                    <ArrowLeft /> Back
                </Button>
            </div>

            <Security initialGroupId={selectedUserGroup?.id} />
        </div>
    );
};

export default UserGroupSecurity;