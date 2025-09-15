import JSZip, { file } from "jszip";

console.log("Renderer loaded");

const isElectron = !!window.electronAPI;

if (isElectron) {
  window.electronAPI.send("ping", "hello from renderer");
  window.electronAPI.receive("pong", (data) => {
    console.log("Got reply:", data);
  });
} else {
  console.log("Running in browser mode (no Electron IPC)");
}

let csvData = null;
let chartInstance = null;

const colors = [
    { border: '#ff0037', background: '#ff0037' },
    { border: '#1dc942ff', background: '#1dc942ff' },
    { border: '#a73addff', background: '#a73addff' },
    { border: '#4f0272', background: '#4f0272' },
    { border: '#ff7f0e', background: '#ff7f0e' }
];

async function updateFileList() {
    const loadedFilesDiv = document.getElementById('loaded-files');
    console.log('Updating loaded files display:', csvFiles.map(f => f.fileName));
    loadedFilesDiv.innerHTML = csvFiles.map(f => `
        <div class="file-info">
            <strong>📄 ${f.fileName}</strong>
        </div>`).join('');
    }
function parseChart1(result) {
    console.log('Parsing Chart 1 CSV:', result);

    const lines = result.data.split(/\r?\n/);

    const sampleLine = lines.find(l => l.trim().length > 0);
    const delimiter = (sampleLine && sampleLine.includes("\t")) ? "\t" : ",";

    const headerIndex = lines.findIndex(
        l => l.startsWith('"Time"') ||
             l.startsWith("Time,") ||
             l.startsWith("AcqTime")
    );
    if (headerIndex === -1) {
        showError("Could not find 'Time' header in file");
        throw new Error("Could not find 'Time' header in file");
    }
    let dataLines = lines.slice(headerIndex);

    dataLines = dataLines.filter(l => {
        if (l.startsWith('"Time"') || l.startsWith("Time,") || l.startsWith("AcqTime")) return true;

        if (/,(Event|Stage|Treatment)/i.test(l)) return false;

        return l.split(delimiter).length > 5;
    });

    const cleanCSV = dataLines.join("\n");

    csvData = Papa.parse(cleanCSV, {
        header: true,
        dynamicTyping: true,
        skipEmptyLines: true,
        delimiter: delimiter
    });

    const preselectedY = [];
    if (/FH/i.test(result.fileName)) {
        preselectedY.push(
            ["Treating Pressure", "TR_PRESS"], 
            ["SLUR_RATE", "Slurry Rate"], 
            ["Slurry Proppant Conc", "SLURRY_CONC"], 
            ["BH Proppant Conc"], 
            ["Backside Pressure", "Casing Pressure"]
        );
    } else if (/PD/i.test(result.fileName)) {
        preselectedY.push(
            ["Treating Pressure", "TR_PRESS"], 
            ["SLUR_RATE", "Slurry Rate"], 
            ["W1 Line Speed"], 
            ["W1 Depth"], 
            ["W1 Surface Line Tension"]
        );
    } else {
        preselectedY.push(
            ["Treating Pressure", "TR_PRESS"],
            ["SLUR_RATE", "Slurry Rate"]
        );
    }

    populateColumnSelectors(preselectedY);

    document.getElementById("chartInfo").innerHTML = `
    <div class="file-info">
        <strong>📄 ${result.fileName}</strong><br>
    </div>`;

    const sel = document.getElementById('fileSelector');
    sel.value = csvFiles.findIndex(f => f.fileName === result.fileName);

    generateChart();
}


const csvFiles = [];


async function handleCsv(result, zipName = null) {
    clearChart();
    console.log('Handling CSV:', result.fileName);
    try {
        console.log('Currently loaded files:');
        console.log(result.fileName);
        console.log(csvFiles.map(f => f.fileName));
        if (csvFiles.some(f => f.fileName === result.fileName)) {
            console.warn('File already loaded:', result.fileName);
            return;
        }
        if (zipName && (!/FH/i.test(result.fileName) && !/PD/i.test(result.fileName))) {
            result.fileName = zipName;
        } else {
            console.log('Not renaming file from ZIP:', result.fileName);
            console.log('ZIP name was:', zipName);
        }
        console.log('After ZIP rename, file name is:', result.fileName);

        parseChart1(result);
        csvFiles.push(result);
        updateFileList();
        populateFileSelector(result.fileName);

    } catch (error) {
        console.error('Error reading CSV file:', error);
        showError('Error reading CSV file: ' + error.message);
    }
}

