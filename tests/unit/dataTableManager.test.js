import DataTableManager from '../../src/modules/dataTableManager.js';

const CSV_DATA = {
    meta: { fields: ['Time', 'Temperature', 'Pressure'] },
    data: [
        { Time: '01:00', Temperature: 20.5, Pressure: 101.3 },
        { Time: '02:00', Temperature: 21.0, Pressure: 101.1 },
        { Time: '03:00', Temperature: null, Pressure: 101.0 }
    ]
};

function setupDom() {
    document.body.innerHTML = `
        <div id="data-table-container" style="display: none;">
            <div class="data-table-header">
                <h3>Selected Data Points</h3>
                <button id="clearTable" disabled>Clear Table</button>
            </div>
            <div class="data-table-scroll">
                <table id="dataTable">
                    <thead></thead>
                    <tbody></tbody>
                </table>
            </div>
        </div>`;
}

function createManager() {
    return new DataTableManager({ currentCsvData: CSV_DATA });
}

describe('DataTableManager', () => {
    let manager;

    beforeEach(() => {
        setupDom();
        manager = createManager();
    });

    test('toggleRow adds a row and shows the table', () => {
        const added = manager.toggleRow(1);

        expect(added).toBe(true);
        expect(manager.getSelectedRowIndices()).toEqual([1]);
        expect(document.getElementById('data-table-container').style.display).toBe('block');
        expect(document.getElementById('clearTable').disabled).toBe(false);
    });

    test('toggleRow toggles the same row off (no duplicates)', () => {
        manager.toggleRow(0);
        manager.toggleRow(2);
        expect(manager.getSelectedRowIndices()).toEqual([0, 2]);

        const added = manager.toggleRow(0);

        expect(added).toBe(false);
        expect(manager.getSelectedRowIndices()).toEqual([2]);
    });

    test('rendered rows contain all CSV fields of the selected row', () => {
        manager.toggleRow(0);

        const headerCells = [...document.querySelectorAll('#dataTable thead th')].map(c => c.textContent);
        expect(headerCells).toEqual(['Time', 'Temperature', 'Pressure', '']);

        const bodyCells = [...document.querySelectorAll('#dataTable tbody tr:first-child td')].map(c => c.textContent);
        expect(bodyCells).toEqual(['01:00', '20.5', '101.3', '×']);
    });

    test('null values render as empty cells', () => {
        manager.toggleRow(2);

        const bodyCells = [...document.querySelectorAll('#dataTable tbody tr:first-child td')].map(c => c.textContent);
        expect(bodyCells).toEqual(['03:00', '', '101', '×']);
    });

    test('per-row remove button removes only that row', () => {
        manager.toggleRow(0);
        manager.toggleRow(1);
        expect(document.querySelectorAll('#dataTable tbody tr').length).toBe(2);

        document.querySelector('#dataTable tbody tr:first-child .row-remove-btn').click();

        expect(manager.getSelectedRowIndices()).toEqual([1]);
        expect(document.querySelectorAll('#dataTable tbody tr').length).toBe(1);
    });

    test('clearTable empties selection and hides the table', () => {
        manager.toggleRow(0);
        manager.toggleRow(1);

        manager.clearTable();

        expect(manager.isEmpty()).toBe(true);
        expect(document.getElementById('data-table-container').style.display).toBe('none');
        expect(document.getElementById('clearTable').disabled).toBe(true);
        expect(document.querySelectorAll('#dataTable tbody tr').length).toBe(0);
    });

    test('columns provider limits displayed columns to marked X and Ys', () => {
        manager.setColumnsProvider(() => ({ xColumn: 'Time', yColumns: ['Pressure'] }));
        manager.toggleRow(0);

        const headerCells = [...document.querySelectorAll('#dataTable thead th')].map(c => c.textContent);
        expect(headerCells).toEqual(['Time', 'Pressure', '']);

        const bodyCells = [...document.querySelectorAll('#dataTable tbody tr:first-child td')].map(c => c.textContent);
        expect(bodyCells).toEqual(['01:00', '101.3', '×']);
    });

    test('changing marked Ys re-renders rows with new columns while keeping selections', () => {
        let columns = { xColumn: 'Time', yColumns: ['Temperature'] };
        manager.setColumnsProvider(() => columns);
        manager.toggleRow(0);

        columns = { xColumn: 'Time', yColumns: ['Temperature', 'Pressure'] };
        manager.renderTable();

        expect(manager.getSelectedRowIndices()).toEqual([0]);
        const headerCells = [...document.querySelectorAll('#dataTable thead th')].map(c => c.textContent);
        expect(headerCells).toEqual(['Time', 'Temperature', 'Pressure', '']);
        const bodyCells = [...document.querySelectorAll('#dataTable tbody tr:first-child td')].map(c => c.textContent);
        expect(bodyCells).toEqual(['01:00', '20.5', '101.3', '×']);
    });

    test('duplicate column selections are displayed once', () => {
        manager.setColumnsProvider(() => ({ xColumn: 'Time', yColumns: ['Temperature', 'Temperature'] }));
        manager.toggleRow(1);

        const headerCells = [...document.querySelectorAll('#dataTable thead th')].map(c => c.textContent);
        expect(headerCells).toEqual(['Time', 'Temperature', '']);
    });

    test('switching to a different file clears selections', () => {
        const store = { currentCsvData: CSV_DATA };
        const mgr = new DataTableManager(store);
        mgr.toggleRow(0);
        mgr.toggleRow(2);
        expect(mgr.getSelectedRowIndices()).toEqual([0, 2]);

        store.currentCsvData = { meta: { fields: ['Time', 'Other'] }, data: [{ Time: 'x', Other: 1 }] };
        mgr.renderTable();

        expect(mgr.getSelectedRowIndices()).toEqual([]);
        expect(document.getElementById('data-table-container').style.display).toBe('none');
    });

    test('cell values are rendered as text, not HTML', () => {
        const store = {
            currentCsvData: {
                meta: { fields: ['Time', 'Note'] },
                data: [{ Time: '01:00', Note: '<img src=x onerror=alert(1)>' }]
            }
        };
        const mgr = new DataTableManager(store);
        mgr.toggleRow(0);

        const cell = document.querySelector('#dataTable tbody tr:first-child td:nth-child(2)');
        expect(cell.innerHTML).toBe('&lt;img src=x onerror=alert(1)&gt;');
        expect(cell.textContent).toBe('<img src=x onerror=alert(1)>');
    });
});
