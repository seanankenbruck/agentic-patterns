export function parseJSONResponse(text: string): object {
    // Remove markdown code blocks if present
    let cleaned = text.trim();
    if (cleaned.startsWith('```json')) {
        cleaned = cleaned.replace(/```json\n?/, '').replace(/\n?```$/, '');
    } else if (cleaned.startsWith('```')) {
        cleaned = cleaned.replace(/```\n?/, '').replace(/\n?```$/, '');
    }
    
    return JSON.parse(cleaned);
}