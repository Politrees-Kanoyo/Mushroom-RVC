let currentModels = [];
let currentVoices = {};
let currentFormats = [];
let currentF0Methods = [];
let currentHubertModels = [];
let i18n = window.i18n || {};
let currentLang = window.currentLang || 'ru';
let currentAudioPlayer = null;
let voiceConversionPlayer = null;
let ttsConversionPlayer = null;

document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
});

function initializeApp() {
    setupTabNavigation();
    setupSliders();
    setupFileInputs();
    setupForms();
    initializeLanguageSwitcher();
    loadInitialData();
}

function setupTabNavigation() {
    const navButtons = document.querySelectorAll('.nav-btn');
    const tabContents = document.querySelectorAll('.tab-content');
    
    navButtons.forEach(button => {
        button.addEventListener('click', () => {
            const targetTab = button.getAttribute('data-tab');
            
            navButtons.forEach(btn => btn.classList.remove('active'));
            tabContents.forEach(tab => tab.classList.remove('active'));
            
            const resultAreas = document.querySelectorAll('.result-area');
            resultAreas.forEach(area => area.classList.add('hidden'));
            
            button.classList.add('active');
            document.getElementById(targetTab).classList.add('active');
            
            if (targetTab === 'voice-conversion') {
                const voiceResult = document.getElementById('voice-conversion-result');
                if (voiceResult && voiceResult.querySelector('.result-content').innerHTML.trim() !== '') {
                    voiceResult.classList.remove('hidden');
                }
                if (voiceConversionPlayer) {
                    currentAudioPlayer = voiceConversionPlayer;
                }
            } else if (targetTab === 'tts-conversion') {
                const ttsResult = document.getElementById('tts-conversion-result');
                if (ttsResult && ttsResult.querySelector('.result-content').innerHTML.trim() !== '') {
                    ttsResult.classList.remove('hidden');
                }
                if (ttsConversionPlayer) {
                    currentAudioPlayer = ttsConversionPlayer;
                }
            }
        });
    });
}

function setupSliders() {
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
    
    sliders.forEach(slider => {
        const element = document.getElementById(slider.id);
        const valueElement = document.getElementById(slider.valueId);
        
        if (element && valueElement) {
            valueElement.textContent = element.value;
            
            element.addEventListener('input', () => {
                valueElement.textContent = element.value;
            });
        }
    });
}

function setupFileInputs() {
    const fileInputs = document.querySelectorAll('.file-input');
    
    fileInputs.forEach(input => {
        input.addEventListener('change', function() {
            const label = this.nextElementSibling;
            const textElement = label.querySelector('.file-text');
            
            if (this.files.length > 0) {
                textElement.textContent = this.files[0].name;
                label.style.borderColor = 'var(--primary-color)';
            } else {
                textElement.textContent = i18n.select_audio_file || 'Выберите файл';
                label.style.borderColor = 'var(--border-color)';
            }
        });
    });
}

function setupForms() {
    const voiceForm = document.getElementById('voice-conversion-form');
    if (voiceForm) {
        voiceForm.addEventListener('submit', handleVoiceConversion);
    }
    
    const ttsForm = document.getElementById('tts-conversion-form');
    if (ttsForm) {
        ttsForm.addEventListener('submit', handleTTSConversion);
    }
    
    const downloadForm = document.getElementById('download-model-form');
    if (downloadForm) {
        downloadForm.addEventListener('submit', handleDownloadModel);
    }
    
    const zipForm = document.getElementById('upload-zip-form');
    if (zipForm) {
        zipForm.addEventListener('submit', handleUploadZip);
    }
    
    const hubertForm = document.getElementById('hubert-form');
    if (hubertForm) {
        hubertForm.addEventListener('submit', handleInstallHubert);
    }
    
    const refreshRvcBtn = document.getElementById('refresh-rvc-models');
    if (refreshRvcBtn) {
        refreshRvcBtn.addEventListener('click', handleRefreshRvcModels);
    }

    const refreshTtsBtn = document.getElementById('refresh-tts-models');
    if (refreshTtsBtn) {
        refreshTtsBtn.addEventListener('click', handleRefreshTtsModels);
    }
    
    setupAutopitchAutotune();
}

