#!/usr/bin/env bash

set -eo pipefail

# runs the docker build, tagging and pushing

ecr=$1
container_name=$2
region=$3

echo "Running docker build, tag, push with ${ecr} and ${container_name}" # TODO remove
cd image
aws ecr get-login-password --region "${region}" | docker login --username AWS --password-stdin "${ecr}"
docker build -t "${container_name}" .
docker tag lambda-image-repo:latest "${ecr}"/"${container_name}":latest
docker push "${ecr}"/"${container_name}":latest
cd ..
