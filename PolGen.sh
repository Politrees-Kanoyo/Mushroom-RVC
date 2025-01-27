#!/bin/bash

set -e

if [ ! -d "env" ]; then
    echo "Please run './PolGen-Installer.sh' first to set up the environment."
    exit 1
fi

check_internet_connection() {
    echo "Checking internet connection..."
    if ping -c 1 google.com &> /dev/null; then
        echo "Internet connection is available."
        INTERNET_AVAILABLE=1
    else
        echo "No internet connection detected."
        INTERNET_AVAILABLE=0
    fi
    echo
}

installing_necessary_models() {
    echo "Checking for required models..."
    HUBERT_BASE="$(pwd)/rvc/models/embedders/hubert_base.pt"
    FCPE="$(pwd)/rvc/models/predictors/fcpe.pt"
    RMVPE="$(pwd)/rvc/models/predictors/rmvpe.pt"

    if [ -f "$HUBERT_BASE" ] && [ -f "$FCPE" ] && [ -f "$RMVPE" ]; then
        echo "All required models are installed."
    else
        echo "Required models were not found. Installing models..."
        "./env/bin/python" download_models.py
        if [ $? -ne 0 ]; then
            echo "Model installation failed."
            exit 1
        fi
    fi
    echo
}

running_interface() {
    echo "Running Interface..."
    if [ "$INTERNET_AVAILABLE" -eq 1 ]; then
        echo "Running app.py..."
        "./env/bin/python" app.py --open
    else
        echo "Running app_offline.py..."
        "./env/bin/python" app_offline.py --open
    fi
}

check_internet_connection
installing_necessary_models
running_interface