function setupAutopitchAutotune() {
    const autopitchCheckbox = document.getElementById('autopitch');
    const autotuneCheckbox = document.getElementById('autotune');
    const autopitchSettings = document.getElementById('autopitch-settings');
    const autotuneSettings = document.getElementById('autotune-settings');
    const pitchSlider = document.getElementById('rvc-pitch');
    const pitchGroup = pitchSlider ? pitchSlider.closest('.form-group') : null;
    
    if (autopitchCheckbox && autopitchSettings) {
        autopitchCheckbox.addEventListener('change', function() {
            autopitchSettings.style.display = this.checked ? 'block' : 'none';
            
            if (pitchGroup) {
                pitchGroup.style.visibility = this.checked ? 'hidden' : 'visible';
                pitchGroup.style.height = this.checked ? '0' : 'auto';
                pitchGroup.style.overflow = this.checked ? 'hidden' : 'visible';
                pitchGroup.style.marginBottom = this.checked ? '0' : '';
            }
            
            if (this.checked) {
                const pitchValue = document.getElementById('rvc-pitch-value');
                if (pitchSlider && pitchValue) {
                    pitchSlider.value = '0';
                    pitchValue.textContent = '0';
                }
            }
        });
    }
    
    if (autotuneCheckbox && autotuneSettings) {
        autotuneCheckbox.addEventListener('change', function() {
            autotuneSettings.style.display = this.checked ? 'block' : 'none';
        });
    }
    
    const autopitchThresholdSlider = document.getElementById('autopitch-threshold');
    const autotuneStrengthSlider = document.getElementById('autotune-strength');
    
    if (autopitchThresholdSlider) {
        const valueDisplay = document.getElementById('autopitch-threshold-value');
        autopitchThresholdSlider.addEventListener('input', function() {
            if (valueDisplay) valueDisplay.textContent = this.value;
        });
    }
    
    if (autotuneStrengthSlider) {
        const valueDisplay = document.getElementById('autotune-strength-value');
        autotuneStrengthSlider.addEventListener('input', function() {
            if (valueDisplay) valueDisplay.textContent = this.value;
        });
    }
}

async function loadInitialData() {
    try {
        await Promise.all([
            loadModels(),
            loadVoices(),
            loadFormats(),
            loadF0Methods(),
            loadHubertModels()
        ]);
        
        showNotification('Данные успешно загружены', 'success');
    } catch (error) {
        console.error('Ошибка загрузки данных:', error);
        showNotification('Ошибка загрузки данных: ' + error.message, 'error');
    }
}

async function loadModels() {
    try {
        const response = await fetch('/api/models');
        const data = await response.json();
        
        if (data.success) {
            currentModels = data.models;
            updateModelSelects();
        } else {
            throw new Error(data.error);
        }
    } catch (error) {
        console.error('Ошибка загрузки моделей:', error);
        throw error;
    }
}

async function loadVoices() {
    try {
        const response = await fetch('/api/voices');
        const data = await response.json();
        
        if (data.success) {
            currentVoices = data.voices;
            updateVoiceSelect();
        } else {
            throw new Error(data.error);
        }
    } catch (error) {
        console.error('Ошибка загрузки голосов:', error);
        throw error;
    }
}

async function loadFormats() {
    try {
        const response = await fetch('/api/formats');
        const data = await response.json();
        
        if (data.success) {
            currentFormats = data.formats;
            updateFormatSelects();
        } else {
            throw new Error(data.error);
        }
    } catch (error) {
        console.error('Ошибка загрузки форматов:', error);
        throw error;
    }
}

async function loadF0Methods() {
    try {
        const response = await fetch('/api/f0-methods');
        const data = await response.json();
        
        if (data.success) {
            currentF0Methods = data.methods;
            updateF0MethodSelect();
        } else {
            throw new Error(data.error);
        }
    } catch (error) {
        console.error('Ошибка загрузки методов F0:', error);
        throw error;
    }
}

async function loadHubertModels() {
    try {
        const response = await fetch('/api/hubert-models');
        const data = await response.json();
        
        if (data.success) {
            currentHubertModels = data.models;
            updateHubertSelect();
        } else {
            throw new Error(data.error);
        }
    } catch (error) {
        console.error('Ошибка загрузки HuBERT моделей:', error);
        throw error;
    }
}

function updateModelSelects() {
    const selects = ['rvc-model', 'tts-rvc-model'];
    
    selects.forEach(selectId => {
        const select = document.getElementById(selectId);
        if (select) {
            select.innerHTML = `<option value="">${i18n.select_model || 'Выберите модель'}</option>`;
            
            currentModels.forEach(model => {
                const option = document.createElement('option');
                option.value = model;
                option.textContent = model;
                select.appendChild(option);
            });
        }
    });
}

function updateVoiceSelect() {
    const select = document.getElementById('tts-voice');
    if (select) {
        select.innerHTML = `<option value="">${i18n.select_voice || 'Выберите голос'}</option>`;
        
        Object.keys(currentVoices).forEach(language => {
            const optgroup = document.createElement('optgroup');
            optgroup.label = language;
            
            currentVoices[language].forEach(voice => {
                const option = document.createElement('option');
                option.value = voice;
                option.textContent = voice;
                optgroup.appendChild(option);
            });
            
            select.appendChild(optgroup);
        });
    }
}

function updateFormatSelects() {
    const selects = ['output-format'];
    
    selects.forEach(selectId => {
        const select = document.getElementById(selectId);
        if (select) {
            select.innerHTML = '';
            
            currentFormats.forEach(format => {
                const option = document.createElement('option');
                option.value = format;
                option.textContent = format.toUpperCase();
                select.appendChild(option);
            });
        }
    });
}

function updateF0MethodSelect() {
    const select = document.getElementById('f0-method');
    if (select && currentF0Methods.length > 0) {
        select.innerHTML = '';
        
        currentF0Methods.forEach(method => {
            const option = document.createElement('option');
            option.value = method;
            option.textContent = method;
            select.appendChild(option);
        });
    }
}

