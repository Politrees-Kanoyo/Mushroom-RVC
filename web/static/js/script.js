// Mushroom RVC Web Interface - Refactored
// Модульная архитектура с улучшенной читаемостью и производительностью

// === КОНСТАНТЫ И КОНФИГУРАЦИЯ ===
const CONFIG = {
    MAX_FILE_SIZE: 500 * 1024 * 1024, // 500MB
    PROGRESS_UPDATE_INTERVAL: 500,
    NOTIFICATION_TIMEOUT: 5000,
    ANIMATION_DELAY: 300,
    SUPPORTED_AUDIO_TYPES: ['mp3', 'wav', 'flac', 'ogg', 'm4a'],
    SUPPORTED_ZIP_TYPES: ['zip']
};

const MESSAGES = {
    ru: {
        fileUploadSuccess: 'Файл успешно загружен!',
        fileRemoved: 'Файл удален',
        voiceConversionComplete: 'Преобразование голоса завершено!',
        ttsConversionComplete: 'Синтез и преобразование завершены!',
        modelDownloadSuccess: 'Модель успешно загружена!',
        zipUploadSuccess: 'ZIP модель успешно загружена!',
        hubertInstallSuccess: 'HuBERT модель успешно установлена!',
        modelsListUpdated: 'Список моделей обновлен',
        uploadCancelled: 'Загрузка отменена',
        selectAudioFile: 'Выберите файл',
        selectZipFile: 'Выберите ZIP файл',
        fileTooLarge: 'Размер файла не должен превышать 500MB',
        selectAudioFirst: 'Пожалуйста, сначала выберите и загрузите аудиофайл',
        enterModelName: 'Пожалуйста, введите имя модели',
        selectZipFirst: 'Пожалуйста, выберите ZIP файл',
        networkError: 'Ошибка сети. Проверьте подключение к интернету.',
        unknownError: 'Произошла неизвестная ошибка'
    },
    en: {
        fileUploadSuccess: 'File uploaded successfully!',
        fileRemoved: 'File removed',
        voiceConversionComplete: 'Voice conversion completed successfully!',
        ttsConversionComplete: 'Synthesis and conversion completed successfully!',
        modelDownloadSuccess: 'Model downloaded successfully!',
        zipUploadSuccess: 'ZIP model uploaded successfully!',
        hubertInstallSuccess: 'HuBERT model installed successfully!',
        modelsListUpdated: 'Models list updated',
        uploadCancelled: 'Upload cancelled',
        selectAudioFile: 'Select audio file',
        selectZipFile: 'Select ZIP file',
        fileTooLarge: 'File size should not exceed 500MB',
        selectAudioFirst: 'Please select and upload an audio file first',
        enterModelName: 'Please enter model name',
        selectZipFirst: 'Please select ZIP file',
        networkError: 'Network error. Check your internet connection.',
        unknownError: 'An unknown error occurred'
    }
};

// === СОСТОЯНИЕ ПРИЛОЖЕНИЯ ===
class AppState {
    constructor() {
        this.models = [];
        this.voices = {};
        this.formats = [];
        this.f0Methods = [];
        this.hubertModels = [];
        this.uploadedAudioFile = null;
        this.currentAudioPlayer = null;
        this.voiceConversionPlayer = null;
        this.ttsConversionPlayer = null;
        this.activeUploads = new Map();
        this.i18n = window.i18n || {};
        this.currentLang = window.currentLang || 'ru';
    }

    getMessage(key) {
        return MESSAGES[this.currentLang]?.[key] || MESSAGES.en[key] || key;
    }
}

const appState = new AppState();

// === УТИЛИТЫ ===
class Utils {
    static formatFileSize(bytes) {
        if (bytes === 0) return '0 B';
        const units = ['B', 'KB', 'MB', 'GB', 'TB'];
        const k = 1024;
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + units[i];
    }

    static formatSpeed(bytesPerSecond) {
        if (bytesPerSecond === 0) return '0 B/s';
        const units = ['B/s', 'KB/s', 'MB/s', 'GB/s'];
        const k = 1024;
        const i = Math.floor(Math.log(bytesPerSecond) / Math.log(k));
        return parseFloat((bytesPerSecond / Math.pow(k, i)).toFixed(1)) + ' ' + units[i];
    }

    static formatTime(seconds) {
        if (seconds === 0 || !isFinite(seconds)) {
            return appState.getMessage('calculating') || 'Calculating...';
        }
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const secs = Math.floor(seconds % 60);
        
        if (hours > 0) {
            return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
        } else if (minutes > 0) {
            return `${minutes}:${secs.toString().padStart(2, '0')}`;
        }
        return `${secs}s`;
    }

    static validateFile(file, options = {}) {
        const {
            maxSize = CONFIG.MAX_FILE_SIZE,
            allowedTypes = [],
            minSize = 0
        } = options;

        const result = { valid: true, errors: [] };

        if (!file) {
            result.valid = false;
            result.errors.push(appState.getMessage('noFileSelected') || 'No file selected');
            return result;
        }

        if (file.size > maxSize) {
            result.valid = false;
            result.errors.push(appState.getMessage('fileTooLarge'));
        }

        if (file.size < minSize) {
            result.valid = false;
            result.errors.push(appState.getMessage('fileTooSmall') || 'File too small');
        }

        if (allowedTypes.length > 0) {
            const fileExtension = file.name.split('.').pop().toLowerCase();
            if (!allowedTypes.includes(fileExtension)) {
                result.valid = false;
                result.errors.push(`Unsupported file type. Allowed: ${allowedTypes.join(', ')}`);
            }
        }

        return result;
    }

