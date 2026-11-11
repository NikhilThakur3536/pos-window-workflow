'use client';

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import GroupActions from './group-actions';
import ActionPolicy from './action-policy';
import ApprovalsList from './approvals-list';
import ApprovalsSummary from './approvals-summary';
import ApprovalGroupMapping from './approval-group-mapping';

interface SecurityProps {
    initialGroupId?: string;
}

const Security = ({ initialGroupId }: SecurityProps) => {
    return (
        <div className="m-2 space-y-4 px-2">
            <Tabs defaultValue="group-actions">
                <TabsList className="flex w-max flex-wrap h-auto">
                    <TabsTrigger value="group-actions">Group Action Permissions</TabsTrigger>
                    <TabsTrigger value="action-policy">Action Policy</TabsTrigger>
                    <TabsTrigger value="approvals">Approvals</TabsTrigger>
                    <TabsTrigger value="summary">Approval Summary</TabsTrigger>
                    <TabsTrigger value="approval-mapping">Approval Group Mapping</TabsTrigger>
                </TabsList>
                <TabsContent value="group-actions">
                    <GroupActions initialGroupId={initialGroupId} />
                </TabsContent>
                <TabsContent value="action-policy">
                    <ActionPolicy />
                </TabsContent>
                <TabsContent value="approvals">
                    <ApprovalsList />
                </TabsContent>
                <TabsContent value="summary">
                    <ApprovalsSummary />
                </TabsContent>
                <TabsContent value="approval-mapping">
                    <ApprovalGroupMapping />
                </TabsContent>
            </Tabs>
        </div>
    );
};

export default Security;
