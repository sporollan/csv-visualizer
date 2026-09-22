import { Chart } from 'chart.js/auto';
import zoomPlugin from 'chartjs-plugin-zoom';
import 'chartjs-adapter-date-fns';
import { COLORS } from '../utils/constants.js';

Chart.register(zoomPlugin);


class ChartManager {
    constructor(dataStore) {
        this.dataStore = dataStore;
        this.pointClickHandler = null;
        this.pointerDownPosition = null;
        this.pointerTrackingAttached = false;
    }

    generateChart(xColumn, yColumns, csvData) {
        if (!xColumn || yColumns.length === 0) return;

        const labels = this.prepareLabels(csvData, xColumn);
        const datasets = this.createDatasets(yColumns, csvData, labels);
        const scales = this.createScales(xColumn, yColumns);

        if (this.dataStore.chartInstance) {
            this.dataStore.chartInstance.destroy();
        }

        this.xColumn = xColumn;
        this.yColumns = yColumns;
        this.csvData = csvData;
        this.labels = labels;
        this.rowIndexByX = this.buildRowIndexMap(labels);
        this.baseDatasetCount = datasets.length;

        const ctx = document.getElementById('myChart').getContext('2d');
        this.dataStore.chartInstance = new Chart(ctx, this.getChartConfig(datasets, scales, xColumn));
        this.attachCanvasPointerTracking();

        this.showChartContainer();
    }

    setPointClickHandler(handler) {
        this.pointClickHandler = handler;
    }

    buildRowIndexMap(labels) {
        const map = new Map();
        labels.forEach((label, idx) => {
            const key = label instanceof Date ? label.getTime() : String(label);
            if (!map.has(key)) map.set(key, idx);
        });
        return map;
    }

    attachCanvasPointerTracking() {
        if (this.pointerTrackingAttached) return;
        const canvas = document.getElementById('myChart');
        if (!canvas) return;
        canvas.addEventListener('pointerdown', (e) => {
            this.pointerDownPosition = { x: e.clientX, y: e.clientY };
        });
        this.pointerTrackingAttached = true;
    }

    isZoomDrag(event) {
        const native = event && event.native;
        if (!native || !this.pointerDownPosition) return false;
        const dx = native.clientX - this.pointerDownPosition.x;
        const dy = native.clientY - this.pointerDownPosition.y;
        return Math.sqrt(dx * dx + dy * dy) > 5;
    }

    handleChartClick(event, elements, chart) {
        if (typeof this.pointClickHandler !== 'function') return;
        if (!elements || elements.length === 0) return;
        if (this.isZoomDrag(event)) return;

        let best = null;
        let bestDistance = Infinity;
        elements.forEach(el => {
            const distance = Math.abs(el.element.y - event.y);
            if (distance < bestDistance) {
                bestDistance = distance;
                best = el;
            }
        });
        if (!best) return;

        const dataset = chart.data.datasets[best.datasetIndex];
        const point = dataset && dataset.data[best.index];
        if (!point) return;

        const key = point.x instanceof Date ? point.x.getTime() : String(point.x);
        const rowIndex = this.rowIndexByX.get(key);
        if (rowIndex === undefined) return;

        this.pointClickHandler(rowIndex);
    }

    setSelectedRowIndices(rowIndices) {
        const chart = this.dataStore.chartInstance;
        if (!chart || !this.baseDatasetCount) return;

        const hadOverlays = chart.data.datasets.length > this.baseDatasetCount;
        chart.data.datasets.length = this.baseDatasetCount;

        if (rowIndices.length > 0 && this.csvData) {
            const overlays = this.yColumns.map((col, j) => {
                const color = COLORS[j % COLORS.length].border;
                return {
                    label: '',
                    data: rowIndices
                        .filter(i => i >= 0 && i < this.csvData.data.length)
                        .map(i => ({ x: this.labels[i], y: parseFloat(this.csvData.data[i][col]) || 0 })),
                    yAxisID: `y${j + 1}`,
                    showLine: false,
                    pointRadius: 4,
                    pointHoverRadius: 5,
                    backgroundColor: color,
                    borderColor: color,
                    fill: false
                };
            });
            chart.data.datasets.push(...overlays);
        }

        if (rowIndices.length > 0 || hadOverlays) {
            chart.update();
        }
    }