function updateHubertSelect() {
    const select = document.getElementById('hubert-model');
    if (select) {
        select.innerHTML = `<option value="">${i18n.select_hubert_model || 'Выберите HuBERT модель'}</option>`;
        
        currentHubertModels.forEach(model => {
            const option = document.createElement('option');
            option.value = model;
            option.textContent = model;
            select.appendChild(option);
        });
    }
}

async function handleVoiceConversion(event) {
    event.preventDefault();
    
    const formData = new FormData(event.target);
    const audioFile = formData.get('audio_file');
    
    if (!audioFile || audioFile.size === 0) {
        showNotification('Пожалуйста, выберите аудиофайл', 'error');
        return;
    }
    
    // Проверка размера файла (максимум 500MB)
    if (audioFile.size > 500 * 1024 * 1024) {
        const errorMsg = currentLang === 'ru' ? 'Файл слишком большой (максимум 500MB)' : 'File too large (max 500MB)';
        showNotification(errorMsg, 'error');
        return;
    }
    
    if (currentAudioPlayer) {
        currentAudioPlayer.destroy();
        currentAudioPlayer = null;
    }
    
    const autopitchChecked = document.getElementById('autopitch').checked;
    const autotuneChecked = document.getElementById('autotune').checked;
    
    formData.set('autopitch', autopitchChecked ? 'true' : 'false');
    formData.set('autotune', autotuneChecked ? 'true' : 'false');
    
    if (autopitchChecked) {
        formData.set('autopitch_threshold', document.getElementById('autopitch-threshold').value);
    } else {
        formData.set('autopitch_threshold', '155.0');
    }
    
    if (autotuneChecked) {
        formData.set('autotune_strength', document.getElementById('autotune-strength').value);
    } else {
        formData.set('autotune_strength', '1.0');
    }
    
    // Скрываем поле выбора файла и показываем прогресс-бар загрузки
    const fileInputWrapper = document.querySelector('.file-input-wrapper');
    if (fileInputWrapper) {
        fileInputWrapper.style.display = 'none';
    }
    showUploadProgress('voice-upload-progress', audioFile);
    
    try {
        const response = await uploadWithProgress('/api/voice-conversion', formData, 'voice-upload-progress');
        const data = await response.json();
        
        if (data.success) {
            // Скрываем прогресс загрузки и показываем прогресс конвертации
            hideUploadProgress('voice-upload-progress');
            showConversionProgress('voice-conversion-progress');
            
            // Симулируем прогресс конвертации
            await simulateConversionProgress('voice-conversion-progress');
            
            showResult({
                type: 'voice-conversion',
                outputPath: data.output_path,
                downloadUrl: data.download_url
            });
            const successMsg = currentLang === 'ru' ? 'Преобразование голоса завершено!' : 'Voice conversion completed successfully!';
            showNotification(successMsg, 'success');
            
            // Скрываем прогресс конвертации и показываем поле выбора файла обратно
            hideUploadProgress('voice-conversion-progress', 2000);
            if (fileInputWrapper) {
                setTimeout(() => {
                    fileInputWrapper.style.display = 'block';
                }, 2000);
            }
        } else {
            throw new Error(data.error);
        }
    } catch (error) {
        console.error('Ошибка преобразования:', error);
        const errorMsg = currentLang === 'ru' ? 'Ошибка преобразования: ' + error.message : 'Conversion error: ' + error.message;
        showNotification(errorMsg, 'error');
        hideUploadProgress('voice-upload-progress', 1000);
        hideUploadProgress('voice-conversion-progress', 1000);
        
        // Показываем поле выбора файла обратно при ошибке
        if (fileInputWrapper) {
            setTimeout(() => {
                fileInputWrapper.style.display = 'block';
            }, 1000);
        }
    }
}

async function handleTTSConversion(event) {
    event.preventDefault();
    
    if (currentAudioPlayer) {
        currentAudioPlayer.destroy();
        currentAudioPlayer = null;
    }
    
    const formData = new FormData(event.target);
    const requestData = {};
    
    for (let [key, value] of formData.entries()) {
        requestData[key] = value;
    }
    
    try {
        // Показываем прогресс синтеза
        showConversionProgress('tts-synthesis-progress');
        
        const response = await fetch('/api/tts-conversion', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(requestData)
        });
        
        const data = await response.json();
        
        if (data.success) {
            // Скрываем прогресс синтеза и показываем прогресс конвертации
            hideUploadProgress('tts-synthesis-progress');
            showConversionProgress('tts-conversion-progress');
            
            // Симулируем прогресс конвертации
            await simulateConversionProgress('tts-conversion-progress');
            
            showResult({
                type: 'tts-conversion',
                synthPath: data.synth_path,
                convertedPath: data.converted_path,
                downloadUrl: data.download_url
            });
            const successMsg = currentLang === 'ru' ? 'Синтез и преобразование завершены!' : 'Synthesis and conversion completed successfully!';
            showNotification(successMsg, 'success');
            
            // Скрываем прогресс конвертации
            hideUploadProgress('tts-conversion-progress', 2000);
        } else {
            throw new Error(data.error);
        }
    } catch (error) {
        console.error('Ошибка TTS преобразования:', error);
        const errorMsg = currentLang === 'ru' ? 'Ошибка TTS преобразования: ' + error.message : 'TTS conversion error: ' + error.message;
        showNotification(errorMsg, 'error');
        
        // Скрываем все прогресс-бары при ошибке
        hideUploadProgress('tts-synthesis-progress', 1000);
        hideUploadProgress('tts-conversion-progress', 1000);
    }
}

