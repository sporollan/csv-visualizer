import FileHandler from './modules/fileHandler.js';
import ChartManager from './modules/chartManager.js';
import UiManager from './modules/uiManager.js';
import dataStore from './modules/dataStore.js';


class App {
    constructor(dependencies = {}) {
        this.dom = dependencies.dom || this.initializeDOM();
        this.dataStore = dependencies.dataStore || dataStore;

        this.fileHandler = dependencies.fileHandler || new FileHandler(this.dataStore);
        this.chartManager = dependencies.chartManager || new ChartManager(this.dataStore);
        this.uiManager = dependencies.uiManager || new UiManager(this.dataStore);

        this.initEventListeners();
    }

    initializeDOM() {
        return {
            loadFile: document.getElementById("loadFile"),
            plotChart: document.getElementById("plotChart"),
            resetZoom: document.getElementById("resetZoom"),
            clearChart: document.getElementById("clearChart"),
            fileSelector: document.getElementById("fileSelector"),
            chartContainer: document.getElementById("chartContainer"),
            axisControls: this.createAxisControls()
        }
    }

    createAxisControls() {
        const controls = {};
        [1, 2, 3, 4, 5, 6].forEach(axisNumber => {
            controls[`yAxis${axisNumber}`] = document.getElementById(`yAxis${axisNumber}`);
            controls[`y${axisNumber}Min`] = document.getElementById(`y${axisNumber}Min`);
            controls[`y${axisNumber}Max`] = document.getElementById(`y${axisNumber}Max`);
            controls[`resetAxis${axisNumber}`] = document.getElementById(`resetAxis${axisNumber}`);
        });
        return controls;   
    }

    initEventListeners() {
        this.dom.loadFile.addEventListener("click", () => this.handleLoadFile());
        this.dom.plotChart.addEventListener("click", () => this.handlePlotChart());
        this.dom.resetZoom.addEventListener("click", () => this.chartManager.resetZoom());
        this.dom.clearChart.addEventListener("click", () => this.handleClearChart());
        this.dom.fileSelector.addEventListener('change', (e) => this.handleFileSelect(e));
        
        [1, 2, 3, 4, 5, 6].forEach(axisNumber => {
            this.dom.axisControls[`yAxis${axisNumber}`].addEventListener("change", () => this.handlePlotChart());
            this.dom.axisControls[`y${axisNumber}Min`].addEventListener("input", () => this.handleAxisUpdate(axisNumber));
            this.dom.axisControls[`y${axisNumber}Max`].addEventListener("input", () => this.handleAxisUpdate(axisNumber));
            this.dom.axisControls[`resetAxis${axisNumber}`].addEventListener("click", () => this.handleAxisReset(axisNumber));
        });
    }

    async handleLoadFile() {
        this.uiManager.setButtonLoading('loadFile', true);

        try {
            const result = await this.selectFileBrowser();
            if (result.success) {
                await this.fileHandler.handleLoadedFile(result);
                const latestFileName = this.dataStore.csvFiles[this.dataStore.csvFiles.length - 1].fileName;
                this.uiManager.updateFileList();
                this.uiManager.populateFileSelector(latestFileName);
                const preselectedY = this.fileHandler.getYAxisPresets(latestFileName);
                this.uiManager.populateColumnSelectors(preselectedY);
                this.handlePlotChart();
                this.uiManager.populateChartName(latestFileName);
                this.uiManager.adjustFileSelector(this.dataStore.csvFiles.length - 1);

            }
        } catch (err) {
            this.uiManager.showError(err.message);
        } finally {
            this.uiManager.setButtonLoading('loadFile', false);
            this.dom.plotChart.disabled = false;
            this.dom.chartContainer.style.display = 'flex';
        }
    }

    handlePlotChart() {
        if (!this.dataStore.currentCsvData) return;
        this.chartManager.clearChart();
        const { xColumn, yColumns } = this.uiManager.getSelectedColumns();
        this.chartManager.generateChart(xColumn, yColumns, this.dataStore.currentCsvData);
    }

    handleClearChart() {
        this.chartManager.clearChart();
        [2, 3, 4, 5, 6].forEach(axisNumber => {
            this.dom.axisControls[`yAxis${axisNumber}`].value = "";
        });
    }

    handleFileSelect(event) {
        const selectedIndex = event.target.value;
        if (selectedIndex === "") return;

        const selectedFile = this.dataStore.csvFiles[selectedIndex];
        if (selectedFile) {
            this.fileHandler.handleCsv(selectedFile)
                .then(() => {
                    const preselectedY = this.fileHandler.getYAxisPresets(selectedFile.fileName);
                    this.uiManager.populateColumnSelectors(preselectedY);
                    this.handlePlotChart();
                    this.uiManager.populateChartName(selectedFile.fileName);
                    this.uiManager.adjustFileSelector(selectedIndex);
                })
                .catch(error => this.uiManager.showError(error.message));
        }
    }

    handleAxisUpdate(axisNumber) {
        const { min, max } = this.uiManager.getAxisLimits(axisNumber);
        this.chartManager.updateAxis(axisNumber, min, max);
    }

    handleAxisReset(axisNumber) {
        this.uiManager.clearAxisInputs(axisNumber);
        this.chartManager.resetAxis(axisNumber);
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
