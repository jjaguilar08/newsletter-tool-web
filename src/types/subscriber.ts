// Matches App\Http\Resources\SubscriberResource's toArray() exactly - no
// unsubscribe_token, it's never in the response (see PROJECT_NOTES.md Day 3).
export type SubscriberStatus = 'subscribed' | 'unsubscribed' | 'bounced'

export interface Subscriber {
    id: number
    email: string
    name: string | null
    status: SubscriberStatus
    subscribed_at: string | null
    unsubscribed_at: string | null
    created_at: string
    updated_at: string
}

// Matches StoreSubscriberRequest/UpdateSubscriberRequest's validated() shape -
// unsubscribe_token is never an accepted input field, the backend generates it.
export interface SubscriberInput {
    email: string
    name?: string | null
    status?: SubscriberStatus
}

export type SubscriberUpdateInput = Partial<SubscriberInput>

export interface ListSubscribersParams {
    page?: number
    search?: string
    status?: SubscriberStatus
}
