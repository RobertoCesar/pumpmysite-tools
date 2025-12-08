document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    const dropZone = document.getElementById('drop-zone');
    const fileInput = document.getElementById('file-input');
    const selectFilesBtn = document.getElementById('select-files-btn');
    const qualitySlider = document.getElementById('quality-slider');
    const qualityValue = document.getElementById('quality-value');
    const maxWidthInput = document.getElementById('max-width');
    const resultsSection = document.getElementById('results-section');
    const fileList = document.getElementById('file-list');
    const downloadAllBtn = document.getElementById('download-all-btn');
    const clearAllBtn = document.getElementById('clear-all-btn');

    // State
    let processedFiles = [];

    // Event Listeners
    selectFilesBtn.addEventListener('click', () => fileInput.click());

    fileInput.addEventListener('change', (e) => {
        handleFiles(e.target.files);
        fileInput.value = ''; // Reset input
    });

    // Drag & Drop
    dropZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropZone.classList.add('drag-over');
    });

    dropZone.addEventListener('dragleave', () => {
        dropZone.classList.remove('drag-over');
    });

    dropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropZone.classList.remove('drag-over');
        handleFiles(e.dataTransfer.files);
    });

    // Quality Slider
    qualitySlider.addEventListener('input', (e) => {
        const value = Math.round(e.target.value * 100);
        qualityValue.textContent = `${value}%`;
    });

    // Clear All
    clearAllBtn.addEventListener('click', () => {
        processedFiles = [];
        fileList.innerHTML = '';
        resultsSection.style.display = 'none';
        downloadAllBtn.style.display = 'none';
    });

    // Download All
    downloadAllBtn.addEventListener('click', async () => {
        if (processedFiles.length === 0) return;

        const zip = new JSZip();
        processedFiles.forEach(item => {
            zip.file(item.name, item.blob);
        });

        const content = await zip.generateAsync({ type: "blob" });
        const url = URL.createObjectURL(content);
        const a = document.createElement('a');
        a.href = url;
        a.download = "imagens_comprimidas.zip";
        a.click();
        URL.revokeObjectURL(url);
    });

    // Main Processing Function
    async function handleFiles(files) {
        if (files.length === 0) return;

        resultsSection.style.display = 'block';

        // Scroll to results
        resultsSection.scrollIntoView({ behavior: 'smooth' });

        for (const file of files) {
            if (!file.type.startsWith('image/')) {
                alert(`O arquivo ${file.name} não é uma imagem válida.`);
                continue;
            }

            await processFile(file);
        }
    }

    async function processFile(file) {
        // Create UI Item (Loading State)
        const uiItem = createFileItemUI(file);
        fileList.appendChild(uiItem.element);

        try {
            const options = {
                maxSizeMB: 1, // Default cap, but quality setting takes precedence usually
                maxWidthOrHeight: maxWidthInput.value ? parseInt(maxWidthInput.value) : undefined,
                useWebWorker: true,
                initialQuality: parseFloat(qualitySlider.value)
            };

            // If user wants high quality (slider > 0.9), we relax the size cap
            if (options.initialQuality > 0.9) {
                options.maxSizeMB = 10;
            }

            const compressedFile = await imageCompression(file, options);

            // Update UI with results
            updateFileItemUI(uiItem, file, compressedFile);

            // Store for batch download
            processedFiles.push({
                name: compressedFile.name,
                blob: compressedFile
            });

            if (processedFiles.length > 1) {
                downloadAllBtn.style.display = 'inline-flex';
            }

        } catch (error) {
            console.error('Error compressing file:', error);
            uiItem.element.querySelector('.file-stats').innerHTML = `<span style="color: var(--error)">Erro na compressão</span>`;
        }
    }

    function createFileItemUI(file) {
        const div = document.createElement('div');
        div.className = 'file-item';

        // Preview
        const img = document.createElement('img');
        img.className = 'file-preview';
        img.src = URL.createObjectURL(file);

        div.innerHTML = `
            <div class="file-details">
                <div class="file-name">${file.name}</div>
                <div class="file-stats">
                    Processando... <i class="fa-solid fa-spinner fa-spin"></i>
                </div>
            </div>
        `;

        div.prepend(img);

        return { element: div, img: img };
    }

    function updateFileItemUI(uiItem, originalFile, compressedFile) {
        const originalSize = formatBytes(originalFile.size);
        const newSize = formatBytes(compressedFile.size);
        const savings = ((originalFile.size - compressedFile.size) / originalFile.size * 100).toFixed(1);

        // If size increased (rare but possible with settings), show 0% savings
        const savingsText = savings > 0 ? `-${savings}%` : '0%';

        uiItem.element.querySelector('.file-stats').innerHTML = `
            <span>${originalSize} <i class="fa-solid fa-arrow-right" style="font-size: 0.7em; margin: 0 5px;"></i> <strong>${newSize}</strong></span>
            <span class="savings">${savingsText}</span>
        `;

        // Add download button
        const downloadBtn = document.createElement('a');
        downloadBtn.className = 'download-btn';
        downloadBtn.href = URL.createObjectURL(compressedFile);
        downloadBtn.download = compressedFile.name;
        downloadBtn.innerHTML = '<i class="fa-solid fa-download"></i>';

        uiItem.element.appendChild(downloadBtn);
    }

    function formatBytes(bytes, decimals = 1) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const dm = decimals < 0 ? 0 : decimals;
        const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
    }
});
