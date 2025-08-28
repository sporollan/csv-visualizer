// renderer.js
const { ipcRenderer } = require('electron');
let csvData = null;
let chartInstance = null;

const colors = [
    { border: '#3b82f6', background: '#3b82f640' },
    { border: '#ef4444', background: '#ef444440' },
    { border: '#10b981', background: '#10b98140' },
    { border: '#f59e0b', background: '#f59e0b40' }
];

document.addEventListener("DOMContentLoaded", () => {
    const loadButton = document.getElementById('loadFile');
    const plotButton = document.getElementById('plotChart');

    // Load CSV button
    loadButton.addEventListener('click', async () => {
        loadButton.innerHTML = '<span class="loading"></span>Loading...';
        loadButton.disabled = true;

        try {
            const result = await ipcRenderer.invoke('select-csv-file');
            if (result.success) {
                // Clean raw CSV -> skip metadata until we reach the "Time" header
                const lines = result.data.split(/\r?\n/);
                const headerIndex = lines.findIndex(l => l.startsWith('"Time"') || l.startsWith('Time,'));
                if (headerIndex === -1) throw new Error("Could not find 'Time' header in CSV");

                // keep header + data only
                const cleanCSV = lines.slice(headerIndex).join("\n");

                csvData = Papa.parse(cleanCSV, {
                    header: true,
                    dynamicTyping: true,
                    skipEmptyLines: true
                });

                populateColumnSelectors();
                document.getElementById('fileInfo').innerHTML = `
                    <div class="file-info">
                        <strong>📄 ${result.fileName}</strong><br>
                        Rows: ${csvData.data.length}<br>
                        Columns: ${csvData.meta.fields.length}
                    </div>`;
                plotButton.disabled = false;
            } else {
                showError(result.error);
            }
        } catch (err) {
            showError(err.message);
        } finally {
            loadButton.innerHTML = 'Load CSV File';
            loadButton.disabled = false;
        }
    });


    // Plot Chart
    plotButton.addEventListener('click', () => {
        generateChart();
    });

    const resetZoomButton = document.getElementById('resetZoom');

    resetZoomButton.addEventListener('click', () => {
        if (chartInstance) {
            chartInstance.resetZoom();
        }
    });

});

function populateColumnSelectors() {
    const selectors = ['xAxis', 'yAxis1', 'yAxis2', 'yAxis3', 'yAxis4'];
    selectors.forEach(id => {
        const sel = document.getElementById(id);
        sel.innerHTML = '<option value="">Select column...</option>';
        csvData.meta.fields.forEach(field => {
            const opt = document.createElement('option');
            opt.value = field.trim();
            opt.textContent = field.trim();
            sel.appendChild(opt);
        });
    });
}

function generateChart() {
    const xColumn = document.getElementById('xAxis').value;
    const yColumns = [
        document.getElementById('yAxis1').value,
        document.getElementById('yAxis2').value,
        document.getElementById('yAxis3').value,
        document.getElementById('yAxis4').value
    ].filter(Boolean);

    if (!xColumn || yColumns.length === 0) {
        return showError('Please select at least X-axis and one Y-axis column');
    }

    // Convert time column into Date objects
    let labels;
    if (xColumn.toLowerCase().includes("time")) {
        labels = csvData.data.map(row => {
            // Try parsing like "28-Aug-2025 01:39:16"
            return new Date(row[xColumn]);
        });
    } else {
        labels = csvData.data.map(row => row[xColumn]);
    }

    const datasets = yColumns.map((col, i) => {
        const axisId = `y${i + 1}`;
        return {
            label: col,
            data: csvData.data.map((row, idx) => ({
                x: labels[idx],
                y: parseFloat(row[col]) || 0
            })),
            borderColor: colors[i % colors.length].border,
            backgroundColor: colors[i % colors.length].background,
            yAxisID: axisId,
            fill: false,
            tension: 0.1,
            pointRadius: 0,
        };
    });


    if (chartInstance) chartInstance.destroy();
    const ctx = document.getElementById('myChart').getContext('2d');

    const scales = {
        x: {
            type: xColumn.toLowerCase().includes("time") ? 'time' : 'category',
            time: xColumn.toLowerCase().includes("time") ? {
                parser: "dd-MMM-yyyy HH:mm:ss", // e.g. 28-Aug-2025 01:39:16
                tooltipFormat: "PPpp",
                displayFormats: { second: "HH:mm:ss", minute: "HH:mm" }
            } : undefined,
            title: { display: true, text: xColumn }
        }
    };

    yColumns.forEach((col, i) => {
        const axisId = `y${i + 1}`;
        const color = colors[i % colors.length].border;
        scales[axisId] = {
            type: 'linear',
            display: true,
            position: i < 2 ? 'left' : 'right',
            grid: { drawOnChartArea: i % 2 === 0 },
            title: { display: true, text: col, color },
            ticks: { color }
        };
    });

    chartInstance = new Chart(ctx, {
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
                        enabled: true,      // <-- allow panning
                        mode: 'xy',         // pan both axes
                        modifierKey: null,  // allow grab without pressing a key
                        threshold: 5,         // minimal drag distance in pixels
                        mouseButtons: [1] // 0=left, 1=middle, 2=right

                    },
                    zoom: { drag: { enabled: true }, wheel: { enabled: true }, pinch: { enabled: true }, mode: 'x' }
                }
            },
            scales: scales
        }
    });

    document.getElementById('chart-container').style.display = 'block';
    document.getElementById('resetZoom').disabled = false;
}




function showError(msg) {
    document.getElementById('fileInfo').innerHTML =
        `<div class="error">❌ ${msg}</div>`;
}
