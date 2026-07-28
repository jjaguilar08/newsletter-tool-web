// Matches App\Http\Resources\CampaignSendResource's toArray() exactly
// (verified against the backend repo, newsletter-tool).
export type CampaignSendStatus = 'pending' | 'sent' | 'failed' | 'bounced'

export interface CampaignSend {
    id: number
    subscriber_email: string
    status: CampaignSendStatus
    sent_at: string | null
    error_message: string | null
}

export interface ListCampaignSendsParams {
    page?: number
}