    static async delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

// === УВЕДОМЛЕНИЯ ===
class NotificationManager {
    static show(message, type = 'success') {
        const notifications = document.getElementById('notifications');
        if (!notifications) return;

        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.textContent = message;

        notifications.appendChild(notification);

        const removeNotification = () => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        };

        setTimeout(removeNotification, CONFIG.NOTIFICATION_TIMEOUT);
        notification.addEventListener('click', removeNotification);
    }
}

// === УПРАВЛЕНИЕ ПРОГРЕССОМ ===
class ProgressManager {
    static show(progressId, file = null) {
        const element = document.getElementById(progressId);
        if (!element) return;

        element.classList.remove('hidden');
        element.classList.add('active');

        if (file) {
            this.updateFileInfo(progressId, file.name, Utils.formatFileSize(file.size));
        }

        this.update(progressId, 0, 'preparing');
    }

    static hide(progressId, delay = 0) {
        setTimeout(() => {
            const element = document.getElementById(progressId);
            if (!element) return;

            element.classList.add('hidden');
            element.classList.remove('active');
            this.clearFileInfo(progressId);
            this.update(progressId, 0, 'preparing');
        }, delay);
    }

    static update(progressId, percentage, status = 'uploading', details = {}) {
        const element = document.getElementById(progressId);
        if (!element) return;

        const statusTexts = {
            'preparing': appState.currentLang === 'ru' ? 'Подготовка...' : 'Preparing...',
            'uploading': appState.currentLang === 'ru' ? 'Загрузка...' : 'Uploading...',
            'processing': appState.currentLang === 'ru' ? 'Обработка...' : 'Processing...',
            'complete': appState.currentLang === 'ru' ? 'Завершено' : 'Completed',
            'error': appState.currentLang === 'ru' ? 'Ошибка' : 'Error',
            'cancelled': appState.currentLang === 'ru' ? 'Отменено' : 'Cancelled'
        };

        // Обновляем элементы прогресса
        const progressFill = element.querySelector('.progress-fill');
        const progressPercentage = element.querySelector('.progress-percentage');
        const progressStatus = element.querySelector('.progress-status');
        const progressSpeed = element.querySelector('.progress-speed');
        const progressEta = element.querySelector('.progress-eta');
        const progressSize = element.querySelector('.progress-size');
        const cancelButton = element.querySelector('.progress-cancel');

        if (progressFill) {
            progressFill.style.width = `${percentage}%`;
            progressFill.style.transition = 'width 0.3s ease';
            progressFill.className = `progress-fill ${status}`;
        }

        if (progressPercentage) progressPercentage.textContent = `${percentage}%`;
        if (progressStatus) progressStatus.textContent = statusTexts[status] || statusTexts['uploading'];

        if (progressSpeed && details.speed !== undefined) {
            progressSpeed.textContent = Utils.formatSpeed(details.speed);
            progressSpeed.style.display = status === 'uploading' ? 'inline' : 'none';
        }

        if (progressEta && details.eta !== undefined && status === 'uploading') {
            progressEta.textContent = Utils.formatTime(details.eta);
            progressEta.style.display = 'inline';
        } else if (progressEta) {
            progressEta.style.display = 'none';
        }

        if (progressSize && details.loaded !== undefined && details.total !== undefined) {
            const sizeText = status === 'processing' ?
                `${details.loaded} / ${details.total}` :
                `${Utils.formatFileSize(details.loaded)} / ${Utils.formatFileSize(details.total)}`;
            progressSize.textContent = sizeText;
            progressSize.style.display = (status === 'uploading' || status === 'processing') ? 'inline' : 'none';
        }

        if (cancelButton) {
            if (status === 'uploading' || status === 'preparing') {
                cancelButton.style.display = 'inline-block';
                cancelButton.onclick = () => this.cancel(progressId);
            } else {
                cancelButton.style.display = 'none';
            }
        }
    }

    static updateFileInfo(progressId, fileName, fileSize) {
        const element = document.getElementById(progressId);
        if (!element) return;

        const fileNameElement = element.querySelector('.progress-filename, .progress-file-name');
        const fileSizeElement = element.querySelector('.progress-filesize, .progress-file-size');

        if (fileNameElement) fileNameElement.textContent = fileName;
        if (fileSizeElement) fileSizeElement.textContent = fileSize;
    }

    static clearFileInfo(progressId) {
        const element = document.getElementById(progressId);
        if (!element) return;

        const elements = element.querySelectorAll('.progress-filename, .progress-file-name, .progress-filesize, .progress-file-size, .progress-speed, .progress-eta, .progress-size');
        elements.forEach(el => el.textContent = '');
    }

    static cancel(progressId) {
        const xhr = appState.activeUploads.get(progressId);
        if (xhr) {
            xhr.abort();
            appState.activeUploads.delete(progressId);
            this.update(progressId, 0, 'cancelled');
            NotificationManager.show(appState.getMessage('uploadCancelled'), 'info');
        }
    }

    static startRealTimeProgress(progressId) {
        // Инициализируем прогресс
        this.updateRealTimeProgress(progressId, {
            progress: 0.0,
            current_step: 0,
            total_steps: 8,
            step_name: appState.currentLang === 'ru' ? 'Инициализация' : 'Initialization',
            description: appState.currentLang === 'ru' ? 'Подготовка к конвертации' : 'Preparing for conversion'
        });

        // Запускаем опрос прогресса каждые 200ms для более плавного обновления
        const intervalId = setInterval(async () => {
            try {
                const response = await fetch('/api/conversion-progress');
                const data = await response.json();
                if (data.success && data.progress) {
                    this.updateRealTimeProgress(progressId, data.progress);
                    
                    // Останавливаем опрос, если конвертация завершена
                    if (data.progress.progress >= 1.0) {
                        clearInterval(intervalId);
                    }
                }
            } catch (error) {
                console.error('Ошибка получения прогресса:', error);
            }
        }, 200); // Уменьшили интервал для более плавного обновления
        
        return intervalId;
    }

