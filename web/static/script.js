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
    showLoading();
    
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
    } finally {
        hideLoading();
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
    
    showLoading();
    
    try {
        const response = await fetch('/api/voice-conversion', {
            method: 'POST',
            body: formData
        });
        
        const data = await response.json();
        
        if (data.success) {
            showResult({
                type: 'voice-conversion',
                outputPath: data.output_path,
                downloadUrl: data.download_url
            });
            const successMsg = currentLang === 'ru' ? 'Преобразование голоса завершено!' : 'Voice conversion completed successfully!';
            showNotification(successMsg, 'success');
        } else {
            throw new Error(data.error);
        }
    } catch (error) {
        console.error('Ошибка преобразования:', error);
        const errorMsg = currentLang === 'ru' ? 'Ошибка преобразования: ' + error.message : 'Conversion error: ' + error.message;
        showNotification(errorMsg, 'error');
    } finally {
        hideLoading();
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
    
    showLoading();
    
    try {
        const response = await fetch('/api/tts-conversion', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(requestData)
        });
        
        const data = await response.json();
        
        if (data.success) {
            showResult({
                type: 'tts-conversion',
                synthPath: data.synth_path,
                convertedPath: data.converted_path,
                downloadUrl: data.download_url
            });
            const successMsg = currentLang === 'ru' ? 'Синтез и преобразование завершены!' : 'Synthesis and conversion completed successfully!';
            showNotification(successMsg, 'success');
        } else {
            throw new Error(data.error);
        }
    } catch (error) {
        console.error('Ошибка TTS преобразования:', error);
        const errorMsg = currentLang === 'ru' ? 'Ошибка TTS преобразования: ' + error.message : 'TTS conversion error: ' + error.message;
        showNotification(errorMsg, 'error');
    } finally {
        hideLoading();
    }
}

async function handleDownloadModel(event) {
    event.preventDefault();
    
    const formData = new FormData(event.target);
    const requestData = {
        url: formData.get('url'),
        model_name: formData.get('model_name')
    };
    
    showLoading();
    
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
    } finally {
        hideLoading();
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
    
    if (!modelName || modelName.trim() === '') {
        const errorMsg = currentLang === 'ru' ? 'Пожалуйста, введите имя модели' : 'Please enter model name';
        showNotification(errorMsg, 'error');
        return;
    }
    
    showLoading();
    
    try {
        const response = await fetch('/api/upload-model-zip', {
            method: 'POST',
            body: formData
        });
        
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
        } else {
            throw new Error(data.error);
        }
    } catch (error) {
        console.error('Ошибка загрузки ZIP:', error);
        const errorMsg = currentLang === 'ru' ? 'Ошибка загрузки ZIP: ' + error.message : 'ZIP upload error: ' + error.message;
        showNotification(errorMsg, 'error');
    } finally {
        hideLoading();
    }
}

async function handleInstallHubert(event) {
    event.preventDefault();
    
    const formData = new FormData(event.target);
    const requestData = {
        model_name: formData.get('model_name'),
        custom_url: formData.get('custom_url') || null
    };
    
    showLoading();
    
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
    } finally {
        hideLoading();
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

function showLoading(customText = null) {
    const loading = document.getElementById('loading');
    if (loading) {
        loading.classList.remove('hidden');
    }
    
    if (customText) {
        updateLoadingText(customText);
    } else {
        updateLoadingText(i18n.processing || 'Обработка...');
    }
}

function hideLoading() {
    const loading = document.getElementById('loading');
    if (loading) {
        loading.classList.add('hidden');
    }
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

function updateLoadingText(text) {
    const loadingText = document.getElementById('loading-text');
    if (loadingText) {
        loadingText.textContent = text;
    }
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