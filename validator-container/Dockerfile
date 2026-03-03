FROM oven/bun:latest

RUN apt-get update && \
    apt-get install -y openssl && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY package*.json .
RUN bun install
COPY . .
CMD ["bun", "run", "index.ts"]