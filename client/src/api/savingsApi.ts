export interface ProjectionRequest {
    initial_amount: number
    monthly_deposit: number
    annual_interest_rate: number
}

export interface MonthlyDataPoint {
    month: number
    year: number
    balance: number
}

export interface ProjectionResponse {
    monthly_data: MonthlyDataPoint[]
    final_balance: number
}

const API_BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:8000'

export async function fetchSavingsProjection(
    params: ProjectionRequest,
    signal?: AbortSignal,
): Promise<ProjectionResponse> {
    const response = await fetch(`${API_BASE_URL}/interest-data/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params),
        signal,
    })

    if (!response.ok) {
        const errorBody = await response.json().catch(() => ({}))
        const message = errorBody?.errors
            ? Object.values<string>(errorBody.errors).join(' ')
            : `Request failed with status ${response.status}`
        throw new Error(message)
    }

    return response.json() as Promise<ProjectionResponse>
}
