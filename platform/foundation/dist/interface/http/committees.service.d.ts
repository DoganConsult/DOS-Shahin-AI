export interface Committee {
    committee_id: string;
    tenant_id: string;
    name_en: string;
    name_ar: string | null;
    code: string | null;
    committee_type: string | null;
    charter: string | null;
    status: string;
    description: string | null;
    created_at: string;
    updated_at: string;
}
export interface CommitteeMember {
    member_id: string;
    committee_id: string;
    user_id: string;
    tenant_id: string;
    role_in_committee: string;
    email?: string;
    display_name?: string;
    created_at: string;
}
export interface CreateCommitteeInput {
    name_en: string;
    name_ar?: string;
    code?: string;
    committee_type?: string;
    charter?: string;
    status?: string;
    description?: string;
}
export declare function listCommittees(tenantId: string, status?: string): Promise<Committee[]>;
export declare function getCommittee(tenantId: string, id: string): Promise<Committee | null>;
export declare function listMembers(tenantId: string, committeeId: string): Promise<CommitteeMember[]>;
export declare function createCommittee(tenantId: string, input: CreateCommitteeInput, actorId: string): Promise<Committee>;
export declare function addMember(tenantId: string, committeeId: string, userId: string, roleInCommittee?: string): Promise<CommitteeMember>;
export declare function removeMember(tenantId: string, committeeId: string, memberOrUserId: string): Promise<boolean>;
export declare function updateCommittee(tenantId: string, id: string, input: Partial<CreateCommitteeInput>): Promise<Committee | null>;
export declare function deleteCommittee(tenantId: string, id: string): Promise<boolean>;
export interface CommitteeMeeting {
    meeting_id: string;
    committee_id: string;
    tenant_id: string;
    title: string;
    agenda: string | null;
    scheduled_at: string;
    location: string | null;
    status: string;
    minutes: string | null;
    created_by: string | null;
    created_at: string;
    updated_at: string;
}
export declare function listMeetings(tenantId: string, committeeId: string): Promise<CommitteeMeeting[]>;
export declare function createMeeting(tenantId: string, committeeId: string, input: {
    title: string;
    agenda?: string;
    scheduled_at: string;
    location?: string;
    status?: string;
    minutes?: string;
}, actorId: string): Promise<CommitteeMeeting>;
