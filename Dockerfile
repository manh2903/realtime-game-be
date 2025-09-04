FROM oven/bun:latest

WORKDIR /app

# Copy package files
COPY package.json bun.lock ./

# Install dependencies với Bun
RUN bun install --production

# Copy source code
COPY . .

EXPOSE 3000

# Start với Bun
CMD ["bun", "start"]