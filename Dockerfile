# Use official Bun image
FROM oven/bun:1

# Copy package files first (for better caching)
COPY bun.lockb ./
COPY package.json ./

# Install dependencies
RUN bun install

# Copy the rest of the application
COPY src ./
COPY tailwind.config.js ./
COPY index.html ./
COPY postcss.config.js ./
COPY tsconfig.json ./
COPY vite.config.ts ./
COPY tsconfig.app.json ./
COPY tsconfig.node.json ./

# Build the Vite app
RUN bun run build

# Use a lightweight web server (optional: Vite preview can also be used)
# If you want to use `vite preview`, expose port 4173 and use that.
EXPOSE 4173

# Start the preview server
CMD ["bun", "run", "preview"]
