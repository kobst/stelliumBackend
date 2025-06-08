#!/bin/bash

# Create layer directory structure
mkdir -p layer/nodejs

# Create package.json for the layer
cat > layer/nodejs/package.json << EOF
{
  "name": "sweph-layer",
  "version": "1.0.0",
  "dependencies": {
    "sweph": "2.10.3-4"
  }
}
EOF

# Build the Docker image
docker build -t sweph-builder .

# Create the layer directory
mkdir -p layer/nodejs/node_modules/sweph/build/Release

# Copy the built module from Docker
docker create --name sweph-container sweph-builder
docker cp sweph-container:/output/nodejs/node_modules/sweph/build/Release/sweph.node layer/nodejs/node_modules/sweph/build/Release/
docker rm sweph-container

echo "Layer created successfully!" 