    static updateRealTimeProgress(progressId, progressData) {
        const fileName = appState.uploadedAudioFile ? appState.uploadedAudioFile.name : 'audio_file';
        const shortFileName = fileName.length > 30 ? fileName.substring(0, 30) + '...' : fileName;
        const percentage = Math.round(progressData.progress * 100);

        // Определяем статус на основе прогресса
        let status = 'processing';
        if (percentage >= 100) {
            status = 'complete';
        } else if (percentage === 0 && progressData.current_step === 0) {
            status = 'preparing';
        }

        const details = {
            loaded: progressData.current_step,
            total: progressData.total_steps
        };

        this.update(progressId, percentage, status, details);

        const element = document.getElementById(progressId);
        if (element) {
            // Обновляем счетчик шагов
            const progressSizeValue = element.querySelector('.progress-size-value');
            if (progressSizeValue) {
                progressSizeValue.textContent = `${progressData.current_step} / ${progressData.total_steps}`;
            }

            // Обновляем текст статуса с более подробной информацией
            const statusText = element.querySelector('.progress-status-text');
            if (statusText) {
                let statusMessage;
                if (percentage >= 100) {
                    statusMessage = appState.currentLang === 'ru' ? 
                        `✅ Конвертация завершена — ${shortFileName}` :
                        `✅ Conversion completed — ${shortFileName}`;
                } else {
                    const stepName = progressData.step_name || (appState.currentLang === 'ru' ? 'Обработка' : 'Processing');
                    const description = progressData.description || stepName;
                    statusMessage = `🌌 ${stepName} — ${shortFileName} (${percentage}%)`;
                }
                statusText.textContent = statusMessage;
            }

            // Обновляем заголовок файла для лучшей информативности
            const fileNameElement = element.querySelector('.progress-file-name');
            if (fileNameElement && progressData.step_name) {
                fileNameElement.textContent = progressData.step_name;
            }
        }
    }
}

// === УПРАВЛЕНИЕ ФАЙЛАМИ ===
class FileManager {
    static async upload(url, formData, progressId) {
        return new Promise((resolve, reject) => {
            const xhr = new XMLHttpRequest();
            const startTime = Date.now();
            let lastLoaded = 0;
            let lastTime = startTime;

            appState.activeUploads.set(progressId, xhr);

            xhr.upload.addEventListener('progress', (event) => {
                if (event.lengthComputable) {
                    const currentTime = Date.now();
                    const percentComplete = Math.round((event.loaded / event.total) * 100);
                    const timeDiff = (currentTime - lastTime) / 1000;
                    const loadedDiff = event.loaded - lastLoaded;
                    const speed = timeDiff > 0 ? loadedDiff / timeDiff : 0;
                    const remaining = event.total - event.loaded;
                    const eta = speed > 0 ? remaining / speed : 0;

                    ProgressManager.update(progressId, percentComplete, 'uploading', {
                        speed, eta, loaded: event.loaded, total: event.total
                    });

                    lastLoaded = event.loaded;
                    lastTime = currentTime;
                }
            });

            xhr.addEventListener('load', () => {
                if (xhr.status >= 200 && xhr.status < 300) {
                    ProgressManager.update(progressId, 100, 'processing');
                    setTimeout(() => {
                        appState.activeUploads.delete(progressId);
                        resolve({
                            json: () => Promise.resolve(JSON.parse(xhr.responseText)),
                            ok: true,
                            status: xhr.status
                        });
                    }, 500);
                } else {
                    ProgressManager.update(progressId, 0, 'error');
                    appState.activeUploads.delete(progressId);
                    try {
                        const errorResponse = JSON.parse(xhr.responseText);
                        reject(new Error(errorResponse.error || `HTTP ${xhr.status}: ${xhr.statusText}`));
                    } catch (e) {
                        reject(new Error(`HTTP ${xhr.status}: ${xhr.statusText}`));
                    }
                }
            });

            xhr.addEventListener('error', () => {
                ProgressManager.update(progressId, 0, 'error');
                appState.activeUploads.delete(progressId);
                reject(new Error(appState.getMessage('networkError')));
            });

            xhr.addEventListener('abort', () => {
                ProgressManager.update(progressId, 0, 'cancelled');
                appState.activeUploads.delete(progressId);
                reject(new Error(appState.getMessage('uploadCancelled')));
            });

            xhr.open('POST', url);
            xhr.send(formData);
        });
    }

    static async uploadAudioFile(file) {
        const validation = Utils.validateFile(file, {
            allowedTypes: CONFIG.SUPPORTED_AUDIO_TYPES
        });

        if (!validation.valid) {
            NotificationManager.show(validation.errors[0], 'error');
            return;
        }

        const formData = new FormData();
        formData.append('audio_file', file);

        ProgressManager.show('voice-upload-progress', file);

        try {
            const response = await this.upload('/api/upload-audio', formData, 'voice-upload-progress');
            const data = await response.json();

            if (data.success) {
                appState.uploadedAudioFile = {
                    name: file.name,
                    path: data.file_path,
                    size: file.size
                };

                ProgressManager.hide('voice-upload-progress', 1000);
                this.updateFileInputDisplay(file.name, true);
                NotificationManager.show(appState.getMessage('fileUploadSuccess'), 'success');
            } else {
                throw new Error(data.error);
            }
        } catch (error) {
            console.error('Ошибка загрузки файла:', error);
            NotificationManager.show(`${appState.getMessage('fileUploadError')}: ${error.message}`, 'error');
            ProgressManager.hide('voice-upload-progress', 1000);
            this.resetFileInput();
            appState.uploadedAudioFile = null;
        }
    }

