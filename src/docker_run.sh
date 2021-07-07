#!/usr/bin/env bash

set -eo pipefail

# runs the docker build, tagging and pushing

repo_uri=$1
repo_name=$2
region=$3

cp -r application image/application

cd image
aws ecr get-login-password --region "${region}" | docker login --username AWS --password-stdin "${repo_uri}"
docker build -t "${repo_name}" .
docker tag "${repo_name}":latest "${repo_uri}":latest
docker push "${repo_uri}":latest

rm -rf application

cd ..
