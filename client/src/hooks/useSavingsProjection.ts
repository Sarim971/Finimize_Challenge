import { useState, useEffect } from 'react'
import {
    fetchSavingsProjection,
    type ProjectionRequest,
    type ProjectionResponse,
} from '../api/savingsApi'

interface UseSavingsProjectionResult {
    projection: ProjectionResponse | null
    isLoading: boolean
    error: string | null
}

const DEBOUNCE_MS = 300

export function useSavingsProjection(params: ProjectionRequest): UseSavingsProjectionResult {
    const [projection, setProjection] = useState<ProjectionResponse | null>(null)
    const [isLoading, setIsLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const { initial_amount, monthly_deposit, annual_interest_rate } = params

    useEffect(() => {
        const controller = new AbortController()

        const timer = setTimeout(async () => {
            setIsLoading(true)
            setError(null)
            try {
                const data = await fetchSavingsProjection(
                    { initial_amount, monthly_deposit, annual_interest_rate },
                    controller.signal,
                )
                setProjection(data)
            } catch (err) {
                if ((err as Error).name === 'AbortError') return
                setError(err instanceof Error ? err.message : 'An unexpected error occurred.')
            } finally {
                if (!controller.signal.aborted) {
                    setIsLoading(false)
                }
            }
        }, DEBOUNCE_MS)

        return () => {
            clearTimeout(timer)
            controller.abort()
        }
    }, [initial_amount, monthly_deposit, annual_interest_rate])

    return { projection, isLoading, error }
}
