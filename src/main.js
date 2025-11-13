import fileHandler from './modules/fileHandler.js';
import chartManager from './modules/chartManager.js';
import uiManager from './modules/uiManager.js';
import dataStore from './modules/dataStore.js';

console.log("Renderer loaded");

class App {
    constructor() {
        this.initEventListeners();
    }

    initEventListeners() {
        document.getElementById("loadFile").addEventListener("click", () => this.handleLoadFile());
        
        document.getElementById("plotChart").addEventListener("click", () => this.handlePlotChart());
        
        document.getElementById("resetZoom").addEventListener("click", () => chartManager.resetZoom());
        
        document.getElementById("clearChart").addEventListener("click", () => this.handleClearChart());
        
        document.getElementById('fileSelector').addEventListener('change', (e) => this.handleFileSelect(e));
        
        [1, 2, 3, 4, 5, 6].forEach(axisNumber => {
            document.getElementById(`yAxis${axisNumber}`).addEventListener("change", () => this.handlePlotChart());
            document.getElementById(`y${axisNumber}Min`).addEventListener("input", () => this.handleAxisUpdate(axisNumber));
            document.getElementById(`y${axisNumber}Max`).addEventListener("input", () => this.handleAxisUpdate(axisNumber));
            document.getElementById(`resetAxis${axisNumber}`).addEventListener("click", () => this.handleAxisReset(axisNumber));
        });
    }

    async handleLoadFile() {
        uiManager.setButtonLoading('loadFile', true);

        try {
            const result = await this.selectFileBrowser();
            if (result.success) {
                console.log(`Selected file: ${result.fileName}`);
                await fileHandler.handleLoadedFile(result);
                uiManager.updateFileList();
                uiManager.populateFileSelector(result.fileName);
                const preselectedY = fileHandler.getYAxisPresets(result.fileName);
                uiManager.populateColumnSelectors(preselectedY);
                dataStore.setCurrentSelectionIndex(dataStore.csvFiles.findIndex(f => f.fileName === result.fileName));
                this.handlePlotChart();
            }
        } catch (err) {
            uiManager.showError(err.message);
        } finally {
            uiManager.setButtonLoading('loadFile', false);
            document.getElementById('plotChart').disabled = false;
            document.getElementById('chartContainer').style.display = 'flex';
        }
    }

    handlePlotChart() {
        if (!dataStore.currentCsvData) return;
        console.log('Plotting chart with current CSV data');
        chartManager.clearChart();
        const { xColumn, yColumns } = uiManager.getSelectedColumns();
        chartManager.generateChart(xColumn, yColumns, dataStore.currentCsvData);
        uiManager.populateChartName(dataStore.getCurrentSelection().fileName);
        uiManager.adjustFileSelector(dataStore.getCurrentSelectionIndex());
    }

    handleClearChart() {
        chartManager.clearChart();
        ['yAxis2', 'yAxis3', 'yAxis4', 'yAxis5', 'yAxis6'].forEach(id => {
            document.getElementById(id).value = "";
        });
    }

    handleFileSelect(event) {
        const selectedIndex = event.target.value;
        if (selectedIndex === "") return;

        const selectedFile = dataStore.csvFiles[selectedIndex];
        if (selectedFile) {
            // Re-parse the selected file
            console.log('Re-selecting file:', selectedFile.fileName);
            fileHandler.handleCsv(selectedFile)
                .then(() => {
                    const preselectedY = fileHandler.getYAxisPresets(selectedFile.fileName);
                    uiManager.populateColumnSelectors(preselectedY);
                    this.handlePlotChart();
                })
                .catch(error => uiManager.showError(error.message));
        }
    }

    handleAxisUpdate(axisNumber) {
        const { min, max } = uiManager.getAxisLimits(axisNumber);
        chartManager.updateAxis(axisNumber, min, max);
    }

    handleAxisReset(axisNumber) {
        uiManager.clearAxisInputs(axisNumber);
        chartManager.resetAxis(axisNumber);
    }

    selectFileBrowser() {
        return new Promise((resolve) => {
            const input = document.createElement("input");
            input.type = "file";
            input.multiple = true;
            input.accept = ".zip,.csv,.txt";
            input.click();

            input.onchange = async (e) => {
                const file = e.target.files[0];
                if (!file) return resolve({ success: false, error: "No file selected" });

                const arrayBuffer = await file.arrayBuffer();
                resolve({ success: true, data: arrayBuffer, fileName: file.name });
            };
            
            input.oncancel = () => resolve({ success: false, error: "File selection cancelled" });
        });
    }
}

new App();
