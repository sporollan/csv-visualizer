class DataStore {
    constructor() {
        this.csvFiles = [];
        this.selectionIndex = null;
        this.currentCsvData = null;
        this.chartInstance = null;
    }

    addCsvFile(file) {
        if (!this.csvFiles.some(f => f.fileName === file.fileName)) {
            this.csvFiles.push(file);
            return true;
        }
        return false;
    }

    getCurrentSelection() {
        return this.csvFiles[this.selectionIndex] || null;
    }

    getCurrentSelectionIndex() {
        return this.selectionIndex;
    }

    setCurrentSelectionIndex(index) {
        this.selectionIndex = index;
    }

    setCurrentCsvData(data) {
        this.currentCsvData = data;
    }

    setChartInstance(chart) {
        this.chartInstance = chart;
    }

    clearAll() {
        this.csvFiles = [];
        this.currentCsvData = null;
        if (this.chartInstance) {
            this.chartInstance.destroy();
            this.chartInstance = null;
        }
    }
}

export default new DataStore();