    static async removeUploadedAudioFile() {
        if (!appState.uploadedAudioFile) return;

        try {
            const response = await fetch('/api/remove-audio', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ file_path: appState.uploadedAudioFile.path })
            });

            const data = await response.json();

            if (data.success) {
                appState.uploadedAudioFile = null;
                this.resetFileInput();
                ProgressManager.hide('voice-upload-progress', 0);
                NotificationManager.show(appState.getMessage('fileRemoved'), 'success');
            } else {
                throw new Error(data.error);
            }
        } catch (error) {
            console.error('Ошибка удаления файла:', error);
            NotificationManager.show(`${appState.getMessage('fileRemovalError')}: ${error.message}`, 'error');
        }
    }

    static updateFileInputDisplay(fileName, uploaded = false) {
        const fileInputWrapper = document.querySelector('.file-input-wrapper');
        if (!fileInputWrapper) return;

        setTimeout(() => {
            fileInputWrapper.style.display = 'block';
            const textElement = fileInputWrapper.querySelector('.file-text');
            if (textElement) {
                textElement.textContent = uploaded ? `✓ ${fileName} (загружен)` : fileName;
            }

            const removeBtn = document.getElementById('remove-audio-file');
            const fileIcon = fileInputWrapper.querySelector('.file-icon');
            
            if (removeBtn) removeBtn.classList.toggle('hidden', !uploaded);
            if (fileIcon) fileIcon.style.display = uploaded ? 'none' : 'block';
        }, 1000);
    }

    static resetFileInput() {
        const audioFileInput = document.getElementById('audio-file');
        const removeBtn = document.getElementById('remove-audio-file');
        const fileIcon = document.querySelector('.file-icon');
        const fileInputWrapper = document.querySelector('.file-input-wrapper');

        if (audioFileInput) audioFileInput.value = '';
        if (removeBtn) removeBtn.classList.add('hidden');
        if (fileIcon) fileIcon.style.display = 'block';

        if (fileInputWrapper) {
            const textElement = fileInputWrapper.querySelector('.file-text');
            const label = fileInputWrapper.querySelector('.file-label');
            
            if (textElement) textElement.textContent = appState.getMessage('selectAudioFile');
            if (label) label.style.borderColor = 'var(--border-color)';
        }
    }
}

// === API МЕНЕДЖЕР ===
class ApiManager {
    static async fetchData(endpoint) {
        try {
            const response = await fetch(endpoint);
            const data = await response.json();
            
            if (data.success) {
                return data;
            } else {
                throw new Error(data.error);
            }
        } catch (error) {
            console.error(`Ошибка загрузки ${endpoint}:`, error);
            throw error;
        }
    }

    static async loadModels() {
        const data = await this.fetchData('/api/models');
        appState.models = data.models;
        UIManager.updateModelSelects();
    }

    static async loadVoices() {
        const data = await this.fetchData('/api/voices');
        appState.voices = data.voices;
        UIManager.updateVoiceSelect();
    }

    static async loadFormats() {
        const data = await this.fetchData('/api/formats');
        appState.formats = data.formats;
        UIManager.updateFormatSelects();
    }

    static async loadF0Methods() {
        const data = await this.fetchData('/api/f0-methods');
        appState.f0Methods = data.methods;
        UIManager.updateF0MethodSelect();
    }

    static async loadHubertModels() {
        const data = await this.fetchData('/api/hubert-models');
        appState.hubertModels = data.models;
        UIManager.updateHubertSelect();
    }

    static async loadInitialData() {
        try {
            await Promise.all([
                this.loadModels(),
                this.loadVoices(),
                this.loadFormats(),
                this.loadF0Methods(),
                this.loadHubertModels()
            ]);
            NotificationManager.show('Данные успешно загружены', 'success');
        } catch (error) {
            console.error('Ошибка загрузки данных:', error);
            NotificationManager.show('Ошибка загрузки данных: ' + error.message, 'error');
        }
    }
}

// === UI МЕНЕДЖЕР ===
class UIManager {
    static updateModelSelects() {
        const selects = ['rvc-model', 'tts-rvc-model'];
        const defaultOption = `<option value="">${appState.i18n.select_model || 'Выберите модель'}</option>`;
        
        selects.forEach(selectId => {
            const select = document.getElementById(selectId);
            if (select) {
                select.innerHTML = defaultOption + appState.models.map(model => 
                    `<option value="${model}">${model}</option>`
                ).join('');
            }
        });
    }

    static updateVoiceSelect() {
        const select = document.getElementById('tts-voice');
        if (!select) return;

        const defaultOption = `<option value="">${appState.i18n.select_voice || 'Выберите голос'}</option>`;
        const optgroups = Object.keys(appState.voices).map(language => {
            const options = appState.voices[language].map(voice => 
                `<option value="${voice}">${voice}</option>`
            ).join('');
            return `<optgroup label="${language}">${options}</optgroup>`;
        }).join('');

        select.innerHTML = defaultOption + optgroups;
    }

    static updateFormatSelects() {
        const select = document.getElementById('output-format');
        if (select) {
            select.innerHTML = appState.formats.map(format => 
                `<option value="${format}">${format.toUpperCase()}</option>`
            ).join('');
        }
    }

