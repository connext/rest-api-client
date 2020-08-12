#! /bin/bash
project_name="connextproject/rest-api-client" 

echo "Building Docker image for $project_name"
docker build -t $project_name .

echo "Pushing $project_name to Docker Hub"
docker push $project_name
