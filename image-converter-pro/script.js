document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    const dropZone = document.getElementById('drop-zone');
    const fileInput = document.getElementById('file-input');
    const selectFilesBtn = document.getElementById('select-files-btn');
    const outputFormatSelect = document.getElementById('output-format');
    const resultsSection = document.getElementById('results-section');
    const fileList = document.getElementById('file-list');
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

    // Clear All
    clearAllBtn.addEventListener('click', () => {
        processedFiles = [];
        fileList.innerHTML = '';
        resultsSection.style.display = 'none';
    });

    // Main Processing Function
    async function handleFiles(files) {
        if (files.length === 0) return;

        resultsSection.style.display = 'block';
        resultsSection.scrollIntoView({ behavior: 'smooth' });

        const targetFormat = outputFormatSelect.value; // 'image/png', 'image/jpeg', 'image/webp'

        for (const file of files) {
            if (!file.type.startsWith('image/')) {
                alert(`O arquivo ${file.name} não é uma imagem válida.`);
                continue;
            }

            await processFile(file, targetFormat);
        }
    }

    async function processFile(file, targetFormat) {
        // Create UI Item
        const uiItem = createFileItemUI(file);
        fileList.appendChild(uiItem.element);

        try {
            const convertedBlob = await convertImage(file, targetFormat);

            // Update UI with results
            updateFileItemUI(uiItem, file, convertedBlob, targetFormat);

        } catch (error) {
            console.error('Error converting file:', error);
            uiItem.element.querySelector('.file-stats').innerHTML = `<span style="color: var(--error)">Erro na conversão</span>`;
        }
    }

    function convertImage(file, format) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            const url = URL.createObjectURL(file);

            img.onload = () => {
                const canvas = document.createElement('canvas');
                canvas.width = img.width;
                canvas.height = img.height;

                const ctx = canvas.getContext('2d');

                // Handle transparency for JPEG (fill with white)
                if (format === 'image/jpeg') {
                    ctx.fillStyle = '#FFFFFF';
                    ctx.fillRect(0, 0, canvas.width, canvas.height);
                }

                ctx.drawImage(img, 0, 0);

                canvas.toBlob((blob) => {
                    URL.revokeObjectURL(url);
                    if (blob) {
                        resolve(blob);
                    } else {
                        reject(new Error('Canvas toBlob failed'));
                    }
                }, format, 0.9); // 0.9 quality
            };

            img.onerror = () => {
                URL.revokeObjectURL(url);
                reject(new Error('Image load failed'));
            };

            img.src = url;
        });
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
                    <span class="status-badge processing">Convertendo...</span>
                </div>
            </div>
        `;

        div.prepend(img);

        return { element: div, img: img };
    }

    function updateFileItemUI(uiItem, originalFile, convertedBlob, targetFormat) {
        const originalExt = originalFile.name.split('.').pop();
        let newExt = targetFormat.split('/')[1];
        if (newExt === 'jpeg') newExt = 'jpg';

        const newName = originalFile.name.replace(/\.[^/.]+$/, "") + '.' + newExt;
        const newSize = formatBytes(convertedBlob.size);

        uiItem.element.querySelector('.file-stats').innerHTML = `
            <span class="status-badge success">Concluído</span>
            <span style="margin-left: 10px; color: var(--text-secondary);">${newSize}</span>
        `;

        // Add download button
        const downloadBtn = document.createElement('a');
        downloadBtn.className = 'download-btn';
        downloadBtn.href = URL.createObjectURL(convertedBlob);
        downloadBtn.download = newName;
        downloadBtn.innerHTML = '<i class="fa-solid fa-download"></i>';
        downloadBtn.title = "Baixar Imagem";

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
