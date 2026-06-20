FROM rust:1-bookworm AS builder
WORKDIR /src
COPY . .
RUN cargo build --release -p sdkwork-documents-api-server

FROM debian:bookworm-slim
RUN apt-get update && apt-get install -y --no-install-recommends ca-certificates && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY --from=builder /src/target/release/sdkwork-documents-api-server /usr/local/bin/sdkwork-documents-api-server
ENV PORT=8080
EXPOSE 8080
CMD ["sdkwork-documents-api-server"]
