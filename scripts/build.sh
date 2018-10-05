#!/bin/sh

VERSION=${1:-dev}
GOOS=${2:-linux}
DOCKER_REPO="bartlettc/kubeviz-server"

# Directory to house our binaries
mkdir -p bin

# Build the binary in Docker and extract it from the container
docker build --build-arg VERSION=${VERSION} --build-arg GOOS=${GOOS} -t ${DOCKER_REPO}:${VERSION}-${GOOS} ./
docker run --rm --name kubeviz-server-build -d --entrypoint "" ${DOCKER_REPO}:${VERSION}-${GOOS} sh -c "sleep 30"
docker cp kubeviz-server-build:/usr/bin/kubeviz-server bin
docker stop kubeviz-server-build

# Zip up the binary
cd bin
zip kubeviz-server-${GOOS}-${VERSION}.zip kubeviz-server
rm kubeviz-server
