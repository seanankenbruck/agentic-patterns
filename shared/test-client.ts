import { AnthropicClient } from "./anthropic-client";

async function testClient() {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
        console.error("Please set the ANTHROPIC_API_KEY environment variable.");
        return;
    }

    const client = new AnthropicClient({ apiKey });

    try {
        const response = await client.sendMessage(
            "Hello, Claude! Can you tell me a fun fact about space?",
            "You are a helpful assistant that provides interesting facts."
        );
        console.log("Claude's response:", response);
    } catch (error) {
        console.error("Error during API call:", error);
    }
}

testClient();