FROM rust:1-bookworm AS builder
WORKDIR /src
COPY . .
RUN cargo build --release -p sdkwork-documents-standalone-gateway

FROM debian:bookworm-slim
RUN apt-get update && apt-get install -y --no-install-recommends ca-certificates && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY --from=builder /src/target/release/sdkwork-documents-standalone-gateway /usr/local/bin/sdkwork-documents-standalone-gateway
ENV PORT=8080
EXPOSE 8080
CMD ["sdkwork-documents-standalone-gateway"]