async function handleZip(result, zipName = null) {
    console.log('Handling ZIP:', result.fileName);
    try {
        const jszip = new JSZip();
        const zip = await jszip.loadAsync(result.data);
        const zipCsv = Object.keys(zip.files).filter(name => name.toLowerCase().endsWith('.csv'));
        for (const fileName of zipCsv) {
            handleCsv({ fileName, data: await zip.files[fileName].async('string') }, result.fileName);
        }

        const zipTxt = Object.keys(zip.files).filter(name => name.toLowerCase().endsWith('.txt'));
    for (const fileName of zipTxt) {
        const content = await zip.files[fileName].async('string');
        const lines = content.split(/\r?\n/);
        const normalized = [lines[0], ...lines.slice(3)].join("\n");
        console.log(normalized);
        handleCsv({
            fileName,
            data: normalized
        });
    }

        const zipNested = Object.keys(zip.files).filter(name => name.toLowerCase().endsWith('.zip'));
        console.log('Found nested ZIP files in ZIP:', zipNested);
        for (const fileName of zipNested) {
            handleZip({ fileName, data: await zip.files[fileName].async('arraybuffer') }, result.fileName);
        }

    } catch (error) {
        console.error('Error reading ZIP file:', error);
        showError('Error reading ZIP file: ' + error.message);
    }
}

function arrayBufferToString(buffer) {
    return new TextDecoder("utf-8").decode(buffer);
}

async function handleLoadedFile(result) {
    console.log('Handling Loaded:', result.fileName);
    try {
        const fileExtension = result.fileName.split('.').pop().toLowerCase();
        if (fileExtension === 'csv') {
            await handleCsv({
                fileName: result.fileName,
                data: arrayBufferToString(result.data)
            });
        } else if (fileExtension === 'zip') {
            await handleZip(result);
        } else if (fileExtension === 'txt') {
            const lines = arrayBufferToString(result.data).split(/\r?\n/);
            const normalized = [lines[0], ...lines.slice(3)].join("\n");
            console.log(normalized);
            await handleCsv({
                fileName: result.fileName.replace(/\.txt$/i, ".csv"),
                data: normalized
            });
        } else {
            console.warn('Unsupported file type:', fileExtension);
        }
    } catch (error) {
        console.error('Error reading files:', error);
        showError('Error reading files: ' + error.message);
    }
}

