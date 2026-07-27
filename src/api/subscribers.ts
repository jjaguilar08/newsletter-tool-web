import { apiClient } from '../lib/apiClient'
import type { Paginated } from '../types/pagination'
import type {
    ListSubscribersParams,
    Subscriber,
    SubscriberInput,
    SubscriberUpdateInput,
} from '../types/subscriber'

function buildListQuery(params: ListSubscribersParams): string {
    const query = new URLSearchParams()

    if (params.page) query.set('page', String(params.page))
    if (params.search) query.set('search', params.search)
    if (params.status) query.set('status', params.status)

    const queryString = query.toString()
    return queryString ? `?${queryString}` : ''
}

export function listSubscribers(params: ListSubscribersParams = {}) {
    return apiClient.get<Paginated<Subscriber>>(`/api/subscribers${buildListQuery(params)}`)
}

// store/update responses are wrapped in { data: ... } by Laravel's
// JsonResource - unwrapped here so callers just get the Subscriber.
export async function createSubscriber(data: SubscriberInput): Promise<Subscriber> {
    const response = await apiClient.post<{ data: Subscriber }>('/api/subscribers', data)
    return response.data
}

export async function updateSubscriber(
    id: number,
    data: SubscriberUpdateInput,
): Promise<Subscriber> {
    const response = await apiClient.put<{ data: Subscriber }>(`/api/subscribers/${id}`, data)
    return response.data
}

export function deleteSubscriber(id: number): Promise<void> {
    return apiClient.delete(`/api/subscribers/${id}`)
}
