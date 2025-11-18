import { describe, test, expect, beforeEach, jest } from '@jest/globals';
import App from '../../src/main.js';

describe('App', () => {
  let app;
  let mockDependencies;

  beforeEach(() => {
    mockDependencies = {
      dom: {
        loadFile: { addEventListener: jest.fn() },
        plotChart: { addEventListener: jest.fn(), disabled: false },
        resetZoom: { addEventListener: jest.fn() },
        clearChart: { addEventListener: jest.fn() },
        fileSelector: { addEventListener: jest.fn() },
        chartContainer: { style: { display: 'none' } },
        axisControls: {
          yAxis1: { addEventListener: jest.fn() },
          y1Min: { addEventListener: jest.fn() },
          y1Max: { addEventListener: jest.fn() },
          resetAxis1: { addEventListener: jest.fn() },
        }
      },
      dataStore: {
        csvFiles: [],
        currentCsvData: null,
        chartInstance: null,
        addCsvFile: jest.fn(),
        setCurrentCsvData: jest.fn()
      },
      fileHandler: {
        handleLoadedFile: jest.fn().mockResolvedValue(),
        getYAxisPresets: jest.fn().mockReturnValue([])
      },
      chartManager: {
        clearChart: jest.fn(),
        generateChart: jest.fn(),
        resetZoom: jest.fn(),
        updateAxis: jest.fn(),
        resetAxis: jest.fn()
      },
      uiManager: {
        setButtonLoading: jest.fn(),
        updateFileList: jest.fn(),
        populateFileSelector: jest.fn(),
        populateColumnSelectors: jest.fn(),
        populateChartName: jest.fn(),
        adjustFileSelector: jest.fn(),
        showError: jest.fn(),
        getSelectedColumns: jest.fn().mockReturnValue({ xColumn: 'Time', yColumns: ['Value1'] }),
        getAxisLimits: jest.fn().mockReturnValue({ min: 0, max: 100 }),
        clearAxisInputs: jest.fn()
      }
    };
  });

  test('should initialize with dependencies', () => {
    app = new App(mockDependencies);
    
    expect(app.dom).toBe(mockDependencies.dom);
    expect(app.dataStore).toBe(mockDependencies.dataStore);
    expect(app.fileHandler).toBe(mockDependencies.fileHandler);
  });

  test('should set up event listeners', () => {
    app = new App(mockDependencies);
    
    expect(mockDependencies.dom.loadFile.addEventListener).toHaveBeenCalledWith(
      'click',
      expect.any(Function)
    );
    expect(mockDependencies.dom.plotChart.addEventListener).toHaveBeenCalledWith(
      'click', 
      expect.any(Function)
    );
  });

  test('handleLoadFile should integrate all modules', async () => {
    app = new App(mockDependencies);
    
    const mockFileResult = {
      success: true,
      fileName: 'test.csv',
      data: new ArrayBuffer(8)
    };
    
    app.selectFileBrowser = jest.fn().mockResolvedValue(mockFileResult);
    
    await app.handleLoadFile();
    
    expect(mockDependencies.uiManager.setButtonLoading).toHaveBeenCalledWith('loadFile', true);
    expect(mockDependencies.fileHandler.handleLoadedFile).toHaveBeenCalledWith(mockFileResult);
    expect(mockDependencies.uiManager.setButtonLoading).toHaveBeenCalledWith('loadFile', false);
    expect(mockDependencies.dom.plotChart.disabled).toBe(false);
    expect(mockDependencies.dom.chartContainer.style.display).toBe('flex');
  });

  test('handlePlotChart should generate chart with selected columns', () => {
    app = new App(mockDependencies);
    mockDependencies.dataStore.currentCsvData = { meta: { fields: [] } };
    
    app.handlePlotChart();
    
    expect(mockDependencies.chartManager.clearChart).toHaveBeenCalled();
    expect(mockDependencies.chartManager.generateChart).toHaveBeenCalledWith(
      'Time',
      ['Value1'],
      mockDependencies.dataStore.currentCsvData
    );
  });
});