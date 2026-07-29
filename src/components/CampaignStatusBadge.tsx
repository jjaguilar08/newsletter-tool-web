import type { CampaignStatus } from '../types/campaign'

const STATUS_CLASSES: Record<CampaignStatus, string> = {
    draft: 'bg-slate-200 text-slate-800',
    scheduled: 'bg-amber-100 text-amber-800',
    sending: 'bg-blue-100 text-blue-800',
    sent: 'bg-green-100 text-green-800',
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
            className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold ${STATUS_CLASSES[status]}`}
        >
            {STATUS_LABELS[status]}
        </span>
    )
}
