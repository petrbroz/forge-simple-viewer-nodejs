/// import * as Autodesk from "@types/forge-viewer";
/// import * as Chart from "@types/chart.js";

import { BaseExtension } from './base.js';

class HistogramExtension extends BaseExtension {
    constructor(viewer, options) {
        super(viewer, options);
        this._barChartButton = null;
        this._pieChartButton = null;
        this._barChartPanel = null;
        this._pieChartPanel = null;
    }

    async load() {
        super.load();
        await this.loadScript('https://cdnjs.cloudflare.com/ajax/libs/Chart.js/3.5.1/chart.min.js', 'Chart');
        Chart.defaults.plugins.legend.display = false;
        console.log('HistogramExtension loaded.');
        return true;
    }

    unload() {
        super.unload();
        for (const button of [this._barChartButton, this._pieChartButton]) {
            this.removeToolbarButton(button);
        }
        this._barChartButton = this._pieChartButton = null;
        for (const panel of [this._barChartPanel, this._pieChartPanel]) {
            panel.setVisible(false);
            panel.uninitialize();
        }
        this._barChartPanel = this._pieChartPanel = null;
        console.log('HistogramExtension unloaded.');
        return true;
    }

    onToolbarCreated() {
        this._barChartPanel = new ChartPanel(this, 'dashboard-barchart-panel', 'Property Histogram', { x: 10, y: 10, chartType: 'bar' });
        this._pieChartPanel = new ChartPanel(this, 'dashboard-piechart-panel', 'Property Histogram', { x: 10, y: 420, chartType: 'doughnut' });
        this._barChartButton = this.createToolbarButton('dashboard-barchart-button', 'https://img.icons8.com/small/32/bar-chart.png', 'Show Property Histogram (Bar Chart)');
        this._barChartButton.onClick = () => {
            this._barChartPanel.setVisible(!this._barChartPanel.isVisible());
            this._barChartButton.setState(this._barChartPanel.isVisible() ? Autodesk.Viewing.UI.Button.State.ACTIVE : Autodesk.Viewing.UI.Button.State.INACTIVE);
            if (this._barChartPanel.isVisible() && this.viewer.model) {
                this._barChartPanel.setModel(this.viewer.model);
            }
        };
        this._pieChartButton = this.createToolbarButton('dashboard-piechart-button', 'https://img.icons8.com/small/32/pie-chart.png', 'Show Property Histogram (Pie Chart)');
        this._pieChartButton.onClick = () => {
            this._pieChartPanel.setVisible(!this._pieChartPanel.isVisible());
            this._pieChartButton.setState(this._pieChartPanel.isVisible() ? Autodesk.Viewing.UI.Button.State.ACTIVE : Autodesk.Viewing.UI.Button.State.INACTIVE);
            if (this._pieChartPanel.isVisible() && this.viewer.model) {
                this._pieChartPanel.setModel(this.viewer.model);
            }
        };
    }

    onModelLoaded(model) {
        super.onModelLoaded(model);
        if (this._barChartPanel && this._barChartPanel.isVisible()) {
            this._barChartPanel.setModel(model);
        }
        if (this._pieChartPanel && this._pieChartPanel.isVisible()) {
            this._pieChartPanel.setModel(model);
        }
    }
}

class ChartPanel extends Autodesk.Viewing.UI.DockingPanel {
    constructor(extension, id, title, options) {
        super(extension.viewer.container, id, title, options);
        this.extension = extension;
        this.container.style.left = (options.x || 0) + 'px';
        this.container.style.top = (options.y || 0) + 'px';
        this.container.style.width = (options.width || 500) + 'px';
        this.container.style.height = (options.height || 400) + 'px';
        this.container.style.resize = 'none';
        this.chartType = options.chartType || 'bar'; // See https://www.chartjs.org/docs/latest for all the supported types of charts
        this.chart = this.createChart();
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
    }

    createChart() {
        return new Chart(this.canvas.getContext('2d'), {
            type: this.chartType,
            data: {
                labels: [],
                datasets: [{ data: [], backgroundColor: [], borderColor: [], borderWidth: 1 }],
            },
            options: { maintainAspectRatio: false }
        });
    }

    async setModel(model) {
        const propertyNames = await this.extension.findPropertyNames(model);
        this.select.innerHTML = propertyNames.map(prop => `<option value="${prop}">${prop}</option>`).join('\n');
        this.select.onchange = () => this.updateChart(model, this.select.value);
        this.updateChart(model, this.select.value);
    }

    async updateChart(model, propName) {
        const histogram = await this.extension.findPropertyValueOccurrences(model, propName);
        const propertyValues = Array.from(histogram.keys());
        this.chart.data.labels = propertyValues;
        const dataset = this.chart.data.datasets[0];
        dataset.label = propName;
        dataset.data = propertyValues.map(val => histogram.get(val).length);
        if (dataset.data.length > 0) {
            const hslaColors = dataset.data.map((val, index) => `hsla(${Math.round(index * (360 / dataset.data.length))}, 100%, 50%, 0.2)`);
            dataset.backgroundColor = dataset.borderColor = hslaColors;
        }
        this.chart.update();
        this.chart.config.options.onClick = (ev, items) => {
            if (items.length === 1) {
                const index = items[0].index;
                const dbids = histogram.get(propertyValues[index]);
                this.extension.viewer.isolate(dbids);
                this.extension.viewer.fitToView(dbids);
            }
        };
    }
}

Autodesk.Viewing.theExtensionManager.registerExtension('HistogramExtension', HistogramExtension);
