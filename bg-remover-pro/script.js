document.addEventListener('DOMContentLoaded', () => {
    const dropZone = document.getElementById('drop-zone');
    const fileInput = document.getElementById('file-input');
    const selectFilesBtn = document.getElementById('select-files-btn');
    const resultsSection = document.getElementById('results-section');
    const fileList = document.getElementById('file-list');
    const clearAllBtn = document.getElementById('clear-all-btn');

    // Remove background function wrapped for single execution
    async function processImage(file) {
        showResultsSection();
        const id = Date.now() + Math.random().toString(36).substr(2, 5);

        let originalPreviewUrl = URL.createObjectURL(file);

        // Add loading item
        const li = document.createElement('div');
        li.className = 'file-item';
        li.id = `item-${id}`;
        li.innerHTML = `
            <div class="image-comparison-container">
                <img src="${originalPreviewUrl}" class="file-preview original" alt="Original">
            </div>
            <div class="file-details">
                <div class="file-name">${file.name}</div>
                <div class="file-stats">
                    <span class="status-badge processing" id="status-${id}">
                        <i class="fa-solid fa-spinner fa-spin"></i> Extraindo IA e Removendo Fundo (Pode demorar um pouco)...
                    </span>
                </div>
            </div>
        `;
        fileList.prepend(li);

        try {
            // configuration for imgly-background-removal
            const config = {
                publicPath: "https://static.imgly.com/@imgly/background-removal/1.4.3/dist/"
            };

            const imageBlob = await imglyRemoveBackground(file, config);

            const url = URL.createObjectURL(imageBlob);

            li.innerHTML = `
                <div class="image-comparison-container">
                    <img src="${originalPreviewUrl}" class="file-preview original" alt="Original">
                    <i class="fa-solid fa-arrow-right"></i>
                    <img src="${url}" class="file-preview result" alt="Transparente" style="background:#000 url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyMCIgaGVpZ2h0PSIyMCI+CjxwYXRoIGZpbGw9IiM0NDQiIGQ9Ik0wIDBoMTB2MTBIMHptMTAgMTBoMTB2MTBIMTB6Ii8+Cjwvc3ZnPg=='); background-size: 10px 10px;">
                </div>
                <div class="file-details">
                    <div class="file-name">${file.name} (Sem Fundo)</div>
                    <div class="file-stats">
                        <span class="status-badge success">Pronto</span>
                        <span>${(imageBlob.size / 1024).toFixed(1)} KB</span>
                    </div>
                </div>
                <a href="${url}" download="no-bg-${file.name}.png" class="download-btn" title="Baixar">
                    <i class="fa-solid fa-download"></i>
                </a>
            `;

        } catch (error) {
            console.error(error);
            document.getElementById(`status-${id}`).className = 'status-badge error';
            document.getElementById(`status-${id}`).innerHTML = '<i class="fa-solid fa-triangle-exclamation"></i> Erro ao remover';
        }
    }

    // Event Listeners for File Selection
    selectFilesBtn.addEventListener('click', () => {
        fileInput.click();
    });

    fileInput.addEventListener('change', (e) => {
        handleFiles(e.target.files);
        fileInput.value = ''; // Reset for the same file upload if needed
    });

    // Drag and Drop
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
        dropZone.addEventListener(eventName, preventDefaults, false);
    });

    function preventDefaults(e) {
        e.preventDefault();
        e.stopPropagation();
    }

    ['dragenter', 'dragover'].forEach(eventName => {
        dropZone.addEventListener(eventName, () => {
            dropZone.classList.add('drag-over');
        });
    });

    ['dragleave', 'drop'].forEach(eventName => {
        dropZone.addEventListener(eventName, () => {
            dropZone.classList.remove('drag-over');
        });
    });

    dropZone.addEventListener('drop', (e) => {
        let dt = e.dataTransfer;
        let files = dt.files;
        handleFiles(files);
    });

    function handleFiles(files) {
        if (!files.length) return;
        // for bg removal, let's process them one by one
        [...files].forEach(file => {
            if (file.type.match('image.*')) {
                processImage(file);
            } else {
                alert('Apenas imagens são suportadas.');
            }
        });
    }

    function showResultsSection() {
        if (resultsSection.style.display === 'none') {
            resultsSection.style.display = 'block';
        }
    }

    // Clear All
    clearAllBtn.addEventListener('click', () => {
        fileList.innerHTML = '';
        resultsSection.style.display = 'none';
        fileInput.value = '';
    });
});
