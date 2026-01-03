
class UIManager {
    constructor(dataStore) {
        this.dataStore = dataStore;
    }

    updateFileList() {
        const loadedFilesDiv = document.getElementById('loaded-files');
        loadedFilesDiv.innerHTML = this.dataStore.csvFiles.map(f => `
            <div class="file-info">
                <strong>📄 ${f.fileName}</strong>
            </div>`).join('');
    }

    populateChartName(fileName) {
        document.getElementById("chartInfo").innerHTML = `
        <div class="file-info">
            <strong>📄 ${fileName}</strong><br>
        </div>`;
    }

    populateFileSelector(selectedFileName = null) {
        const sel = document.getElementById('fileSelector');
        sel.innerHTML = '<option value="">...</option>';
        this.dataStore.csvFiles.forEach((file, index) => {
            const opt = document.createElement('option');
            opt.value = index;
            opt.textContent = file.fileName;
            sel.appendChild(opt);
            if (file.fileName === selectedFileName) {
                sel.value = index;
            }
        });
    }

    adjustFileSelector(index){
        const sel = document.getElementById('fileSelector');
        sel.value = index;
    }

    populateColumnSelectors(preselectedY = []) {
        const selectors = ['xAxis', 'yAxis1', 'yAxis2', 'yAxis3', 'yAxis4', 'yAxis5', 'yAxis6'];
        
        selectors.forEach(id => {
            const sel = document.getElementById(id);
            sel.innerHTML = '<option value="">Select column...</option>';
            
            this.dataStore.currentCsvData.meta.fields.forEach(field => {
                const cleanField = field.trim();
                const opt = document.createElement('option');
                opt.value = cleanField;
                opt.textContent = cleanField;

                if (id === "xAxis" && (cleanField.toLowerCase() === "time" || cleanField.toLowerCase() === "acqtime")) {
                    opt.selected = true;
                }

                if (id.startsWith("yAxis")) {
                    const yIndex = parseInt(id.replace("yAxis", ""), 10) - 1;
                    const aliases = preselectedY[yIndex];
                    if (aliases && aliases.some(a => a.toLowerCase() === cleanField.toLowerCase())) {
                        opt.selected = true;
                    }
                }

                sel.appendChild(opt);
            });
        });
    }

    showError(msg) {
        document.getElementById('loaded-files').innerHTML =
            `<div class="error">${msg}</div>`;
    }

    setButtonLoading(buttonId, isLoading) {
        const button = document.getElementById(buttonId);
        if (isLoading) {
            button.innerHTML = '<span class="loading"></span>Loading...';
            button.disabled = true;
        } else {
            button.innerHTML = "Add More Files";
            button.disabled = false;
        }
    }

    getSelectedColumns() {
        return {
            xColumn: document.getElementById('xAxis').value,
            yColumns: [
                document.getElementById('yAxis1').value,
                document.getElementById('yAxis2').value,
                document.getElementById('yAxis3').value,
                document.getElementById('yAxis4').value,
                document.getElementById('yAxis5').value,
                document.getElementById('yAxis6').value
            ].filter(Boolean)
        };
    }

    getAxisLimits(axisNumber) {
        return {
            min: parseFloat(document.getElementById(`y${axisNumber}Min`).value),
            max: parseFloat(document.getElementById(`y${axisNumber}Max`).value)
        };
    }

    clearAxisInputs(axisNumber) {
        document.getElementById(`y${axisNumber}Min`).value = "";
        document.getElementById(`y${axisNumber}Max`).value = "";
    }
}

export default UIManager;