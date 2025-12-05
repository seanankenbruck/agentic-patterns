import { ClassificationResult, HandlerResponse } from "../types";

export abstract class BaseHandler {
    abstract handle(classification: ClassificationResult): Promise<HandlerResponse>;

    protected createResponse(
        success: boolean,
        data: any,
        handler: string,
        executionTime: number,
        confidence: number,
        note?: string,
        error?: string,
    ): HandlerResponse {
        return {
            success,
            data,
            metadata: {
                handler,
                executionTime,
                confidence
            },
            ...(note && { note }),
            ...(error && { error })
        }
    }
}