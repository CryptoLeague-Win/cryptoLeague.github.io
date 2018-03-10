import { Component, OnInit } from '@angular/core';

declare var $: any;
declare var DraggablePiechart: any;

@Component({
	selector: 'app-portfolio',
	templateUrl: './portfolio.component.html',
	styleUrls: ['./portfolio.component.scss']
})
export class PortfolioComponent implements OnInit {

	constructor() { }

	ngOnInit() {
		this.setupPieChart();
	}

	setupPieChart() {
		var proportions = [
		{ proportion: 50, format: { color: "#2665da", label: 'Cats'}},
		{ proportion: 50, format: { color: "#6dd020", label: 'Dogs'}} ];

		var setup = {
			canvas: document.getElementById('piechart'),
			radius: 0.9,
			collapsing: true,
			proportions: proportions,
	        drawNode: this.hideNode,
	        onchange: this.onPieChartChange,
	        dragDisabled: true
	    };

	    var newPie = new DraggablePiechart(setup);

	}

	hideNode (context, piechart, x, y, centerX, centerY, hover) {
		context.save();
		context.translate(centerX, centerY);
		context.fillStyle = '#fefefe';
		context.beginPath();
		context.arc(x, y, 0, 0, Math.PI * 2, true);
		context.fill();
        //context.stroke();
        context.restore();
    }

	drawNode (context, piechart, x, y, centerX, centerY, hover) {
		context.save();
		context.translate(centerX, centerY);
		context.fillStyle = '#fefefe';

		var rad = hover ? 7 : 5;
		context.beginPath();
		context.arc(x, y, rad, 0, Math.PI * 2, true);
		context.fill();
        //context.stroke();
        context.restore();
    }

    onPieChartChange(piechart) {
    	var table = $('#proportions-table');
    	var percentages = piechart.getAllSliceSizePercentages();
        //console.log("percentages", percentages);

    }
}