async function handleDownloadModel(event) {
    event.preventDefault();
    
    const formData = new FormData(event.target);
    const requestData = {
        url: formData.get('url'),
        model_name: formData.get('model_name')
    };
    
    try {
        const response = await fetch('/api/download-model', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(requestData)
        });
        
        const data = await response.json();
        
        if (data.success) {
            const successMsg = currentLang === 'ru' ? 'Модель успешно загружена!' : 'Model downloaded successfully!';
            showNotification(successMsg, 'success');
            await loadModels(); 
            event.target.reset();
        } else {
            throw new Error(data.error);
        }
    } catch (error) {
        console.error('Ошибка загрузки модели:', error);
        const errorMsg = currentLang === 'ru' ? 'Ошибка загрузки модели: ' + error.message : 'Model download error: ' + error.message;
        showNotification(errorMsg, 'error');
    }
}

async function handleUploadZip(event) {
    event.preventDefault();
    
    const formData = new FormData(event.target);
    const modelFile = formData.get('model_file');
    const modelName = formData.get('model_name');
    
    if (!modelFile || modelFile.size === 0) {
        showNotification('Пожалуйста, выберите ZIP файл', 'error');
        return;
    }
    
    // Проверка размера файла (максимум 500MB)
    if (modelFile.size > 500 * 1024 * 1024) {
        const errorMsg = currentLang === 'ru' ? 'Файл слишком большой (максимум 500MB)' : 'File too large (max 500MB)';
        showNotification(errorMsg, 'error');
        return;
    }
    
    if (!modelName || modelName.trim() === '') {
        const errorMsg = currentLang === 'ru' ? 'Пожалуйста, введите имя модели' : 'Please enter model name';
        showNotification(errorMsg, 'error');
        return;
    }
    
    // Показать прогресс-бар загрузки
    showUploadProgress('zip-upload-progress', modelFile);
    
    try {
        const response = await uploadWithProgress('/api/upload-model-zip', formData, 'zip-upload-progress');
        const data = await response.json();
        
        if (data.success) {
            const successMsg = currentLang === 'ru' ? 'ZIP модель успешно загружена!' : 'ZIP model uploaded successfully!';
            showNotification(successMsg, 'success');
            await loadModels(); 
            event.target.reset();
            
            const fileLabel = document.querySelector('#zip-file + .file-label .file-text');
            if (fileLabel) {
                fileLabel.textContent = i18n.select_zip || 'Выберите ZIP файл';
            }
            hideUploadProgress('zip-upload-progress', 2000);
        } else {
            throw new Error(data.error);
        }
    } catch (error) {
        console.error('Ошибка загрузки ZIP:', error);
        const errorMsg = currentLang === 'ru' ? 'Ошибка загрузки ZIP: ' + error.message : 'ZIP upload error: ' + error.message;
        showNotification(errorMsg, 'error');
        hideUploadProgress('zip-upload-progress', 1000);
    }
}

async function handleInstallHubert(event) {
    event.preventDefault();
    
    const formData = new FormData(event.target);
    const requestData = {
        model_name: formData.get('model_name'),
        custom_url: formData.get('custom_url') || null
    };
    
    try {
        const response = await fetch('/api/install-hubert', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(requestData)
        });
        
        const data = await response.json();
        
        if (data.success) {
            const successMsg = currentLang === 'ru' ? 'HuBERT модель успешно установлена!' : 'HuBERT model installed successfully!';
            showNotification(successMsg, 'success');
            event.target.reset();
        } else {
            throw new Error(data.error);
        }
    } catch (error) {
        console.error('Ошибка установки HuBERT:', error);
        const errorMsg = currentLang === 'ru' ? 'Ошибка установки HuBERT: ' + error.message : 'HuBERT installation error: ' + error.message;
        showNotification(errorMsg, 'error');
    }
}

