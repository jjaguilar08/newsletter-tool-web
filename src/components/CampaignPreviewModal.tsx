import { useEffect, useState } from 'react'
import { previewCampaign } from '../api/campaigns'
import { ApiError } from '../lib/apiClient'
import type { Campaign, CampaignPreview } from '../types/campaign'

interface CampaignPreviewModalProps {
    campaign: Campaign
    onClose: () => void
}

export function CampaignPreviewModal({ campaign, onClose }: CampaignPreviewModalProps) {
    const [preview, setPreview] = useState<CampaignPreview | null>(null)
    const [loadState, setLoadState] = useState<'loading' | 'ready' | 'error'>('loading')
    const [loadError, setLoadError] = useState<string | null>(null)

    useEffect(() => {
        let active = true

        previewCampaign(campaign.id)
            .then((result) => {
                if (!active) return
                setPreview(result)
                setLoadState('ready')
            })
            .catch((error: unknown) => {
                if (!active) return
                setLoadState('error')
                setLoadError(
                    error instanceof ApiError ? error.message : 'Failed to load the preview.',
                )
            })

        return () => {
            active = false
        }
    }, [campaign.id])

    return (
        <div role="dialog" aria-modal="true" aria-label="Preview campaign">
            <h2>Preview</h2>

            {loadState === 'loading' && <p>Loading preview…</p>}
            {loadState === 'error' && <p role="alert">{loadError}</p>}

            {loadState === 'ready' && preview && (
                <>
                    <p>Subject: {preview.subject}</p>
                    {/* Campaign content is staff-authored but still arbitrary
                        HTML - an empty sandbox (no allow-scripts, no
                        allow-same-origin) is what actually neutralizes it,
                        not dangerouslySetInnerHTML into the app's own DOM. */}
                    <iframe title="Campaign preview" srcDoc={preview.html} sandbox="" />
                </>
            )}

            <button type="button" onClick={onClose}>
                Close
            </button>
        </div>
    )
}
