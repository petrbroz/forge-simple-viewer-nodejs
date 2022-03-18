// Viewer extension providing a datagrid UI via a 3rd party library (http://tabulator.info)
class DataGridExtension extends Autodesk.Viewing.Extension {
    constructor(viewer, options) {
        super(viewer, options);
        this._dataGridButton = null;
        this._dataGridPanel = null;
    }

    async load() {
        const loadCSS = (href) => new Promise(function (resolve, reject) {
            const el = document.createElement('link');
            el.rel = 'stylesheet';
            el.href = href;
            el.onload = resolve;
            el.onerror = reject;
            document.head.appendChild(el);
        });

        await Promise.all([
            Autodesk.Viewing.Private.theResourceLoader.loadScript('https://cdn.jsdelivr.net/npm/moment@2.29.1/moment.min.js', 'moment'), // kinda hacky...
            Autodesk.Viewing.Private.theResourceLoader.loadScript('https://unpkg.com/tabulator-tables@4.9.3/dist/js/tabulator.min.js', 'Tabulator'), // kinda hacky...
            loadCSS('https://unpkg.com/tabulator-tables@4.9.3/dist/css/tabulator.min.css') // kinda hacky...
        ]);
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

    _createUI() {
        let group = this.viewer.toolbar.getControl('dashboard-toolbar-group');
        if (!group) {
            group = new Autodesk.Viewing.UI.ControlGroup('dashboard-toolbar-group');
            this.viewer.toolbar.addControl(group);
        }

        this._dataGridButton = new Autodesk.Viewing.UI.Button('datagrid-button');
        this._dataGridButton.onClick = () => {
            if (!this._dataGridPanel) {
                this._dataGridPanel = new DataGridPanel(this.viewer, 'datagrid', 'Data Grid', { x: 10, y: 10 });
                if (this.viewer.model) {
                    this._dataGridPanel.setModel(this.viewer.model);
                }
            }
            this._dataGridPanel.setVisible(!this._dataGridPanel.isVisible());
            const { ACTIVE, INACTIVE } = Autodesk.Viewing.UI.Button.State;
            this._dataGridButton.setState(this._dataGridPanel.isVisible() ? ACTIVE : INACTIVE);
        };
        this._dataGridButton.setToolTip('Show Data Grid');
        group.addControl(this._dataGridButton);
    }

    _removeUI() {
        if (this._dataGridPanel) {
            this._dataGridPanel.setVisible(false);
            this._dataGridPanel.uninitialize();
            this._dataGridPanel = null;
        }
        if (this._dataGridButton) {
            this.viewer.toolbar.getControl('dashboard-toolbar-group').removeControl(this._dataGridButton);
            this._dataGridButton = null;
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
            groupBy: 'material',
            columns: [
                { title: 'ID', field: 'dbid' },
                { title: 'Name', field: 'name', width: 150 },
                { title: 'Volume', field: 'volume', hozAlign: 'left', formatter: 'progress' },
                { title: 'Material', field: 'material' }
            ],
            rowClick: (e, row) => {
                const { dbid } = row.getData();
                this.viewer.isolate([dbid]);
                this.viewer.fitToView([dbid]);
            }
        });
    }

    async setModel(model) {
        this.updateTable(model);
    }

    async updateTable(model) {
        const getProps = (model, dbids, props) => new Promise(function (resolve, reject) {
            model.getBulkProperties(dbids, { propFilter: props }, resolve, reject);
        });
        const summaryExt = this.viewer.getExtension('SummaryExtension');
        const dbids = await summaryExt.findLeafNodes(model);
        const results = await getProps(model, dbids, ['Name', 'Volume', 'Structural Material', 'name']);
        this.table.replaceData(results.map(result => {
            return {
                dbid: result.dbId,
                name: result.name,
                volume: result.properties.find(item => item.displayName === 'Volume')?.displayValue,
                material: result.properties.find(item => item.displayName === 'Structural Material')?.displayValue
            };
        }));
    }
}

Autodesk.Viewing.theExtensionManager.registerExtension('DataGridExtension', DataGridExtension);
