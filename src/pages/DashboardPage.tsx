import { useEffect, useState } from 'react'
import { getDashboardStats } from '../api/dashboard'
import { ApiError } from '../lib/apiClient'
import { CampaignStatusBadge } from '../components/CampaignStatusBadge'
import { Spinner } from '../components/Spinner'
import {
    alertError,
    buttonSecondary,
    card,
    emptyState,
    loadingState,
    pageContainer,
    pageHeading,
    statLabel,
    statValue,
    subheading,
    table,
    tableBody,
    tableHeadRow,
    tableRow,
    tableWrapper,
    td,
    th,
} from '../styles/ui'
import type { DashboardStats } from '../types/dashboardStats'

function formatDate(value: string | null): string {
    if (!value) return '—'
    return new Date(value).toLocaleString()
}

export function DashboardPage() {
    const [stats, setStats] = useState<DashboardStats | null>(null)
    const [loadState, setLoadState] = useState<'loading' | 'ready' | 'error'>('loading')
    const [loadError, setLoadError] = useState<string | null>(null)
    const [refreshKey, setRefreshKey] = useState(0)

    useEffect(() => {
        let active = true

        getDashboardStats()
            .then((result) => {
                if (!active) return
                setStats(result)
                setLoadState('ready')
            })
            .catch((error: unknown) => {
                if (!active) return
                setLoadState('error')
                setLoadError(
                    error instanceof ApiError
                        ? error.message
                        : 'Something went wrong loading the dashboard.',
                )
            })

        return () => {
            active = false
        }
    }, [refreshKey])

    function refreshStats() {
        setLoadState('loading')
        setRefreshKey((key) => key + 1)
    }

    return (
        <div className={pageContainer}>
            <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
                <h1 className={pageHeading}>Dashboard</h1>
                <button type="button" onClick={refreshStats} className={buttonSecondary}>
                    Refresh
                </button>
            </div>

            {loadState === 'loading' && (
                <div className={loadingState}>
                    <Spinner />
                    <span>Loading dashboard…</span>
                </div>
            )}

            {loadState === 'error' && (
                <div className={alertError}>
                    <p role="alert">{loadError}</p>
                    <button
                        type="button"
                        onClick={refreshStats}
                        className={`${buttonSecondary} mt-3`}
                    >
                        Retry
                    </button>
                </div>
            )}

            {loadState === 'ready' && stats && (
                <div className="space-y-8">
                    <div className="grid gap-6 sm:grid-cols-3">
                        <section className={`${card} p-6`}>
                            <h2 className={subheading}>Subscribers</h2>
                            <dl className="mt-4 space-y-2 text-sm">
                                <div className="flex items-center justify-between">
                                    <dt className={statLabel}>Subscribed</dt>
                                    <dd className={statValue}>{stats.subscribers.subscribed}</dd>
                                </div>
                                <div className="flex items-center justify-between">
                                    <dt className={statLabel}>Unsubscribed</dt>
                                    <dd className={statValue}>{stats.subscribers.unsubscribed}</dd>
                                </div>
                                <div className="flex items-center justify-between">
                                    <dt className={statLabel}>Bounced</dt>
                                    <dd className={statValue}>{stats.subscribers.bounced}</dd>
                                </div>
                            </dl>
                        </section>

                        <section className={`${card} p-6`}>
                            <h2 className={subheading}>Campaigns</h2>
                            <dl className="mt-4 space-y-2 text-sm">
                                <div className="flex items-center justify-between">
                                    <dt className={statLabel}>Draft</dt>
                                    <dd className={statValue}>{stats.campaigns.draft}</dd>
                                </div>
                                <div className="flex items-center justify-between">
                                    <dt className={statLabel}>Scheduled</dt>
                                    <dd className={statValue}>{stats.campaigns.scheduled}</dd>
                                </div>
                                <div className="flex items-center justify-between">
                                    <dt className={statLabel}>Sending</dt>
                                    <dd className={statValue}>{stats.campaigns.sending}</dd>
                                </div>
                                <div className="flex items-center justify-between">
                                    <dt className={statLabel}>Sent</dt>
                                    <dd className={statValue}>{stats.campaigns.sent}</dd>
                                </div>
                            </dl>
                        </section>

                        <section className={`${card} p-6`}>
                            <h2 className={subheading}>Campaign sends</h2>
                            <dl className="mt-4 space-y-2 text-sm">
                                <div className="flex items-center justify-between">
                                    <dt className={statLabel}>Sent</dt>
                                    <dd className={statValue}>{stats.campaign_sends.sent}</dd>
                                </div>
                                <div className="flex items-center justify-between">
                                    <dt className={statLabel}>Failed</dt>
                                    <dd className={statValue}>{stats.campaign_sends.failed}</dd>
                                </div>
                            </dl>
                        </section>
                    </div>

                    <section>
                        <h2 className={`${subheading} mb-4`}>Recent campaigns</h2>
                        {stats.recent_campaigns.length === 0 ? (
                            <div className={emptyState}>
                                <p>No campaigns yet.</p>
                            </div>
                        ) : (
                            <div className={tableWrapper}>
                                <table className={table}>
                                    <thead className={tableHeadRow}>
                                        <tr>
                                            <th className={th}>Subject</th>
                                            <th className={th}>Status</th>
                                            <th className={th}>Sent at</th>
                                        </tr>
                                    </thead>
                                    <tbody className={tableBody}>
                                        {stats.recent_campaigns.map((campaign, index) => (
                                            // No id in this response shape - index is
                                            // stable since the list is only ever
                                            // replaced wholesale on refresh.
                                            <tr key={index} className={tableRow}>
                                                <td className={td}>{campaign.subject}</td>
                                                <td className={td}>
                                                    <CampaignStatusBadge status={campaign.status} />
                                                </td>
                                                <td className={td}>
                                                    {formatDate(campaign.sent_at)}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </section>
                </div>
            )}
        </div>
    )
}
