import { useEffect, useState } from 'react'
import { listCampaignSends } from '../api/campaignSends'
import { ApiError } from '../lib/apiClient'
import type { Campaign } from '../types/campaign'
import type { CampaignSend } from '../types/campaignSend'
import type { PaginationMeta } from '../types/pagination'

interface CampaignViewModalProps {
    campaign: Campaign
    onClose: () => void
}

function formatDate(value: string | null): string {
    if (!value) return '—'
    return new Date(value).toLocaleString()
}

// Read-only view for Sending/Sent campaigns - CampaignFormModal always
// offers a Save button, which the backend would reject with a 403 for these
// statuses (CampaignPolicy::update is Draft/Scheduled only), so reusing it
// here would be misleading rather than actually preventing the edit. Also
// shows the campaign's send log, since that's only meaningful once a
// campaign has actually started sending.
export function CampaignViewModal({ campaign, onClose }: CampaignViewModalProps) {
    const [page, setPage] = useState(1)
    const [sends, setSends] = useState<CampaignSend[] | null>(null)
    const [meta, setMeta] = useState<PaginationMeta | null>(null)
    const [loadState, setLoadState] = useState<'loading' | 'ready' | 'error'>('loading')
    const [loadError, setLoadError] = useState<string | null>(null)

    useEffect(() => {
        let active = true

        listCampaignSends(campaign.id, { page })
            .then((result) => {
                if (!active) return
                setSends(result.data)
                setMeta(result.meta)
                setLoadState('ready')
            })
            .catch((error: unknown) => {
                if (!active) return
                setLoadState('error')
                setLoadError(
                    error instanceof ApiError ? error.message : 'Failed to load the send log.',
                )
            })

        return () => {
            active = false
        }
    }, [campaign.id, page])

    function goToPage(updater: (current: number) => number) {
        setLoadState('loading')
        setPage(updater)
    }

    return (
        <div role="dialog" aria-modal="true" aria-label="View campaign">
            <h2>{campaign.subject}</h2>
            <p>{campaign.content}</p>

            <h3>Send log</h3>

            {loadState === 'loading' && <p>Loading send log…</p>}

            {loadState === 'error' && <p role="alert">{loadError}</p>}

            {loadState === 'ready' && sends !== null && sends.length === 0 && <p>No sends yet.</p>}

            {loadState === 'ready' && sends !== null && sends.length > 0 && (
                <>
                    <table>
                        <thead>
                            <tr>
                                <th>Email</th>
                                <th>Status</th>
                                <th>Sent at</th>
                                <th>Error</th>
                            </tr>
                        </thead>
                        <tbody>
                            {sends.map((send) => (
                                <tr key={send.id}>
                                    <td>{send.subscriber_email}</td>
                                    <td>{send.status}</td>
                                    <td>{formatDate(send.sent_at)}</td>
                                    <td>{send.error_message ?? '—'}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>

                    {meta && (
                        <div>
                            <button
                                type="button"
                                onClick={() => goToPage((current) => current - 1)}
                                disabled={meta.current_page <= 1}
                            >
                                Previous
                            </button>
                            <span>
                                Page {meta.current_page} of {meta.last_page} ({meta.total} total)
                            </span>
                            <button
                                type="button"
                                onClick={() => goToPage((current) => current + 1)}
                                disabled={meta.current_page >= meta.last_page}
                            >
                                Next
                            </button>
                        </div>
                    )}
                </>
            )}

            <button type="button" onClick={onClose}>
                Close
            </button>
        </div>
    )
}
