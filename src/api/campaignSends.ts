import { apiClient } from '../lib/apiClient'
import type { Paginated } from '../types/pagination'
import type { CampaignSend, ListCampaignSendsParams } from '../types/campaignSend'

function buildListQuery(params: ListCampaignSendsParams): string {
    const query = new URLSearchParams()

    if (params.page) query.set('page', String(params.page))

    const queryString = query.toString()
    return queryString ? `?${queryString}` : ''
}

export function listCampaignSends(campaignId: number, params: ListCampaignSendsParams = {}) {
    return apiClient.get<Paginated<CampaignSend>>(
        `/api/campaigns/${campaignId}/sends${buildListQuery(params)}`,
    )
}