function showResult(result) {
    let resultArea, resultContent, playerContainerId, playerVariable;
    
    if (result.type === 'voice-conversion') {
        resultArea = document.getElementById('voice-conversion-result');
        resultContent = document.getElementById('voice-conversion-result-content');
        playerContainerId = 'voice-conversion-audio-player';
        playerVariable = 'voiceConversionPlayer';
    } else if (result.type === 'tts-conversion') {
        resultArea = document.getElementById('tts-conversion-result');
        resultContent = document.getElementById('tts-conversion-result-content');
        playerContainerId = 'tts-conversion-audio-player';
        playerVariable = 'ttsConversionPlayer';
    }
    
    if (!resultArea || !resultContent) return;
    
    let html = '';
    
    if (result.type === 'voice-conversion') {
        const titleText = currentLang === 'ru' ? 'Преобразование голоса завершено' : 'Voice conversion completed';
        const fileText = currentLang === 'ru' ? 'Выходной файл:' : 'Output file:';
        
        html = `
            <h4>${titleText}</h4>
            <p><strong>${fileText}</strong> ${result.outputPath}</p>
            <div class="audio-player-container" id="${playerContainerId}"></div>
        `;
    } else if (result.type === 'tts-conversion') {
        const titleText = currentLang === 'ru' ? 'Синтез и преобразование завершены' : 'Synthesis and conversion completed';
        const synthText = currentLang === 'ru' ? 'Синтезированная речь:' : 'Synthesized speech:';
        const convertedText = currentLang === 'ru' ? 'Преобразованный голос:' : 'Converted voice:';
        
        html = `
            <h4>${titleText}</h4>
            <p><strong>${synthText}</strong> ${result.synthPath}</p>
            <p><strong>${convertedText}</strong> ${result.convertedPath}</p>
            <div class="audio-player-container" id="${playerContainerId}"></div>
        `;
    }
    
    resultContent.innerHTML = html;
    resultArea.classList.remove('hidden');
    
    if (result.type === 'voice-conversion' && voiceConversionPlayer) {
        voiceConversionPlayer.destroy();
        voiceConversionPlayer = null;
    } else if (result.type === 'tts-conversion' && ttsConversionPlayer) {
        ttsConversionPlayer.destroy();
        ttsConversionPlayer = null;
    }
    
    if (result.downloadUrl) {
        setTimeout(() => {
            const playerContainer = document.getElementById(playerContainerId);
            if (playerContainer) {
                const newPlayer = new AudioPlayer(playerContainer);
                newPlayer.loadAudio(result.downloadUrl, result.outputPath || 'result.mp3');
                
                if (result.type === 'voice-conversion') {
                    voiceConversionPlayer = newPlayer;
                } else if (result.type === 'tts-conversion') {
                    ttsConversionPlayer = newPlayer;
                }
                
                currentAudioPlayer = newPlayer;
            }
        }, 100);
    }
    
    resultArea.scrollIntoView({ behavior: 'smooth' });
}



function showNotification(message, type = 'success') {
    const notifications = document.getElementById('notifications');
    if (!notifications) return;
    
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;
    
    notifications.appendChild(notification);
    
    setTimeout(() => {
        if (notification.parentNode) {
            notification.parentNode.removeChild(notification);
        }
    }, 5000);
    
    notification.addEventListener('click', () => {
        if (notification.parentNode) {
            notification.parentNode.removeChild(notification);
        }
    });
}

function initializeLanguageSwitcher() {
    const langButtons = document.querySelectorAll('.lang-btn');
    
    langButtons.forEach(btn => {
        if (btn.dataset.lang === currentLang) {
            btn.classList.add('active');
        }
        
        btn.addEventListener('click', () => {
            switchLanguage(btn.dataset.lang);
        });
    });
}

function switchLanguage(lang) {
    if (lang === currentLang) return;
    
    fetch('/api/set-language', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ language: lang })
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            window.location.reload();
        } else {
            showNotification(data.error || 'Ошибка переключения языка', 'error');
        }
    })
    .catch(error => {
        console.error('Ошибка переключения языка:', error);
        showNotification('Ошибка переключения языка', 'error');
    });
}



function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function isFileSupported(file, allowedTypes) {
    const fileExtension = file.name.split('.').pop().toLowerCase();
    return allowedTypes.includes(fileExtension);
}

function handleNetworkError(error) {
    if (error.name === 'TypeError' && error.message.includes('fetch')) {
        return 'Ошибка сети. Проверьте подключение к интернету.';
    }
    return error.message || 'Произошла неизвестная ошибка';
}

async function handleRefreshRvcModels() {
    
    const refreshBtn = document.getElementById('refresh-rvc-models');
    const refreshIcon = refreshBtn.querySelector('.refresh-icon');
    
    refreshIcon.style.transform = 'rotate(360deg)';
    refreshBtn.disabled = true;
    
    try {
        await loadModels();
        
        const message = currentLang === 'ru' ? 'Список моделей обновлен' : 'Models list updated';
        showNotification(message, 'success');
        
    } catch (error) {
        const message = currentLang === 'ru' ? 'Ошибка при обновлении моделей' : 'Error updating models';
        showNotification(message, 'error');
    } finally {
        setTimeout(() => {
            refreshIcon.style.transform = '';
            refreshBtn.disabled = false;
        }, 300);
    }
}

async function handleRefreshTtsModels() {
    
    const refreshBtn = document.getElementById('refresh-tts-models');
    const refreshIcon = refreshBtn.querySelector('.refresh-icon');
    
    refreshIcon.style.transform = 'rotate(360deg)';
    refreshBtn.disabled = true;
    
    try {
        await loadModels();
        
        const message = currentLang === 'ru' ? 'Список моделей обновлен' : 'Models list updated';
        showNotification(message, 'success');
        
    } catch (error) {
        const message = currentLang === 'ru' ? 'Ошибка при обновлении моделей' : 'Error updating models';
        showNotification(message, 'error');
    } finally {
        setTimeout(() => {
            refreshIcon.style.transform = '';
            refreshBtn.disabled = false;
        }, 300);
    }
}

