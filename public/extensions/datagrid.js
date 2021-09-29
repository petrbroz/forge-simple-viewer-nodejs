// Viewer extension providing a datagrid UI via a 3rd party library (http://tabulator.info)
export class DataGridExtension extends Autodesk.Viewing.Extension {
    constructor(viewer, options) {
        super(viewer, options);
        this._group = null;
        this._dataGridPanel = null;
    }

    async load() {
        await this.viewer.loadExtension('SummaryExtension');
        await this._loadDependencies();
        this.viewer.addEventListener(Autodesk.Viewing.OBJECT_TREE_CREATED_EVENT, () => {
            if (this._dataGridPanel) {
                this._dataGridPanel.setModel(this.viewer.model);
            }
        });
        console.log('DataGridExtension loaded.');
        return true;
    }

    async unload() {
        this._removeUI();
        console.log('DataGridExtension unloaded.');
        return true;
    }

    onToolbarCreated() {
        this._createUI();
    }

    async _loadDependencies() {
        const loadDependency = (src) => new Promise(function (resolve, reject) {
            if (src.endsWith('.js')) {
                const el = document.createElement('script');
                el.type = 'text/javascript';
                el.src = src;
                el.onload = resolve;
                document.head.appendChild(el);
            } else if (src.endsWith('.css')) {
                const el = document.createElement('link');
                el.rel = 'stylesheet';
                el.href = src;
                el.onload = resolve;
                document.head.appendChild(el);
            } else {
                reject('Unsupported file extension.');
            }
        });
        if (!window.Tabulator) {
            await loadDependency('https://unpkg.com/tabulator-tables/dist/css/tabulator.min.css');
            await loadDependency('https://unpkg.com/tabulator-tables/dist/js/tabulator.min.js');
        }
        if (!window.moment) {
            await loadDependency('https://cdn.jsdelivr.net/npm/moment@2.29.1/moment.min.js');
        }
    }

    _createUI() {
        this._group = this.viewer.toolbar.getControl('datagrid-group');
        if (!this._group) {
            this._group = new Autodesk.Viewing.UI.ControlGroup('datagrid-group');
            this.viewer.toolbar.addControl(this._group);
        }

        const dataGridButton = new Autodesk.Viewing.UI.Button('datagrid-button');
        dataGridButton.onClick = () => {
            if (!this._dataGridPanel) {
                this._dataGridPanel = new DataGridPanel(this.viewer, 'datagrid', 'Data Grid', { x: 10, y: 10 });
                if (this.viewer.model) {
                    this._dataGridPanel.setModel(this.viewer.model);
                }
            }
            this._dataGridPanel.setVisible(!this._dataGridPanel.isVisible());
            const { ACTIVE, INACTIVE } = Autodesk.Viewing.UI.Button.State;
            dataGridButton.setState(this._dataGridPanel.isVisible() ? ACTIVE : INACTIVE);
        };
        dataGridButton.setToolTip('Show Data Grid');
        this._group.addControl(dataGridButton);
    }

    _removeUI() {
        if (this._dataGridPanel) {
            this._dataGridPanel.setVisible(false);
            this._dataGridPanel.uninitialize();
            this._dataGridPanel = null;
        }
        if (this._group) {
            this.viewer.toolbar.removeControl(this._group);
            this._group = null;
        }
    }
}

class DataGridPanel extends Autodesk.Viewing.UI.DockingPanel {
    constructor(viewer, id, title, options) {
        super(viewer.container, id, title, options);
        this.viewer = viewer;
        this.container.style.left = (options.x || 0) + 'px';
        this.container.style.top = (options.y || 0) + 'px';
        this.container.style.width = (options.width || 500) + 'px';
        this.container.style.height = (options.height || 400) + 'px';
        this.container.style.resize = 'none';
    }

    initialize() {
        this.title = this.createTitleBar(this.titleLabel || this.container.id);
        this.initializeMoveHandlers(this.title);
        this.container.appendChild(this.title);
        this.content = document.createElement('div');
        this.content.style.height = '350px';
        this.content.style.backgroundColor = 'white';
        this.content.innerHTML = `<div class="datagrid-container" style="position: relative; height: 350px;"></div>`;
        this.container.appendChild(this.content);
        this.table = new Tabulator('.datagrid-container', {
            height: '100%',
            layout: 'fitColumns',
            columns: [
                { title: 'Name', field: 'name', width: 150 },
                { title: 'Age', field: 'age', hozAlign: 'left', formatter: 'progress' },
                { title: 'Favourite Color', field: 'col' },
                { title: 'Date Of Birth', field: 'dob', sorter: 'date', hozAlign: 'center' }
            ],
            rowClick: function (e, row) { //trigger an alert message when the row is clicked
                alert('Row ' + row.getData().id + ' Clicked!!!!');
            }
        });
    }

    async setModel(model) {
        this.updateTable(model);
    }

    async updateTable(model) {
        const firstNames = ['Oli', 'Mary', 'Christine', 'Brendon', 'Margret'];
        const lastNames = ['Bob', 'May', 'Lobowski', 'Philips', 'Marmajuke'];
        const colors = ['red', 'green', 'blue', 'yellow'];
        let data = [];
        for (let i = 0; i < 15; i++) {
            data.push({
                id: i + 1,
                name: firstNames[Math.floor(Math.random() * firstNames.length)] + ' ' + lastNames[Math.floor(Math.random() * lastNames.length)],
                age: Math.round(Math.random() * 80).toString(),
                col: colors[Math.floor(Math.random() * colors.length)],
                dob: `${Math.ceil(Math.random() * 31)}/${Math.ceil(Math.random() * 12)}/${1900 + Math.floor(Math.random() * 100)}`
            });
        }
        this.table.replaceData(data);
    }
}
