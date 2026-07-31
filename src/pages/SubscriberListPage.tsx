import { useEffect, useState } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faPenToSquare, faTrashCan } from '@fortawesome/free-solid-svg-icons'
import { deleteSubscriber, listSubscribers } from '../api/subscribers'
import { ApiError } from '../lib/apiClient'
import { ConfirmDialog } from '../components/ConfirmDialog'
import { SubscriberFormModal } from '../components/SubscriberFormModal'
import { SubscriberImportModal } from '../components/SubscriberImportModal'
import { Spinner } from '../components/Spinner'
import { useDebouncedValue } from '../hooks/useDebouncedValue'
import {
    alertError,
    buttonPrimary,
    buttonSecondary,
    buttonSecondarySm,
    card,
    emptyState,
    iconButtonDestructive,
    iconButtonSecondary,
    input,
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
import type { Subscriber, SubscriberStatus } from '../types/subscriber'

const STATUS_FILTER_OPTIONS: SubscriberStatus[] = ['subscribed', 'unsubscribed', 'bounced']

type FormModalState = { mode: 'create' } | { mode: 'edit'; subscriber: Subscriber }

function formatDate(value: string | null): string {
    if (!value) return '—'
    return new Date(value).toLocaleDateString()
}

export function SubscriberListPage() {
    const [searchInput, setSearchInput] = useState('')
    const debouncedSearch = useDebouncedValue(searchInput, 300)
    const [statusFilter, setStatusFilter] = useState<SubscriberStatus | ''>('')
    const [page, setPage] = useState(1)
    const [refreshKey, setRefreshKey] = useState(0)

    const [subscribers, setSubscribers] = useState<Subscriber[] | null>(null)
    const [meta, setMeta] = useState<PaginationMeta | null>(null)
    const [loadState, setLoadState] = useState<'loading' | 'ready' | 'error'>('loading')
    const [loadError, setLoadError] = useState<string | null>(null)
    // 422s here mean the current search/status params themselves are invalid
    // (e.g. search over the backend's 255-char limit) - retrying with the
    // same params can't succeed, so Retry is only offered for errors where
    // resending might actually help (network blips, 5xx).
    const [loadErrorRetryable, setLoadErrorRetryable] = useState(true)

    const [formModal, setFormModal] = useState<FormModalState | null>(null)
    const [isImportOpen, setIsImportOpen] = useState(false)
    const [deleteTarget, setDeleteTarget] = useState<Subscriber | null>(null)
    const [isDeleting, setIsDeleting] = useState(false)
    const [deleteError, setDeleteError] = useState<string | null>(null)

    useEffect(() => {
        let active = true

        listSubscribers({
            page,
            search: debouncedSearch || undefined,
            status: statusFilter || undefined,
        })
            .then((result) => {
                if (!active) return
                setSubscribers(result.data)
                setMeta(result.meta)
                setLoadState('ready')
            })
            .catch((error: unknown) => {
                if (!active) return
                setLoadState('error')
                setLoadError(
                    error instanceof ApiError
                        ? error.message
                        : 'Something went wrong loading subscribers.',
                )
                setLoadErrorRetryable(!(error instanceof ApiError && error.status === 422))
            })

        return () => {
            active = false
        }
    }, [page, debouncedSearch, statusFilter, refreshKey])

    function handleSearchChange(value: string) {
        setSearchInput(value)
        setPage(1)
        setLoadState('loading')
    }

    function handleStatusChange(value: SubscriberStatus | '') {
        setStatusFilter(value)
        setPage(1)
        setLoadState('loading')
    }

    function goToPage(updater: (current: number) => number) {
        setPage(updater)
        setLoadState('loading')
    }

    function retryLoad() {
        setLoadState('loading')
        setRefreshKey((key) => key + 1)
    }

    function handleSaved() {
        setFormModal(null)
        setLoadState('loading')
        setRefreshKey((key) => key + 1)
    }

    function handleImported() {
        setLoadState('loading')
        setRefreshKey((key) => key + 1)
    }

    async function handleConfirmDelete() {
        if (!deleteTarget) return

        setIsDeleting(true)
        setDeleteError(null)

        try {
            await deleteSubscriber(deleteTarget.id)
            setDeleteTarget(null)

            // If the row we just deleted was the only one on this page and
            // we're not already on page 1, land back on the previous page
            // instead of refetching the now-out-of-range current page and
            // showing a false "no subscribers" empty state.
            if (subscribers !== null && subscribers.length === 1 && page > 1) {
                goToPage((current) => current - 1)
            } else {
                setLoadState('loading')
                setRefreshKey((key) => key + 1)
            }
        } catch (error) {
            setDeleteError(
                error instanceof ApiError ? error.message : 'Failed to delete subscriber.',
            )
        } finally {
            setIsDeleting(false)
        }
    }

    const hasFilters = debouncedSearch !== '' || statusFilter !== ''

    return (
        <>
            <div className={pageContainer}>
                <h1 className={`mb-6 ${pageHeading}`}>Subscribers</h1>

                <div className={`${card} mb-6 flex flex-wrap items-end gap-4 p-4`}>
                    <div>
                        <label htmlFor="subscriber-search" className={label}>
                            Search
                        </label>
                        <input
                            id="subscriber-search"
                            type="search"
                            value={searchInput}
                            onChange={(event) => handleSearchChange(event.target.value)}
                            placeholder="Search by email or name"
                            maxLength={255}
                            className={`${input} w-64`}
                        />
                    </div>

                    <div>
                        <label htmlFor="subscriber-status-filter" className={label}>
                            Status
                        </label>
                        <select
                            id="subscriber-status-filter"
                            value={statusFilter}
                            onChange={(event) =>
                                handleStatusChange(event.target.value as SubscriberStatus | '')
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

                    <div className="ml-auto flex flex-wrap gap-3">
                        <button
                            type="button"
                            onClick={() => setFormModal({ mode: 'create' })}
                            className={buttonPrimary}
                        >
                            Add subscriber
                        </button>
                        <button
                            type="button"
                            onClick={() => setIsImportOpen(true)}
                            className={buttonSecondary}
                        >
                            Import CSV
                        </button>
                    </div>
                </div>

                {loadState === 'loading' && (
                    <div className={loadingState}>
                        <Spinner />
                        <span>Loading subscribers…</span>
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

                {loadState === 'ready' && subscribers !== null && subscribers.length === 0 && (
                    <div className={emptyState}>
                        <p>
                            {hasFilters
                                ? 'No subscribers match your search.'
                                : 'No subscribers yet. Add one to get started.'}
                        </p>
                    </div>
                )}

                {loadState === 'ready' && subscribers !== null && subscribers.length > 0 && (
                    <div className={tableWrapper}>
                        <table className={table}>
                            <thead className={tableHeadRow}>
                                <tr>
                                    <th className={th}>Email</th>
                                    <th className={th}>Name</th>
                                    <th className={th}>Status</th>
                                    <th className={th}>Subscribed at</th>
                                    <th className={th}>Actions</th>
                                </tr>
                            </thead>
                            <tbody className={tableBody}>
                                {subscribers.map((subscriber) => (
                                    <tr key={subscriber.id} className={tableRow}>
                                        <td className={td}>{subscriber.email}</td>
                                        <td className={td}>{subscriber.name ?? '—'}</td>
                                        <td className={td}>{subscriber.status}</td>
                                        <td className={td}>
                                            {formatDate(subscriber.subscribed_at)}
                                        </td>
                                        <td className={td}>
                                            <div className={rowActions}>
                                                <button
                                                    type="button"
                                                    onClick={() =>
                                                        setFormModal({ mode: 'edit', subscriber })
                                                    }
                                                    aria-label="Edit"
                                                    title="Edit"
                                                    className={iconButtonSecondary}
                                                >
                                                    <FontAwesomeIcon icon={faPenToSquare} />
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        setDeleteError(null)
                                                        setDeleteTarget(subscriber)
                                                    }}
                                                    aria-label="Delete"
                                                    title="Delete"
                                                    className={iconButtonDestructive}
                                                >
                                                    <FontAwesomeIcon icon={faTrashCan} />
                                                </button>
                                            </div>
                                        </td>
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
            </div>

            {formModal && (
                <SubscriberFormModal
                    subscriber={formModal.mode === 'edit' ? formModal.subscriber : undefined}
                    onClose={() => setFormModal(null)}
                    onSaved={handleSaved}
                />
            )}

            {isImportOpen && (
                <SubscriberImportModal
                    onClose={() => setIsImportOpen(false)}
                    onImported={handleImported}
                />
            )}

            {deleteTarget && (
                <ConfirmDialog
                    title="Delete subscriber"
                    message={`Are you sure you want to delete ${deleteTarget.email}? This cannot be undone.`}
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