document.addEventListener("DOMContentLoaded", () => {
    const loadButton = document.getElementById("loadFile");
    const plotButton = document.getElementById("plotChart");

    loadButton.addEventListener("click", async () => {
        loadButton.innerHTML = '<span class="loading"></span>Loading...';
        loadButton.disabled = true;

        try {
            let result;

            if (isElectron) {
                // Electron: use IPC bridge
                result = await window.electronAPI.selectCsvFile();
            } else {
                // Web fallback: use <input type="file">
                const input = document.createElement("input");
                input.type = "file";
                input.multiple = true;
                input.accept = ".zip,.csv,.txt";
                input.click();

                result = await new Promise((resolve) => {
                input.onchange = async (e) => {
                    const file = e.target.files[0];
                    if (!file) return resolve({ success: false, error: "No file selected" });

                    const arrayBuffer = await file.arrayBuffer();
                    resolve({ success: true, data: arrayBuffer, fileName: file.name });
                };
                input.oncancel = () => resolve({ success: false, error: "File selection cancelled" });
                });
            }
            if (result.success) {
                await handleLoadedFile(result);
            }
        } catch (err) {
        showError(err.message);
        } finally {
            loadButton.innerHTML = "Add More Files";
            loadButton.disabled = false;
            plotButton.disabled = false;
            document.getElementById('chartContainer').style.display = 'flex';
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

    const clearChartButton = document.getElementById('clearChart');

    clearChartButton.addEventListener('click', () => clearChart());

});

function clearChart() {
        ['yAxis2', 'yAxis3', 'yAxis4', 'yAxis5'].forEach(id => {
            document.getElementById(id).value = "";
        });
        generateChart();
        document.getElementById('chart-container').style.display = 'none';
    }


function populateFileSelector(fileName = null) {
    const sel = document.getElementById('fileSelector');
    sel.innerHTML = '<option value="">...</option>';
    csvFiles.forEach((file, index) => {
        const opt = document.createElement('option');
        opt.value = index;
        opt.textContent = file.fileName;
        sel.appendChild(opt);
        if (file.fileName === fileName) {
            sel.value = index;
        }
    });
}

function populateColumnSelectors(preselectedY) {
    const selectors = ['xAxis', 'yAxis1', 'yAxis2', 'yAxis3', 'yAxis4', 'yAxis5'];
    selectors.forEach(id => {
        const sel = document.getElementById(id);
        sel.innerHTML = '<option value="">Select column...</option>';
        
        csvData.meta.fields.forEach(field => {
            const cleanField = field.trim();
            const opt = document.createElement('option');
            opt.value = cleanField;
            opt.textContent = cleanField;

            if (id === "xAxis" && (cleanField.toLowerCase() === "time" || cleanField.toLowerCase() === "acqtime")) {
                opt.selected = true;
            }

            if (id.startsWith("yAxis")) {
                const yIndex = parseInt(id.replace("yAxis", ""), 10) - 1; // yAxis1 -> index 0
                const aliases = preselectedY[yIndex];
                if (aliases && aliases.some(a => a.toLowerCase() === cleanField.toLowerCase())) {
                    opt.selected = true;
                }
            }

            sel.appendChild(opt);
        });
    });
}


function updateAxis(axisNumber) {
  const minValue = parseFloat(document.getElementById(`y${axisNumber}Min`).value);
  const maxValue = parseFloat(document.getElementById(`y${axisNumber}Max`).value);

  const scale = chartInstance.options.scales[`y${axisNumber}`];
  scale.min = isNaN(minValue) ? undefined : minValue;
  scale.max = isNaN(maxValue) ? undefined : maxValue;

  chartInstance.update();
}

function resetAxis(axisNumber) {
  document.getElementById(`y${axisNumber}Min`).value = "";
  document.getElementById(`y${axisNumber}Max`).value = "";

  const scale = chartInstance.options.scales[`y${axisNumber}`];
  scale.min = undefined;
  scale.max = undefined;

  chartInstance.update();
}

document.getElementById('fileSelector').addEventListener('change', (e) => {
    console.log('File selector changed:', e.target.value);
    clearChart();
    parseChart1(csvFiles[e.target.value]);
});

const axes = [1, 2, 3, 4, 5];

axes.forEach(axisNumber => {
    document.getElementById(`yAxis${axisNumber}`).addEventListener("change", () => generateChart());
    document.getElementById(`y${axisNumber}Min`).addEventListener("input", () => updateAxis(axisNumber));
    document.getElementById(`y${axisNumber}Max`).addEventListener("input", () => updateAxis(axisNumber));
    document.getElementById(`resetAxis${axisNumber}`).addEventListener("click", () => resetAxis(axisNumber));
});

function generateChart() {
    console.log('Generating chart with data:', csvData);
    const xColumn = document.getElementById('xAxis').value;
    const yColumns = [
        document.getElementById('yAxis1').value,
        document.getElementById('yAxis2').value,
        document.getElementById('yAxis3').value,
        document.getElementById('yAxis4').value,
        document.getElementById('yAxis5').value
    ].filter(Boolean);

    if (!xColumn || yColumns.length === 0) {
        return
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
                        enabled: false,      // allow panning
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
    document.getElementById('clearChart').disabled = false;
}




function showError(msg) {
    document.getElementById('loaded-files').innerHTML =
        `<div class="error">${msg}</div>`;
}
