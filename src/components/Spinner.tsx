interface SpinnerProps {
    className?: string
}

// Purely decorative - every loading state also renders its own text (e.g.
// "Loading subscribers…"), which is what screen readers should announce, so
// this is hidden from the accessibility tree rather than duplicating it.
export function Spinner({ className = 'h-5 w-5' }: SpinnerProps) {
    return (
        <span
            aria-hidden="true"
            className={`inline-block animate-spin rounded-full border-2 border-beacon-muted-banner border-t-beacon-terracotta ${className}`}
        />
    )
}
