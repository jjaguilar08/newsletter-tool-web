import { useEffect, useState } from 'react'
import { listCampaignSends } from '../api/campaignSends'
import { ApiError } from '../lib/apiClient'
import { Spinner } from './Spinner'
import {
    alertError,
    buttonSecondary,
    buttonSecondarySm,
    emptyState,
    loadingState,
    modalActions,
    modalOverlay,
    modalPanelWide,
    modalTitle,
    paginationBar,
    subheading,
    table,
    tableBody,
    tableHeadRow,
    tableRow,
    tableWrapper,
    td,
    th,
} from '../styles/ui'
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
    const [refreshKey, setRefreshKey] = useState(0)
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
    }, [campaign.id, page, refreshKey])

    function goToPage(updater: (current: number) => number) {
        setLoadState('loading')
        setPage(updater)
    }

    function retryLoad() {
        setLoadState('loading')
        setRefreshKey((key) => key + 1)
    }

    return (
        <div className={modalOverlay}>
            <div
                role="dialog"
                aria-modal="true"
                aria-label="View campaign"
                className={modalPanelWide}
            >
                <h2 className={modalTitle}>{campaign.subject}</h2>
                <p className="mt-2 whitespace-pre-wrap text-sm text-beacon-ink">
                    {campaign.content}
                </p>

                <h3 className={`mt-6 mb-4 ${subheading}`}>Send log</h3>

                {loadState === 'loading' && (
                    <div className={loadingState}>
                        <Spinner />
                        <span>Loading send log…</span>
                    </div>
                )}

                {loadState === 'error' && (
                    <div className={alertError}>
                        <p role="alert">{loadError}</p>
                        <button
                            type="button"
                            onClick={retryLoad}
                            className={`${buttonSecondary} mt-3`}
                        >
                            Retry
                        </button>
                    </div>
                )}

                {loadState === 'ready' && sends !== null && sends.length === 0 && (
                    <div className={emptyState}>
                        <p>No sends yet.</p>
                    </div>
                )}

                {loadState === 'ready' && sends !== null && sends.length > 0 && (
                    <div className={tableWrapper}>
                        <table className={table}>
                            <thead className={tableHeadRow}>
                                <tr>
                                    <th className={th}>Email</th>
                                    <th className={th}>Status</th>
                                    <th className={th}>Sent at</th>
                                    <th className={th}>Error</th>
                                </tr>
                            </thead>
                            <tbody className={tableBody}>
                                {sends.map((send) => (
                                    <tr key={send.id} className={tableRow}>
                                        <td className={td}>{send.subscriber_email}</td>
                                        <td className={td}>{send.status}</td>
                                        <td className={td}>{formatDate(send.sent_at)}</td>
                                        <td className={td}>{send.error_message ?? '—'}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>

                        {meta && (
                            <div className={paginationBar}>
                                <button
                                    type="button"
                                    onClick={() => goToPage((current) => current - 1)}
                                    disabled={meta.current_page <= 1}
                                    className={buttonSecondarySm}
                                >
                                    Previous
                                </button>
                                <span>
                                    Page {meta.current_page} of {meta.last_page} ({meta.total}{' '}
                                    total)
                                </span>
                                <button
                                    type="button"
                                    onClick={() => goToPage((current) => current + 1)}
                                    disabled={meta.current_page >= meta.last_page}
                                    className={buttonSecondarySm}
                                >
                                    Next
                                </button>
                            </div>
                        )}
                    </div>
                )}

                <div className={modalActions}>
                    <button type="button" onClick={onClose} className={buttonSecondary}>
                        Close
                    </button>
                </div>
            </div>
        </div>
    )
}
