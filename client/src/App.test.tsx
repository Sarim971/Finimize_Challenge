import { render, screen, fireEvent } from '@testing-library/react'
import { ChakraProvider, createSystem, defaultConfig } from '@chakra-ui/react'
import App from './App'
import InputPanel from './components/InputPanel'
import SavingsSummary from './components/SavingsSummary'

const system = createSystem(defaultConfig)
const renderWithChakra = (ui: React.ReactElement) =>
    render(<ChakraProvider value={system}>{ui}</ChakraProvider>)

vi.mock('react-chartjs-2', () => ({
    Line: () => <div data-testid='line-chart' />,
}))

const MOCK_PROJECTION = {
    monthly_data: Array.from({ length: 600 }, (_, i) => ({
        month: i + 1,
        year: Math.ceil((i + 1) / 12),
        balance: 1000 + i * 10,
    })),
    final_balance: 6990,
}

const hookResult = {
    projection: MOCK_PROJECTION as typeof MOCK_PROJECTION | null,
    isLoading: false,
    error: null as string | null,
}

vi.mock('./hooks/useSavingsProjection', () => ({
    useSavingsProjection: () => hookResult,
}))

describe('App', () => {
    test('renders the Finimize header', () => {
        render(<App />)
        expect(screen.getByAltText('Finimize')).toBeInTheDocument()
    })

    test('renders the savings chart', () => {
        render(<App />)
        expect(screen.getByTestId('line-chart')).toBeInTheDocument()
    })

    test('renders the final balance summary', () => {
        render(<App />)
        expect(screen.getByTestId('final-balance')).toBeInTheDocument()
    })

    test('renders all three input sliders', () => {
        render(<App />)
        expect(screen.getByRole('slider', { name: /initial savings amount/i })).toBeInTheDocument()
        expect(screen.getByRole('slider', { name: /monthly deposit/i })).toBeInTheDocument()
        expect(screen.getByRole('slider', { name: /annual interest rate/i })).toBeInTheDocument()
    })

    test('renders all yearly plan buttons', () => {
        render(<App />)
        ;['5Y', '10Y', '20Y', '30Y', '50Y'].forEach((label) => {
            expect(screen.getByTestId(`plan-${label}`)).toBeInTheDocument()
        })
    })

    test('renders all monthly plan buttons', () => {
        render(<App />)
        ;['12M', '24M', '60M', '120M', '300M', '600M'].forEach((label) => {
            expect(screen.getByTestId(`plan-${label}`)).toBeInTheDocument()
        })
    })

    test('switching to a monthly plan updates the summary label', () => {
        render(<App />)
        fireEvent.click(screen.getByTestId('plan-12M'))
        expect(screen.getByText(/12-month plan/i)).toBeInTheDocument()
    })

    test('switching to a yearly plan updates the summary label', () => {
        render(<App />)
        fireEvent.click(screen.getByTestId('plan-10Y'))
        expect(screen.getByText(/10-year plan/i)).toBeInTheDocument()
    })

    test('shows an error banner when the hook returns an error', () => {
        hookResult.projection = null
        hookResult.error = 'Server error'

        render(<App />)

        expect(screen.getByText('Server error')).toBeInTheDocument()

        hookResult.projection = MOCK_PROJECTION
        hookResult.error = null
    })

    test('does not show an error banner when error is null', () => {
        hookResult.error = null
        render(<App />)
        expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    })

    test('shows a spinner when isLoading is true and no projection is available', () => {
        hookResult.projection = null
        hookResult.isLoading = true
        hookResult.error = null

        render(<App />)

        expect(screen.queryByTestId('line-chart')).not.toBeInTheDocument()

        hookResult.projection = MOCK_PROJECTION
        hookResult.isLoading = false
    })
})

