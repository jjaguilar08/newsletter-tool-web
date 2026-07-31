import { apiClient } from '../lib/apiClient'
import type { Paginated } from '../types/pagination'
import type {
    Campaign,
    CampaignInput,
    CampaignPreview,
    CampaignUpdateInput,
    ListCampaignsParams,
} from '../types/campaign'

function buildListQuery(params: ListCampaignsParams): string {
    const query = new URLSearchParams()

    if (params.page) query.set('page', String(params.page))
    if (params.status) query.set('status', params.status)

    const queryString = query.toString()
    return queryString ? `?${queryString}` : ''
}

export function listCampaigns(params: ListCampaignsParams = {}) {
    return apiClient.get<Paginated<Campaign>>(`/api/campaigns${buildListQuery(params)}`)
}

// store/update responses are wrapped in { data: ... } by Laravel's
// JsonResource - unwrapped here so callers just get the Campaign.
export async function createCampaign(data: CampaignInput): Promise<Campaign> {
    const response = await apiClient.post<{ data: Campaign }>('/api/campaigns', data)
    return response.data
}

export async function updateCampaign(id: number, data: CampaignUpdateInput): Promise<Campaign> {
    const response = await apiClient.put<{ data: Campaign }>(`/api/campaigns/${id}`, data)
    return response.data
}

export function deleteCampaign(id: number): Promise<void> {
    return apiClient.delete(`/api/campaigns/${id}`)
}

// Not wrapped in { data: ... } - CampaignController::preview() returns
// { subject, html } directly.
export function previewCampaign(id: number): Promise<CampaignPreview> {
    return apiClient.get<CampaignPreview>(`/api/campaigns/${id}/preview`)
}

// send()/schedule() responses are { message, data: ... }, not the bare
// { data: ... } store/update use - unwrapped the same way regardless.
export async function sendCampaign(id: number): Promise<Campaign> {
    const response = await apiClient.post<{ message: string; data: Campaign }>(
        `/api/campaigns/${id}/send`,
    )
    return response.data
}

export async function scheduleCampaign(id: number, scheduledAt: string): Promise<Campaign> {
    const response = await apiClient.post<{ message: string; data: Campaign }>(
        `/api/campaigns/${id}/schedule`,
        { scheduled_at: scheduledAt },
    )
    return response.data
}

// CampaignAssetController::store() returns a plain { url } - not wrapped in
// { data: ... } like store/update, since it's not returning a Campaign.
export function uploadCampaignAsset(file: File): Promise<{ url: string }> {
    const formData = new FormData()
    formData.set('image', file)
    return apiClient.postForm<{ url: string }>('/api/campaigns/assets', formData)
}
