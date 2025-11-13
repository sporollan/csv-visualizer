import { Chart } from 'chart.js/auto';
import zoomPlugin from 'chartjs-plugin-zoom';
import 'chartjs-adapter-date-fns';
import { COLORS } from '../utils/constants.js';
import dataStore from './dataStore.js';

Chart.register(zoomPlugin);


class ChartManager {
    generateChart(xColumn, yColumns, csvData) {
        if (!xColumn || yColumns.length === 0) return;

        const labels = this.prepareLabels(csvData, xColumn);
        const datasets = this.createDatasets(yColumns, csvData, labels);
        const scales = this.createScales(xColumn, yColumns);

        if (dataStore.chartInstance) {
            dataStore.chartInstance.destroy();
        }

        const ctx = document.getElementById('myChart').getContext('2d');
        dataStore.chartInstance = new Chart(ctx, this.getChartConfig(datasets, scales, xColumn));
        
        this.showChartContainer();
    }

    prepareLabels(csvData, xColumn) {
        if (xColumn.toLowerCase().includes("time")) {
            return csvData.data.map(row => new Date(row[xColumn]));
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
                plugins: {
                    legend: { position: 'top' },
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
        if (!dataStore.chartInstance) return;

        const scale = dataStore.chartInstance.options.scales[`y${axisNumber}`];
        scale.min = isNaN(minValue) ? undefined : minValue;
        scale.max = isNaN(maxValue) ? undefined : maxValue;
        dataStore.chartInstance.update();
    }

    resetAxis(axisNumber) {
        if (!dataStore.chartInstance) return;

        const scale = dataStore.chartInstance.options.scales[`y${axisNumber}`];
        scale.min = undefined;
        scale.max = undefined;
        dataStore.chartInstance.update();
    }

    resetZoom() {
        if (dataStore.chartInstance) {
            dataStore.chartInstance.resetZoom();
        }
    }

    clearChart() {
        if (dataStore.chartInstance) {
            dataStore.chartInstance.destroy();
            dataStore.chartInstance = null;
        }
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

export default new ChartManager();