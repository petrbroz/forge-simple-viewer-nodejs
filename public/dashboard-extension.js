/// import * as Chart from "@types/chart.js";

export class DashboardExtension extends Autodesk.Viewing.Extension {
    constructor(viewer, options) {
        super(viewer, options);
        this._summaryExt = null;
        this._group = null;
        this._barChartButton = null;
        this._barChartPanel = null;
        this._barChart = null;
        this._pieChartButton = null;
        this._pieChartPanel = null;
        this._pieChart = null;
    }

    async load() {
        this._summaryExt = await this.viewer.loadExtension('SummaryExtension');
        this.viewer.addEventListener(Autodesk.Viewing.OBJECT_TREE_CREATED_EVENT, async (ev) => {
            this._updateSummary(ev.model);
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
                this._barChartPanel = new DashboardChartPanel(this.viewer.container, 'dashboard-barchart', 'Summary (Bar Chart)', 10, 10);
                this._barChart = this._createBarChart(this._barChartPanel.content);
                if (this.viewer.model) {
                    this._updateSummary(this.viewer.model);
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
                this._pieChartPanel = new DashboardChartPanel(this.viewer.container, 'dashboard-piechart', 'Summary (Pie Chart)', 10, 420);
                this._pieChart = this._createPieChart(this._pieChartPanel.content);
                if (this.viewer.model) {
                    this._updateSummary(this.viewer.model);
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

    _createBarChart(canvas) {
        return new Chart(canvas.getContext('2d'), {
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

    _createPieChart(canvas) {
        return new Chart(canvas.getContext('2d'), {
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

    _generateRandomColors(count, alpha) {
        let colors = [];
        for (let i = 0; i < count; i++) {
            colors.push([Math.random(), Math.random(), Math.random(), alpha]);
        }
        return colors;
    }

    async _updateSummary(model) {
        const propName = 'Material';
        try {
            const histogram = await this._summaryExt.computeHistogram(model, propName);
            const colors = this._generateRandomColors(histogram.size, 0.2);
            if (this._barChart) {
                this._updateChart(this._barChart, histogram, propName, colors);
            }
            if (this._pieChart) {
                this._updateChart(this._pieChart, histogram, propName, colors);
            }
        } catch (err) {
            console.error(err);
        }
    }

    _updateChart(chart, histogram, label, colors) {
        const propertyValues = Array.from(histogram.keys());
        chart.data.labels = propertyValues;
        const dataset = chart.data.datasets[0];
        dataset.label = label;
        dataset.data = propertyValues.map(val => histogram.get(val).length);
        const rgbaColors = colors.map(c => `rgba(${Math.round(c[0] * 255)}, ${Math.round(c[1] * 255)}, ${Math.round(c[2] * 255)}, ${c[3]})`);
        dataset.backgroundColor = dataset.borderColor = rgbaColors;
        chart.update();
        chart.config.options.onClick = (ev, items) => {
            if (items.length === 1) {
                const index = items[0].index;
                const dbids = histogram.get(propertyValues[index]);
                this.viewer.isolate(dbids);
                this.viewer.fitToView(dbids);
            }
        };
    }
}

class DashboardChartPanel extends Autodesk.Viewing.UI.DockingPanel {
    constructor(container, id, title, x, y, options) {
        super(container, id, title, options);
        this.container.style.width = '500px';
        this.container.style.height = '400px';
        this.container.style.resize = 'none';
        this.container.style.left = x + 'px';
        this.container.style.top = y + 'px';
    }

    initialize() {
        this.title = this.createTitleBar(this.titleLabel || this.container.id);
        this.container.appendChild(this.title);
        this.content = document.createElement('canvas');
        this.content.style.backgroundColor = 'white';
        this.content.width = 500;
        this.content.height = 350;
        this.container.appendChild(this.content);
        this.initializeMoveHandlers(this.container);
    }
}