describe('InputPanel', () => {
    const defaultValues = { initialAmount: 10_000, monthlyDeposit: 500, annualInterestRate: 5 }

    test('displays formatted current values for all three fields', () => {
        renderWithChakra(<InputPanel values={defaultValues} onChange={() => {}} />)
        expect(screen.getByText('£10,000')).toBeInTheDocument()
        expect(screen.getByText('£500')).toBeInTheDocument()
        expect(screen.getByText('5.0%')).toBeInTheDocument()
    })

    test('calls onChange when the initial amount slider is moved', () => {
        const handleChange = vi.fn()
        renderWithChakra(<InputPanel values={defaultValues} onChange={handleChange} />)
        fireEvent.change(screen.getByRole('slider', { name: /initial savings amount/i }), {
            target: { value: '20000' },
        })
        expect(handleChange).toHaveBeenCalledWith(expect.objectContaining({ initialAmount: 20_000 }))
    })

    test('calls onChange when the interest rate slider is moved', () => {
        const handleChange = vi.fn()
        renderWithChakra(<InputPanel values={defaultValues} onChange={handleChange} />)
        fireEvent.change(screen.getByRole('slider', { name: /annual interest rate/i }), {
            target: { value: '7' },
        })
        expect(handleChange).toHaveBeenCalledWith(expect.objectContaining({ annualInterestRate: 7 }))
    })

    test('calls onChange when a number input is changed to a valid value', () => {
        const handleChange = vi.fn()
        renderWithChakra(<InputPanel values={defaultValues} onChange={handleChange} />)
        fireEvent.change(screen.getByRole('spinbutton', { name: /monthly deposit input/i }), {
            target: { value: '800' },
        })
        expect(handleChange).toHaveBeenCalledWith(expect.objectContaining({ monthlyDeposit: 800 }))
    })

    test('shows an error and does not commit when value exceeds max', () => {
        const handleChange = vi.fn()
        renderWithChakra(<InputPanel values={defaultValues} onChange={handleChange} />)
        fireEvent.change(screen.getByRole('spinbutton', { name: /initial savings amount input/i }), {
            target: { value: '999999' },
        })
        expect(screen.getByText(/maximum value is 100,000/i)).toBeInTheDocument()
        expect(handleChange).not.toHaveBeenCalled()
    })

    test('shows an error and does not commit when value is below min', () => {
        const handleChange = vi.fn()
        renderWithChakra(<InputPanel values={defaultValues} onChange={handleChange} />)
        fireEvent.change(screen.getByRole('spinbutton', { name: /monthly deposit input/i }), {
            target: { value: '-50' },
        })
        expect(screen.getByText(/minimum value is 0/i)).toBeInTheDocument()
        expect(handleChange).not.toHaveBeenCalled()
    })

    test('error message clears when value returns to a valid range', () => {
        const handleChange = vi.fn()
        renderWithChakra(<InputPanel values={defaultValues} onChange={handleChange} />)
        const input = screen.getByRole('spinbutton', { name: /monthly deposit input/i })
        fireEvent.change(input, { target: { value: '-50' } })
        expect(screen.getByText(/minimum value is 0/i)).toBeInTheDocument()
        fireEvent.change(input, { target: { value: '200' } })
        expect(screen.queryByText(/minimum value/i)).not.toBeInTheDocument()
    })

    test('restores last valid value on blur when field is cleared', () => {
        const handleChange = vi.fn()
        renderWithChakra(<InputPanel values={defaultValues} onChange={handleChange} />)
        const input = screen.getByRole('spinbutton', { name: /monthly deposit input/i })
        fireEvent.change(input, { target: { value: '' } })
        fireEvent.blur(input)
        expect(handleChange).not.toHaveBeenCalled()
    })

    test('does not show error when field is empty (mid-edit)', () => {
        renderWithChakra(<InputPanel values={defaultValues} onChange={() => {}} />)
        const input = screen.getByRole('spinbutton', { name: /monthly deposit input/i })
        fireEvent.change(input, { target: { value: '' } })
        expect(screen.queryByText(/minimum/i)).not.toBeInTheDocument()
        expect(screen.queryByText(/maximum/i)).not.toBeInTheDocument()
    })
})

describe('SavingsSummary', () => {
    test('displays the formatted final balance in GBP', () => {
        renderWithChakra(<SavingsSummary finalBalance={125_000} label='50-year plan' />)
        expect(screen.getByTestId('final-balance')).toHaveTextContent('£125,000')
    })

    test('displays the plan label', () => {
        renderWithChakra(<SavingsSummary finalBalance={50_000} label='10-year plan' />)
        expect(screen.getByText(/10-year plan/i)).toBeInTheDocument()
    })

    test('formats large balances correctly', () => {
        renderWithChakra(<SavingsSummary finalBalance={1_250_000} label='50-year plan' />)
        expect(screen.getByTestId('final-balance')).toHaveTextContent('£1,250,000')
    })

    test('displays zero balance as £0', () => {
        renderWithChakra(<SavingsSummary finalBalance={0} label='5-year plan' />)
        expect(screen.getByTestId('final-balance')).toHaveTextContent('£0')
    })
})
