import { AnthropicClient } from '../../shared/anthropic-client';
import { SectioningSummarizer } from '../sectioning-summarizer';

async function testSectioningWithAggregation() {
    // Get API key
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
        console.error("❌ Please set ANTHROPIC_API_KEY environment variable");
        process.exit(1);
    }

    console.log("🚀 Starting Sectioning Summarizer with Aggregation Test\n");
    console.log("=".repeat(80));

    // Create client and summarizer
    const client = new AnthropicClient({ apiKey });
    const summarizer = new SectioningSummarizer(client);
    
    // More substantial test document to show aggregation benefits
    const testDoc = `
The Evolution of Distributed Systems Architecture in Cloud-Native Environments

Introduction
Over the past decade, the architectural paradigms governing large-scale distributed systems have undergone a fundamental transformation. Traditional monolithic architectures, characterized by tightly coupled components and centralized data stores, have gradually given way to microservices-based approaches that prioritize modularity, scalability, and fault tolerance. This shift has been driven by several converging factors: the exponential growth of internet-connected devices, the increasing demand for real-time data processing, and the maturation of container orchestration platforms like Kubernetes.

Technical Implementation
Modern distributed systems leverage a sophisticated stack of technologies to achieve their operational goals. At the foundation lies container technology, primarily Docker, which provides lightweight, portable execution environments. These containers are orchestrated using Kubernetes, which handles scheduling, scaling, and self-healing capabilities across clusters of machines. Service mesh architectures, exemplified by tools like Istio and Linkerd, provide critical infrastructure for service-to-service communication, implementing features such as circuit breaking, retry logic, and distributed tracing.

The data layer presents unique challenges in distributed environments. Traditional ACID guarantees become difficult to maintain across network boundaries, leading to the adoption of eventual consistency models and the CAP theorem's practical implications. Databases have evolved to support these requirements, with solutions ranging from distributed SQL databases like CockroachDB and Google Spanner to NoSQL offerings like Cassandra and DynamoDB. Event streaming platforms, particularly Apache Kafka, have become central to many architectures, enabling asynchronous communication patterns and event-driven designs.

Business Impact and Adoption
From a business perspective, the transition to cloud-native distributed systems offers compelling advantages. Organizations report 40-60% reductions in infrastructure costs through improved resource utilization and elastic scaling capabilities. Time-to-market for new features has decreased dramatically, with some companies deploying updates hundreds of times per day rather than quarterly. The improved fault isolation means that individual component failures no longer cascade into system-wide outages, resulting in significantly higher availability metrics.

However, this transformation is not without costs. The operational complexity of distributed systems requires substantial investment in observability tooling, including distributed tracing systems, centralized logging platforms, and sophisticated monitoring solutions. Organizations must develop new skill sets around distributed systems debugging, performance optimization, and security practices. The "fallacies of distributed computing" - including assumptions about reliable networks, zero latency, and infinite bandwidth - continue to create unexpected challenges for teams new to this paradigm.

Security Considerations
Security in distributed systems requires a fundamentally different approach than traditional perimeter-based models. Zero-trust architectures have emerged as the standard, assuming that threats exist both outside and inside the network perimeter. Service-to-service authentication and authorization must be implemented at every level, typically using mutual TLS (mTLS) and JSON Web Tokens (JWT). Secrets management becomes critical, with dedicated solutions like HashiCorp Vault providing encrypted storage and dynamic credentials generation.

Future Directions
Looking ahead, several trends are shaping the next evolution of distributed systems. WebAssembly is emerging as a potential alternative to container technology, offering even lighter-weight execution environments with near-native performance. Serverless computing continues to mature, abstracting away infrastructure management entirely for certain workload types. Edge computing is pushing computation closer to data sources, creating new architectural patterns for latency-sensitive applications. Machine learning operations (MLOps) are beginning to integrate with traditional DevOps practices, creating unified pipelines for both application code and ML model deployment.

The convergence of these technologies suggests that future distributed systems will be increasingly heterogeneous, spanning multiple execution environments and orchestration platforms. Success will require not just technical expertise but also strong organizational practices around API design, documentation, and cross-team communication. As systems become more distributed, the human aspects of software engineering - collaboration, clear communication, and shared understanding - become even more critical to success.
    `.trim();
    
    console.log(`\nDocument Stats:`);
    console.log(`- Total words: ${testDoc.split(/\s+/).length}`);
    console.log(`- Target chunk size: 80 words\n`);
    
    try {
        // Run sectioning with aggregation
        const result = await summarizer.summarizeWithAggregation(testDoc, 80);
        
        console.log('\n📊 SECTIONING RESULTS:');
        console.log('='.repeat(80));
        console.log(`Total sections: ${result.sections.length}`);
        console.log(`Total processing time: ${result.totalProcessingTimeMs}ms\n`);
        
        // Display each section summary
        console.log('INDIVIDUAL SECTION SUMMARIES:');
        console.log('-'.repeat(80));
        result.sections.forEach(section => {
            console.log(`\nSection ${section.sectionNumber}:`);
            console.log(`  Word count: ${section.wordCount} words`);
            console.log(`  Summary: ${section.summary}`);
        });
        
        // Display aggregation results
        console.log('\n\n📝 AGGREGATED FINAL SUMMARY:');
        console.log('='.repeat(80));
        console.log(result.aggregation.finalSummary);
        
        console.log('\n\n📈 AGGREGATION METRICS:');
        console.log('-'.repeat(80));
        console.log(`Original document: ${result.aggregation.totalWordCount} words`);
        console.log(`Final summary: ${result.aggregation.summaryWordCount} words`);
        console.log(`Compression ratio: ${result.aggregation.compressionRatio}x`);
        console.log(`Sections processed: ${result.aggregation.sectionCount}`);
        
        // Calculate average section summary length for comparison
        const avgSectionWords = result.sections.reduce((sum, s) => 
            sum + s.summary.split(/\s+/).length, 0) / result.sections.length;
        console.log(`Average section summary: ${Math.round(avgSectionWords)} words`);
        
        console.log('\n✅ Test completed successfully!');
        
    } catch (error) {
        console.error('\n❌ Error during test:', error);
        process.exit(1);
    }
}

testSectioningWithAggregation();