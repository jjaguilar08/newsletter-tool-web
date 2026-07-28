import { useEffect, useState } from 'react'
import { deleteCampaign, listCampaigns, sendCampaign } from '../api/campaigns'
import { ApiError } from '../lib/apiClient'
import { CampaignFormModal } from '../components/CampaignFormModal'
import { CampaignPreviewModal } from '../components/CampaignPreviewModal'
import { CampaignScheduleModal } from '../components/CampaignScheduleModal'
import { CampaignStatusBadge } from '../components/CampaignStatusBadge'
import { CampaignViewModal } from '../components/CampaignViewModal'
import { ConfirmDialog } from '../components/ConfirmDialog'
import type { PaginationMeta } from '../types/pagination'
import type { Campaign, CampaignStatus } from '../types/campaign'

const STATUS_FILTER_OPTIONS: CampaignStatus[] = ['draft', 'scheduled', 'sending', 'sent']

// Mirrors CampaignPolicy::update on the backend (Draft/Scheduled only) - the
// UI shouldn't offer Edit/Delete on a row the backend will reject anyway.
const EDITABLE_STATUSES: CampaignStatus[] = ['draft', 'scheduled']

// Preview reads whatever content is currently saved, so it's only useful
// while a campaign can still change (same statuses as Edit) - Sending/Sent
// rows show the frozen content directly via CampaignViewModal instead.
const PREVIEWABLE_STATUSES: CampaignStatus[] = ['draft', 'scheduled']

type FormModalState = { mode: 'create' } | { mode: 'edit'; campaign: Campaign }

// toLocaleString (date + time), not toLocaleDateString - scheduled_at's time
// component is the actual point of the Schedule feature, not just its date.
function formatDate(value: string | null): string {
    if (!value) return '—'
    return new Date(value).toLocaleString()
}

