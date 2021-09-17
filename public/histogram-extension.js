/// import * as Chart from "@types/chart.js";

Chart.defaults.plugins.legend.display = false;

export class HistogramExtension extends Autodesk.Viewing.Extension {
    constructor(viewer, options) {
        super(viewer, options);
        this._group = null;
        this._barChartPanel = null;
        this._pieChartPanel = null;
    }

    async load() {
        await this.viewer.loadExtension('SummaryExtension');
        this.viewer.addEventListener(Autodesk.Viewing.OBJECT_TREE_CREATED_EVENT, () => {
            if (this._barChartPanel) {
                this._barChartPanel.setModel(this.viewer.model);
            }
            if (this._pieChartPanel) {
                this._pieChartPanel.setModel(this.viewer.model);
            }
        });
        console.log('HistogramExtension loaded.');
        return true;
    }

    async unload() {
        this._removeUI();
        console.log('HistogramExtension unloaded.');
        return true;
    }

    onToolbarCreated() {
        this._createUI();
    }

    _createUI() {
        this._group = this.viewer.toolbar.getControl('histogram-group');
        if (!this._group) {
            this._group = new Autodesk.Viewing.UI.ControlGroup('histogram-group');
            this.viewer.toolbar.addControl(this._group);
        }

        const barChartButton = new Autodesk.Viewing.UI.Button('histogram-barchart-button');
        barChartButton.onClick = () => {
            if (!this._barChartPanel) {
                this._barChartPanel = new BarChartPanel(this.viewer, 'histogram-barchart', 'Property Histogram', { x: 10, y: 10 });
                if (this.viewer.model) {
                    this._barChartPanel.setModel(this.viewer.model);
                }
            }
            this._barChartPanel.setVisible(!this._barChartPanel.isVisible());
            const { ACTIVE, INACTIVE } = Autodesk.Viewing.UI.Button.State;
            barChartButton.setState(this._barChartPanel.isVisible() ? ACTIVE : INACTIVE);
        };
        barChartButton.setToolTip('Show Property Histogram (Bar Chart)');
        this._group.addControl(barChartButton);

        const pieChartButton = new Autodesk.Viewing.UI.Button('histogram-piechart-button');
        pieChartButton.onClick = () => {
            if (!this._pieChartPanel) {
                this._pieChartPanel = new PieChartPanel(this.viewer, 'histogram-piechart', 'Property Histogram', { x: 10, y: 420 });
                if (this.viewer.model) {
                    this._pieChartPanel.setModel(this.viewer.model);
                }
            }
            this._pieChartPanel.setVisible(!this._pieChartPanel.isVisible());
            pieChartButton.setState(this._pieChartPanel.isVisible() ? Autodesk.Viewing.UI.Button.State.ACTIVE : Autodesk.Viewing.UI.Button.State.INACTIVE);
        };
        pieChartButton.setToolTip('Show Property Histogram (Pie Chart)');
        this._group.addControl(pieChartButton);
    }

    _removeUI() {
        if (this._barChartPanel) {
            this._barChartPanel.setVisible(false);
            this._barChartPanel = null;
        }
        if (this._pieChartPanel) {
            this._pieChartPanel.setVisible(false);
            this._pieChartPanel = null;
        }
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
        this.content.innerHTML = `
            <div class="props-container" style="position: relative; height: 25px; padding: 0.5em;">
                <select class="props"></select>
            </div>
            <div class="chart-container" style="position: relative; height: 325px; padding: 0.5em;">
                <canvas class="chart"></canvas>
            </div>
        `;
        this.select = this.content.querySelector('select.props');
        this.canvas = this.content.querySelector('canvas.chart');
        this.container.appendChild(this.content);

        this.chart = this.createChart();
    }

    createChart() {
        throw new Error('Method not implemented');
    }

    async setModel(model) {
        const summaryExt = this.viewer.getExtension('SummaryExtension');
        const properties = await summaryExt.findAllProperties(model);
        this.select.innerHTML = properties.map(prop => `<option value="${prop}">${prop}</option>`).join('\n');
        this.select.onchange = () => this.updateChart(model, this.select.value);
        this.updateChart(model, this.select.value);
    }

    async updateChart(model, propName) {
        const summaryExt = this.viewer.getExtension('SummaryExtension');
        const histogram = await summaryExt.computePropertyHistogram(model, propName);
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
    createChart() {
        return new Chart(this.canvas.getContext('2d'), {
            type: 'bar',
            data: {
                labels: [],
                datasets: [{ data: [], backgroundColor: [], borderColor: [], borderWidth: 1 }],
                options: {
                    scales: {
                        yAxes: [{ ticks: { beginAtZero: true } }]
                    },
                    // legend: { display: false },
                    maintainAspectRatio: false
                }
            }
        });
    }
}

class PieChartPanel extends ChartPanel {
    createChart() {
        return new Chart(this.canvas.getContext('2d'), {
            type: 'doughnut',
            data: {
                labels: [],
                datasets: [{ data: [], backgroundColor: [], borderColor: [], borderWidth: 1 }]
            },
            options: {
                // legend: { display: false },
                maintainAspectRatio: false
            }
        });
    }
}
