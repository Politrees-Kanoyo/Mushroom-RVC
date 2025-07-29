class AudioPlayer {
    constructor(container) {
        this.container = container;
        this.audio = null;
        this.isPlaying = false;
        this.waveformCanvas = null;
        this.waveformCtx = null;
        this.audioData = null;
        this.animationFrame = null;
        this.currentTime = 0;
        this.audioContext = null;
        this.audioBuffer = null;
        this.waveformData = null;
        
        this.init();
    }
    
    init() {
        this.createPlayer();
        this.setupEventListeners();
    }
    
    createPlayer() {
        this.container.innerHTML = `
            <div class="audio-player">
                <div class="waveform-container">
                    <canvas class="waveform-canvas"></canvas>
                    <div class="progress-overlay"></div>
                    <div class="progress-indicator"></div>
                </div>
                <div class="player-controls">
                    <button class="player-btn play-pause-btn" title="Воспроизвести/Пауза">
                        <svg class="player-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <polygon points="5,3 19,12 5,21" />
                        </svg>
                    </button>
                    <button class="player-btn download-btn" title="Скачать">
                        <svg class="player-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                            <polyline points="7,10 12,15 17,10"/>
                            <line x1="12" y1="15" x2="12" y2="3"/>
                        </svg>
                    </button>
                    <div class="time-display">
                        <span class="current-time">0:00</span> / <span class="duration">0:00</span>
                    </div>
                    <input type="range" class="volume-slider" min="0" max="1" step="0.01" value="1" title="Громкость">
                </div>
            </div>
        `;
        
        this.waveformCanvas = this.container.querySelector('.waveform-canvas');
        this.waveformCtx = this.waveformCanvas.getContext('2d');
        this.playPauseBtn = this.container.querySelector('.play-pause-btn');
        this.downloadBtn = this.container.querySelector('.download-btn');
        this.currentTimeDisplay = this.container.querySelector('.current-time');
        this.durationDisplay = this.container.querySelector('.duration');
        this.volumeSlider = this.container.querySelector('.volume-slider');
        this.progressOverlay = this.container.querySelector('.progress-overlay');
        this.progressIndicator = this.container.querySelector('.progress-indicator');
    }
    
    setupEventListeners() {
        this.playPauseBtn.addEventListener('click', () => this.togglePlayPause());
        this.downloadBtn.addEventListener('click', () => this.downloadAudio());
        this.volumeSlider.addEventListener('input', (e) => this.setVolume(e.target.value));
        
        this.progressOverlay.addEventListener('click', (e) => {
            if (!this.audio) return;
            const rect = this.progressOverlay.getBoundingClientRect();
            const pos = (e.clientX - rect.left) / rect.width;
            this.audio.currentTime = pos * this.audio.duration;
        });
    }
    
    loadAudio(audioUrl, filename = 'audio') {
        if (this.audio) {
            this.audio.pause();
            // Освобождаем URL только если это blob URL
            if (this.audio.src.startsWith('blob:')) {
                URL.revokeObjectURL(this.audio.src);
            }
        }
        
        this.audio = new Audio(audioUrl);
        this.filename = filename;
        
        this.audio.addEventListener('loadedmetadata', () => {
            this.durationDisplay.textContent = this.formatTime(this.audio.duration);
            this.generateWaveform();
        });
        
        this.audio.addEventListener('timeupdate', () => {
            this.currentTime = this.audio.currentTime;
            this.updateProgress();
            this.currentTimeDisplay.textContent = this.formatTime(this.audio.currentTime);
        });
        
        this.audio.addEventListener('ended', () => {
            this.isPlaying = false;
            this.updatePlayPauseButton();
        });
        
        this.audio.addEventListener('error', (e) => {
            console.error('Ошибка загрузки аудио:', e);
        });
    }
    
    togglePlayPause() {
        if (!this.audio) return;
        
        if (this.isPlaying) {
            this.audio.pause();
        } else {
            this.audio.play();
        }
        
        this.isPlaying = !this.isPlaying;
        this.updatePlayPauseButton();
    }
    
    updatePlayPauseButton() {
        const icon = this.playPauseBtn.querySelector('.player-icon');
        if (this.isPlaying) {
            icon.innerHTML = `
                <rect x="6" y="4" width="4" height="16"/>
                <rect x="14" y="4" width="4" height="16"/>
            `;
        } else {
            icon.innerHTML = `<polygon points="5,3 19,12 5,21" />`;
        }
    }
    
    setVolume(volume) {
        if (this.audio) {
            this.audio.volume = volume;
        }
    }
    
    updateProgress() {
        if (!this.audio) return;
        
        const progress = this.currentTime / this.audio.duration;
        this.progressIndicator.style.width = `${progress * 100}%`;
    }
    
    async generateWaveform() {
        if (!this.audio) return;
        
        try {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            
            const response = await fetch(this.audio.src);
            const arrayBuffer = await response.arrayBuffer();
            this.audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer);
            
            this.extractWaveformData();
            
            this.drawRealWaveform();
        } catch (error) {
            console.warn('Не удалось загрузить настоящую волну, используем упрощенную:', error);
            this.drawSimplifiedWaveform();
        }
    }
    
    extractWaveformData() {
        if (!this.audioBuffer) return;
        
        const channelData = this.audioBuffer.getChannelData(0); 
        const samples = 1000; 
        const blockSize = Math.floor(channelData.length / samples);
        this.waveformData = [];
        
        for (let i = 0; i < samples; i++) {
            let sum = 0;
            for (let j = 0; j < blockSize; j++) {
                sum += Math.abs(channelData[i * blockSize + j] || 0);
            }
            this.waveformData.push(sum / blockSize);
        }
    }
    
    drawRealWaveform() {
        if (!this.waveformCanvas || !this.waveformCtx || !this.waveformData) return;
        
        const width = this.waveformCanvas.offsetWidth;
        const height = this.waveformCanvas.offsetHeight;
        
        this.waveformCanvas.width = width;
        this.waveformCanvas.height = height;
        
        const ctx = this.waveformCtx;
        ctx.clearRect(0, 0, width, height);
        
        const centerY = height / 2;
        const maxAmplitude = Math.max(...this.waveformData);
        const amplitudeScale = (height / 2) * 0.8; 
        
        ctx.beginPath();
        ctx.lineWidth = 2;
        ctx.strokeStyle = '#6366f1';
        
        for (let i = 0; i < this.waveformData.length; i++) {
            const x = (i / this.waveformData.length) * width;
            const amplitude = (this.waveformData[i] / maxAmplitude) * amplitudeScale;
            const y = centerY - amplitude;
            
            if (i === 0) {
                ctx.moveTo(x, y);
            } else {
                ctx.lineTo(x, y);
            }
        }
        
        ctx.stroke();
        
        ctx.beginPath();
        for (let i = 0; i < this.waveformData.length; i++) {
            const x = (i / this.waveformData.length) * width;
            const amplitude = (this.waveformData[i] / maxAmplitude) * amplitudeScale;
            const y = centerY + amplitude;
            
            if (i === 0) {
                ctx.moveTo(x, y);
            } else {
                ctx.lineTo(x, y);
            }
        }
        
        ctx.stroke();
        
        ctx.beginPath();
        ctx.moveTo(0, centerY);
        
        for (let i = 0; i < this.waveformData.length; i++) {
            const x = (i / this.waveformData.length) * width;
            const amplitude = (this.waveformData[i] / maxAmplitude) * amplitudeScale;
            const y = centerY - amplitude;
            ctx.lineTo(x, y);
        }
        
        for (let i = this.waveformData.length - 1; i >= 0; i--) {
            const x = (i / this.waveformData.length) * width;
            const amplitude = (this.waveformData[i] / maxAmplitude) * amplitudeScale;
            const y = centerY + amplitude;
            ctx.lineTo(x, y);
        }
        
        ctx.closePath();
        
        const gradient = ctx.createLinearGradient(0, 0, 0, height);
        gradient.addColorStop(0, 'rgba(99, 102, 241, 0.3)');
        gradient.addColorStop(0.5, 'rgba(99, 102, 241, 0.1)');
        gradient.addColorStop(1, 'rgba(99, 102, 241, 0.3)');
        ctx.fillStyle = gradient;
        ctx.fill();
    }
    
    drawSimplifiedWaveform() {
        if (!this.waveformCanvas || !this.waveformCtx) return;
        
        const width = this.waveformCanvas.offsetWidth;
        const height = this.waveformCanvas.offsetHeight;
        
        this.waveformCanvas.width = width;
        this.waveformCanvas.height = height;
        
        const ctx = this.waveformCtx;
        ctx.clearRect(0, 0, width, height);
        
        ctx.beginPath();
        ctx.lineWidth = 3;
        ctx.strokeStyle = '#6366f1'; 
        
        const centerY = height / 2;
        const amplitude = height / 3;
        const points = 200;
        
        for (let i = 0; i <= points; i++) {
            const x = (i / points) * width;
            const y = centerY + 
                Math.sin(i * 0.2) * amplitude * 0.4 + 
                Math.sin(i * 0.5) * amplitude * 0.2;
            
            if (i === 0) {
                ctx.moveTo(x, y);
            } else {
                ctx.lineTo(x, y);
            }
        }
        
        ctx.stroke();
        
        ctx.beginPath();
        ctx.moveTo(0, centerY);
        
        for (let i = 0; i <= points; i++) {
            const x = (i / points) * width;
            const y = centerY + 
                Math.sin(i * 0.2) * amplitude * 0.4 + 
                Math.sin(i * 0.5) * amplitude * 0.2;
            ctx.lineTo(x, y);
        }
        
        ctx.lineTo(width, centerY);
        ctx.closePath();
        
        const gradient = ctx.createLinearGradient(0, 0, 0, height);
        gradient.addColorStop(0, 'rgba(99, 102, 241, 0.3)');
        gradient.addColorStop(1, 'rgba(99, 102, 241, 0.05)');
        ctx.fillStyle = gradient;
        ctx.fill();
    }
    
    downloadAudio() {
        if (!this.audio) return;
        
        const link = document.createElement('a');
        // Убираем timestamp параметр из URL для скачивания
        const cleanUrl = this.audio.src.split('?')[0];
        link.href = cleanUrl;
        link.download = this.filename || 'audio.mp3';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }
    
    formatTime(seconds) {
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
    }
    
    destroy() {
        if (this.audio) {
            this.audio.pause();
            // Освобождаем URL только если это blob URL
            if (this.audio.src.startsWith('blob:')) {
                URL.revokeObjectURL(this.audio.src);
            }
            this.audio = null;
        }
        
        if (this.animationFrame) {
            cancelAnimationFrame(this.animationFrame);
        }
        
        if (this.audioContext && this.audioContext.state !== 'closed') {
            this.audioContext.close();
        }
        
        this.audioBuffer = null;
        this.waveformData = null;
        this.audioContext = null;
    }
}

document.addEventListener('DOMContentLoaded', function() {
});
