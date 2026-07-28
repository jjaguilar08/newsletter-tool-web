import type { CampaignStatus } from '../types/campaign'

const STATUS_STYLES: Record<CampaignStatus, { background: string; color: string }> = {
    draft: { background: '#e2e8f0', color: '#1e293b' },
    scheduled: { background: '#fef3c7', color: '#92400e' },
    sending: { background: '#dbeafe', color: '#1e40af' },
    sent: { background: '#dcfce7', color: '#166534' },
}

const STATUS_LABELS: Record<CampaignStatus, string> = {
    draft: 'Draft',
    scheduled: 'Scheduled',
    sending: 'Sending',
    sent: 'Sent',
}

interface CampaignStatusBadgeProps {
    status: CampaignStatus
}

export function CampaignStatusBadge({ status }: CampaignStatusBadgeProps) {
    return (
        <span
            style={{
                ...STATUS_STYLES[status],
                display: 'inline-block',
                padding: '0.15em 0.6em',
                borderRadius: '999px',
                fontSize: '0.85em',
                fontWeight: 600,
            }}
        >
            {STATUS_LABELS[status]}
        </span>
    )
}
