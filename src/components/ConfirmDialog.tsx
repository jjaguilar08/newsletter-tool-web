import {
    alertError,
    buttonDestructive,
    buttonPrimary,
    buttonSecondary,
    modalActions,
    modalOverlay,
    modalPanel,
    modalTitle,
} from '../styles/ui'

interface ConfirmDialogProps {
    title: string
    message: string
    confirmLabel?: string
    isConfirming?: boolean
    error?: string | null
    // Most confirmations here guard an irreversible action (delete, send
    // now), so destructive (red) is the default - Schedule is the one
    // caller that isn't destructive and opts into 'primary' instead.
    tone?: 'primary' | 'destructive'
    onConfirm: () => void
    onCancel: () => void
}

export function ConfirmDialog({
    title,
    message,
    confirmLabel = 'Confirm',
    isConfirming = false,
    error = null,
    tone = 'destructive',
    onConfirm,
    onCancel,
}: ConfirmDialogProps) {
    return (
        <div className={modalOverlay}>
            <div role="dialog" aria-modal="true" aria-label={title} className={modalPanel}>
                <h2 className={modalTitle}>{title}</h2>
                <p className="mt-2 text-sm text-beacon-muted">{message}</p>
                {error && (
                    <p role="alert" className={`mt-3 ${alertError}`}>
                        {error}
                    </p>
                )}
                <div className={modalActions}>
                    <button
                        type="button"
                        onClick={onCancel}
                        disabled={isConfirming}
                        className={buttonSecondary}
                    >
                        Cancel
                    </button>
                    <button
                        type="button"
                        onClick={onConfirm}
                        disabled={isConfirming}
                        className={tone === 'primary' ? buttonPrimary : buttonDestructive}
                    >
                        {isConfirming ? 'Working…' : confirmLabel}
                    </button>
                </div>
            </div>
        </div>
    )
}