// Глобальные переменные для отслеживания загрузок
const activeUploads = new Map();

/**
 * Функция для загрузки файлов с отслеживанием прогресса
 * @param {string} url - URL для загрузки
 * @param {FormData} formData - Данные формы
 * @param {string} progressId - ID элемента прогресс-бара
 * @returns {Promise<Response>} - Promise с ответом сервера
 */
async function uploadWithProgress(url, formData, progressId) {
    return new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        const startTime = Date.now();
        let lastLoaded = 0;
        let lastTime = startTime;
        
        // Сохраняем ссылку на XHR для возможности отмены
        activeUploads.set(progressId, xhr);
        
        // Обработчик прогресса загрузки
        xhr.upload.addEventListener('progress', (event) => {
            if (event.lengthComputable) {
                const currentTime = Date.now();
                const percentComplete = Math.round((event.loaded / event.total) * 100);
                
                // Расчет скорости загрузки
                const timeDiff = (currentTime - lastTime) / 1000; // в секундах
                const loadedDiff = event.loaded - lastLoaded;
                const speed = timeDiff > 0 ? loadedDiff / timeDiff : 0; // байт/сек
                
                // Расчет оставшегося времени
                const remaining = event.total - event.loaded;
                const eta = speed > 0 ? remaining / speed : 0; // секунды
                
                updateUploadProgress(progressId, percentComplete, 'uploading', {
                    speed: speed,
                    eta: eta,
                    loaded: event.loaded,
                    total: event.total
                });
                
                lastLoaded = event.loaded;
                lastTime = currentTime;
            }
        });
        
        // Обработчик завершения загрузки
        xhr.addEventListener('load', () => {
            if (xhr.status >= 200 && xhr.status < 300) {
                updateUploadProgress(progressId, 100, 'processing');
                setTimeout(() => {
                    activeUploads.delete(progressId);
                    resolve({
                        json: () => Promise.resolve(JSON.parse(xhr.responseText)),
                        ok: true,
                        status: xhr.status
                    });
                }, 500);
            } else {
                updateUploadProgress(progressId, 0, 'error');
                activeUploads.delete(progressId);
                try {
                    const errorResponse = JSON.parse(xhr.responseText);
                    reject(new Error(errorResponse.error || `HTTP ${xhr.status}: ${xhr.statusText}`));
                } catch (e) {
                    reject(new Error(`HTTP ${xhr.status}: ${xhr.statusText}`));
                }
            }
        });
        
        // Обработчик ошибок
        xhr.addEventListener('error', () => {
            updateUploadProgress(progressId, 0, 'error');
            activeUploads.delete(progressId);
            reject(new Error('Ошибка сети при загрузке файла'));
        });
        
        // Обработчик отмены
        xhr.addEventListener('abort', () => {
            updateUploadProgress(progressId, 0, 'cancelled');
            activeUploads.delete(progressId);
            reject(new Error('Загрузка была отменена'));
        });
        
        // Настройка и отправка запроса
        xhr.open('POST', url);
        xhr.send(formData);
    });
}

/**
 * Показать прогресс-бар загрузки
 * @param {string} progressId - ID элемента прогресс-бара
 * @param {File} file - Файл для загрузки (опционально)
 */
function showUploadProgress(progressId, file = null) {
    const progressElement = document.getElementById(progressId);
    if (progressElement) {
        progressElement.classList.remove('hidden');
        progressElement.classList.add('active');
        
        // Устанавливаем информацию о файле
        if (file) {
            const fileName = progressElement.querySelector('.progress-filename');
            const fileSize = progressElement.querySelector('.progress-filesize');
            
            if (fileName) {
                fileName.textContent = file.name;
            }
            
            if (fileSize) {
                fileSize.textContent = formatFileSize(file.size);
            }
        }
        
        updateUploadProgress(progressId, 0, 'preparing');
    }
}

/**
 * Скрыть прогресс-бар загрузки
 * @param {string} progressId - ID элемента прогресс-бара
 * @param {number} delay - Задержка перед скрытием в миллисекундах
 */
function hideUploadProgress(progressId, delay = 0) {
    setTimeout(() => {
        const progressElement = document.getElementById(progressId);
        if (progressElement) {
            progressElement.classList.add('hidden');
            progressElement.classList.remove('active');
            
            // Очищаем информацию о файле
            const fileName = progressElement.querySelector('.progress-filename');
            const fileSize = progressElement.querySelector('.progress-filesize');
            const progressSpeed = progressElement.querySelector('.progress-speed');
            const progressEta = progressElement.querySelector('.progress-eta');
            const progressSize = progressElement.querySelector('.progress-size');
            
            if (fileName) fileName.textContent = '';
            if (fileSize) fileSize.textContent = '';
            if (progressSpeed) progressSpeed.textContent = '';
            if (progressEta) progressEta.textContent = '';
            if (progressSize) progressSize.textContent = '';
            
            // Сброс прогресса
            updateUploadProgress(progressId, 0, 'preparing');
        }
    }, delay);
}

