/// import * as Chart from "@types/chart.js";

/*
TODO:
- see if Chart.js can be imported as an ES6 module
*/

export class DashboardExtension extends Autodesk.Viewing.Extension {
    constructor(viewer, options) {
        super(viewer, options);
        this._group = null;
        this._barChartButton = null;
        this._barChartPanel = null;
        this._pieChartButton = null;
        this._pieChartPanel = null;
    }

    async load() {
        await this.viewer.loadExtension('SummaryExtension');
        this.viewer.addEventListener(Autodesk.Viewing.OBJECT_TREE_CREATED_EVENT, async (ev) => {
            if (this._barChartPanel) {
                this._barChartPanel.setModel(this.viewer.model);
            }
            if (this._pieChartPanel) {
                this._pieChartPanel.setModel(this.viewer.model);
            }
        });
        console.log('DashboardExtension loaded.');
        return true;
    }

    async unload() {
        if (this._barChartPanel) {
            this._barChartPanel.setVisible(false);
            this._barChartPanel = null;
        }
        if (this._pieChartPanel) {
            this._pieChartPanel.setVisible(false);
            this._pieChartPanel = null;
        }
        console.log('DashboardExtension unloaded.');
        return true;
    }

    onToolbarCreated() {
        this._createUI();
    }

    _createUI() {
        this._group = this.viewer.toolbar.getControl('dashboard-group');
        if (!this._group) {
            this._group = new Autodesk.Viewing.UI.ControlGroup('dashboard-group');
            this.viewer.toolbar.addControl(this._group);
        }

        this._barChartButton = new Autodesk.Viewing.UI.Button('dashboard-barchart-button');
        this._barChartButton.onClick = (ev) => {
            if (!this._barChartPanel) {
                this._barChartPanel = new BarChartPanel(this.viewer, 'dashboard-barchart', 'Summary (Bar Chart)', { x: 10, y: 10 });
                if (this.viewer.model) {
                    this._barChartPanel.setModel(this.viewer.model);
                }
            }
            this._barChartPanel.setVisible(!this._barChartPanel.isVisible());
            this._barChartButton.setState(this._barChartPanel.isVisible() ? Autodesk.Viewing.UI.Button.State.ACTIVE : Autodesk.Viewing.UI.Button.State.INACTIVE);
        };
        this._barChartButton.setToolTip('Show Summary (Bar Chart)');
        this._group.addControl(this._barChartButton);

        this._pieChartButton = new Autodesk.Viewing.UI.Button('dashboard-piechart-button');
        this._pieChartButton.onClick = (ev) => {
            if (!this._pieChartPanel) {
                this._pieChartPanel = new PieChartPanel(this.viewer, 'dashboard-piechart', 'Summary (Pie Chart)', { x: 10, y: 420 });
                if (this.viewer.model) {
                    this._pieChartPanel.setModel(this.viewer.model);
                }
            }
            this._pieChartPanel.setVisible(!this._pieChartPanel.isVisible());
            this._pieChartButton.setState(this._pieChartPanel.isVisible() ? Autodesk.Viewing.UI.Button.State.ACTIVE : Autodesk.Viewing.UI.Button.State.INACTIVE);
        };
        this._pieChartButton.setToolTip('Show Summary (Pie Chart)');
        this._group.addControl(this._pieChartButton);
    }

    _removeUI() {
        if (this._group) {
            this.viewer.toolbar.removeControl(this._group);
            this._group = null;
        }
    }
}

class ChartPanel extends Autodesk.Viewing.UI.DockingPanel {
    constructor(viewer, id, title, options) {
        super(viewer.container, id, title);
        this.viewer = viewer;
        this.container.style.left = (options.x || 0) + 'px';
        this.container.style.top = (options.y || 0) + 'px';
        this.container.style.width = (options.width || 500) + 'px';
        this.container.style.height = (options.width || 400) + 'px';
        this.container.style.resize = 'none';
    }

    initialize() {
        this.title = this.createTitleBar(this.titleLabel || this.container.id);
        this.initializeMoveHandlers(this.title);
        this.container.appendChild(this.title);
        this.content = document.createElement('div');
        this.content.style.padding = '0.5em';
        this.content.style.backgroundColor = 'white';
        this.content.innerHTML = `
            <select class="props-dropdown"></select>
            <canvas width="500" height="350" />
        `;
        this.select = this.content.children[0];
        this.select.onchange = this.updateChart.bind(this);
        this.canvas = this.content.children[1];
        this.container.appendChild(this.content);
    }

    async setModel(model) {
        this.model = model;
        const summaryExt = this.viewer.getExtension('SummaryExtension');
        try {
            const properties = await summaryExt.findAllProperties(model);
            this.select.innerHTML = properties.map(prop => `<option value="${prop}">${prop}</option>`).join('\n');
            await this.updateChart();
        } catch (err) {
            console.error(err);
        }
    }

    async updateChart() {
        const propName = this.select.value;
        const summaryExt = this.viewer.getExtension('SummaryExtension');
        const histogram = await summaryExt.computeHistogram(this.model, propName);
        const propertyValues = Array.from(histogram.keys());
        this.chart.data.labels = propertyValues;
        const dataset = this.chart.data.datasets[0];
        dataset.label = propName;
        dataset.data = propertyValues.map(val => histogram.get(val).length);
        if (dataset.data.length > 0) {
            const hslaStrings = dataset.data.map((val, index) => `hsla(${Math.round(index * (360 / dataset.data.length))}, 100%, 50%, 0.2)`);
            dataset.backgroundColor = dataset.borderColor = hslaStrings;
        }
        this.chart.update();
        this.chart.config.options.onClick = (ev, items) => {
            if (items.length === 1) {
                const index = items[0].index;
                const dbids = histogram.get(propertyValues[index]);
                this.viewer.isolate(dbids);
                this.viewer.fitToView(dbids);
            }
        };
    }
}

class BarChartPanel extends ChartPanel {
    initialize() {
        super.initialize();
        this.chart = new Chart(this.canvas.getContext('2d'), {
            type: 'bar',
            data: {
                labels: [],
                datasets: [{ data: [], backgroundColor: [], borderColor: [], borderWidth: 1 }],
                options: {
                    scales: {
                        yAxes: [{
                            ticks: { beginAtZero: true }
                        }]
                    },
                    legend: { display: false }
                }
            }
        });
    }
}

class PieChartPanel extends ChartPanel {
    initialize() {
        super.initialize();
        this.chart = new Chart(this.canvas.getContext('2d'), {
            type: 'doughnut',
            data: {
                labels: [],
                datasets: [{ data: [], backgroundColor: [], borderColor: [], borderWidth: 1 }]
            },
            options: {
                legend: { display: false }
            }
        });
    }
}
