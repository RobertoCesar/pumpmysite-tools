document.addEventListener('DOMContentLoaded', () => {
    // --- DOM Elements ---
    const uploadZone = document.getElementById('upload-zone');
    const videoInput = document.getElementById('video-input');
    const selectVideoBtn = document.getElementById('select-video-btn');

    const editorInterface = document.getElementById('editor-interface');
    const videoElement = document.getElementById('source-video');

    const startTimeInput = document.getElementById('start-time');
    const endTimeInput = document.getElementById('end-time');
    const setCurrentStartBtn = document.getElementById('set-current-start');
    const setCurrentEndBtn = document.getElementById('set-current-end');

    const gifWidthInput = document.getElementById('gif-width');
    const gifFpsInput = document.getElementById('gif-fps');
    const gifQualityInput = document.getElementById('gif-quality');

    const generateBtn = document.getElementById('generate-btn');
    const resetBtn = document.getElementById('reset-btn');

    const resultInterface = document.getElementById('result-interface');
    const loadingState = document.getElementById('loading-state');
    const successState = document.getElementById('success-state');
    const progressFill = document.getElementById('progress-fill');
    const statusText = document.getElementById('status-text');
    const resultGif = document.getElementById('result-gif');
    const downloadLink = document.getElementById('download-link');
    const backToEditBtn = document.getElementById('back-to-edit');

    // --- State ---
    let uploadedFile = null;

    // --- Event Listeners ---
    selectVideoBtn.addEventListener('click', () => videoInput.click());

    videoInput.addEventListener('change', (e) => {
        if (e.target.files.length > 0) {
            handleFile(e.target.files[0]);
        }
    });

    // Drag & Drop
    uploadZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        uploadZone.style.borderColor = 'var(--accent)';
    });
    uploadZone.addEventListener('dragleave', () => {
        uploadZone.style.borderColor = 'var(--glass-border)';
    });
    uploadZone.addEventListener('drop', (e) => {
        e.preventDefault();
        uploadZone.style.borderColor = 'var(--glass-border)';
        if (e.dataTransfer.files.length > 0) {
            handleFile(e.dataTransfer.files[0]);
        }
    });

    // Editor Controls
    setCurrentStartBtn.addEventListener('click', () => {
        startTimeInput.value = videoElement.currentTime.toFixed(1);
    });

    setCurrentEndBtn.addEventListener('click', () => {
        endTimeInput.value = videoElement.currentTime.toFixed(1);
    });

    videoElement.addEventListener('loadedmetadata', () => {
        endTimeInput.value = Math.min(5, videoElement.duration).toFixed(1);
        startTimeInput.value = 0;
    });

    resetBtn.addEventListener('click', () => {
        location.reload(); // Simple reset
    });

    backToEditBtn.addEventListener('click', () => {
        resultInterface.style.display = 'none';
        editorInterface.style.display = 'grid';
    });

    generateBtn.addEventListener('click', startConversion);

    // --- Functions ---

    function handleFile(file) {
        if (!file.type.startsWith('video/')) {
            alert('Por favor, envie um arquivo de vídeo válido.');
            return;
        }
        uploadedFile = file;
        const url = URL.createObjectURL(file);
        videoElement.src = url;

        uploadZone.style.display = 'none';
        editorInterface.style.display = 'grid';
    }

    async function startConversion() {
        const startTime = parseFloat(startTimeInput.value);
        const endTime = parseFloat(endTimeInput.value);
        const width = parseInt(gifWidthInput.value);
        const fps = parseInt(gifFpsInput.value);
        const quality = parseInt(gifQualityInput.value);

        if (endTime <= startTime) {
            alert('O tempo final deve ser maior que o inicial.');
            return;
        }

        const duration = endTime - startTime;
        if (duration > 20) {
            if (!confirm('GIFs longos (>20s) podem demorar muito e travar o navegador. Deseja continuar?')) return;
        }

        // Switch UI
        editorInterface.style.display = 'none';
        resultInterface.style.display = 'block';
        loadingState.style.display = 'flex';
        successState.style.display = 'none';
        progressFill.style.width = '0%';
        statusText.textContent = 'Capturando quadros...';

        try {
            const blob = await createGif(uploadedFile, startTime, endTime, width, fps, quality);

            // Show Result
            const url = URL.createObjectURL(blob);
            resultGif.src = url;
            downloadLink.href = url;

            loadingState.style.display = 'none';
            successState.style.display = 'block';
        } catch (error) {
            console.error(error);
            alert('Erro ao gerar GIF: ' + error.message);
            location.reload();
        }
    }

    function createGif(file, start, end, width, fps, quality) {
        return new Promise((resolve, reject) => {
            const video = document.createElement('video');
            video.src = URL.createObjectURL(file);
            video.muted = true;
            video.crossOrigin = "anonymous";

            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');

            // Initialize GIF.js
            // Note: We need to point to the worker script. 
            // Since we are using a CDN for the main lib, we need a blob for the worker to avoid CORS issues if not hosted on same domain.
            // However, gif.js usually tries to load 'gif.worker.js'. 
            // We will use a Blob URL for the worker code to make it truly standalone.

            const workerBlob = new Blob([`
                importScripts('https://cdnjs.cloudflare.com/ajax/libs/gif.js/0.2.0/gif.worker.js');
            `], { type: 'application/javascript' });

            const gif = new GIF({
                workers: 2,
                quality: quality,
                width: width,
                height: width * (videoElement.videoHeight / videoElement.videoWidth), // Maintain aspect ratio
                workerScript: URL.createObjectURL(workerBlob)
            });

            // Calculate steps
            const duration = end - start;
            const totalFrames = Math.floor(duration * fps);
            const interval = 1 / fps;
            let currentFrame = 0;

            video.addEventListener('loadeddata', async () => {
                canvas.width = width;
                canvas.height = width * (video.videoHeight / video.videoWidth);

                video.currentTime = start;
            });

            video.addEventListener('seeked', () => {
                if (video.currentTime > end || currentFrame >= totalFrames) {
                    // Finish
                    statusText.textContent = 'Renderizando GIF...';
                    gif.render();
                    return;
                }

                // Draw frame
                ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
                gif.addFrame(ctx, { copy: true, delay: 1000 / fps });

                // Update progress
                currentFrame++;
                const progress = (currentFrame / totalFrames) * 100;
                progressFill.style.width = `${Math.min(90, progress)}%`;

                // Next frame
                video.currentTime += interval;
            });

            gif.on('finished', (blob) => {
                progressFill.style.width = '100%';
                resolve(blob);
            });

            // Start process
            video.load(); // Trigger loadeddata
        });
    }
});
