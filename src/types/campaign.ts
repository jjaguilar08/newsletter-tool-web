// Matches App\Http\Resources\CampaignResource's toArray() exactly (verified
// against the backend repo, newsletter-tool).
export type CampaignStatus = 'draft' | 'scheduled' | 'sending' | 'sent'

export interface Campaign {
    id: number
    subject: string
    content: string
    // Both null until a campaign has been authored/saved at least once
    // through the GrapesJS design editor - see CampaignContentEditor.
    body_html: string | null
    design_json: Record<string, unknown> | null
    status: CampaignStatus
    scheduled_at: string | null
    sent_at: string | null
    created_by: number
    created_at: string
    updated_at: string
}

// Matches StoreCampaignRequest/UpdateCampaignRequest's validated() shape -
// status is never an accepted input field here. The backend silently drops
// it on create (always Draft) and rejects it with a 422 on update (status
// changes only go through the dedicated schedule/send endpoints, not built
// in this pass).
export interface CampaignInput {
    subject: string
    content: string
    // Optional and sent together (HTML editor/Visual builder modes) or not
    // at all (Plain text mode) - see CampaignFormModal's handleSubmit. The
    // `| null` on design_json lets HTML editor mode explicitly clear a
    // previously-saved GrapesJS design when switching away from it, rather
    // than leaving stale design_json alongside HTML that no longer matches.
    body_html?: string
    design_json?: Record<string, unknown> | null
}

export type CampaignUpdateInput = Partial<CampaignInput>

export interface ListCampaignsParams {
    page?: number
    status?: CampaignStatus
}

// Matches CampaignController::preview()'s response shape exactly - not
// wrapped in { data: ... } like store/update.
export interface CampaignPreview {
    subject: string
    html: string
}

// Matches CampaignController::defaultTemplate()'s response shape - not
// wrapped in { data: ... }, same as CampaignPreview above.
export interface CampaignDefaultTemplate {
    html: string
}
