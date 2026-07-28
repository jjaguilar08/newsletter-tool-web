import { apiClient } from '../lib/apiClient'
import type { Paginated } from '../types/pagination'
import type {
    Campaign,
    CampaignInput,
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
