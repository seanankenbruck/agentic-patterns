import { BaseHandler } from "./base-handler";
import { ClassificationResult, HandlerResponse } from "../types";

// Mock database
const MOCK_DATABASE = {
    customers: [
        { id: '12345', name: 'John Doe', email: 'john@example.com', country: 'US', status: 'active' },
        { id: '67890', name: 'Jane Smith', email: 'jane@example.com', country: 'UK', status: 'active' },
        { id: '11111', name: 'Bob Wilson', email: 'bob@example.com', country: 'US', status: 'inactive' }
    ],
    orders: [
        { id: 'ORD-001', customerId: '12345', amount: 150.00, date: '2024-01-15', status: 'completed' },
        { id: 'ORD-002', customerId: '67890', amount: 275.50, date: '2024-01-20', status: 'pending' },
        { id: 'ORD-003', customerId: '12345', amount: 99.99, date: '2024-01-25', status: 'completed' }
    ],
    products: [
        { id: 'PROD-A', name: 'Widget Pro', price: 49.99, category: 'tools', stock: 150 },
        { id: 'PROD-B', name: 'Gadget Plus', price: 79.99, category: 'electronics', stock: 75 },
        { id: 'PROD-C', name: 'Doohickey', price: 29.99, category: 'tools', stock: 200 }
    ]
};

export class DataLookupHandler extends BaseHandler {
    async handle(classification: ClassificationResult): Promise<HandlerResponse> {
        const startTime = Date.now();

        const { entity, fields, filters } = classification.extractedData;

        if (!entity) {
            return this.createResponse(
                false,
                null,
                'DataLookupHandler',
                Date.now() - startTime,
                classification.confidence,
                undefined,
                'No entity specified in query'
            );
        }

        // Get the data collection
        const normalizedEntity = entity.toLowerCase().replace(/s$/, '') + 's'; // normalize to plural
        const collection = (MOCK_DATABASE as any)[normalizedEntity];
        if (!collection) {
            return this.createResponse(
                false,
                null,
                'DataLookupHandler',
                Date.now() - startTime,
                classification.confidence,
                undefined,
                `Unknown entity type: ${entity}`
            );
        }

        // Apply filters
        let results = collection;
        if (filters) {
            results = results.filter((item: any) => {
                return Object.entries(filters).every(([key, value]) => item[key] === value);
            });
        }

        // Select fields
        if (fields && fields.length > 0 && !fields.includes('*')) {
            results = results.map((item: any) => {
                const selected: any = {};
                fields.forEach(field => {
                    if (field in item) {
                        selected[field] = item[field];
                    }
                });
                return selected;
            });
        }

        // Handle no results
        if (results.length === 0) {
            return this.createResponse(
                true,
                [],
                'DataLookupHandler',
                Date.now() - startTime,
                classification.confidence,
                'No records found matching the specified criteria',
                undefined
            );
        }

        return this.createResponse(
            true,
            results,
            'DataLookupHandler',
            Date.now() - startTime,
            classification.confidence,
            results.length === 1 ? '1 record found' : `${results.length} records found`,
            undefined
        );
    }
}