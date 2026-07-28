import { useEffect, useState } from 'react'
import { deleteSubscriber, listSubscribers } from '../api/subscribers'
import { ApiError } from '../lib/apiClient'
import { ConfirmDialog } from '../components/ConfirmDialog'
import { SubscriberFormModal } from '../components/SubscriberFormModal'
import { SubscriberImportModal } from '../components/SubscriberImportModal'
import { useDebouncedValue } from '../hooks/useDebouncedValue'
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
        <main>
            <h1>Subscribers</h1>

            <div>
                <label htmlFor="subscriber-search">Search</label>
                <input
                    id="subscriber-search"
                    type="search"
                    value={searchInput}
                    onChange={(event) => handleSearchChange(event.target.value)}
                    placeholder="Search by email or name"
                    maxLength={255}
                />

                <label htmlFor="subscriber-status-filter">Status</label>
                <select
                    id="subscriber-status-filter"
                    value={statusFilter}
                    onChange={(event) =>
                        handleStatusChange(event.target.value as SubscriberStatus | '')
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
                    Add subscriber
                </button>
                <button type="button" onClick={() => setIsImportOpen(true)}>
                    Import CSV
                </button>
            </div>

            {loadState === 'loading' && <p>Loading subscribers…</p>}

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

            {loadState === 'ready' && subscribers !== null && subscribers.length === 0 && (
                <p>
                    {hasFilters
                        ? 'No subscribers match your search.'
                        : 'No subscribers yet. Add one to get started.'}
                </p>
            )}

            {loadState === 'ready' && subscribers !== null && subscribers.length > 0 && (
                <>
                    <table>
                        <thead>
                            <tr>
                                <th>Email</th>
                                <th>Name</th>
                                <th>Status</th>
                                <th>Subscribed at</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {subscribers.map((subscriber) => (
                                <tr key={subscriber.id}>
                                    <td>{subscriber.email}</td>
                                    <td>{subscriber.name ?? '—'}</td>
                                    <td>{subscriber.status}</td>
                                    <td>{formatDate(subscriber.subscribed_at)}</td>
                                    <td>
                                        <button
                                            type="button"
                                            onClick={() =>
                                                setFormModal({ mode: 'edit', subscriber })
                                            }
                                        >
                                            Edit
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setDeleteError(null)
                                                setDeleteTarget(subscriber)
                                            }}
                                        >
                                            Delete
                                        </button>
                                    </td>
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
        </main>
    )
}
