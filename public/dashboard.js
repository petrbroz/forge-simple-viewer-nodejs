/// import * as Autodesk from "@types/forge-viewer";
/// import * as Chart from "@types/chart.js";

/**
 * Sets up the dashboard interface.
 * @param {Autodesk.Viewing.GuiViewer3D} viewer 
 */
export async function initializeDashboard(viewer) {
    const barChart = createBarChart(document.getElementById('bar-chart'));
    const pieChart = createPieChart(document.getElementById('pie-chart'));
    const propertySelect = document.getElementById('summary-property');
    viewer.addEventListener(Autodesk.Viewing.OBJECT_TREE_CREATED_EVENT, async function () {
        const summaryExt = await viewer.loadExtension('SummaryExtension');
        const props = await summaryExt.findAllProperties(viewer.model);
        propertySelect.innerHTML = props.map(prop => `<option value="${prop}">${prop}</option>`).join('\n');
        updateSummary(viewer, viewer.model, propertySelect.value, barChart, pieChart);
    });
    propertySelect.addEventListener('change', function () {
        updateSummary(viewer, viewer.model, propertySelect.value, barChart, pieChart);
    });
}

async function updateSummary(viewer, model, propName, barChart, pieChart) {
    const summaryExt = await viewer.loadExtension('SummaryExtension');
    try {
        updateChart(barChart, new Map(), '', [], viewer);
        updateChart(pieChart, new Map(), '', [], viewer);
        viewer.clearThemingColors(model);
        const histogram = await summaryExt.computeHistogram(model, propName);
        const colors = generateRandomColors(histogram.size, 0.2);
        updateChart(barChart, histogram, propName, colors, viewer);
        updateChart(pieChart, histogram, propName, colors, viewer);
        updateThemingColors(model, histogram, colors);
    } catch (err) {
        console.log(err);
    }
}

function generateRandomColors(count, alpha) {
    let colors = [];
    for (let i = 0; i < count; i++) {
        colors.push([Math.random(), Math.random(), Math.random(), alpha]);
    }
    return colors;
}

function createBarChart(canvas) {
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

function createPieChart(canvas) {
    return new Chart(canvas.getContext('2d'), {
        type: 'doughnut',
        data: {
            labels: [],
            datasets: [{ data: [], backgroundColor: [], borderColor: [], borderWidth: 1 }]
        },
        options: {
            legend: { display: true }
        }
    });
}

function updateChart(chart, histogram, label, colors, viewer) {
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
            viewer.isolate(dbids);
            viewer.fitToView(dbids);
        }
    };
}

function updateThemingColors(model, histogram, colors) {
    const propValues = Array.from(histogram.keys());
    for (let i = 0, len = propValues.length; i < len; i++) {
        const color = new THREE.Vector4().fromArray(colors[i]);
        color.a = 0.75;
        const dbids = histogram.get(propValues[i]);
        for (const dbid of dbids) {
            model.setThemingColor(dbid, color, true);
        }
    }
}
