import { describe, test, expect, beforeEach } from '@jest/globals';
import DataStore from '../../src/modules/dataStore.js';
import FileHandler from '../../src/modules/fileHandler.js';
import UIManager from '../../src/modules/uiManager.js';

describe('Data Flow Integration', () => {
  let dataStore;
  let fileHandler;
  let uiManager;

  beforeEach(() => {
    dataStore = new DataStore();
    fileHandler = new FileHandler(dataStore);
    uiManager = new UIManager(dataStore);
  });

  test('file processing updates dataStore and UI state', async () => {
    const testCSV = `Time,Voltage,Current
00:00,12.5,1.2
00:01,12.6,1.3`;

    const mockFile = {
      fileName: 'test.csv',
      data: testCSV
    };

    await fileHandler.handleCsv(mockFile);
    
    expect(dataStore.csvFiles).toHaveLength(1);
    expect(dataStore.currentCsvData).toBeDefined();
    expect(dataStore.currentCsvData.meta.fields).toContain('Time');
  });
});