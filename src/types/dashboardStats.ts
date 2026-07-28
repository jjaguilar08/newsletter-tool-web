import type { CampaignStatus } from './campaign'

// Matches DashboardController::stats()'s response shape exactly (verified
// against the backend repo, newsletter-tool) - not wrapped in { data: ... }.
export interface DashboardStats {
    subscribers: {
        subscribed: number
        unsubscribed: number
        bounced: number
    }
    campaigns: {
        draft: number
        scheduled: number
        sending: number
        sent: number
    }
    recent_campaigns: RecentCampaign[]
    campaign_sends: {
        sent: number
        failed: number
    }
}

export interface RecentCampaign {
    subject: string
    status: CampaignStatus
    sent_at: string | null
}
