import Papa from 'papaparse';
import JSZip from 'jszip';
import dataStore from "./dataStore.js";
import { Y_AXIS_PRESETS } from "../utils/constants.js";

class FileHandler {
    arrayBufferToString(buffer) {
        return new TextDecoder("utf-8").decode(buffer);
    }

    async handleLoadedFile(result) {
        console.log('Handling Loaded:', result.fileName);
        try {
            const fileExtension = result.fileName.split('.').pop().toLowerCase();
            
            if (fileExtension === 'csv') {
                await this.handleCsv({
                    fileName: result.fileName,
                    data: this.arrayBufferToString(result.data)
                });
            } else if (fileExtension === 'zip') {
                await this.handleZip(result);
            } else if (fileExtension === 'txt') {
                const lines = this.arrayBufferToString(result.data).split(/\r?\n/);
                const normalized = [lines[0], ...lines.slice(3)].join("\n");
                await this.handleCsv({
                    fileName: result.fileName.replace(/\.txt$/i, ".csv"),
                    data: normalized
                });
            } else {
                console.warn('Unsupported file type:', fileExtension);
            }
        } catch (error) {
            console.error('Error reading files:', error);
            throw error;
        }
    }

    async handleZip(result) {
        console.log('Handling ZIP:', result.fileName);
        try {
            const jszip = new JSZip();
            const zip = await jszip.loadAsync(result.data);
            
            // Handle CSV files in ZIP
            const zipCsv = Object.keys(zip.files).filter(name => name.toLowerCase().endsWith('.csv'));
            for (const fileName of zipCsv) {
                await this.handleCsv({ 
                    fileName, 
                    data: await zip.files[fileName].async('string') 
                }, result.fileName);
            }

            // Handle TXT files in ZIP
            const zipTxt = Object.keys(zip.files).filter(name => name.toLowerCase().endsWith('.txt'));
            for (const fileName of zipTxt) {
                const content = await zip.files[fileName].async('string');
                const lines = content.split(/\r?\n/);
                const normalized = [lines[0], ...lines.slice(3)].join("\n");
                await this.handleCsv({
                    fileName,
                    data: normalized
                });
            }

            // Handle nested ZIP files
            const zipNested = Object.keys(zip.files).filter(name => name.toLowerCase().endsWith('.zip'));
            for (const fileName of zipNested) {
                await this.handleZip({ 
                    fileName, 
                    data: await zip.files[fileName].async('arraybuffer') 
                }, result.fileName);
            }
        } catch (error) {
            console.error('Error reading ZIP file:', error);
            throw error;
        }
    }

    async handleCsv(result, zipName = null) {
        console.log('Handling CSV:', result.fileName);
        /*
        if (dataStore.csvFiles.some(f => f.fileName === result.fileName)) {
            console.warn('File already loaded:', result.fileName);
            return;
        }
        */
        // Apply ZIP name if appropriate
        if (zipName && (!/FH/i.test(result.fileName) && !/PD/i.test(result.fileName))) {
            result.fileName = zipName;
        }

        const parsedData = this.parseCsv(result);
        dataStore.setCurrentCsvData(parsedData);
        dataStore.addCsvFile(result);
        
        return parsedData;
    }

    parseCsv(result) {
        console.log('Parsing CSV:', result.fileName);

        const lines = result.data.split(/\r?\n/);
        const sampleLine = lines.find(l => l.trim().length > 0);
        const delimiter = (sampleLine && sampleLine.includes("\t")) ? "\t" : ",";

        const headerIndex = lines.findIndex(
            l => l.startsWith('"Time"') ||
                 l.startsWith("Time,") ||
                 l.startsWith("AcqTime")
        );
        
        if (headerIndex === -1) {
            throw new Error("Could not find 'Time' header in file");
        }

        let dataLines = lines.slice(headerIndex);
        dataLines = dataLines.filter(l => {
            if (l.startsWith('"Time"') || l.startsWith("Time,") || l.startsWith("AcqTime")) return true;
            if (/,(Event|Stage|Treatment)/i.test(l)) return false;
            return l.split(delimiter).length > 5;
        });

        const cleanCSV = dataLines.join("\n");
        return Papa.parse(cleanCSV, {
            header: true,
            dynamicTyping: true,
            skipEmptyLines: true,
            delimiter: delimiter
        });
    }

    getYAxisPresets(fileName) {
        console.log('Getting Y-Axis presets for file:', fileName);
        if (/FH/i.test(fileName)) {
            return Y_AXIS_PRESETS.FH;
        } else if (/PD/i.test(fileName)) {
            return Y_AXIS_PRESETS.PD;
        } else {
            return Y_AXIS_PRESETS.DEFAULT;
        }
    }
}

export default new FileHandler();