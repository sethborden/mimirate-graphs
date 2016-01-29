'use strict';
d3.chart('Gaussian', {
    initialize: function() {
        var chart = this;
        chart.areas = {};
        chart.data = [];

        //These will be used later
        chart.xScale = d3.scale.linear();
        chart.xBarScale = d3.scale.linear();
        chart.yScale = d3.scale.linear();
        chart.yBarScale = d3.scale.linear();
        chart.yBarLabelScale = d3.scale.linear();

        //Margins for the chart
        chart.margins = {
            top: 20,
            right: 50,
            bottom: 50,
            left: 50
        };
        //Draw in the background
        var background = chart.base.append('rect')
            .classed('background', true);

        var clipPath = chart.base.append('clipPath')
            .attr('id', 'chart-area')
            .append('rect');

        //Draw in the histogram
        chart.layer('Histogram', chart.base.append('g'), {
            dataBind: function(data) {
                var chart = this.chart();
                chart.histData = chart.generateHistogram(data);
                chart.barWidth = (chart.width() - chart.margins.left - chart.margins.right) / chart.histData.length;

                chart.yBarScale
                    .domain([0, d3.max(chart.histData) * 1.1])
                    .range([chart.margins.top, chart.height() - chart.margins.bottom]);

                chart.yBarLabelScale
                    .domain([0, d3.max(chart.histData) * 1.1])
                    .range([chart.height() - chart.margins.bottom, chart.margins.top]);

                var yBarAxis = d3.svg.axis()
                    .scale(chart.yBarLabelScale)
                    .orient('right')
                    .tickPadding(10)
                    .outerTickSize(1)
                    .innerTickSize(0)
                    .ticks(5);
                chart.areas.yBarLabels.transition().call(yBarAxis);

                return this.selectAll('.bar').data(chart.histData);
            },
            insert: function() {
                return this.append('rect')
                    .classed('bar', true)
                    .attr('fill', '#EEEEEE');
            },
            events: {
                'merge:transition': function() {
                    this.attr('height', function(d) {
                            return chart.yBarScale(d) - chart.margins.top;
                        })
                        .attr('width', chart.barWidth)
                        .attr('x', function(d, i) { return (i * chart.barWidth) + chart.margins.left; })
                        .attr('y', function(d) {
                            return chart.height() - chart.margins.bottom - chart.yBarScale(d) + chart.margins.top;
                        })
                        .style('fill', 'salmon');
                    return this;
                }
            }
        });

        //Draw in the curve layer
        chart.layer('GaussianCurve', chart.base.append('g'), {
            dataBind: function(data) {
                var chart = this.chart();

                //generate the path and setup scales
                chart.curveData = chart.generateGaussianPath(data);
                chart.xScale
                    .domain(d3.extent(chart.curveData, function(d) {
                        return Math.max(0, d.x);
                    }))
                    .range([chart.margins.left, chart.width() - chart.margins.right]);
                chart.yScale
                    .range([chart.height() - chart.margins.bottom, chart.margins.top])
                    .domain([0, d3.max(chart.curveData, function(d) {
                        return d.y;
                    }) * 1.1]);

                //setup the line that we'll draw for the path
                chart.line = d3.svg.line()
                    .x(function(d) {
                        return chart.xScale(d.x);
                    })
                    .y(function(d) {
                        return chart.yScale(d.y);
                    });

                var yCurveAxis = d3.svg.axis()
                    .scale(chart.yScale)
                    .orient('left')
                    .tickFormat(d3.format('.0%'))
                    .tickPadding(10)
                    .outerTickSize(1)
                    .innerTickSize(0)
                    .ticks(5);
                chart.areas.yCurveLabels.transition().call(yCurveAxis);

                var xFrequencyAxis = d3.svg.axis()
                    .scale(chart.xScale)
                    .orient('bottom')
                    .tickPadding(10)
                    .outerTickSize(1)
                    .innerTickSize(0)
                    .ticks(5);
                chart.areas.xFrequencyLabels.transition().call(xFrequencyAxis);

                var xTopAxis = d3.svg.axis()
                    .scale(chart.xScale)
                    .orient('top')
                    .tickPadding(10)
                    .outerTickSize(1)
                    .innerTickSize(0)
                    .ticks(0);
                chart.areas.xTopLabels.call(xTopAxis);

                chart.trigger('databound'); //some of the axes can only be drawn once we have data bound, so we bind data.

                //then we draw in the path
                return this.selectAll('path').data([chart.curveData]);
            },
            insert: function() {
                return this.append('path')
                   .attr('d', chart.line)
                   .attr('clip-path', 'url(#chart-area)')
                   .attr('class', 'line')
                   .attr('fill', 'none')
                   .attr('stroke', 'steelblue')
                   .attr('stroke-width', '5');
            },
            events: {
                'update:transition': function() {
                    return this.attr('d', chart.line);
                }
            }
        });

        chart.layer('MeanLine', chart.base.append('g'), {
            dataBind: function(data) {
                var chart = this.chart();
                var mean = chart.mean(data);
                var meanLine = [
                    [chart.xScale(mean), chart.margins.top],
                    [chart.xScale(mean), chart.height() - chart.margins.bottom]
                ];

                chart.meanLine = d3.svg.line()
                    .x(function(d) {
                        return d[0];
                    })
                    .y(function(d) {
                        return d[1];
                    });

                return this.selectAll('path').data([meanLine]);
            },
            insert: function() {
                return this.append('path')
                    .classed('.median-line', true)
                    .attr('stroke', 'steelblue')
                    .attr('stroke-width', '3');
            },
            events: {
                'merge:transition': function() {
                    var chart = this.chart();
                    return this.attr('d', function(d) {
                        return chart.meanLine(d);
                    });
                }
            }
        });

        //Draw in the mouseline
        chart.areas.mouseLine = chart.base.append('line')
            .classed('mouse-line', true)
            .attr('stroke-width', '2')
            .attr('stroke', 'red')
            .attr('x1', String(chart.margins.left + 3))
            .attr('x2', String(chart.margins.left + 3));

        //Setup some areas -- things that aren't necessarily bound to data
        chart.areas.yBarLabels = chart.base.append('g')
            .classed('axis', true)
            .classed('yAxis', true)
            .attr('width', chart.margins.right);

        chart.areas.yCurveLabels = chart.base.append('g')
            .classed('axis', true)
            .classed('yAxis', true)
            .attr('width', chart.margins.left);

        chart.areas.xFrequencyLabels = chart.base.append('g')
            .classed('axis', true)
            .classed('xAxis', true)
            .attr('height', chart.margins.bottom);

        chart.areas.xTopLabels = chart.base.append('g')
            .attr('height', chart.margins.top)
            .classed('axis', true);

        //Creat a front layer to handle mouse over stuff
        var foreground = chart.base.append('rect')
            .classed('foreground', true)
            .attr('fill', 'rgba(0,0,0,0)') //make sure to set the layer as transparent
            .on('mousemove', function() {
                var x = d3.mouse(this)[0];
                chart.areas.mouseLine.attr('x1', x).attr('x2', x);
            }); //We set up the mouseover listener for the chart there

        //Setup event listeners
        chart.on('change:_width', function() {
            background
                .attr('x', 0 + chart.margins.left)
                .attr('width', chart.width() - chart.margins.left - chart.margins.right);
            foreground
                .attr('x', 0 + chart.margins.left)
                .attr('width', chart.width() - chart.margins.left - chart.margins.right);
            clipPath
                .attr('x', 0 + chart.margins.left)
                .attr('width', chart.width() - chart.margins.left - chart.margins.right);
            chart.areas.yBarLabels
                .attr('transform', 'translate(' + (chart.width() - chart.margins.right) + ',' + (0) + ')');
            chart.areas.yCurveLabels
                .attr('transform', 'translate(' + (chart.margins.left)  + ')');
        });

        chart.on('change:_height', function() {
            background
                .attr('y', 0 + chart.margins.top)
                .attr('height', chart.height() - chart.margins.top - chart.margins.bottom);
            foreground
                .attr('y', 0 + chart.margins.top)
                .attr('height', chart.height() - chart.margins.top - chart.margins.bottom);
            clipPath
                .attr('y', 0 + chart.margins.top)
                .attr('height', chart.height() - chart.margins.top - chart.margins.bottom);
            chart.areas.xTopLabels
                .attr('transform', 'translate(' + (0) + ',' + (chart.margins.top) + ')');
            chart.areas.mouseLine
                .attr('y1', 0 + chart.margins.top)
                .attr('y2', chart.height() - chart.margins.bottom);
        });

        chart.on('databound', function(){
            chart.areas.xFrequencyLabels
                .attr('transform', 'translate(' + (0) + ',' + (chart.height() - chart.margins.bottom) + ')');
            d3.selectAll('.xAxis text')
                .attr('transform', 'translate(' + (chart.barWidth / 2) + ',' + (0) + ')');
        });
    },

    /**
     * @desc: Generate a gaussian path for use in our graph above
     * @param {number[]} data - The vector that we'll be using for this graph
     * @returns {Object[]} Pairs of x, y coords to map out our graph
     */
    generateGaussianPath: function(data) {
        if (data.length === 0) { return 0; }
        var normData = [];
        var u = this.mean(data);
        var s = this.stddev(data);
        var min = s - (2 * u);
        var max = s + (2 * u);
        var step = (max - min) / 1000;
        var point;
        for (var x = 0; x < max * 1.5; x = x + step) {
            point = {
                'x': x,
                'y': this.bellCurve(x, u, s)
            };
            normData.push(point);
        }
        return normData;
    },

    /**
     * @desc: Given a vector, returns the sum of all elements
     * @param {number[]} data - Vector of numbers
     * @returns {number} Sum of all numbers in the vector.
     */
    sum: function(data) {
        if (data.length === 0) { return 0; }
        return data.reduce(function(a,b) { return a + b; });
    },

    /**
     * @desc: Given a vector, returns the mean of all elements
     * @param {number[]} data - Vector of numbers
     * @returns {number} Mean of all numbers in the input vector.
     */
    mean: function(data) {
        if (data.length === 0) { return 0; }
        return this.sum(data) / data.length;
    },

    /**
     * @desc Given a vector, returns the standard deviation of the vector from
     * the vector's mean
     * @param {number[]} data - Vector of numbers
     * @returns {number} Standard Deviation from the mean
     */
    stddev: function(data) {
        if (data.length === 0) { return 0; }
        var u = this.mean(data);
        var vSquared = data.map(function(d) {
            return (d - u) * (d - u);
        });
        return Math.sqrt(this.sum(vSquared) / (data.length - 1)); // Bessel's Correction
    },

    /**
     * @desc Maps x to y on a gaussian curve with the given mean and standard
     * deviation (sigma)
     * @param {number} x - x value to be mapped to y.
     * @param {number} mean - Mean value (μ) for the gaussian curve
     * @param {number} sigma - Standard deviation (σ) for the gaussian curve.
     * @returns {number} f(x) on the gaussian curve.
     */
    bellCurve: function(x, mean, sigma) {
        return (1 / (sigma * Math.sqrt(2 * Math.PI))) * Math.exp((-1 * ((x - mean) * (x - mean)) / (2 * sigma * sigma)));
    },

    /**
     * @desc: Produces a historgram showing the frequency of occurence of each
     * element in a given vector.
     * @param {number[]} data - Vector (i.e. array) of data to get the histogram of.
     * @returns {number[]} Vector of the occurence of each element within the
     * input vector, zero if the number does not occur.
     */
    generateHistogram: function(data) {
        if (data.length === 0) { return []; }
        var hist = d3.range(0, d3.max(data) + 1) //Generate the range of the histogram
            .map(function() { return 0; }); //Set all values to zero
        data.forEach(function(d) {
            d = Math.floor(d); //Round down for each value in the data...
            hist[d] = hist[d] + 1; //...and add it to the histogram
        });
        return hist;
    },

    /**
     * @desc Update the histogram as new data is inserted into the chart
     * @param {number} unit - new number being added to the histogram
     * @param {number[]} (histogram=chart.histData) - Histogram that we're
     * modifying, defaults to the chart's histogram.
     * @return {number[]} An updated historgram.
     */
    updateHistogram: function(unit, histogram) {
        var chart = this;
        if(!histogram) {
            histogram = chart.histData;
        }
        if(typeof unit === 'number') {
            unit = [unit];
        }
        unit.forEach(function(u) {
            histogram[u] = histogram[u] + 1;
        });
        return histogram;
    },


    //----------Getter/Setter function--------------
    width: function(newWidth) {
        if(arguments.length === 0) {
            return this._width;
        }
        this._width = newWidth;
        this.base.attr('width', this._width);
        this.trigger('change:_width', newWidth);
        return this;
    },
    height: function(newHeight) {
        if(arguments.length === 0) {
            return this._height;
        }
        this._height = newHeight;
        this.base.attr('height', this._height);
        this.trigger('change:_height', newHeight);
        return this;
    }
});

//------------ NOT PART OF ANYTHING ----------------
//RENDERING FOR TESTS
var testData = [10, 14, 20, 33, 3, 10, 22];

var gausschart = d3.select('#vis2')
    .append('svg')
    .chart('Gaussian')
    .width(600)
    .height(400);

gausschart.draw(testData);
//

//Some logic to make our graph randomly add values and redraw the histogram.
var addNumber = function(number) {
    testData.push(number);
    gausschart.draw(testData.sort(function(a,b) {
        return a > b;
    }));
};

var interval = function() {
    return setInterval(function() {
        //Use the central limit theorem to get random numbers that are normally
        //distributed.
        var rand = Math.floor(Math.abs((((Math.random() + Math.random() + Math.random() + Math.random() + Math.random() + Math.random()) - 3) / 3) * 50));
        addNumber(rand);
    }, 500);
};


document.querySelector('#stop').addEventListener('click', function() {
    clearInterval(interval);
});

document.querySelector('#add').addEventListener('click', function() {
    var inp = Number.parseFloat(document.querySelector('#input').value);
    if (inp !== 'NaN') {
        addNumber(inp);
        document.querySelector('#input').value = '';
    }
});

var interval = interval();
