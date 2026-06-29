import { useState, useEffect, useMemo } from 'react'
import { Box, Flex, Text, Input } from '@chakra-ui/react'

export interface SavingsInputs {
    initialAmount: number
    monthlyDeposit: number
    annualInterestRate: number
}

interface InputPanelProps {
    values: SavingsInputs
    onChange: (values: SavingsInputs) => void
}

interface FieldConfig {
    label: string
    key: keyof SavingsInputs
    min: number
    max: number
    step: number
    prefix?: string
    suffix?: string
}

interface NumberFieldProps {
    label: string
    fieldKey: keyof SavingsInputs
    value: number
    min: number
    max: number
    step: number
    onChange: (key: keyof SavingsInputs, value: number) => void
}

const FIELDS: FieldConfig[] = [
    { label: 'Initial Savings Amount', key: 'initialAmount', min: 0, max: 100_000, step: 100, prefix: '£' },
    { label: 'Monthly Deposit', key: 'monthlyDeposit', min: 0, max: 5_000, step: 50, prefix: '£' },
    { label: 'Annual Interest Rate', key: 'annualInterestRate', min: 0, max: 20, step: 0.1, suffix: '%' },
]

const sliderStyle: React.CSSProperties = {
    width: '100%',
    accentColor: 'var(--chakra-colors-primary, #3BA9FC)',
    cursor: 'pointer',
}

const formatDisplayValue = (key: keyof SavingsInputs, value: number): string =>
    key === 'annualInterestRate' ? value.toFixed(1) : value.toLocaleString()

const getValidationError = (value: number, min: number, max: number): string | null => {
    if (value < min) return `Minimum value is ${min.toLocaleString()}`
    if (value > max) return `Maximum value is ${max.toLocaleString()}`
    return null
}

function NumberField({ label, fieldKey, value, min, max, step, onChange }: NumberFieldProps) {
    const [draft, setDraft] = useState(String(value))

    useEffect(() => {
        setDraft(String(value))
    }, [value])

    const handleChange = (raw: string) => {
        setDraft(raw)
        const parsed = parseFloat(raw)
        if (!isNaN(parsed) && getValidationError(parsed, min, max) === null) {
            onChange(fieldKey, parsed)
        }
    }

    const handleBlur = () => {
        if (isNaN(parseFloat(draft))) {
            setDraft(String(value))
        }
    }

    const error = useMemo(() => {
        const parsed = parseFloat(draft)
        return isNaN(parsed) ? null : getValidationError(parsed, min, max)
    }, [draft, min, max])

    return (
        <Box>
            <Input
                mt={1}
                size='sm'
                type='number'
                min={min}
                max={max}
                step={step}
                value={draft}
                onChange={(e) => handleChange(e.target.value)}
                onBlur={handleBlur}
                aria-label={`${label} input`}
                borderColor={error ? 'danger' : undefined}
                _focus={{ borderColor: error ? 'danger' : 'primary' }}
            />
            {error && (
                <Text fontSize='xs' color='danger' mt={1}>
                    {error}
                </Text>
            )}
        </Box>
    )
}

const InputPanel = ({ values, onChange }: InputPanelProps) => {
    const handleFieldChange = (key: keyof SavingsInputs, value: number) => {
        onChange({ ...values, [key]: value })
    }

    const handleSliderChange = (key: keyof SavingsInputs, rawValue: string) => {
        const parsed = parseFloat(rawValue)
        if (!isNaN(parsed)) {
            onChange({ ...values, [key]: parsed })
        }
    }

    return (
        <Box>
            {FIELDS.map(({ label, key, min, max, step, prefix, suffix }) => (
                <Box key={key} mb={6}>
                    <Flex justifyContent='space-between' mb={1}>
                        <Text fontWeight='medium' fontSize='sm' color='text'>
                            {label}
                        </Text>
                        <Text fontWeight='bold' fontSize='sm' color='primary'>
                            {prefix}
                            {formatDisplayValue(key, values[key])}
                            {suffix}
                        </Text>
                    </Flex>

                    <input
                        aria-label={label}
                        type='range'
                        min={min}
                        max={max}
                        step={step}
                        value={values[key]}
                        onChange={(e) => handleSliderChange(key, e.target.value)}
                        style={sliderStyle}
                    />

                    <NumberField
                        label={label}
                        fieldKey={key}
                        value={values[key]}
                        min={min}
                        max={max}
                        step={step}
                        onChange={handleFieldChange}
                    />
                </Box>
            ))}
        </Box>
    )
}

export default InputPanel
