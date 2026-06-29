import { useState, useMemo } from 'react'
import {
    Box,
    Button,
    ButtonGroup,
    ChakraProvider,
    Container,
    Grid,
    GridItem,
    Spinner,
    Text,
    createSystem,
    defaultConfig,
    defineConfig,
} from '@chakra-ui/react'
import DefaultLayout from './components/layouts/Default'
import LineChart from './components/LineChart'
import InputPanel, { type SavingsInputs } from './components/InputPanel'
import SavingsSummary from './components/SavingsSummary'
import { useSavingsProjection } from './hooks/useSavingsProjection'
import theme from './theme'

const toColorTokens = (colors: Record<string, string>) =>
    Object.fromEntries(Object.entries(colors).map(([name, value]) => [name, { value }]))

const system = createSystem(
    defaultConfig,
    defineConfig({ theme: { tokens: { colors: toColorTokens(theme.colors) } } }),
)

const DEFAULT_INPUTS: SavingsInputs = {
    initialAmount: 10_000,
    monthlyDeposit: 500,
    annualInterestRate: 5,
}

type Unit = 'year' | 'month'

interface Plan {
    unit: Unit
    count: number
    label: string
}

const YEARLY_PLANS: Plan[] = [
    { unit: 'year', count: 5, label: '5Y' },
    { unit: 'year', count: 10, label: '10Y' },
    { unit: 'year', count: 20, label: '20Y' },
    { unit: 'year', count: 30, label: '30Y' },
    { unit: 'year', count: 50, label: '50Y' },
]

const MONTHLY_PLANS: Plan[] = [
    { unit: 'month', count: 12, label: '12M' },
    { unit: 'month', count: 24, label: '24M' },
    { unit: 'month', count: 60, label: '60M' },
    { unit: 'month', count: 120, label: '120M' },
    { unit: 'month', count: 300, label: '300M' },
    { unit: 'month', count: 600, label: '600M' },
]

const DEFAULT_PLAN: Plan = YEARLY_PLANS[YEARLY_PLANS.length - 1]

const planSummaryLabel = (plan: Plan): string =>
    plan.unit === 'year' ? `${plan.count}-year plan` : `${plan.count}-month plan`

interface PlanButtonProps {
    plan: Plan
    isActive: boolean
    onSelect: (plan: Plan) => void
}

const PlanButton = ({ plan, isActive, onSelect }: PlanButtonProps) => (
    <Button
        flex={1}
        onClick={() => onSelect(plan)}
        bg={isActive ? 'primary' : undefined}
        color={isActive ? 'white' : 'text'}
        borderColor='grey4'
        data-testid={`plan-${plan.label}`}
    >
        {plan.label}
    </Button>
)

function SavingsCalculator() {
    const [inputs, setInputs] = useState<SavingsInputs>(DEFAULT_INPUTS)
    const [activePlan, setActivePlan] = useState<Plan>(DEFAULT_PLAN)

    const { projection, isLoading, error } = useSavingsProjection({
        initial_amount: inputs.initialAmount,
        monthly_deposit: inputs.monthlyDeposit,
        annual_interest_rate: inputs.annualInterestRate,
    })

    const chartData = useMemo(() => {
        if (!projection) return { xAxis: [] as string[], yAxis: [] as number[] }

        const points =
            activePlan.unit === 'year'
                ? projection.monthly_data.filter(
                      (p) => p.month % 12 === 0 && p.year <= activePlan.count,
                  )
                : projection.monthly_data.filter((p) => p.month <= activePlan.count)

        return {
            xAxis:
                activePlan.unit === 'year'
                    ? points.map((p) => `Year ${p.year}`)
                    : points.map((p) => `Month ${p.month}`),
            yAxis: points.map((p) => p.balance),
        }
    }, [projection, activePlan])

    const finalBalanceForPlan = chartData.yAxis.at(-1) ?? projection?.final_balance ?? 0

    return (
        <Container maxW='1100px' pt={8} pb={12}>
            <Grid templateColumns={{ base: '1fr', md: '1fr 2fr' }} gap={8}>
                <GridItem>
                    <Box bg='grey1' border='1px solid' borderColor='grey3' borderRadius='md' p={6}>
                        <Text fontSize='lg' fontWeight='bold' color='blueHeader' mb={6}>
                            Your Savings
                        </Text>
                        <InputPanel values={inputs} onChange={setInputs} />
                    </Box>
                </GridItem>

                <GridItem>
                    <Box bg='grey1' border='1px solid' borderColor='grey3' borderRadius='md' p={6}>
                        {error && (
                            <Text color='danger' mb={4} fontSize='sm'>
                                {error}
                            </Text>
                        )}

                        {projection && (
                            <SavingsSummary
                                finalBalance={finalBalanceForPlan}
                                label={planSummaryLabel(activePlan)}
                            />
                        )}

                        {isLoading && !projection && (
                            <Box display='flex' justifyContent='center' py={16}>
                                <Spinner color='primary' />
                            </Box>
                        )}

                        {chartData.xAxis.length > 0 && (
                            <>
                                <Box mb={3}>
                                    <ButtonGroup size='xs' variant='outline' attached mb={2} width='100%'>
                                        {YEARLY_PLANS.map((plan) => (
                                            <PlanButton
                                                key={plan.label}
                                                plan={plan}
                                                isActive={activePlan === plan}
                                                onSelect={setActivePlan}
                                            />
                                        ))}
                                    </ButtonGroup>
                                    <ButtonGroup size='xs' variant='outline' attached width='100%'>
                                        {MONTHLY_PLANS.map((plan) => (
                                            <PlanButton
                                                key={plan.label}
                                                plan={plan}
                                                isActive={activePlan === plan}
                                                onSelect={setActivePlan}
                                            />
                                        ))}
                                    </ButtonGroup>
                                </Box>

                                <LineChart
                                    title='Savings Over Time'
                                    xAxisData={chartData.xAxis}
                                    yAxisData={chartData.yAxis}
                                    xLabel={activePlan.unit === 'year' ? 'Year' : 'Month'}
                                    yLabel='Balance (£)'
                                />
                            </>
                        )}
                    </Box>
                </GridItem>
            </Grid>
        </Container>
    )
}

function App() {
    return (
        <ChakraProvider value={system}>
            <DefaultLayout>
                <SavingsCalculator />
            </DefaultLayout>
        </ChakraProvider>
    )
}

export default App
