import type { Campaign } from '../types/campaign'

interface CampaignViewModalProps {
    campaign: Campaign
    onClose: () => void
}

// Read-only view for Sending/Sent campaigns - CampaignFormModal always
// offers a Save button, which the backend would reject with a 403 for these
// statuses (CampaignPolicy::update is Draft/Scheduled only), so reusing it
// here would be misleading rather than actually preventing the edit.
export function CampaignViewModal({ campaign, onClose }: CampaignViewModalProps) {
    return (
        <div role="dialog" aria-modal="true" aria-label="View campaign">
            <h2>{campaign.subject}</h2>
            <p>{campaign.content}</p>
            <button type="button" onClick={onClose}>
                Close
            </button>
        </div>
    )
}