/**
 * Обновить прогресс загрузки
 * @param {string} progressId - ID элемента прогресс-бара
 * @param {number} percentage - Процент выполнения (0-100)
 * @param {string} status - Статус загрузки
 * @param {Object} details - Дополнительные детали (скорость, время и т.д.)
 */
function updateUploadProgress(progressId, percentage, status = 'uploading', details = {}) {
    const progressElement = document.getElementById(progressId);
    if (!progressElement) return;
    
    const progressFill = progressElement.querySelector('.progress-fill');
    const progressPercentage = progressElement.querySelector('.progress-percentage');
    const progressStatus = progressElement.querySelector('.progress-status');
    const progressSpeed = progressElement.querySelector('.progress-speed');
    const progressEta = progressElement.querySelector('.progress-eta');
    const progressSize = progressElement.querySelector('.progress-size');
    const cancelButton = progressElement.querySelector('.progress-cancel');
    
    if (progressFill) {
        progressFill.style.width = `${percentage}%`;
        
        // Добавляем анимацию для плавного изменения
        progressFill.style.transition = 'width 0.3s ease';
        
        // Изменяем цвет в зависимости от статуса
        progressFill.className = `progress-fill ${status}`;
    }
    
    if (progressPercentage) {
        progressPercentage.textContent = `${percentage}%`;
    }
    
    if (progressStatus) {
        const statusTexts = {
            'preparing': currentLang === 'ru' ? 'Подготовка...' : 'Preparing...',
            'uploading': currentLang === 'ru' ? 'Загрузка...' : 'Uploading...',
            'processing': currentLang === 'ru' ? 'Обработка...' : 'Processing...',
            'complete': currentLang === 'ru' ? 'Завершено' : 'Completed',
            'error': currentLang === 'ru' ? 'Ошибка' : 'Error',
            'cancelled': currentLang === 'ru' ? 'Отменено' : 'Cancelled'
        };
        
        progressStatus.textContent = statusTexts[status] || statusTexts['uploading'];
    }
    
    // Обновляем скорость загрузки
    if (progressSpeed && details.speed !== undefined) {
        const speedText = formatSpeed(details.speed);
        progressSpeed.textContent = speedText;
        progressSpeed.style.display = status === 'uploading' ? 'inline' : 'none';
    }
    
    // Обновляем оставшееся время
    if (progressEta && details.eta !== undefined && status === 'uploading') {
        const etaText = formatTime(details.eta);
        progressEta.textContent = etaText;
        progressEta.style.display = 'inline';
    } else if (progressEta) {
        progressEta.style.display = 'none';
    }
    
    // Обновляем размер файла
    if (progressSize && details.loaded !== undefined && details.total !== undefined) {
        const sizeText = `${formatFileSize(details.loaded)} / ${formatFileSize(details.total)}`;
        progressSize.textContent = sizeText;
        progressSize.style.display = status === 'uploading' ? 'inline' : 'none';
    }
    
    // Управляем кнопкой отмены
    if (cancelButton) {
        if (status === 'uploading' || status === 'preparing') {
            cancelButton.style.display = 'inline-block';
            cancelButton.onclick = () => cancelUpload(progressId);
        } else {
            cancelButton.style.display = 'none';
        }
    }
}

/**
 * Улучшенная функция для проверки поддерживаемых типов файлов
 * @param {File} file - Файл для проверки
 * @param {Array} allowedTypes - Массив разрешенных расширений
 * @returns {boolean} - true если файл поддерживается
 */
function isFileTypeSupported(file, allowedTypes) {
    if (!file || !file.name) return false;
    
    const fileName = file.name.toLowerCase();
    const fileExtension = fileName.split('.').pop();
    
    return allowedTypes.includes(fileExtension);
}

/**
 * Функция для валидации файлов перед загрузкой
 * @param {File} file - Файл для валидации
 * @param {Object} options - Опции валидации
 * @returns {Object} - Результат валидации
 */
function validateFile(file, options = {}) {
    const {
        maxSize = 500 * 1024 * 1024, // 500MB по умолчанию
        allowedTypes = [],
        minSize = 0
    } = options;
    
    const result = {
        valid: true,
        errors: []
    };
    
    if (!file) {
        result.valid = false;
        result.errors.push(currentLang === 'ru' ? 'Файл не выбран' : 'No file selected');
        return result;
    }
    
    // Проверка размера файла
    if (file.size > maxSize) {
        result.valid = false;
        const maxSizeMB = Math.round(maxSize / (1024 * 1024));
        result.errors.push(
            currentLang === 'ru' 
                ? `Файл слишком большой (максимум ${maxSizeMB}MB)` 
                : `File too large (max ${maxSizeMB}MB)`
        );
    }
    
    if (file.size < minSize) {
        result.valid = false;
        result.errors.push(
            currentLang === 'ru' 
                ? 'Файл слишком маленький' 
                : 'File too small'
        );
    }
    
    // Проверка типа файла
    if (allowedTypes.length > 0 && !isFileTypeSupported(file, allowedTypes)) {
        result.valid = false;
        result.errors.push(
            currentLang === 'ru' 
                ? `Неподдерживаемый тип файла. Разрешены: ${allowedTypes.join(', ')}` 
                : `Unsupported file type. Allowed: ${allowedTypes.join(', ')}`
        );
    }
    
    return result;
}

