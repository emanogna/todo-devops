pipeline {
    agent any

    stages {
        stage('Checkout') {
            steps {
                checkout scm
            }
        }

        stage('Install Dependencies') {
            steps {
                bat 'python -m pip install -r requirements.txt'
            }
        }

        stage('Test') {
            steps {
                bat 'python -m pytest -v'
            }
        }
    }

    post {
        success { echo 'Build and tests passed!' }
        failure { echo 'Build failed. Check the Console Output.' }
    }
}