    static updateF0MethodSelect() {
        const select = document.getElementById('f0-method');
        if (select && appState.f0Methods.length > 0) {
            select.innerHTML = appState.f0Methods.map(method => 
                `<option value="${method}">${method}</option>`
            ).join('');
        }
    }

    static updateHubertSelect() {
        const select = document.getElementById('hubert-model');
        if (select) {
            const defaultOption = `<option value="">${appState.i18n.select_hubert_model || 'Выберите HuBERT модель'}</option>`;
            select.innerHTML = defaultOption + appState.hubertModels.map(model => 
                `<option value="${model}">${model}</option>`
            ).join('');
        }
    }

    static setupSliders() {
        const sliders = [
            { id: 'rvc-pitch', valueId: 'rvc-pitch-value' },
            { id: 'protect', valueId: 'protect-value' },
            { id: 'index-rate', valueId: 'index-rate-value' },
            { id: 'volume-envelope', valueId: 'volume-envelope-value' },
            { id: 'tts-rate', valueId: 'tts-rate-value' },
            { id: 'tts-volume', valueId: 'tts-volume-value' },
            { id: 'tts-rvc-pitch', valueId: 'tts-rvc-pitch-value' },
            { id: 'tts-protect', valueId: 'tts-protect-value' }
        ];

        sliders.forEach(({ id, valueId }) => {
            const slider = document.getElementById(id);
            const valueElement = document.getElementById(valueId);

            if (slider && valueElement) {
                valueElement.textContent = slider.value;
                slider.addEventListener('input', () => {
                    valueElement.textContent = slider.value;
                });
            }
        });
    }

    static showResult(result) {
        const { type } = result;
        const resultArea = document.getElementById(`${type}-result`);
        const resultContent = document.getElementById(`${type}-result-content`);
        const playerContainerId = `${type}-audio-player`;

        if (!resultArea || !resultContent) return;

        let html = '';
        if (type === 'voice-conversion') {
            const titleText = appState.currentLang === 'ru' ? 'Преобразование голоса завершено' : 'Voice conversion completed';
            const fileText = appState.currentLang === 'ru' ? 'Выходной файл:' : 'Output file:';
            html = `
                <h4>${titleText}</h4>
                <p><strong>${fileText}</strong> ${result.outputPath}</p>
                <div class="audio-player-container" id="${playerContainerId}"></div>
            `;
        } else if (type === 'tts-conversion') {
            const titleText = appState.currentLang === 'ru' ? 'Синтез и преобразование завершены' : 'Synthesis and conversion completed';
            const synthText = appState.currentLang === 'ru' ? 'Синтезированная речь:' : 'Synthesized speech:';
            const convertedText = appState.currentLang === 'ru' ? 'Преобразованный голос:' : 'Converted voice:';
            html = `
                <h4>${titleText}</h4>
                <p><strong>${synthText}</strong> ${result.synthPath}</p>
                <p><strong>${convertedText}</strong> ${result.convertedPath}</p>
                <div class="audio-player-container" id="${playerContainerId}"></div>
            `;
        }

        resultContent.innerHTML = html;
        resultArea.classList.remove('hidden');

        // Очистка предыдущих плееров
        if (type === 'voice-conversion' && appState.voiceConversionPlayer) {
            appState.voiceConversionPlayer.destroy();
            appState.voiceConversionPlayer = null;
        } else if (type === 'tts-conversion' && appState.ttsConversionPlayer) {
            appState.ttsConversionPlayer.destroy();
            appState.ttsConversionPlayer = null;
        }

        // Создание нового плеера
        if (result.downloadUrl) {
            setTimeout(() => {
                const playerContainer = document.getElementById(playerContainerId);
                if (playerContainer) {
                    const newPlayer = new AudioPlayer(playerContainer);
                    // Добавляем timestamp к URL для принудительного обновления кэша
                    const cacheBustUrl = `${result.downloadUrl}?t=${Date.now()}`;
                    newPlayer.loadAudio(cacheBustUrl, result.outputPath || 'result.mp3');

                    if (type === 'voice-conversion') {
                        appState.voiceConversionPlayer = newPlayer;
                    } else if (type === 'tts-conversion') {
                        appState.ttsConversionPlayer = newPlayer;
                    }

                    appState.currentAudioPlayer = newPlayer;
                }
            }, 100);
        }

        resultArea.scrollIntoView({ behavior: 'smooth' });
    }
}

// === ОБРАБОТЧИКИ СОБЫТИЙ ===
class EventHandlers {
    static setupTabNavigation() {
        const navButtons = document.querySelectorAll('.nav-btn');
        const tabContents = document.querySelectorAll('.tab-content');

        navButtons.forEach(button => {
            button.addEventListener('click', () => {
                const targetTab = button.getAttribute('data-tab');

                // Переключение активных элементов
                navButtons.forEach(btn => btn.classList.remove('active'));
                tabContents.forEach(tab => tab.classList.remove('active'));
                document.querySelectorAll('.result-area').forEach(area => area.classList.add('hidden'));

                button.classList.add('active');
                document.getElementById(targetTab).classList.add('active');

                // Показ результатов для активной вкладки
                this.showTabResults(targetTab);
            });
        });
    }

