pipeline{
    agent none

    environment{
        DOCKERHUB_USER = 'jalajkumarr'   
        BACKEND_IMAGE   = "${DOCKERHUB_USER}/invoice-triage-backend"
        FRONTEND_IMAGE  = "${DOCKERHUB_USER}/invoice-triage-frontend"
    }

    stages{
        stage('checkout'){
            agent any
            steps{
                checkout scm
            }
        }

        stage('backend install'){
            agent{
                docker{image 'node:22-alpine'}
            }
            steps{
                dir('backend'){
                    sh 'npm ci'
                    sh 'npm run lint || true'
                }
            }
        }

        stage('backend:unit test'){
            agent{
                docker{image 'node:22-alpine'}
            }
            steps{
                dir('backend'){
                    sh 'npm ci'
                    sh 'LLM_PROVIDER=mock npx vitest run'
                }
            }
        }

        stage('Backend: LLMOps Eval Gate') {
            agent {
                docker { image 'node:22-alpine' }
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
                docker { image 'node:22-alpine' }
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
                script {
                    docker.withRegistry('https://registry.hub.docker.com', 'dockerhub-creds') {
                        def img = docker.build("${BACKEND_IMAGE}:${env.BUILD_NUMBER}", "./backend")
                        img.push()
                        img.push("latest")
                    }
                }
            }
        }

        stage('Build & Push Frontend Image') {
            agent any
            steps {
                script {
                    docker.withRegistry('https://registry.hub.docker.com', 'dockerhub-creds') {
                        def img = docker.build(
                            "${FRONTEND_IMAGE}:${env.BUILD_NUMBER}",
                            "--build-arg NEXT_PUBLIC_API_URL=http://localhost:3000 ./frontend"
                        )
                        img.push()
                        img.push("latest")
                    }
                }
            }
        }
    }

    post {
        success {
            echo "Build ${env.BUILD_NUMBER} succeeded — images pushed as tag ${env.BUILD_NUMBER} and latest."
        }
        failure {
            echo "Build failed — check the stage above for which gate blocked it."
        }
    }
}
