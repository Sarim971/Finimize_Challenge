import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    Title,
    Tooltip,
    Legend,
    Filler,
    type TooltipItem,
} from 'chart.js'
import { useMemo } from 'react'
import { Line } from 'react-chartjs-2'
import theme from '../theme'

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler)

const currencyFormatter = new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency: 'GBP',
    maximumFractionDigits: 0,
})

interface Props {
    xAxisData: string[]
    yAxisData: number[]
    title?: string
    xLabel?: string
    yLabel?: string
}

const LineChart = ({ xAxisData, yAxisData, title, xLabel, yLabel }: Props) => {
    const options = useMemo(
        () => ({
            responsive: true,
            interaction: {
                mode: 'index' as const,
                intersect: false,
            },
            plugins: {
                legend: { display: false },
                title: { display: !!title, text: title },
                tooltip: {
                    callbacks: {
                        label: (ctx: TooltipItem<'line'>) =>
                            ctx.parsed.y != null ? currencyFormatter.format(ctx.parsed.y) : '',
                    },
                },
            },
            scales: {
                y: {
                    title: { display: !!yLabel, text: yLabel },
                    grid: { display: false },
                    ticks: {
                        callback: (value: number | string) => {
                            const n = Number(value)
                            return isNaN(n) ? '' : currencyFormatter.format(n)
                        },
                    },
                },
                x: {
                    title: { display: !!xLabel, text: xLabel },
                    grid: { display: false },
                },
            },
        }),
        [title, xLabel, yLabel],
    )

    const chartData = useMemo(
        () => ({
            labels: xAxisData,
            datasets: [
                {
                    data: yAxisData,
                    borderColor: theme.colors.primary,
                    backgroundColor: theme.colors.blue100,
                    fill: true,
                    pointRadius: 0,
                    pointHoverRadius: 5,
                    tension: 0.3,
                },
            ],
        }),
        [xAxisData, yAxisData],
    )

    return <Line data={chartData} options={options} />
}

export default LineChart