export function CampaignListPage() {
    const [statusFilter, setStatusFilter] = useState<CampaignStatus | ''>('')
    const [page, setPage] = useState(1)
    const [refreshKey, setRefreshKey] = useState(0)

    const [campaigns, setCampaigns] = useState<Campaign[] | null>(null)
    const [meta, setMeta] = useState<PaginationMeta | null>(null)
    const [loadState, setLoadState] = useState<'loading' | 'ready' | 'error'>('loading')
    const [loadError, setLoadError] = useState<string | null>(null)
    const [loadErrorRetryable, setLoadErrorRetryable] = useState(true)

    const [formModal, setFormModal] = useState<FormModalState | null>(null)
    const [viewTarget, setViewTarget] = useState<Campaign | null>(null)
    const [previewTarget, setPreviewTarget] = useState<Campaign | null>(null)
    const [scheduleTarget, setScheduleTarget] = useState<Campaign | null>(null)
    const [deleteTarget, setDeleteTarget] = useState<Campaign | null>(null)
    const [isDeleting, setIsDeleting] = useState(false)
    const [deleteError, setDeleteError] = useState<string | null>(null)
    const [sendTarget, setSendTarget] = useState<Campaign | null>(null)
    const [isSending, setIsSending] = useState(false)
    const [sendError, setSendError] = useState<string | null>(null)

    useEffect(() => {
        let active = true

        listCampaigns({
            page,
            status: statusFilter || undefined,
        })
            .then((result) => {
                if (!active) return
                setCampaigns(result.data)
                setMeta(result.meta)
                setLoadState('ready')
            })
            .catch((error: unknown) => {
                if (!active) return
                setLoadState('error')
                setLoadError(
                    error instanceof ApiError
                        ? error.message
                        : 'Something went wrong loading campaigns.',
                )
                setLoadErrorRetryable(!(error instanceof ApiError && error.status === 422))
            })

        return () => {
            active = false
        }
    }, [page, statusFilter, refreshKey])

    function handleStatusChange(value: CampaignStatus | '') {
        setStatusFilter(value)
        setPage(1)
        setLoadState('loading')
    }

    function goToPage(updater: (current: number) => number) {
        setPage(updater)
        setLoadState('loading')
    }

    function retryLoad() {
        refreshList()
    }

    function handleSaved() {
        setFormModal(null)
        refreshList()
    }

    async function handleConfirmDelete() {
        if (!deleteTarget) return

        setIsDeleting(true)
        setDeleteError(null)

        try {
            await deleteCampaign(deleteTarget.id)
            setDeleteTarget(null)

            // Same pagination-stranding fix as Subscribers: land back a page
            // if we just deleted the only row on a non-first page.
            if (campaigns !== null && campaigns.length === 1 && page > 1) {
                goToPage((current) => current - 1)
            } else {
                refreshList()
            }
        } catch (error) {
            setDeleteError(error instanceof ApiError ? error.message : 'Failed to delete campaign.')
        } finally {
            setIsDeleting(false)
        }
    }

    function refreshList() {
        setLoadState('loading')
        setRefreshKey((key) => key + 1)
    }

    function handleScheduled() {
        setScheduleTarget(null)
        refreshList()
    }

    async function handleConfirmSend() {
        if (!sendTarget) return

        setIsSending(true)
        setSendError(null)

        try {
            await sendCampaign(sendTarget.id)
            setSendTarget(null)
            refreshList()
        } catch (error) {
            // A 409 here means the campaign was no longer a draft by the
            // time this click landed (already sent, or claimed by the
            // scheduler) - the backend's message already says exactly that,
            // so it's shown as-is rather than a generic failure. Either way
            // the list is stale, so refresh it in the background without
            // closing the dialog - the user still sees why nothing happened.
            setSendError(error instanceof ApiError ? error.message : 'Failed to send campaign.')
            if (error instanceof ApiError && error.status === 409) {
                refreshList()
            }
        } finally {
            setIsSending(false)
        }
    }

    const hasFilters = statusFilter !== ''

    return (
        <main>
            <h1>Campaigns</h1>

            <div>
                <label htmlFor="campaign-status-filter">Status</label>
                <select
                    id="campaign-status-filter"
                    value={statusFilter}
                    onChange={(event) =>
                        handleStatusChange(event.target.value as CampaignStatus | '')
                    }
                >
                    <option value="">All statuses</option>
                    {STATUS_FILTER_OPTIONS.map((option) => (
                        <option key={option} value={option}>
                            {option}
                        </option>
                    ))}
                </select>

                <button type="button" onClick={() => setFormModal({ mode: 'create' })}>
                    Add campaign
                </button>
            </div>

            {loadState === 'loading' && <p>Loading campaigns…</p>}

            {loadState === 'error' && (
                <div>
                    <p role="alert">{loadError}</p>
                    {loadErrorRetryable && (
                        <button type="button" onClick={retryLoad}>
                            Retry
                        </button>
                    )}
                </div>
            )}

            {loadState === 'ready' && campaigns !== null && campaigns.length === 0 && (
                <p>
                    {hasFilters
                        ? 'No campaigns match your filter.'
                        : 'No campaigns yet. Add one to get started.'}
                </p>
            )}

            {loadState === 'ready' && campaigns !== null && campaigns.length > 0 && (
                <>
                    <table>
                        <thead>
                            <tr>
                                <th>Subject</th>
                                <th>Status</th>
                                <th>Scheduled at</th>
                                <th>Sent at</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {campaigns.map((campaign) => {
                                const isEditable = EDITABLE_STATUSES.includes(campaign.status)
                                const isPreviewable = PREVIEWABLE_STATUSES.includes(campaign.status)
                                const isDraft = campaign.status === 'draft'
                                return (
                                    <tr key={campaign.id}>
                                        <td>{campaign.subject}</td>
                                        <td>
                                            <CampaignStatusBadge status={campaign.status} />
                                        </td>
                                        <td>{formatDate(campaign.scheduled_at)}</td>
                                        <td>{formatDate(campaign.sent_at)}</td>
                                        <td>
                                            {isPreviewable && (
                                                <button
                                                    type="button"
                                                    onClick={() => setPreviewTarget(campaign)}
                                                >
                                                    Preview
                                                </button>
                                            )}
                                            {isEditable ? (
                                                <>
                                                    <button
                                                        type="button"
                                                        onClick={() =>
                                                            setFormModal({ mode: 'edit', campaign })
                                                        }
                                                    >
                                                        Edit
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            setDeleteError(null)
                                                            setDeleteTarget(campaign)
                                                        }}
                                                    >
                                                        Delete
                                                    </button>
                                                </>
                                            ) : (
                                                <button
                                                    type="button"
                                                    onClick={() => setViewTarget(campaign)}
                                                >
                                                    View
                                                </button>
                                            )}
                                            {isDraft && (
                                                <>
                                                    <button
                                                        type="button"
                                                        onClick={() => setScheduleTarget(campaign)}
                                                    >
                                                        Schedule
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            setSendError(null)
                                                            setSendTarget(campaign)
                                                        }}
                                                    >
                                                        Send Now
                                                    </button>
                                                </>
                                            )}
                                        </td>
                                    </tr>
                                )
                            })}
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

            {formModal && (
                <CampaignFormModal
                    campaign={formModal.mode === 'edit' ? formModal.campaign : undefined}
                    onClose={() => setFormModal(null)}
                    onSaved={handleSaved}
                />
            )}

            {viewTarget && (
                <CampaignViewModal campaign={viewTarget} onClose={() => setViewTarget(null)} />
            )}

            {previewTarget && (
                <CampaignPreviewModal
                    campaign={previewTarget}
                    onClose={() => setPreviewTarget(null)}
                />
            )}

            {scheduleTarget && (
                <CampaignScheduleModal
                    campaign={scheduleTarget}
                    onClose={() => setScheduleTarget(null)}
                    onScheduled={handleScheduled}
                />
            )}

            {sendTarget && (
                <ConfirmDialog
                    title="Send campaign"
                    message={`Send "${sendTarget.subject}" now? This will email every subscribed recipient and cannot be undone.`}
                    confirmLabel="Send Now"
                    isConfirming={isSending}
                    error={sendError}
                    onConfirm={() => void handleConfirmSend()}
                    onCancel={() => setSendTarget(null)}
                />
            )}

            {deleteTarget && (
                <ConfirmDialog
                    title="Delete campaign"
                    message={`Are you sure you want to delete "${deleteTarget.subject}"? This cannot be undone.`}
                    confirmLabel="Delete"
                    isConfirming={isDeleting}
                    error={deleteError}
                    onConfirm={() => void handleConfirmDelete()}
                    onCancel={() => setDeleteTarget(null)}
                />
            )}
        </main>
    )
}
