# SSE streaming over WebSockets for scan results

Chose Server-Sent Events (SSE) for streaming scan progress/results from backend to frontend, rejecting WebSockets. The backend deploys on FastAPI Cloud (serverless), where WebSocket connections require persistent infrastructure (EC2, ECS, Kubernetes). SSE works over standard HTTP and is natively supported by serverless platforms via chunked transfer encoding. The trade-off is unidirectional server→client streaming (sufficient for our use case) and lack of native browser retry semantics compared to WebSocket reconnection.
