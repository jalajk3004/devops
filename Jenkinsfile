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

                    echo "Building Backend Docker Image"
                    echo "Image: ${image}:${tag}"

                    docker.build(
                        "${image}:${tag}",
                        "./backend"
                    )

                    echo "Backend image built successfully."

                    sh """
                        docker tag \
                            "${image}:${tag}" \
                            "${image}:latest"
                    """

                    echo "Backend latest tag created."

                    withCredentials([
                        usernamePassword(
                            credentialsId: 'dockerhub',
                            usernameVariable: 'DOCKERHUB_USER',
                            passwordVariable: 'DOCKERHUB_PWD'
                        )
                    ]) {
                        sh """
                            echo "\$DOCKERHUB_PWD" | docker login \
                                -u "\$DOCKERHUB_USER" \
                                --password-stdin

                            echo "Pushing ${image}:${tag}"
                            docker push "${image}:${tag}"

                            echo "Pushing ${image}:latest"
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

                    echo "Building Frontend Docker Image"
                    echo "Image: ${image}:${tag}"

                    docker.build(
                        "${image}:${tag}",
                        "--build-arg NEXT_PUBLIC_API_URL=http://invoice.local ./frontend"
                    )

                    echo "Frontend image built successfully."

                    sh """
                        docker tag \
                            "${image}:${tag}" \
                            "${image}:latest"
                    """

                    echo "Frontend latest tag created."

                    withCredentials([
                        usernamePassword(
                            credentialsId: 'dockerhub',
                            usernameVariable: 'DOCKERHUB_USER',
                            passwordVariable: 'DOCKERHUB_PWD'
                        )
                    ]) {
                        sh """
                            echo "\$DOCKERHUB_PWD" | docker login \
                                -u "\$DOCKERHUB_USER" \
                                --password-stdin

                            echo "Pushing ${image}:${tag}"
                            docker push "${image}:${tag}"

                            echo "Pushing ${image}:latest"
                            docker push "${image}:latest"

                            echo "Frontend images pushed successfully."
                        """
                    }
                }
            }
        }

        stage('Deploy to Minikube') {
            agent any

            steps {
                withCredentials([
                    file(
                        credentialsId: 'minikube-kubeconfig',
                        variable: 'KUBECONFIG'
                    )
                ]) {
                    sh """
                        echo "Deploying to Minikube"

                        kubectl get nodes

                        kubectl set image deployment/invoice-api \
                            api=${BACKEND_IMAGE}:${BUILD_NUMBER} \
                            -n invoice-triage

                        kubectl set image deployment/invoice-worker \
                            worker=${BACKEND_IMAGE}:${BUILD_NUMBER} \
                            -n invoice-triage

                        kubectl set image deployment/invoice-frontend \
                            frontend=${FRONTEND_IMAGE}:${BUILD_NUMBER} \
                            -n invoice-triage

                        kubectl rollout status \
                            deployment/invoice-api \
                            -n invoice-triage \
                            --timeout=90s

                        kubectl rollout status \
                            deployment/invoice-worker \
                            -n invoice-triage \
                            --timeout=90s

                        kubectl rollout status \
                            deployment/invoice-frontend \
                            -n invoice-triage \
                            --timeout=90s

                        kubectl get pods -n invoice-triage
                    """
                }
            }
        }
    }

    post {
        success {
            echo "BUILD SUCCESSFUL"
            echo "Build Number: ${env.BUILD_NUMBER}"
            echo "Backend: ${BACKEND_IMAGE}:${env.BUILD_NUMBER}"
            echo "Backend: ${BACKEND_IMAGE}:latest"
            echo "Frontend: ${FRONTEND_IMAGE}:${env.BUILD_NUMBER}"
            echo "Frontend: ${FRONTEND_IMAGE}:latest"
        }

        failure {
            echo "BUILD FAILED"
            echo "Check the failed stage above."
        }
    }
}