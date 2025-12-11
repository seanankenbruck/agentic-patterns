import { APIRequirements } from "../src/types.js";

/**
 * Impossible/conflicting requirements designed to test the max iterations exit condition.
 * These requirements contain contradictions and impossibilities that should prevent
 * the spec from ever reaching an acceptable score.
 */
export const impossibleRequirements: APIRequirements = {
  description: "A RESTful API that must also be GraphQL-only, use both stateless JWT and stateful session cookies simultaneously, support real-time WebSocket connections while being purely request-response, and implement OAuth2 without any authentication endpoints",
  endpoints: [
    "A single endpoint that performs all CRUD operations using only GET requests",
    "POST endpoint that never accepts request bodies",
    "DELETE endpoint that creates new resources",
    "Health check endpoint that requires authentication but must work when auth server is down",
    "File upload endpoint that doesn't accept multipart/form-data",
    "Pagination endpoint without page/limit parameters",
    "Search endpoint that returns results without accepting search criteria"
  ],
  features: [
    "Stateless authentication using stateful sessions",
    "Real-time updates without WebSockets or polling",
    "Infinite scroll without pagination",
    "Rate limiting without tracking requests",
    "CORS support that blocks all origins",
    "API versioning using the same URL for all versions",
    "Caching that never stores or retrieves data",
    "Comprehensive error handling that never returns errors",
    "Required fields that are optional",
    "Backward compatibility while breaking all previous versions"
  ]
};