    static showTabResults(targetTab) {
        if (targetTab === 'voice-conversion') {
            const voiceResult = document.getElementById('voice-conversion-result');
            if (voiceResult && voiceResult.querySelector('.result-content').innerHTML.trim() !== '') {
                voiceResult.classList.remove('hidden');
            }
            if (appState.voiceConversionPlayer) {
                appState.currentAudioPlayer = appState.voiceConversionPlayer;
            }
        } else if (targetTab === 'tts-conversion') {
            const ttsResult = document.getElementById('tts-conversion-result');
            if (ttsResult && ttsResult.querySelector('.result-content').innerHTML.trim() !== '') {
                ttsResult.classList.remove('hidden');
            }
            if (appState.ttsConversionPlayer) {
                appState.currentAudioPlayer = appState.ttsConversionPlayer;
            }
        }
    }

    static setupFileInputs() {
        const audioFileInput = document.getElementById('audio-file');
        const removeAudioBtn = document.getElementById('remove-audio-file');
        const zipFileInput = document.getElementById('zip-file');

        if (audioFileInput) {
            audioFileInput.addEventListener('change', async function() {
                if (this.files.length > 0) {
                    await FileManager.uploadAudioFile(this.files[0]);
                } else {
                    FileManager.resetFileInput();
                    appState.uploadedAudioFile = null;
                }
            });
        }

        if (removeAudioBtn) {
            removeAudioBtn.addEventListener('click', () => FileManager.removeUploadedAudioFile());
        }

        if (zipFileInput) {
            zipFileInput.addEventListener('change', function() {
                const label = this.nextElementSibling;
                const textElement = label.querySelector('.file-text');

                if (this.files.length > 0) {
                    const file = this.files[0];
                    const validation = Utils.validateFile(file, {
                        allowedTypes: CONFIG.SUPPORTED_ZIP_TYPES
                    });

                    if (validation.valid) {
                        textElement.textContent = file.name;
                        label.style.borderColor = 'var(--primary-color)';
                    } else {
                        NotificationManager.show(validation.errors[0], 'error');
                        this.value = '';
                        textElement.textContent = appState.getMessage('selectZipFile');
                        label.style.borderColor = 'var(--border-color)';
                    }
                } else {
                    textElement.textContent = appState.getMessage('selectZipFile');
                    label.style.borderColor = 'var(--border-color)';
                }
            });
        }
    }

    static setupForms() {
        const forms = [
            { id: 'voice-conversion-form', handler: this.handleVoiceConversion },
            { id: 'tts-conversion-form', handler: this.handleTTSConversion },
            { id: 'download-model-form', handler: this.handleDownloadModel },
            { id: 'upload-zip-form', handler: this.handleUploadZip },
            { id: 'hubert-form', handler: this.handleInstallHubert }
        ];

        forms.forEach(({ id, handler }) => {
            const form = document.getElementById(id);
            if (form) {
                form.addEventListener('submit', handler.bind(this));
            }
        });

        // Кнопки обновления
        const refreshButtons = [
            { id: 'refresh-rvc-models', handler: this.handleRefreshModels },
            { id: 'refresh-tts-models', handler: this.handleRefreshModels }
        ];

        refreshButtons.forEach(({ id, handler }) => {
            const button = document.getElementById(id);
            if (button) {
                button.addEventListener('click', handler.bind(this));
            }
        });

        this.setupAutopitchAutotune();
    }

    static setupAutopitchAutotune() {
        const autopitchCheckbox = document.getElementById('autopitch');
        const autotuneCheckbox = document.getElementById('autotune');
        const autopitchSettings = document.getElementById('autopitch-settings');
        const autotuneSettings = document.getElementById('autotune-settings');
        const pitchSlider = document.getElementById('rvc-pitch');
        const pitchGroup = pitchSlider?.closest('.form-group');

        if (autopitchCheckbox && autopitchSettings) {
            autopitchCheckbox.addEventListener('change', function() {
                const isChecked = this.checked;
                autopitchSettings.style.display = isChecked ? 'block' : 'none';

                if (pitchGroup) {
                    Object.assign(pitchGroup.style, {
                        visibility: isChecked ? 'hidden' : 'visible',
                        height: isChecked ? '0' : 'auto',
                        overflow: isChecked ? 'hidden' : 'visible',
                        marginBottom: isChecked ? '0' : ''
                    });
                }

                if (isChecked && pitchSlider) {
                    pitchSlider.value = '0';
                    const pitchValue = document.getElementById('rvc-pitch-value');
                    if (pitchValue) pitchValue.textContent = '0';
                }
            });
        }

        if (autotuneCheckbox && autotuneSettings) {
            autotuneCheckbox.addEventListener('change', function() {
                autotuneSettings.style.display = this.checked ? 'block' : 'none';
            });
        }

        // Настройка слайдеров autopitch и autotune
        const sliders = [
            { id: 'autopitch-threshold', valueId: 'autopitch-threshold-value' },
            { id: 'autotune-strength', valueId: 'autotune-strength-value' }
        ];

        sliders.forEach(({ id, valueId }) => {
            const slider = document.getElementById(id);
            const valueDisplay = document.getElementById(valueId);
            if (slider && valueDisplay) {
                slider.addEventListener('input', function() {
                    valueDisplay.textContent = this.value;
                });
            }
        });
    }

