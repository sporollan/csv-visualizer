class DataTableManager {
    constructor(dataStore) {
        this.dataStore = dataStore;
        this.selectedRowIndices = [];
        this.columnsProvider = null;
        this.selectionData = null;
    }

    setColumnsProvider(provider) {
        this.columnsProvider = provider;
    }

    toggleRow(rowIndex) {
        this.syncSelectionData();
        const position = this.selectedRowIndices.indexOf(rowIndex);
        if (position === -1) {
            this.selectedRowIndices.push(rowIndex);
        } else {
            this.selectedRowIndices.splice(position, 1);
        }
        this.renderTable();
        return position === -1;
    }

    removeRow(rowIndex) {
        this.syncSelectionData();
        const position = this.selectedRowIndices.indexOf(rowIndex);
        if (position !== -1) {
            this.selectedRowIndices.splice(position, 1);
            this.renderTable();
        }
    }

    syncSelectionData() {
        const csvData = this.dataStore.currentCsvData;
        if (csvData !== this.selectionData) {
            this.selectedRowIndices = [];
            this.selectionData = csvData;
        }
    }

    clearTable() {
        this.selectedRowIndices = [];
        this.renderTable();
    }

    getSelectedRowIndices() {
        return [...this.selectedRowIndices];
    }

    isEmpty() {
        return this.selectedRowIndices.length === 0;
    }

    getDisplayFields(csvData) {
        if (typeof this.columnsProvider === 'function') {
            const { xColumn, yColumns } = this.columnsProvider() || {};
            const columns = [xColumn, ...(yColumns || [])].filter(Boolean);
            if (columns.length > 0) return [...new Set(columns)];
        }
        return csvData.meta.fields || [];
    }

    renderTable() {
        const container = document.getElementById('data-table-container');
        const table = document.getElementById('dataTable');
        const clearButton = document.getElementById('clearTable');
        if (!container || !table || !clearButton) return;

        this.syncSelectionData();
        const csvData = this.dataStore.currentCsvData;
        if (!csvData || this.selectedRowIndices.length === 0) {
            container.style.display = 'none';
            table.querySelector('thead').innerHTML = '';
            table.querySelector('tbody').innerHTML = '';
            clearButton.disabled = true;
            return;
        }

        const fields = this.getDisplayFields(csvData);
        this.renderHeader(table, fields);
        this.renderBody(table, fields, csvData);

        container.style.display = 'block';
        clearButton.disabled = false;
    }

    renderHeader(table, fields) {
        const thead = table.querySelector('thead');
        thead.innerHTML = '';
        const tr = document.createElement('tr');
        fields.forEach(field => {
            const th = document.createElement('th');
            th.textContent = field;
            tr.appendChild(th);
        });
        const removeTh = document.createElement('th');
        removeTh.setAttribute('aria-label', 'Remove row');
        tr.appendChild(removeTh);
        thead.appendChild(tr);
    }

    renderBody(table, fields, csvData) {
        const tbody = table.querySelector('tbody');
        tbody.innerHTML = '';
        this.selectedRowIndices.forEach(rowIndex => {
            const row = csvData.data[rowIndex];
            if (!row) return;
            const tr = document.createElement('tr');
            fields.forEach(field => {
                const td = document.createElement('td');
                td.textContent = row[field] === null || row[field] === undefined ? '' : String(row[field]);
                tr.appendChild(td);
            });
            const removeTd = document.createElement('td');
            removeTd.appendChild(this.createRemoveButton(rowIndex));
            tr.appendChild(removeTd);
            tbody.appendChild(tr);
        });
    }

    createRemoveButton(rowIndex) {
        const button = document.createElement('button');
        button.className = 'row-remove-btn';
        button.textContent = '×';
        button.setAttribute('aria-label', 'Remove row');
        button.addEventListener('click', () => this.removeRow(rowIndex));
        return button;
    }
}

export default DataTableManager;
