'use strict';
d3.chart('Cashflow', {
    initialize: function() {
        var chart = this;
        chart.areas = {};
        chart.margins = {
            top: 20,
            right: 50,
            bottom: 50,
            left: 100
        };
        
        chart.areas.background = chart.base.append('rect')
            .classed('background', true);

        chart.areas.clipPath = chart.base.append('clipPath')
            .attr('id', 'clip')
            .append('rect');

        chart.layer('Scenarios', chart.base.append('g'), {
            dataBind: function(data) {
                //First, gather all of the base and scenario data to get extents
                var allData = [];
                allData = allData.concat(data.base);
                data.scenarios.forEach(function(s) {
                    allData = allData.concat(s);
                });

                //Set up our x-axis by looking at base and scenarios
                var xDomain = d3.extent(allData, function(d) {
                    return chart.processDate(d);
                });
                xDomain[0] = xDomain[0].setMonth(xDomain[0].getMonth() - chart.timePadding());
                xDomain[1] = xDomain[1].setMonth(xDomain[1].getMonth() + chart.timePadding());
                chart.xDateScale = d3.time.scale()
                    .domain(xDomain)
                    .range([chart.margins.left, chart.width() - chart.margins.right]);
                chart.xDateAxis = d3.svg.axis()
                    .scale(chart.xDateScale)
                    .orient('bottom')
                    .tickPadding(10)
                    .outerTickSize(1)
                    .innerTickSize(0)
                    .ticks(5);
                chart.areas.xDateLabels.transition().call(chart.xDateAxis);

                //Set up our y-axis
                var yDomain = d3.extent(allData, function(d) {
                    return d.value;
                });
                yDomain[0] = yDomain[0] < 0 ? yDomain[0] * 1.1 : 0;
                yDomain[1] = yDomain[1] * 1.1;
                chart.yValueScale = d3.scale.linear()
                    .domain(yDomain)
                    .range([chart.height() - chart.margins.bottom, chart.margins.top]);
                chart.yValueAxis = d3.svg.axis()
                    .scale(chart.yValueScale)
                    .orient('left')
                    .tickPadding(10)
                    .outerTickSize(1)
                    .innerTickSize(0)
                    .ticks(5);
                chart.areas.yValueLabels.transition().call(chart.yValueAxis);

                //Setup our line function to make our path, this should probably
                //be declared elsewhere...but fuck it, it works fine here.
                chart.generateCashPath = d3.svg.line()
                    .x(function(d) {
                        var date = chart.processDate(d);
                        return chart.xDateScale(date);
                    })
                    .y(function(d) {
                        return chart.yValueScale(d.value);
                    })
                    .interpolate('step-after');

                chart.scenarioData = data.scenarios;
                return this.selectAll('path').data(chart.scenarioData);
            },
            insert: function() {
                return this.append('path')
                    .attr('d', chart.generateCashPath)
                    .attr('clip-path', 'url(#clip)')
                    .attr('class', 'line')
                    .attr('fill', 'none')
                    .attr('stroke-width', '3');
            },
            events: {
                'enter': function() {
                    this.attr('d', chart.generateCashPath)
                        .attr('stroke', function() {
                            return chart.getColor(); 
                        });
                }
            }
        });

        chart.layer('BaseCase', chart.base.append('g'), {
            dataBind: function(data) {

                chart.baseData = data.base;
                return this.selectAll('path').data([chart.baseData]);
            },
            insert: function() {
                return this.append('path')
                    .attr('d', chart.generateCashPath)
                    .attr('clip-path', 'url(#chart-area)')
                    .attr('clip-path', 'url(#clip)')
                    .attr('class', 'line')
                    .attr('fill', 'none')
                    .attr('stroke', 'steelblue')
                    .attr('stroke-width', '5');
            },
            events: {
                'enter': function() {
                    return this.attr('d', chart.generateCashPath);
                },
                'update:transition': function() {
                    return this.attr('d', chart.generateCashPath);
                }
            }
        });


        chart.layer('Veronoi', chart.base.append('g'), {
            dataBind: function(data) {
                var chart = this.chart();

                //Munge, demux, and hocus-pocus the data to get it right, then
                //generate the voronoi paths for each point.
                var allData = [];
                allData = allData.concat(data.base);
                data.scenarios.forEach(function(s) {
                    allData = allData.concat(s);
                });

                //Really tortured way of getting all the unique values using d3
                //only, probably could use lodash...but who cares.
                allData = d3.set(allData.map(function(p) {
                    var x = chart.xDateScale(chart.processDate(p));
                    var y = chart.yValueScale(p.value);
                    return [x, y];
                })).values().map(function(p) {
                    return p.split(',');
                });
                
                var voronoiZones = d3.geom.voronoi(allData);

                return this.selectAll('path').data(voronoiZones);
            },
            insert: function() {
                var chart = this.chart();
                return this.append('path')
                    .classed('v-path', true)
                    .attr('d', function(d) {
                        return 'M' + d.join(',') + 'Z';
                    })
                    //.style('fill', 'lightpink')
                    //.style('stroke', 'crimson')
                    .style('opacity', '0')
                    .on('mouseenter', function(d) {
                        chart.trigger('moveSelectedNode', d.point);
                    });
            },
            events: {
                'enter': function() {
                    this.attr('d', function(d) {
                        return 'M' + d.join(',') + 'Z';
                    });
                }    
            }
        });

        chart.layer('PointsOfInterest', chart.base.append('g'), {
            dataBind: function(data) {
                var chart = this.chart();

                chart.pointsOfInterest = data.pointsOfInterest;
                return this.selectAll('circle').data(chart.pointsOfInterest);
            },
            insert: function() {
                return this.append('circle')
                    .attr('cx', function(d) {
                        return chart.xDateScale(chart.processDate(d));
                    })
                    .attr('cy', function(d) {
                        return chart.yValueScale(d.value);
                    })
                    .attr('r', 5)
                    .style('fill', function(d) {
                        return chart.getPOIColor(d.type);
                    });
            },
            events: {
                'enter': function() {
                    this.attr('cx', function(d) {
                        return chart.xDateScale(chart.processDate(d));
                    })
                    .attr('cy', function(d) {
                        return chart.yValueScale(d.value);
                    });
                }
            }
        });


        chart.areas.xDateLabels = chart.base.append('g')
            .classed('axis', true)
            .classed('xAxis', true)
            .attr('height', chart.margins.bottom);

        chart.areas.xTopLine = chart.base.append('line')
            .classed('axis', true)
            .classed('xAxis', true)
            .style('stroke', 'black')
            .style('stroke-width', '2')
            .attr('x1', chart.margins.left)
            .attr('y1', chart.margins.top)
            .attr('y2', chart.margins.top);

        chart.areas.yRightLine = chart.base.append('line')
            .classed('axis', true)
            .classed('yAxis', true)
            .style('stroke', 'black')
            .style('stroke-width', '2')
            .attr('y1', chart.margins.top - 1);

        chart.areas.yValueLabels = chart.base.append('g')
            .classed('axis', true)
            .classed('yAxis', true)
            .attr('width', chart.margins.left);

        chart.areas.selectedNode = chart.base.append('circle')
            .classed('selectedNode', true)
            .attr('cx', -100)
            .attr('cy', -100)
            .attr('r', 10)
            .style('fill', 'crimson');

        chart.on('change:width', function() {
            chart.areas.yValueLabels
                .attr('transform', 'translate(' + chart.margins.left + ',' + (0) + ')');
            chart.areas.background
                .attr('width', chart.width() - chart.margins.left - chart.margins.right)
                .attr('transform', 'translate(' + chart.margins.left + ',' + chart.margins.top + ')');
            chart.areas.xTopLine
                .attr('x2', chart.width() - chart.margins.right);
            chart.areas.yRightLine
                .attr('x1', chart.width() - chart.margins.right)
                .attr('x2', chart.width() - chart.margins.right);
            chart.areas.clipPath
                .attr('width', chart.width() - chart.margins.left - chart.margins.right)
                .attr('transform', 'translate(' + chart.margins.left + ',' + chart.margins.top + ')');
        });

        chart.on('change:height', function() {
            chart.areas.xDateLabels
                .attr('transform', 'translate(' + (0)+ ',' + (chart.height() - chart.margins.bottom) + ')');
            chart.areas.background
                .attr('height', chart.height() - chart.margins.top - chart.margins.bottom)
                .attr('transform', 'translate(' + chart.margins.left + ',' + (chart.margins.top) + ')');
            chart.areas.yRightLine
                .attr('y2', chart.height() - chart.margins.bottom + 1);
            chart.areas.clipPath
                .attr('height', chart.height() - chart.margins.top - chart.margins.bottom)
                .attr('transform', 'translate(' + chart.margins.left + ',' + (chart.margins.top) + ')');
        });

        chart.on('moveSelectedNode', function(d) {
            chart.areas.selectedNode
                .transition()
                .duration(100)
                .attr('cx', d[0])
                .attr('cy', d[1]);
        });
    },

    processDate: function(d) {
        var date = d.date.split('-');
        return (new Date(date[0], date[1] - 1, date[2]));
    },

    getColor: function() {
        var colors = [
            'blueviolet',
            'cadetblue',
            'crimson',
            'darkgreen',
            'deeppink',
            'midnightblue',
            'royalblue',
            'seagreen'];
        if(!this.hasOwnProperty('_colorIdx')) {
            this._colorIdx = 0;
        } else {
            this._colorIdx = this._colorIdx === colors.length - 1 ? 0 : this._colorIdx + 1;
        }
        return colors[this._colorIdx];
    },

    /** 
     * Getters/Setters
     */
    height: function(h) {
        if(arguments.length === 0) {
            return this._height;
        }
        this._height = h;
        this.base.attr('height', h);
        this.trigger('change:height');
        return this;
    },

    width: function(w) {
        if(arguments.length === 0) {
            return this._width;
        }
        this._width = w;
        this.base.attr('width', w);
        this.trigger('change:width');
        return this;
    },

    timePadding: function(t) {
        if(arguments.length === 0) {
            return this._timePadding || 0;
        }
        this._timePadding = t;
        return this;
    },

    getPOIColor: function(type) {
        return {
            'max': 'seagreen',
            'min': 'tomato',
            'neg': 'crimson',
            'pos': 'lightgreen'
        }[type];
    }
});

