import { fetchSavingsProjection, type ProjectionRequest } from './savingsApi'

const VALID_PARAMS: ProjectionRequest = {
    initial_amount: 1000,
    monthly_deposit: 100,
    annual_interest_rate: 5,
}

const MOCK_RESPONSE_BODY = {
    monthly_data: [{ month: 1, year: 1, balance: 1100 }],
    final_balance: 1100,
}

function makeResponse(body: unknown, status = 200): Response {
    return {
        ok: status >= 200 && status < 300,
        status,
        json: () => Promise.resolve(body),
    } as unknown as Response
}

let mockFetch: ReturnType<typeof vi.fn>

beforeEach(() => {
    mockFetch = vi.fn()
    vi.stubGlobal('fetch', mockFetch)
})

afterEach(() => {
    vi.unstubAllGlobals()
})

describe('fetchSavingsProjection', () => {
    test('calls the correct URL with POST and JSON content-type', async () => {
        mockFetch.mockResolvedValue(makeResponse(MOCK_RESPONSE_BODY))

        await fetchSavingsProjection(VALID_PARAMS)

        expect(mockFetch).toHaveBeenCalledWith(
            expect.stringContaining('/interest-data/'),
            expect.objectContaining({
                method: 'POST',
                headers: expect.objectContaining({ 'Content-Type': 'application/json' }),
            }),
        )
    })

    test('serialises params as JSON in the request body', async () => {
        mockFetch.mockResolvedValue(makeResponse(MOCK_RESPONSE_BODY))

        await fetchSavingsProjection(VALID_PARAMS)

        const [, init] = mockFetch.mock.calls[0] as [string, RequestInit]
        expect(JSON.parse(init.body as string)).toEqual(VALID_PARAMS)
    })

    test('returns the parsed response body on success', async () => {
        mockFetch.mockResolvedValue(makeResponse(MOCK_RESPONSE_BODY))

        const result = await fetchSavingsProjection(VALID_PARAMS)

        expect(result).toEqual(MOCK_RESPONSE_BODY)
    })

    test('throws with the joined validation messages on 400', async () => {
        mockFetch.mockResolvedValue(
            makeResponse(
                { errors: { initial_amount: 'must be >= 0', monthly_deposit: 'must be >= 0' } },
                400,
            ),
        )

        await expect(fetchSavingsProjection(VALID_PARAMS)).rejects.toThrow(
            'must be >= 0 must be >= 0',
        )
    })

    test('throws with a status message when the error body has no errors field', async () => {
        mockFetch.mockResolvedValue(makeResponse({}, 500))

        await expect(fetchSavingsProjection(VALID_PARAMS)).rejects.toThrow(
            'Request failed with status 500',
        )
    })

    test('throws with a status message when the error body is not JSON', async () => {
        const badJsonResponse = {
            ok: false,
            status: 503,
            json: () => Promise.reject(new SyntaxError('bad json')),
        } as unknown as Response
        mockFetch.mockResolvedValue(badJsonResponse)

        await expect(fetchSavingsProjection(VALID_PARAMS)).rejects.toThrow(
            'Request failed with status 503',
        )
    })

    test('forwards the AbortSignal to fetch', async () => {
        mockFetch.mockResolvedValue(makeResponse(MOCK_RESPONSE_BODY))
        const controller = new AbortController()

        await fetchSavingsProjection(VALID_PARAMS, controller.signal)

        const [, init] = mockFetch.mock.calls[0] as [string, RequestInit]
        expect(init.signal).toBe(controller.signal)
    })

    test('omits the signal when none is provided', async () => {
        mockFetch.mockResolvedValue(makeResponse(MOCK_RESPONSE_BODY))

        await fetchSavingsProjection(VALID_PARAMS)

        const [, init] = mockFetch.mock.calls[0] as [string, RequestInit]
        expect(init.signal).toBeUndefined()
    })

    test('propagates AbortError when the request is cancelled', async () => {
        const controller = new AbortController()
        const abortError = Object.assign(new Error('Aborted'), { name: 'AbortError' })
        mockFetch.mockRejectedValue(abortError)
        controller.abort()

        await expect(fetchSavingsProjection(VALID_PARAMS, controller.signal)).rejects.toMatchObject(
            { name: 'AbortError' },
        )
    })
})
