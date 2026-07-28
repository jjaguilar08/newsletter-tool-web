import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { getDashboardStats } from '../api/dashboard'
import { useAuth } from '../hooks/useAuth'
import { ApiError } from '../lib/apiClient'
import { CampaignStatusBadge } from '../components/CampaignStatusBadge'
import type { DashboardStats } from '../types/dashboardStats'

function formatDate(value: string | null): string {
    if (!value) return '—'
    return new Date(value).toLocaleString()
}

export function DashboardPage() {
    const { user, logout } = useAuth()

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
        <main>
            <h1>Dashboard</h1>
            <p>Signed in as {user?.name}</p>
            <nav>
                <Link to="/subscribers">Subscribers</Link>
                <Link to="/campaigns">Campaigns</Link>
            </nav>
            <button type="button" onClick={() => void logout()}>
                Log out
            </button>

            <button type="button" onClick={refreshStats}>
                Refresh
            </button>

            {loadState === 'loading' && <p>Loading dashboard…</p>}

            {loadState === 'error' && (
                <div>
                    <p role="alert">{loadError}</p>
                    <button type="button" onClick={refreshStats}>
                        Retry
                    </button>
                </div>
            )}

            {loadState === 'ready' && stats && (
                <>
                    <section>
                        <h2>Subscribers</h2>
                        <dl>
                            <dt>Subscribed</dt>
                            <dd>{stats.subscribers.subscribed}</dd>
                            <dt>Unsubscribed</dt>
                            <dd>{stats.subscribers.unsubscribed}</dd>
                            <dt>Bounced</dt>
                            <dd>{stats.subscribers.bounced}</dd>
                        </dl>
                    </section>

                    <section>
                        <h2>Campaigns</h2>
                        <dl>
                            <dt>Draft</dt>
                            <dd>{stats.campaigns.draft}</dd>
                            <dt>Scheduled</dt>
                            <dd>{stats.campaigns.scheduled}</dd>
                            <dt>Sending</dt>
                            <dd>{stats.campaigns.sending}</dd>
                            <dt>Sent</dt>
                            <dd>{stats.campaigns.sent}</dd>
                        </dl>
                    </section>

                    <section>
                        <h2>Campaign sends</h2>
                        <dl>
                            <dt>Sent</dt>
                            <dd>{stats.campaign_sends.sent}</dd>
                            <dt>Failed</dt>
                            <dd>{stats.campaign_sends.failed}</dd>
                        </dl>
                    </section>

                    <section>
                        <h2>Recent campaigns</h2>
                        {stats.recent_campaigns.length === 0 ? (
                            <p>No campaigns yet.</p>
                        ) : (
                            <table>
                                <thead>
                                    <tr>
                                        <th>Subject</th>
                                        <th>Status</th>
                                        <th>Sent at</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {stats.recent_campaigns.map((campaign, index) => (
                                        // No id in this response shape - index is
                                        // stable since the list is only ever
                                        // replaced wholesale on refresh.
                                        <tr key={index}>
                                            <td>{campaign.subject}</td>
                                            <td>
                                                <CampaignStatusBadge status={campaign.status} />
                                            </td>
                                            <td>{formatDate(campaign.sent_at)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </section>
                </>
            )}
        </main>
    )
}
