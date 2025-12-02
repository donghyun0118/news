# Stage 1: Dependencies & Build
FROM node:18-alpine AS builder

# Set working directory
WORKDIR /usr/src/app

# Install Python and pip for build-time script dependencies
RUN apk add --no-cache python3 py3-pip

# Copy package definition files for the backend
# The build context is the monorepo root, so specify the path from the root
COPY backend/package*.json ./

# Install backend Node.js dependencies
RUN npm install

# Copy the entire backend source code into the container
# This includes the /src, /scripts, tsconfig, etc.
COPY backend/ ./

# Install Python dependencies for the scripts
RUN apk add --no-cache build-base gfortran python3-dev musl-dev && \
    pip install --no-cache-dir -r scripts/requirements.txt

# Build the NestJS application
RUN npm run build

# ---

# Stage 2: Production
FROM node:18-alpine AS production

WORKDIR /usr/src/app

# Install Python runtime (no need for pip anymore)
RUN apk add --no-cache python3

# Copy production node_modules from the builder stage
COPY --from=builder /usr/src/app/node_modules ./node_modules

# Copy compiled NestJS application from the builder stage
COPY --from=builder /usr/src/app/dist ./dist

# Copy Python scripts and their installed libraries from the builder stage
COPY --from=builder /usr/src/app/scripts ./scripts
# This path may vary slightly depending on the Alpine/Python version, but it's a common one
COPY --from=builder /usr/lib/python3.11/site-packages /usr/lib/python3.11/site-packages

# The command to run the application
CMD ["node", "dist/main"]