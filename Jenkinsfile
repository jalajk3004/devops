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

        // ==========================================
        // CHECKOUT
        // ==========================================

        stage('Checkout') {
            agent any

            steps {
                checkout scm
            }
        }


        // ==========================================
        // BACKEND INSTALL
        // ==========================================

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


        // ==========================================
        // BACKEND UNIT TEST
        // ==========================================

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


        // ==========================================
        // LLMOPS EVALUATION
        // ==========================================

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


        // ==========================================
        // FRONTEND TYPECHECK
        // ==========================================

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


        // ==========================================
        // BUILD & PUSH BACKEND
        // ==========================================

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

                    echo "Backend image built successfully."


                    // Create latest tag
                    sh """
                        docker tag \
                            "${image}:${tag}" \
                            "${image}:latest"
                    """

                    echo "Backend latest tag created."


                    // Login and push
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


        // ==========================================
        // BUILD & PUSH FRONTEND
        // ==========================================

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

                    echo "Frontend image built successfully."


                    // Create latest tag
                    sh """
                        docker tag \
                            "${image}:${tag}" \
                            "${image}:latest"
                    """

                    echo "Frontend latest tag created."


                    // Login and push
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


        // ==========================================
        // DEPLOY TO MINIKUBE
        // ==========================================

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
                        echo "========================================"
                        echo "Deploying to Minikube"
                        echo "========================================"

                        kubectl get nodes

                        echo "Updating backend API..."

                        kubectl set image deployment/invoice-api \
                            api=${BACKEND_IMAGE}:${BUILD_NUMBER} \
                            -n invoice-triage

                        echo "Updating backend worker..."

                        kubectl set image deployment/invoice-worker \
                            worker=${BACKEND_IMAGE}:${BUILD_NUMBER} \
                            -n invoice-triage

                        echo "Updating frontend..."

                        kubectl set image deployment/invoice-frontend \
                            frontend=${FRONTEND_IMAGE}:${BUILD_NUMBER} \
                            -n invoice-triage


                        echo "Waiting for API rollout..."

                        kubectl rollout status \
                            deployment/invoice-api \
                            -n invoice-triage \
                            --timeout=90s


                        echo "Waiting for worker rollout..."

                        kubectl rollout status \
                            deployment/invoice-worker \
                            -n invoice-triage \
                            --timeout=90s


                        echo "Waiting for frontend rollout..."

                        kubectl rollout status \
                            deployment/invoice-frontend \
                            -n invoice-triage \
                            --timeout=90s


                        echo "========================================"
                        echo "Minikube deployment successful"
                        echo "========================================"

                        kubectl get pods -n invoice-triage
                    """
                }
            }
        }
    }


    // ==========================================
    // POST ACTIONS
    // ==========================================

    post {

        success {
            echo "========================================"
            echo "BUILD SUCCESSFUL"
            echo "========================================"

            echo "Build Number: ${env.BUILD_NUMBER}"

            echo "Backend:"
            echo "${BACKEND_IMAGE}:${env.BUILD_NUMBER}"
            echo "${BACKEND_IMAGE}:latest"

            echo "Frontend:"
            echo "${FRONTEND_IMAGE}:${env.BUILD_NUMBER}"
            echo "${FRONTEND_IMAGE}:latest"

            echo "========================================"
        }

        failure {
            echo "========================================"
            echo "BUILD FAILED"
            echo "========================================"

            echo "Check the failed stage above."

            echo "========================================"
        }
    }
}