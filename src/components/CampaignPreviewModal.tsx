import { useEffect, useState } from 'react'
import { previewCampaign } from '../api/campaigns'
import { ApiError } from '../lib/apiClient'
import { Spinner } from './Spinner'
import {
    alertError,
    buttonSecondary,
    loadingState,
    modalActions,
    modalOverlay,
    modalPanelWide,
    modalTitle,
} from '../styles/ui'
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
        <div className={modalOverlay}>
            <div
                role="dialog"
                aria-modal="true"
                aria-label="Preview campaign"
                className={modalPanelWide}
            >
                <h2 className={modalTitle}>Preview</h2>

                {loadState === 'loading' && (
                    <div className={`mt-4 ${loadingState}`}>
                        <Spinner />
                        <span>Loading preview…</span>
                    </div>
                )}
                {loadState === 'error' && (
                    <p role="alert" className={`mt-4 ${alertError}`}>
                        {loadError}
                    </p>
                )}

                {loadState === 'ready' && preview && (
                    <>
                        <p className="mt-4 text-sm text-beacon-ink">
                            <span className="font-medium text-beacon-ink">Subject:</span>{' '}
                            {preview.subject}
                        </p>
                        {/* Campaign content is staff-authored but still arbitrary
                            HTML - an empty sandbox (no allow-scripts, no
                            allow-same-origin) is what actually neutralizes it,
                            not dangerouslySetInnerHTML into the app's own DOM. */}
                        <iframe
                            title="Campaign preview"
                            srcDoc={preview.html}
                            sandbox=""
                            className="mt-3 h-[70vh] w-full rounded-md border border-beacon-muted-banner"
                        />
                    </>
                )}

                <div className={modalActions}>
                    <button type="button" onClick={onClose} className={buttonSecondary}>
                        Close
                    </button>
                </div>
            </div>
        </div>
    )
}