    static async handleVoiceConversion(event) {
        event.preventDefault();

        if (!appState.uploadedAudioFile) {
            NotificationManager.show(appState.getMessage('selectAudioFirst'), 'error');
            return;
        }

        if (appState.currentAudioPlayer) {
            appState.currentAudioPlayer.destroy();
            appState.currentAudioPlayer = null;
        }

        const formData = new FormData(event.target);
        formData.set('audio_file_path', appState.uploadedAudioFile.path);

        // Настройки autopitch и autotune
        const autopitchChecked = document.getElementById('autopitch').checked;
        const autotuneChecked = document.getElementById('autotune').checked;

        formData.set('autopitch', autopitchChecked ? 'true' : 'false');
        formData.set('autotune', autotuneChecked ? 'true' : 'false');
        formData.set('autopitch_threshold', autopitchChecked ? 
            document.getElementById('autopitch-threshold').value : '155.0');
        formData.set('autotune_strength', autotuneChecked ? 
            document.getElementById('autotune-strength').value : '1.0');

        ProgressManager.clearFileInfo('voice-conversion-progress');
        ProgressManager.show('voice-conversion-progress');
        const progressInterval = ProgressManager.startRealTimeProgress('voice-conversion-progress');

        try {
            const response = await fetch('/api/voice-conversion', {
                method: 'POST',
                body: formData
            });

            const data = await response.json();
            clearInterval(progressInterval);

            if (data.success) {
                ProgressManager.updateRealTimeProgress('voice-conversion-progress', {
                    progress: 1.0,
                    current_step: 8,
                    total_steps: 8,
                    step_name: appState.currentLang === 'ru' ? 'Завершено' : 'Completed',
                    description: appState.currentLang === 'ru' ? 'Конвертация завершена' : 'Conversion completed'
                });

                UIManager.showResult({
                    type: 'voice-conversion',
                    outputPath: data.output_path,
                    downloadUrl: data.download_url
                });

                NotificationManager.show(appState.getMessage('voiceConversionComplete'), 'success');
                ProgressManager.hide('voice-conversion-progress', 2000);
            } else {
                throw new Error(data.error);
            }
        } catch (error) {
            clearInterval(progressInterval);
            console.error('Ошибка преобразования:', error);
            NotificationManager.show(`${appState.getMessage('conversionError')}: ${error.message}`, 'error');
            ProgressManager.hide('voice-conversion-progress', 1000);
        }
    }