    parseDate(value) {
        const direct = new Date(value);
        if (!isNaN(direct.getTime())) return direct;

        const match = String(value).match(/^(\d{2}):(\d{2}):(\d{4}):(\d{2}):(\d{2}):(\d{2})$/);
        if (match) {
            const [, month, day, year, hour, minute, second] = match;
            return new Date(`${year}-${month}-${day}T${hour}:${minute}:${second}`);
        }

        return direct;
    }

    prepareLabels(csvData, xColumn) {
        if (xColumn.toLowerCase().includes("time")) {
            return csvData.data.map(row => this.parseDate(row[xColumn]));
        }
        return csvData.data.map(row => row[xColumn]);
    }

    createDatasets(yColumns, csvData, labels) {
        return yColumns.map((col, i) => {
            const axisId = `y${i + 1}`;
            return {
                label: col,
                data: csvData.data.map((row, idx) => ({
                    x: labels[idx],
                    y: parseFloat(row[col]) || 0
                })),
                borderColor: COLORS[i % COLORS.length].border,
                backgroundColor: COLORS[i % COLORS.length].background,
                yAxisID: axisId,
                fill: false,
                tension: 0.1,
                pointRadius: 0,
            };
        });
    }

    createScales(xColumn, yColumns) {
        const scales = {
            x: {
                type: xColumn.toLowerCase().includes("time") ? 'time' : 'category',
                time: xColumn.toLowerCase().includes("time") ? {
                    parser: "dd-MMM-yyyy HH:mm:ss",
                    tooltipFormat: "PPpp",
                    displayFormats: { second: "HH:mm:ss", minute: "HH:mm" }
                } : undefined,
                title: { display: true, text: xColumn }
            }
        };

        yColumns.forEach((col, i) => {
            const axisId = `y${i + 1}`;
            const color = COLORS[i % COLORS.length].border;
            scales[axisId] = {
                type: 'linear',
                display: true,
                position: i < 2 ? 'left' : 'right',
                grid: { drawOnChartArea: i % 2 === 0 },
                title: { display: true, text: col, color },
                ticks: { color }
            };
        });

        return scales;
    }

    getChartConfig(datasets, scales, xColumn) {
        return {
            type: 'line',
            data: { datasets },
            options: {
                animation: false,
                responsive: true,
                interaction: { mode: 'index', intersect: false },
                onClick: (event, elements, chart) => this.handleChartClick(event, elements, chart),
                plugins: {
                    legend: {
                        position: 'top',
                        labels: { filter: (item) => item.text !== '' }
                    },
                    tooltip: { filter: (item) => item.dataset.label !== '' },
                    decimation: { enabled: true, algorithm: 'min-max', samples: 2000 },
                    zoom: {
                        pan: {
                            enabled: false,
                            mode: 'xy',
                            modifierKey: null,
                            threshold: 5,
                            mouseButtons: [1]
                        },
                        zoom: { 
                            drag: { enabled: true }, 
                            wheel: { enabled: true }, 
                            pinch: { enabled: true }, 
                            mode: 'x' 
                        }
                    }
                },
                scales: scales
            }
        };
    }

    updateAxis(axisNumber, minValue, maxValue) {
        if (!this.dataStore.chartInstance) return;

        const scale = this.dataStore.chartInstance.options.scales[`y${axisNumber}`];
        scale.min = isNaN(minValue) ? undefined : minValue;
        scale.max = isNaN(maxValue) ? undefined : maxValue;
        this.dataStore.chartInstance.update();
    }

    resetAxis(axisNumber) {
        if (!this.dataStore.chartInstance) return;

        const scale = this.dataStore.chartInstance.options.scales[`y${axisNumber}`];
        scale.min = undefined;
        scale.max = undefined;
        this.dataStore.chartInstance.update();
    }

    resetZoom() {
        if (this.dataStore.chartInstance) {
            this.dataStore.chartInstance.resetZoom();
        }
    }

    clearChart() {
        if (this.dataStore.chartInstance) {
            this.dataStore.chartInstance.destroy();
            this.dataStore.chartInstance = null;
        }
        this.baseDatasetCount = 0;
        this.rowIndexByX = null;
        this.hideChartContainer();
    }

    showChartContainer() {
        document.getElementById('chart-container').style.display = 'block';
        document.getElementById('resetZoom').disabled = false;
        document.getElementById('clearChart').disabled = false;
    }

    hideChartContainer() {
        document.getElementById('chart-container').style.display = 'none';
    }
}

export default ChartManager;