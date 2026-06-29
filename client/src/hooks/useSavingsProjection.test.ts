import { renderHook, act } from '@testing-library/react'
import { useSavingsProjection } from './useSavingsProjection'
import * as savingsApi from '../api/savingsApi'

vi.mock('../api/savingsApi')

const MOCK_RESPONSE: savingsApi.ProjectionResponse = {
    monthly_data: Array.from({ length: 600 }, (_, i) => ({
        month: i + 1,
        year: Math.ceil((i + 1) / 12),
        balance: 1000 + i * 10,
    })),
    final_balance: 6990,
}

const DEFAULT_PARAMS: savingsApi.ProjectionRequest = {
    initial_amount: 1000,
    monthly_deposit: 100,
    annual_interest_rate: 5,
}

beforeEach(() => {
    vi.useFakeTimers()
    vi.mocked(savingsApi.fetchSavingsProjection).mockResolvedValue(MOCK_RESPONSE)
})

afterEach(() => {
    vi.useRealTimers()
    vi.clearAllMocks()
})

async function flushDebounce() {
    await act(async () => {
        await vi.runAllTimersAsync()
    })
}

describe('useSavingsProjection', () => {
    test('starts with projection=null, isLoading=false, error=null', () => {
        const { result } = renderHook(() => useSavingsProjection(DEFAULT_PARAMS))
        expect(result.current.projection).toBeNull()
        expect(result.current.isLoading).toBe(false)
        expect(result.current.error).toBeNull()
    })

    test('sets isLoading=true after the debounce fires but before fetch resolves', async () => {
        let resolveFetch!: (v: savingsApi.ProjectionResponse) => void
        vi.mocked(savingsApi.fetchSavingsProjection).mockReturnValue(
            new Promise((res) => {
                resolveFetch = res
            }),
        )

        const { result } = renderHook(() => useSavingsProjection(DEFAULT_PARAMS))

        await act(async () => {
            vi.advanceTimersByTime(300)
        })

        expect(result.current.isLoading).toBe(true)

        await act(async () => {
            resolveFetch(MOCK_RESPONSE)
        })
    })

    test('does not call fetch before the debounce window elapses', async () => {
        renderHook(() => useSavingsProjection(DEFAULT_PARAMS))

        await act(async () => {
            vi.advanceTimersByTime(299)
        })

        expect(savingsApi.fetchSavingsProjection).not.toHaveBeenCalled()
    })

    test('populates projection after the debounce + fetch resolve', async () => {
        const { result } = renderHook(() => useSavingsProjection(DEFAULT_PARAMS))

        await flushDebounce()

        expect(result.current.projection).toEqual(MOCK_RESPONSE)
        expect(result.current.isLoading).toBe(false)
        expect(result.current.error).toBeNull()
    })

    test('calls fetch exactly once with the correct params and an AbortSignal', async () => {
        const { result } = renderHook(() => useSavingsProjection(DEFAULT_PARAMS))

        await flushDebounce()

        expect(result.current.projection).not.toBeNull()
        expect(savingsApi.fetchSavingsProjection).toHaveBeenCalledTimes(1)
        expect(savingsApi.fetchSavingsProjection).toHaveBeenCalledWith(
            DEFAULT_PARAMS,
            expect.any(AbortSignal),
        )
    })

    test('sets error and clears isLoading when fetch rejects', async () => {
        vi.mocked(savingsApi.fetchSavingsProjection).mockRejectedValue(new Error('Server error'))

        const { result } = renderHook(() => useSavingsProjection(DEFAULT_PARAMS))

        await flushDebounce()

        expect(result.current.error).toBe('Server error')
        expect(result.current.isLoading).toBe(false)
        expect(result.current.projection).toBeNull()
    })

    test('uses a generic message for non-Error rejections', async () => {
        vi.mocked(savingsApi.fetchSavingsProjection).mockRejectedValue('plain string error')

        const { result } = renderHook(() => useSavingsProjection(DEFAULT_PARAMS))

        await flushDebounce()

        expect(result.current.error).toBe('An unexpected error occurred.')
    })

    test('re-fetches when params change', async () => {
        const { result, rerender } = renderHook(
            (params: savingsApi.ProjectionRequest) => useSavingsProjection(params),
            { initialProps: DEFAULT_PARAMS },
        )

        await flushDebounce()
        expect(result.current.projection).not.toBeNull()

        rerender({ ...DEFAULT_PARAMS, initial_amount: 5000 })
        await flushDebounce()

        expect(savingsApi.fetchSavingsProjection).toHaveBeenCalledTimes(2)
        expect(savingsApi.fetchSavingsProjection).toHaveBeenLastCalledWith(
            { ...DEFAULT_PARAMS, initial_amount: 5000 },
            expect.any(AbortSignal),
        )
    })

    test('debounces rapid param changes — only one fetch for the final value', async () => {
        const { rerender } = renderHook(
            (params: savingsApi.ProjectionRequest) => useSavingsProjection(params),
            { initialProps: DEFAULT_PARAMS },
        )

        await act(async () => { vi.advanceTimersByTime(100) })
        rerender({ ...DEFAULT_PARAMS, initial_amount: 2000 })
        await act(async () => { vi.advanceTimersByTime(100) })
        rerender({ ...DEFAULT_PARAMS, initial_amount: 3000 })
        await act(async () => { vi.advanceTimersByTime(100) })
        rerender({ ...DEFAULT_PARAMS, initial_amount: 4000 })

        await flushDebounce()

        expect(savingsApi.fetchSavingsProjection).toHaveBeenCalledTimes(1)
        expect(savingsApi.fetchSavingsProjection).toHaveBeenCalledWith(
            { ...DEFAULT_PARAMS, initial_amount: 4000 },
            expect.any(AbortSignal),
        )
    })

    test('aborts the in-flight request when params change mid-flight', async () => {
        let capturedSignal: AbortSignal | undefined
        vi.mocked(savingsApi.fetchSavingsProjection).mockImplementation(
            (_params, signal) =>
                new Promise((_res, _rej) => {
                    capturedSignal = signal
                }),
        )

        const { rerender } = renderHook(
            (params: savingsApi.ProjectionRequest) => useSavingsProjection(params),
            { initialProps: DEFAULT_PARAMS },
        )

        await act(async () => {
            vi.advanceTimersByTime(300)
        })

        expect(capturedSignal?.aborted).toBe(false)

        rerender({ ...DEFAULT_PARAMS, initial_amount: 9999 })

        expect(capturedSignal?.aborted).toBe(true)
    })

    test('clears error when a subsequent fetch succeeds', async () => {
        vi.mocked(savingsApi.fetchSavingsProjection)
            .mockRejectedValueOnce(new Error('First attempt failed'))
            .mockResolvedValueOnce(MOCK_RESPONSE)

        const { result, rerender } = renderHook(
            (params: savingsApi.ProjectionRequest) => useSavingsProjection(params),
            { initialProps: DEFAULT_PARAMS },
        )

        await flushDebounce()
        expect(result.current.error).toBe('First attempt failed')

        rerender({ ...DEFAULT_PARAMS, initial_amount: 2000 })
        await flushDebounce()

        expect(result.current.error).toBeNull()
        expect(result.current.projection).toEqual(MOCK_RESPONSE)
    })
})
