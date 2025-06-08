FROM amazonlinux:2023

# Install dependencies
RUN dnf clean all && \
    dnf update -y && \
    dnf install -y gcc gcc-c++ make python3 python3-devel tar gzip && \
    dnf groupinstall -y "Development Tools"

# Install Node.js 18
RUN curl -sL https://rpm.nodesource.com/setup_18.x | bash - && \
    dnf install -y nodejs

# Create app directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy source code
COPY . .

# Build the application
RUN npm run build

# Copy the built sweph.node binary to /output/
RUN mkdir -p /output/nodejs/node_modules/sweph/build/Release && \
    cp node_modules/sweph/build/Release/sweph.node /output/nodejs/node_modules/sweph/build/Release/

# Expose port
EXPOSE 3000

# Start the application
CMD ["npm", "start"] 