    static async handleTTSConversion(event) {
        event.preventDefault();

        if (appState.currentAudioPlayer) {
            appState.currentAudioPlayer.destroy();
            appState.currentAudioPlayer = null;
        }

        const formData = new FormData(event.target);
        const requestData = Object.fromEntries(formData.entries());

        try {
            ProgressManager.show('tts-synthesis-progress');

            const response = await fetch('/api/tts-conversion', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(requestData)
            });

            const data = await response.json();

            if (data.success) {
                ProgressManager.hide('tts-synthesis-progress');
                ProgressManager.clearFileInfo('tts-conversion-progress');
                ProgressManager.show('tts-conversion-progress');

                await this.simulateConversionProgress('tts-conversion-progress');

                UIManager.showResult({
                    type: 'tts-conversion',
                    synthPath: data.synth_path,
                    convertedPath: data.converted_path,
                    downloadUrl: data.download_url
                });

                NotificationManager.show(appState.getMessage('ttsConversionComplete'), 'success');
                ProgressManager.hide('tts-conversion-progress', 2000);
            } else {
                throw new Error(data.error);
            }
        } catch (error) {
            console.error('Ошибка TTS преобразования:', error);
            NotificationManager.show(`${appState.getMessage('ttsConversionError')}: ${error.message}`, 'error');
            ProgressManager.hide('tts-synthesis-progress', 1000);
            ProgressManager.hide('tts-conversion-progress', 1000);
        }
    }

    static async simulateConversionProgress(progressId) {
        const fileName = appState.uploadedAudioFile ? appState.uploadedAudioFile.name : 'audio_file';
        const shortFileName = fileName.length > 30 ? fileName.substring(0, 30) + '...' : fileName;

        const steps = [
            { progress: 0, current: 0, total: 2, elapsed: 0, text: appState.currentLang === 'ru' ? 'Преобразование аудио' : 'Converting audio' },
            { progress: 25, current: 0, total: 2, elapsed: 1, text: appState.currentLang === 'ru' ? 'Преобразование аудио' : 'Converting audio' },
            { progress: 50, current: 1, total: 2, elapsed: 2, text: appState.currentLang === 'ru' ? 'Преобразование аудио' : 'Converting audio' },
            { progress: 75, current: 1, total: 2, elapsed: 3, text: appState.currentLang === 'ru' ? 'Преобразование аудио' : 'Converting audio' },
            { progress: 100, current: 2, total: 2, elapsed: 5, text: appState.currentLang === 'ru' ? 'Преобразование аудио' : 'Converting audio' }
        ];

        for (const step of steps) {
            const details = { loaded: step.current, total: step.total };
            ProgressManager.update(progressId, step.progress, step.progress === 100 ? 'complete' : 'processing', details);

            const element = document.getElementById(progressId);
            if (element) {
                const progressSizeValue = element.querySelector('.progress-size-value');
                if (progressSizeValue) {
                    progressSizeValue.textContent = `${step.current} / ${step.total}`;
                }

                const statusText = element.querySelector('.progress-status-text');
                if (statusText) {
                    const remaining = step.total - step.current;
                    const timeRemaining = remaining > 0 ? `00:0${Math.max(0, 5 - step.elapsed)}` : '00:00';
                    const speed = step.elapsed > 0 ? (step.elapsed / Math.max(1, step.current)).toFixed(2) : '0.00';
                    const statusMessage = `[🌌] ${step.text} — ${shortFileName}\nКонвертация: ${step.progress}% ${step.current}/${step.total} [00:0${step.elapsed}<${timeRemaining}, ${speed}s/steps]`;
                    statusText.textContent = statusMessage;
                }
            }

            await Utils.delay(800 + Math.random() * 400);
        }
    }

    static async handleDownloadModel(event) {
        event.preventDefault();

        const formData = new FormData(event.target);
        const requestData = {
            url: formData.get('url'),
            model_name: formData.get('model_name')
        };

        const progressId = 'model-download-progress';
        ProgressManager.show(progressId);
        ProgressManager.updateFileInfo(progressId, requestData.model_name, 
            appState.currentLang === 'ru' ? 'Загрузка...' : 'Downloading...');

        try {
            const response = await fetch('/api/download-model', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(requestData)
            });

            const data = await response.json();

            if (data.success) {
                ProgressManager.update(progressId, 100, 'complete');
                NotificationManager.show(appState.getMessage('modelDownloadSuccess'), 'success');
                await ApiManager.loadModels();
                event.target.reset();
                ProgressManager.hide(progressId, 2000);
            } else {
                ProgressManager.update(progressId, 0, 'error');
                ProgressManager.hide(progressId, 1000);
                throw new Error(data.error);
            }
        } catch (error) {
            console.error('Ошибка загрузки модели:', error);
            ProgressManager.update(progressId, 0, 'error');
            ProgressManager.hide(progressId, 1000);
            NotificationManager.show(`${appState.getMessage('modelDownloadError')}: ${error.message}`, 'error');
        }
    }

    static async handleUploadZip(event) {
        event.preventDefault();

        const formData = new FormData(event.target);
        const modelFile = formData.get('model_file');
        const modelName = formData.get('model_name');

        if (!modelFile || modelFile.size === 0) {
            NotificationManager.show(appState.getMessage('selectZipFirst'), 'error');
            return;
        }

        if (!modelName || modelName.trim() === '') {
            NotificationManager.show(appState.getMessage('enterModelName'), 'error');
            return;
        }

        const validation = Utils.validateFile(modelFile, {
            allowedTypes: CONFIG.SUPPORTED_ZIP_TYPES
        });

        if (!validation.valid) {
            NotificationManager.show(validation.errors[0], 'error');
            return;
        }

        ProgressManager.show('zip-upload-progress', modelFile);

        try {
            const response = await FileManager.upload('/api/upload-model-zip', formData, 'zip-upload-progress');
            const data = await response.json();

            if (data.success) {
                NotificationManager.show(appState.getMessage('zipUploadSuccess'), 'success');
                await ApiManager.loadModels();
                event.target.reset();

                const fileLabel = document.querySelector('#zip-file + .file-label .file-text');
                if (fileLabel) {
                    fileLabel.textContent = appState.getMessage('selectZipFile');
                }
                ProgressManager.hide('zip-upload-progress', 2000);
            } else {
                throw new Error(data.error);
            }
        } catch (error) {
            console.error('Ошибка загрузки ZIP:', error);
            NotificationManager.show(`${appState.getMessage('zipUploadError')}: ${error.message}`, 'error');
            ProgressManager.hide('zip-upload-progress', 1000);
        }
    }

    static async handleInstallHubert(event) {
        event.preventDefault();

        const formData = new FormData(event.target);
        const requestData = {
            model_name: formData.get('model_name'),
            custom_url: formData.get('custom_url') || null
        };

        try {
            const response = await fetch('/api/install-hubert', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(requestData)
            });

            const data = await response.json();

            if (data.success) {
                NotificationManager.show(appState.getMessage('hubertInstallSuccess'), 'success');
                event.target.reset();
            } else {
                throw new Error(data.error);
            }
        } catch (error) {
            console.error('Ошибка установки HuBERT:', error);
            NotificationManager.show(`${appState.getMessage('hubertInstallError')}: ${error.message}`, 'error');
        }
    }

    static async handleRefreshModels(event) {
        const refreshBtn = event.target.closest('button');
        const refreshIcon = refreshBtn.querySelector('.refresh-icon');

        refreshIcon.style.transform = 'rotate(360deg)';
        refreshBtn.disabled = true;

        try {
            await ApiManager.loadModels();
            NotificationManager.show(appState.getMessage('modelsListUpdated'), 'success');
        } catch (error) {
            NotificationManager.show(appState.getMessage('modelsUpdateError') || 'Error updating models', 'error');
        } finally {
            setTimeout(() => {
                refreshIcon.style.transform = '';
                refreshBtn.disabled = false;
            }, CONFIG.ANIMATION_DELAY);
        }
    }

    static initializeLanguageSwitcher() {
        const languageSelect = document.getElementById('language-select');

        if (languageSelect) {
            languageSelect.value = appState.currentLang;
            languageSelect.addEventListener('change', (event) => {
                this.switchLanguage(event.target.value);
            });
        }
    }

    static switchLanguage(lang) {
        if (lang === appState.currentLang) return;

        fetch('/api/set-language', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ language: lang })
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                window.location.reload();
            } else {
                NotificationManager.show(data.error || 'Ошибка переключения языка', 'error');
            }
        })
        .catch(error => {
            console.error('Ошибка переключения языка:', error);
            NotificationManager.show('Ошибка переключения языка', 'error');
        });
    }
}

// === ИНИЦИАЛИЗАЦИЯ ПРИЛОЖЕНИЯ ===
class App {
    static async initialize() {
        try {
            EventHandlers.setupTabNavigation();
            UIManager.setupSliders();
            EventHandlers.setupFileInputs();
            EventHandlers.setupForms();
            EventHandlers.initializeLanguageSwitcher();
            await ApiManager.loadInitialData();
        } catch (error) {
            console.error('Ошибка инициализации приложения:', error);
            NotificationManager.show('Ошибка инициализации приложения', 'error');
        }
    }
}

// === ЗАПУСК ПРИЛОЖЕНИЯ ===
document.addEventListener('DOMContentLoaded', () => {
    App.initialize();
});