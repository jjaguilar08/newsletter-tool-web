interface ConfirmDialogProps {
    title: string
    message: string
    confirmLabel?: string
    isConfirming?: boolean
    error?: string | null
    onConfirm: () => void
    onCancel: () => void
}

export function ConfirmDialog({
    title,
    message,
    confirmLabel = 'Confirm',
    isConfirming = false,
    error = null,
    onConfirm,
    onCancel,
}: ConfirmDialogProps) {
    return (
        <div role="dialog" aria-modal="true" aria-label={title}>
            <h2>{title}</h2>
            <p>{message}</p>
            {error && <p role="alert">{error}</p>}
            <button type="button" onClick={onCancel} disabled={isConfirming}>
                Cancel
            </button>
            <button type="button" onClick={onConfirm} disabled={isConfirming}>
                {isConfirming ? 'Working…' : confirmLabel}
            </button>
        </div>
    )
}
