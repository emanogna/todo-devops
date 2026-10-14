pipeline {
    agent any

    environment {
        PYTHON = 'C:\\Users\\manog\\AppData\\Local\\Programs\\Python\\Python313\\python.exe'
        IMAGE  = 'manogna0807/todo-devops'
        PATH   = "C:\\Users\\manog\\AppData\\Local\\Programs\\DockerDesktop\\resources\\bin;${env.PATH}"
    }

    stages {
        stage('Checkout') {
            steps { checkout scm }
        }

        stage('Install Dependencies') {
            steps { bat '"%PYTHON%" -m pip install -r requirements.txt' }
        }

        stage('Test') {
            steps { bat '"%PYTHON%" -m pytest -v' }
        }

        stage('Docker Build') {
            steps { bat 'docker build -t %IMAGE%:%BUILD_NUMBER% .' }
        }

        stage('Docker Push') {
            steps {
                withCredentials([usernamePassword(credentialsId: 'dockerhub-creds',
                                 usernameVariable: 'DH_USER', passwordVariable: 'DH_PASS')]) {
                    bat 'echo %DH_PASS%| docker login -u %DH_USER% --password-stdin'
                    bat 'docker push %IMAGE%:%BUILD_NUMBER%'
                }
            }
        }

        stage('Kubernetes Deploy') {
            steps {
                bat 'kubectl apply -f k8s/'
                bat 'kubectl set image deployment/todo-app todo-app=%IMAGE%:%BUILD_NUMBER%'
                bat 'kubectl rollout status deployment/todo-app'
            }
        }
    }

    post {
        success { echo 'Pipeline finished: app deployed!' }
        failure { echo 'Pipeline failed. Check the Console Output.' }
    }
}