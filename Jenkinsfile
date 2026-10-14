pipeline {
    agent any

    environment {
        PYTHON = 'C:\\Users\\manog\\AppData\\Local\\Programs\\Python\\Python312\\python.exe'
    }

    stages {
        stage('Checkout') {
            steps {
                checkout scm
            }
        }

        stage('Install Dependencies') {
            steps {
                bat '"%PYTHON%" -m pip install -r requirements.txt'
            }
        }

        stage('Test') {
            steps {
                bat '"%PYTHON%" -m pytest -v'
            }
        }
    }

    post {
        success { echo 'Build and tests passed!' }
        failure { echo 'Build failed. Check the Console Output.' }
    }
}