//Data format for the Cashflow chart:

var data = {
    base: [
        {date: '2015-01-01', value: 2000},
        {date: '2015-01-15', value: 2500},
        {date: '2015-01-17', value: 2800},
        {date: '2015-02-01', value: 4000},
        {date: '2015-03-01', value: 6000},
        {date: '2015-04-01', value: 8000},
        {date: '2015-05-01', value: 10000},
        {date: '2015-06-01', value: 10000},
    ],
    scenarios: [
        [
            {date: '2015-02-01', value: 4000},
            {date: '2015-03-01', value: 8000},
            {date: '2015-04-01', value: 10000},
            {date: '2015-05-01', value: 12000},
            {date: '2015-06-01', value: 12000},
        ],
        [
            {date: '2015-02-01', value: 4000},
            {date: '2015-03-01', value: 7000},
            {date: '2015-04-01', value: 9000},
            {date: '2015-05-01', value: 11000},
            {date: '2015-06-01', value: 13000},
        ],
    ],
    pointsOfInterest: [
        {date: '2015-02-01', type:'max', value: 4000},
        {date: '2015-03-01', type:'min', value: 8000},
        {date: '2015-04-01', type:'pos', value: 10000},
        {date: '2015-05-01', type:'neg', value: 12000},
    ]
};

var cash = d3.select('#vis')
    .append('svg')
    .chart('Cashflow')
    .width(600)
    .height(400);

cash.draw(data);
