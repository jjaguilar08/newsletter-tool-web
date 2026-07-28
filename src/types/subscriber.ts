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

// Matches SubscriberController::import()'s response shape exactly (see
// PROJECT_NOTES.md Day 4/10) - row numbers count the header as row 1, so the
// first data row is row 2, matching what a user sees in a spreadsheet.
export interface SkippedImportRow {
    row: number
    reason: string
}

export interface ImportSubscribersResult {
    created: number
    updated: number
    skipped: number
    skipped_rows: SkippedImportRow[]
}
