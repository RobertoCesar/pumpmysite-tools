document.addEventListener('DOMContentLoaded', () => {
    const dropZone = document.getElementById('drop-zone');
    const fileInput = document.getElementById('file-input');
    const selectFilesBtn = document.getElementById('select-files-btn');
    const resultsSection = document.getElementById('results-section');
    const loadingArea = document.getElementById('loading-area');
    const loadingText = document.getElementById('loading-text');
    const originalImage = document.getElementById('original-image');
    const resultImage = document.getElementById('result-image');
    const downloadBtn = document.getElementById('download-btn');
    const clearBtn = document.getElementById('clear-btn');

    let currentResultUrl = null;

    // Trigger file input dialog
    selectFilesBtn.addEventListener('click', () => fileInput.click());
    dropZone.addEventListener('click', (e) => {
        if (e.target !== selectFilesBtn) {
            fileInput.click();
        }
    });

    // Handle drag events
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
        dropZone.addEventListener(eventName, preventDefaults, false);
    });

    function preventDefaults(e) {
        e.preventDefault();
        e.stopPropagation();
    }

    ['dragenter', 'dragover'].forEach(eventName => {
        dropZone.addEventListener(eventName, () => dropZone.classList.add('drag-over'), false);
    });

    ['dragleave', 'drop'].forEach(eventName => {
        dropZone.addEventListener(eventName, () => dropZone.classList.remove('drag-over'), false);
    });

    // Handle dropped files
    dropZone.addEventListener('drop', (e) => {
        const dt = e.dataTransfer;
        const files = dt.files;
        handleFiles(files);
    });

    // Handle selected files
    fileInput.addEventListener('change', function (e) {
        handleFiles(this.files);
    });

    function handleFiles(files) {
        if (files.length === 0) return;
        const file = files[0];

        if (!file.type.match('image.*')) {
            alert('Por favor, selecione apenas arquivos de imagem.');
            return;
        }

        processImage(file);
    }

    async function processImage(file) {
        // Reset and UI setups
        const originalUrl = URL.createObjectURL(file);
        originalImage.src = originalUrl;

        dropZone.style.display = 'none';
        resultsSection.style.display = 'none';
        loadingArea.style.display = 'block';
        loadingText.textContent = "Carregando modelo de IA (pode demorar na primeira vez)...";

        try {
            loadingText.textContent = "Processando imagem... (Removendo o fundo)";

            // Call imgly API
            const imageBlob = await imglyRemoveBackground(file, {
                progress: (key, current, total) => {
                    if (key.includes('fetch')) {
                        loadingText.textContent = `Baixando modelo IA... ${~~((current / total) * 100)}%`;
                    } else {
                        loadingText.textContent = `Processando: ${~~((current / total) * 100)}%`;
                    }
                }
            });

            // Create result Object URL
            currentResultUrl = URL.createObjectURL(imageBlob);
            resultImage.src = currentResultUrl;

            loadingArea.style.display = 'none';
            resultsSection.style.display = 'block';
        } catch (error) {
            console.error("Erro ao remover fundo:", error);
            alert("Ocorreu um erro ao remover o fundo da imagem. Verifique o console para mais detalhes.");
            dropZone.style.display = 'block';
            loadingArea.style.display = 'none';
        }
    }

    downloadBtn.addEventListener('click', () => {
        if (!currentResultUrl) return;

        const a = document.createElement('a');
        a.style.display = 'none';
        a.href = currentResultUrl;
        a.download = `sem-fundo-${Date.now()}.png`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(currentResultUrl);
        document.body.removeChild(a);
    });

    clearBtn.addEventListener('click', () => {
        dropZone.style.display = 'block';
        resultsSection.style.display = 'none';
        fileInput.value = '';
        if (currentResultUrl) {
            window.URL.revokeObjectURL(currentResultUrl);
            currentResultUrl = null;
        }
    });
});
