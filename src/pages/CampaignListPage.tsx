import { useEffect, useState } from 'react'
import { deleteCampaign, listCampaigns, sendCampaign } from '../api/campaigns'
import { ApiError } from '../lib/apiClient'
import { CampaignFormModal } from '../components/CampaignFormModal'
import { CampaignPreviewModal } from '../components/CampaignPreviewModal'
import { CampaignScheduleModal } from '../components/CampaignScheduleModal'
import { CampaignStatusBadge } from '../components/CampaignStatusBadge'
import { CampaignViewModal } from '../components/CampaignViewModal'
import { ConfirmDialog } from '../components/ConfirmDialog'
import { Spinner } from '../components/Spinner'
import {
    alertError,
    buttonDestructiveSm,
    buttonPrimary,
    buttonPrimarySm,
    buttonSecondary,
    buttonSecondarySm,
    card,
    emptyState,
    label,
    loadingState,
    paginationBar,
    pageContainer,
    pageHeading,
    rowActions,
    select,
    table,
    tableBody,
    tableHeadRow,
    tableRow,
    tableWrapper,
    td,
    th,
} from '../styles/ui'
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
        <>
            <div className={pageContainer}>
                <h1 className={`mb-6 ${pageHeading}`}>Campaigns</h1>

                <div className={`${card} mb-6 flex flex-wrap items-end gap-4 p-4`}>
                    <div>
                        <label htmlFor="campaign-status-filter" className={label}>
                            Status
                        </label>
                        <select
                            id="campaign-status-filter"
                            value={statusFilter}
                            onChange={(event) =>
                                handleStatusChange(event.target.value as CampaignStatus | '')
                            }
                            className={select}
                        >
                            <option value="">All statuses</option>
                            {STATUS_FILTER_OPTIONS.map((option) => (
                                <option key={option} value={option}>
                                    {option}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className="ml-auto">
                        <button
                            type="button"
                            onClick={() => setFormModal({ mode: 'create' })}
                            className={buttonPrimary}
                        >
                            Add campaign
                        </button>
                    </div>
                </div>

                {loadState === 'loading' && (
                    <div className={loadingState}>
                        <Spinner />
                        <span>Loading campaigns…</span>
                    </div>
                )}

                {loadState === 'error' && (
                    <div className={alertError}>
                        <p role="alert">{loadError}</p>
                        {loadErrorRetryable && (
                            <button
                                type="button"
                                onClick={retryLoad}
                                className={`${buttonSecondary} mt-3`}
                            >
                                Retry
                            </button>
                        )}
                    </div>
                )}

                {loadState === 'ready' && campaigns !== null && campaigns.length === 0 && (
                    <div className={emptyState}>
                        <p>
                            {hasFilters
                                ? 'No campaigns match your filter.'
                                : 'No campaigns yet. Add one to get started.'}
                        </p>
                    </div>
                )}

                {loadState === 'ready' && campaigns !== null && campaigns.length > 0 && (
                    <div className={tableWrapper}>
                        <table className={table}>
                            <thead className={tableHeadRow}>
                                <tr>
                                    <th className={th}>Subject</th>
                                    <th className={th}>Status</th>
                                    <th className={th}>Scheduled at</th>
                                    <th className={th}>Sent at</th>
                                    <th className={th}>Actions</th>
                                </tr>
                            </thead>
                            <tbody className={tableBody}>
                                {campaigns.map((campaign) => {
                                    const isEditable = EDITABLE_STATUSES.includes(campaign.status)
                                    const isPreviewable = PREVIEWABLE_STATUSES.includes(
                                        campaign.status,
                                    )
                                    const isDraft = campaign.status === 'draft'
                                    return (
                                        <tr key={campaign.id} className={tableRow}>
                                            <td className={td}>{campaign.subject}</td>
                                            <td className={td}>
                                                <CampaignStatusBadge status={campaign.status} />
                                            </td>
                                            <td className={td}>
                                                {formatDate(campaign.scheduled_at)}
                                            </td>
                                            <td className={td}>{formatDate(campaign.sent_at)}</td>
                                            <td className={td}>
                                                <div className={rowActions}>
                                                    {isPreviewable && (
                                                        <button
                                                            type="button"
                                                            onClick={() =>
                                                                setPreviewTarget(campaign)
                                                            }
                                                            className={buttonSecondarySm}
                                                        >
                                                            Preview
                                                        </button>
                                                    )}
                                                    {isEditable ? (
                                                        <>
                                                            <button
                                                                type="button"
                                                                onClick={() =>
                                                                    setFormModal({
                                                                        mode: 'edit',
                                                                        campaign,
                                                                    })
                                                                }
                                                                className={buttonSecondarySm}
                                                            >
                                                                Edit
                                                            </button>
                                                            <button
                                                                type="button"
                                                                onClick={() => {
                                                                    setDeleteError(null)
                                                                    setDeleteTarget(campaign)
                                                                }}
                                                                className={buttonDestructiveSm}
                                                            >
                                                                Delete
                                                            </button>
                                                        </>
                                                    ) : (
                                                        <button
                                                            type="button"
                                                            onClick={() => setViewTarget(campaign)}
                                                            className={buttonSecondarySm}
                                                        >
                                                            View
                                                        </button>
                                                    )}
                                                    {isDraft && (
                                                        <>
                                                            <button
                                                                type="button"
                                                                onClick={() =>
                                                                    setScheduleTarget(campaign)
                                                                }
                                                                className={buttonSecondarySm}
                                                            >
                                                                Schedule
                                                            </button>
                                                            <button
                                                                type="button"
                                                                onClick={() => {
                                                                    setSendError(null)
                                                                    setSendTarget(campaign)
                                                                }}
                                                                className={buttonPrimarySm}
                                                            >
                                                                Send Now
                                                            </button>
                                                        </>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    )
                                })}
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
            </div>

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
        </>
    )
}
