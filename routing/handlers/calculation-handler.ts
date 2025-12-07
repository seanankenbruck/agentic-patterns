import { BaseHandler } from "./base-handler";
import { ClassificationResult, HandlerResponse } from "../types";

// Conversion factors - all conversions go through a base unit
const CONVERSIONS: Record<string, Record<string, number>> = {
    // Length (base: meters)
    length: {
        meters: 1,
        kilometers: 0.001,
        centimeters: 100,
        millimeters: 1000,
        miles: 0.000621371,
        yards: 1.09361,
        feet: 3.28084,
        inches: 39.3701
    },
    // Weight (base: kilograms)
    weight: {
        kilograms: 1,
        grams: 1000,
        milligrams: 1000000,
        pounds: 2.20462,
        ounces: 35.274
    },
    // Data/bytes (base: bytes)
    bytes: {
        bytes: 1,
        kilobytes: 1 / 1024,
        megabytes: 1 / (1024 * 1024),
        gigabytes: 1 / (1024 * 1024 * 1024),
        terabytes: 1 / (1024 * 1024 * 1024 * 1024),
        kb: 1 / 1024,
        mb: 1 / (1024 * 1024),
        gb: 1 / (1024 * 1024 * 1024),
        tb: 1 / (1024 * 1024 * 1024 * 1024)
    }
};

// Temperature units
const TEMPERATURE_UNITS = ['celsius', 'fahrenheit', 'kelvin', 'c', 'f', 'k'];

export class CalculationHandler extends BaseHandler {
    async handle(classification: ClassificationResult): Promise<HandlerResponse> {
        const startTime = Date.now();

        const { operation, operands, expression } = classification.extractedData;

        if (!operation || !operands || operands.length === 0) {
            return this.createResponse(
                false,
                null,
                'CalculationHandler',
                Date.now() - startTime,
                classification.confidence,
                undefined,
                'Missing operation or operands'
            );
        }

        // Calculation logic
        let result: number;
        let explanation: string;
        
        switch (operation.toLowerCase()) {
            case 'percentage':
                result = (operands[0] / 100) * operands[1];
                explanation = `${operands[0]}% of ${operands[1]} = ${result}`;
                break;
                
            case 'arithmetic':
                if (expression) {
                    const tokens = expression.split(' ');
                    const a = parseFloat(tokens[0]);
                    const operator = tokens[1];
                    const b = parseFloat(tokens[2]);
                    
                    switch (operator) {
                        case '+':
                            result = a + b;
                            break;
                        case '-':
                            result = a - b;
                            break;
                        case '*':
                            result = a * b;
                            break;
                        case '/':
                            if (b === 0) {
                                return this.createResponse(
                                    false,
                                    null,
                                    'CalculationHandler',
                                    Date.now() - startTime,
                                    classification.confidence,
                                    undefined,
                                    'Division by zero'
                                );
                            }
                            result = a / b;
                            break;
                        default:
                            return this.createResponse(
                                false,
                                null,
                                'CalculationHandler',
                                Date.now() - startTime,
                                classification.confidence,
                                undefined,
                                `Unsupported arithmetic operator: ${operator}`
                            );
                    }
                    explanation = `${a} ${operator} ${b} = ${result}`;
                } else {
                    return this.createResponse(
                        false,
                        null,
                        'CalculationHandler',
                        Date.now() - startTime,
                        classification.confidence,
                        undefined,
                        'Missing expression for arithmetic operation'
                    );
                }
                break;
                
            case 'conversion':
                const conversionResult = this.handleConversion(expression);
                if (!conversionResult.success) {
                    return this.createResponse(
                        false,
                        null,
                        'CalculationHandler',
                        Date.now() - startTime,
                        classification.confidence,
                        undefined,
                        conversionResult.error
                    );
                }
                result = conversionResult.result!;
                explanation = conversionResult.explanation!;
                break;
                
            default:
                return this.createResponse(
                    false,
                    null,
                    'CalculationHandler',
                    Date.now() - startTime,
                    classification.confidence,
                    undefined,
                    `Unsupported operation: ${operation}`
                );
        }
        
        return this.createResponse(
            true,
            { result, expression, explanation },
            'CalculationHandler',
            Date.now() - startTime,
            classification.confidence
        );
    }

    private handleConversion(
        expression?: string
    ): { success: boolean; result?: number; explanation?: string; error?: string } {
        
        if (!expression) {
            return { success: false, error: 'Missing conversion expression' };
        }

        // Parse expression like "50 miles to kilometers" or "100 celsius to fahrenheit"
        const match = expression.match(/(\d+\.?\d*)\s*(?:degrees?)?\s*(\w+)\s+to\s+(\w+)/i);
        if (!match) {
            return { success: false, error: 'Invalid conversion format. Use: "X unit to unit"' };
        }

        const value = parseFloat(match[1]);
        const fromUnit = match[2].toLowerCase();
        const toUnit = match[3].toLowerCase();

        // Special handling for temperature
        if (TEMPERATURE_UNITS.includes(fromUnit) && TEMPERATURE_UNITS.includes(toUnit)) {
            const result = this.convertTemperature(value, fromUnit, toUnit);
            return {
                success: true,
                result,
                explanation: `${value}°${this.getTempSymbol(fromUnit)} = ${result.toFixed(2)}°${this.getTempSymbol(toUnit)}`
            };
        }

        // Find which conversion category this belongs to
        let category: string | null = null;
        for (const [cat, units] of Object.entries(CONVERSIONS)) {
            if (fromUnit in units && toUnit in units) {
                category = cat;
                break;
            }
        }

        if (!category) {
            return { 
                success: false, 
                error: `Cannot convert between ${fromUnit} and ${toUnit} - incompatible units` 
            };
        }

        // Convert: value -> base unit -> target unit
        const baseValue = value / CONVERSIONS[category][fromUnit];
        const result = baseValue * CONVERSIONS[category][toUnit];

        return {
            success: true,
            result,
            explanation: `${value} ${fromUnit} = ${result.toFixed(4)} ${toUnit}`
        };
    }

    private getTempSymbol(unit: string): string {
        const normalized = unit.toLowerCase();
        if (normalized === 'celsius' || normalized === 'c') return 'C';
        if (normalized === 'fahrenheit' || normalized === 'f') return 'F';
        if (normalized === 'kelvin' || normalized === 'k') return 'K';
        return unit;
    }

    private convertTemperature(value: number, from: string, to: string): number {
        const fromNorm = from.toLowerCase();
        const toNorm = to.toLowerCase();

        // Convert to Celsius first (as base)
        let celsius: number;
        if (fromNorm === 'celsius' || fromNorm === 'c') {
            celsius = value;
        } else if (fromNorm === 'fahrenheit' || fromNorm === 'f') {
            celsius = (value - 32) * (5 / 9);
        } else if (fromNorm === 'kelvin' || fromNorm === 'k') {
            celsius = value - 273.15;
        } else {
            celsius = value; // fallback
        }

        // Convert from Celsius to target
        if (toNorm === 'celsius' || toNorm === 'c') {
            return celsius;
        } else if (toNorm === 'fahrenheit' || toNorm === 'f') {
            return (celsius * 9/5) + 32;
        } else if (toNorm === 'kelvin' || toNorm === 'k') {
            return celsius + 273.15;
        } else {
            return celsius; // fallback
        }
    }
}