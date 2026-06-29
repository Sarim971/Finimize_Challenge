import { Box, Text } from '@chakra-ui/react'

interface SavingsSummaryProps {
    finalBalance: number
    label: string
}

const currencyFormatter = new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency: 'GBP',
    maximumFractionDigits: 0,
})

const SavingsSummary = ({ finalBalance, label }: SavingsSummaryProps) => (
    <Box textAlign='center' mb={6}>
        <Text fontSize='sm' color='grey5' mb={1}>
            Projected balance — {label}
        </Text>
        <Text fontSize='xl' fontWeight='bold' color='primary' data-testid='final-balance'>
            {currencyFormatter.format(finalBalance)}
        </Text>
    </Box>
)

export default SavingsSummary
