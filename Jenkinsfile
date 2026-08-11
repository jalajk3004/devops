pipeline {
    agent none

    options {
        skipDefaultCheckout(true)
    }

    environment {
        DOCKERHUB_USER = 'jalajkumarr'

        BACKEND_IMAGE  = "${DOCKERHUB_USER}/invoice-triage-backend"
        FRONTEND_IMAGE = "${DOCKERHUB_USER}/invoice-triage-frontend"
    }

    stages {

        stage('Checkout') {
            agent any

            steps {
                checkout scm
            }
        }

        stage('Backend Install') {
            agent {
                docker {
                    image 'node:22-alpine'
                }
            }

            steps {
                dir('backend') {
                    sh 'npm ci'
                    sh 'npm run lint || true'
                }
            }
        }

        stage('Backend Unit Test') {
            agent {
                docker {
                    image 'node:22-alpine'
                }
            }

            steps {
                dir('backend') {
                    sh 'npm ci'
                    sh 'LLM_PROVIDER=mock npx vitest run'
                }
            }
        }

        stage('Backend: LLMOps Eval Gate') {
            agent {
                docker {
                    image 'node:22-alpine'
                }
            }

            steps {
                dir('backend') {
                    sh 'npm ci'
                    sh 'LLM_PROVIDER=mock npx tsx evals/run-evals.ts'
                }
            }
        }

        stage('Frontend: Install & Typecheck') {
            agent {
                docker {
                    image 'node:22-alpine'
                }
            }

            steps {
                dir('frontend') {
                    sh 'npm ci'
                    sh 'npx tsc --noEmit'
                }
            }
        }

        stage('Build & Push Backend Image') {
            agent any

            steps {
                sh 'docker --version'
                sh 'docker info'

                script {
                    def image = "${BACKEND_IMAGE}"
                    def tag = "${env.BUILD_NUMBER}"

                    echo "========================================"
                    echo "Building Backend Docker Image"
                    echo "Image: ${image}:${tag}"
                    echo "========================================"

                    docker.build(
                        "${image}:${tag}",
                        "./backend"
                    )

                    echo "Backend Docker image built successfully."

                    withCredentials([
                        usernamePassword(
                            credentialsId: 'dockerhub-creds',
                            usernameVariable: 'DOCKERHUB_USER',
                            passwordVariable: 'DOCKERHUB_PWD'
                        )
                    ]) {

                        sh """
                            echo "Logging in to Docker Hub..."

                            echo "\$DOCKERHUB_PWD" | docker login \
                                -u "\$DOCKERHUB_USER" \
                                --password-stdin

                            echo "Docker Hub login successful."

                            echo "Pushing backend image: ${image}:${tag}"
                            docker push "${image}:${tag}"

                            echo "Pushing backend image: ${image}:latest"
                            docker push "${image}:latest"

                            echo "Backend images pushed successfully."
                        """
                    }
                }
            }
        }

        stage('Build & Push Frontend Image') {
            agent any

            steps {
                sh 'docker --version'
                sh 'docker info'

                script {
                    def image = "${FRONTEND_IMAGE}"
                    def tag = "${env.BUILD_NUMBER}"

                    echo "========================================"
                    echo "Building Frontend Docker Image"
                    echo "Image: ${image}:${tag}"
                    echo "========================================"

                    docker.build(
                        "${image}:${tag}",
                        "--build-arg NEXT_PUBLIC_API_URL=http://localhost:3000 ./frontend"
                    )

                    echo "Frontend Docker image built successfully."

                    withCredentials([
                        usernamePassword(
                            credentialsId: 'dockerhub-creds',
                            usernameVariable: 'DOCKERHUB_USER',
                            passwordVariable: 'DOCKERHUB_PWD'
                        )
                    ]) {

                        sh """
                            echo "Logging in to Docker Hub..."

                            echo "\$DOCKERHUB_PWD" | docker login \
                                -u "\$DOCKERHUB_USER" \
                                --password-stdin

                            echo "Docker Hub login successful."

                            echo "Pushing frontend image: ${image}:${tag}"
                            docker push "${image}:${tag}"

                            echo "Pushing frontend image: ${image}:latest"
                            docker push "${image}:latest"

                            echo "Frontend images pushed successfully."
                        """
                    }
                }
            }
        }
    }

    post {
        success {
            echo "========================================"
            echo "BUILD SUCCESSFUL"
            echo "Build Number: ${env.BUILD_NUMBER}"
            echo "Backend: ${BACKEND_IMAGE}:${env.BUILD_NUMBER}"
            echo "Backend: ${BACKEND_IMAGE}:latest"
            echo "Frontend: ${FRONTEND_IMAGE}:${env.BUILD_NUMBER}"
            echo "Frontend: ${FRONTEND_IMAGE}:latest"
            echo "========================================"
        }

        failure {
            echo "========================================"
            echo "BUILD FAILED"
            echo "Check the failed stage above."
            echo "========================================"
        }
    }
}