/**
 * Отмена загрузки
 * @param {string} progressId - ID элемента прогресс-бара
 */
function cancelUpload(progressId) {
    const xhr = activeUploads.get(progressId);
    if (xhr) {
        xhr.abort();
        activeUploads.delete(progressId);
        updateUploadProgress(progressId, 0, 'cancelled');
        
        const message = currentLang === 'ru' ? 'Загрузка отменена' : 'Upload cancelled';
        showNotification(message, 'info');
    }
}

/**
 * Форматирование скорости загрузки
 * @param {number} bytesPerSecond - Скорость в байтах в секунду
 * @returns {string} - Отформатированная строка скорости
 */
function formatSpeed(bytesPerSecond) {
    if (bytesPerSecond === 0) return '0 B/s';
    
    const units = ['B/s', 'KB/s', 'MB/s', 'GB/s'];
    const k = 1024;
    const i = Math.floor(Math.log(bytesPerSecond) / Math.log(k));
    
    return parseFloat((bytesPerSecond / Math.pow(k, i)).toFixed(1)) + ' ' + units[i];
}

/**
 * Форматирование времени
 * @param {number} seconds - Время в секундах
 * @returns {string} - Отформатированная строка времени
 */
function formatTime(seconds) {
    if (seconds === 0 || !isFinite(seconds)) {
        return currentLang === 'ru' ? 'Вычисление...' : 'Calculating...';
    }
    
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    
    if (hours > 0) {
        return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    } else if (minutes > 0) {
        return `${minutes}:${secs.toString().padStart(2, '0')}`;
    } else {
        return `${secs}s`;
    }
}

/**
 * Форматирование размера файла
 * @param {number} bytes - Размер в байтах
 * @returns {string} - Отформатированная строка размера
 */
function formatFileSize(bytes) {
    if (bytes === 0) return '0 B';
    
    const units = ['B', 'KB', 'MB', 'GB', 'TB'];
    const k = 1024;
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + units[i];
}

/**
 * Показать прогресс-бар конвертации
 * @param {string} progressId - ID элемента прогресс-бара
 */
function showConversionProgress(progressId) {
    const progressElement = document.getElementById(progressId);
    if (progressElement) {
        progressElement.classList.remove('hidden');
        progressElement.classList.add('active');
        
        // Сброс прогресса
        updateUploadProgress(progressId, 0, 'processing');
    }
}

/**
 * Симуляция прогресса конвертации
 * @param {string} progressId - ID элемента прогресс-бара
 */
async function simulateConversionProgress(progressId) {
    const steps = [
        { progress: 10, status: 'processing', text: currentLang === 'ru' ? 'Загрузка модели...' : 'Loading model...' },
        { progress: 25, status: 'processing', text: currentLang === 'ru' ? 'Анализ аудио...' : 'Analyzing audio...' },
        { progress: 40, status: 'processing', text: currentLang === 'ru' ? 'Извлечение признаков...' : 'Extracting features...' },
        { progress: 60, status: 'processing', text: currentLang === 'ru' ? 'Преобразование голоса...' : 'Converting voice...' },
        { progress: 80, status: 'processing', text: currentLang === 'ru' ? 'Применение эффектов...' : 'Applying effects...' },
        { progress: 95, status: 'processing', text: currentLang === 'ru' ? 'Финализация...' : 'Finalizing...' },
        { progress: 100, status: 'complete', text: currentLang === 'ru' ? 'Завершено!' : 'Completed!' }
    ];
    
    for (const step of steps) {
        updateUploadProgress(progressId, step.progress, step.status);
        
        // Обновляем текст статуса
        const progressElement = document.getElementById(progressId);
        if (progressElement) {
            const statusText = progressElement.querySelector('.progress-status-text');
            if (statusText) {
                statusText.textContent = step.text;
            }
        }
        
        // Задержка между шагами
        await new Promise(resolve => setTimeout(resolve, 500 + Math.random() * 1000));
    }
}

/**
 * Улучшенная функция обработки ошибок сети
 * @param {Error} error - Объект ошибки
 * @returns {string} - Сообщение об ошибке для пользователя
 */
function getNetworkErrorMessage(error) {
    if (!navigator.onLine) {
        return currentLang === 'ru' 
            ? 'Нет подключения к интернету' 
            : 'No internet connection';
    }
    
    if (error.name === 'AbortError') {
        return currentLang === 'ru' 
            ? 'Операция была отменена' 
            : 'Operation was cancelled';
    }
    
    if (error.message.includes('timeout')) {
        return currentLang === 'ru' 
            ? 'Превышено время ожидания' 
            : 'Request timeout';
    }
    
    if (error.message.includes('Failed to fetch')) {
        return currentLang === 'ru' 
            ? 'Ошибка подключения к серверу' 
            : 'Failed to connect to server';
    }
    
    return error.message || (
        currentLang === 'ru' 
            ? 'Произошла неизвестная ошибка' 
            : 'An unknown error occurred'
    );
}