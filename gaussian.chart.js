
$(element[0]).html('');
var data = attrs.hasOwnProperty('data') ? scope.data : randomGaussianArray(1000, 100);

var margins = {
    top: 20,
    right: 90,
    bottom: 80,
    left: 80,
    labelsRight: 15
};

var aspectRatio = window.innerHeight / window.innerWidth;
var width = attrs.width ? attrs.width : $(element[0]).parent().width() - margins.left - margins.right;
var height = attrs.height ? attrs.height : width * aspectRatio * 0.95 - margins.top - margins.bottom;
var yMult = 1.1;

var normData = populateData(data);
var histData = histogram(data);

var xScale = d3.scale.linear().range([0, width]);
var yScale = d3.scale.linear().range([height, 0]);

var yBarScale = d3.scale.linear().range([height, 0]);
yBarScale.domain([0, d3.max(histData) * yMult]);

var xAxis = d3.svg.axis().scale(xScale).orient('bottom').outerTickSize(0);
var xTopAxis = d3.svg.axis().scale(xScale).orient('top').tickFormat('').outerTickSize(0).innerTickSize(0);
var yAxis = d3.svg.axis().scale(yScale).orient('right').tickFormat(d3.format('.1%')).outerTickSize(0);
var yBarAxis = d3.svg.axis().scale(yBarScale).orient('left').outerTickSize(0);

xScale.domain(d3.extent(normData, function(d) { return Math.max(0,d.x); }));
var yScaleMax = d3.max(normData, function(d) {
    return d.y;
}) * yMult;
yScale.domain([0, yScaleMax]);

var barWidth = width / xScale.domain()[1];

var line = d3.svg.line()
             .x(function(d) {
                 return xScale(d.x);
             })
             .y(function(d) {
                 return yScale(d.y);
             });

//setup the graph
var svg = d3.select(element[0]).append('svg')
    .attr('width', width + margins.left + margins.right)
    .attr('height', height + margins.top + margins.bottom)
    .append('g')
    .attr('transform', 'translate(' + margins.left + ',' + margins.top + ')');

//Draw in the background
svg
.append('rect')
    .attr('class', 'background')
    .attr('fill', '#CDDEE6')
    .attr('width', width)
    .attr('height', height);

//draw in our histogram
svg.selectAll('.bar')
   .data(histData)
   .enter()
   .append('rect')
   .attr('class', 'bar')
   .attr('fill', '#EEEEEE')
   .attr('stroke-width', '2')
   .attr('stroke-color', '#EEEEEE')
   .attr('x', function(d, i) { return (i * barWidth); })
   .attr('y', function(d) { return yBarScale(d); })
   .attr('height', function(d) { return height - yBarScale(d); })
   .attr('width', barWidth);

//Draw in the mean line
svg.append('line')
    .attr('class', 'mean')
    .attr('stroke', 'steelblue')
    .attr('stroke-width', '5')
    .attr('y1', 0)
    .attr('y2', height)
    .attr('x1', xScale(mean(data)))
    .attr('x2', xScale(mean(data)));


//Draw the mouseline
svg.append('rect')
    .attr('class', 'mouse-line')
    .attr('height', height)
    .attr('width', 1)
    .attr('y', 0)
    .attr('x', 0);

//Draw the mouse/normal intersection point
svg.append('circle')
   .attr('class', 'mouse-circle')
   .attr('r', 15)
   .attr('cx', 0)
   .attr('cy', height);

//Draw our dist-curve
svg.append('path')
   .datum(normData)
   .attr('class', 'line')
   .attr('fill', 'none')
   .attr('stroke', 'steelblue')
   .attr('stroke-width', '5')
   .attr('d', line);

//Draw the x-axis
svg.append('g')
   .attr('class', 'axis')
   .attr('transform', 'translate(0,' + height + ')')
   .call(xAxis);

//Draw in the x-axis label
svg.append('text')
   .attr('class', 'label')
   .attr('text-anchor', 'middle')
   .attr('x', width / 2)
   .attr('y', height + 40)
   .text(scope.units);

//Draw the bar y-axis
svg.append('g')
   .attr('class', 'axis')
   .call(yBarAxis);

//Draw the bar axis label
svg.append('text')
   .attr('class', 'label')
   .attr('text-anchor', 'middle')
   .attr('x', -45)
   .attr('y', height / 2)
   .attr('transform', 'rotate(270 -45,' + (height / 2) + ')')
   .text('frequency');

//Draw the percent y-axis
svg.append('g')
   .attr('class', 'axis')
   .attr('transform', 'translate(' + width + ',0)')
   .call(yAxis);

//Draw the percent axis label
svg.append('text')
   .attr('class', 'label')
   .attr('text-anchor', 'middle')
   .attr('x', width + 70)
   .attr('y', height / 2)
   .attr('transform', 'rotate(90 ' +  (width + 70) + ',' + (height / 2) + ')')
   .text('percentage');

//Draw in the top axis for completeness
svg.append('g')
   .attr('class', 'axis')
   .call(xTopAxis);

//Draw the user/normal intersection point
if (scope.userNumber) {
    svg.append('circle')
       .attr('class', 'user-circle')
       .attr('stroke', 'none')
       .attr('fill', 'tomato')
       .attr('r', 15)
       .attr('cx', xScale(Number(scope.userNumber)))
       .attr('cy', yScale(bellCurve(Number(scope.userNumber), mean(data), stddev(data))));
}

//Draw in the users line
if (scope.userNumber) {
    svg.append('line')
        .attr('class', 'user')
        .attr('stroke', 'tomato')
        .attr('stroke-width', '5')
        .attr('y1', 0)
        .attr('y2', height)
        .attr('x1', xScale(scope.userNumber))
        .attr('x2', xScale(scope.userNumber));
}
//Draw in text showing the mean
svg.append('text')
   .attr('class', 'mean-text label')
   .attr('text-anchor', 'end')
   .attr('x', width - margins.labelsRight)
   .attr('y', margins.top + 10)
   .text('Average Value: ' + d3.round(mean(data), 2));

//Draw in text showing the mean
if (scope.userNumber) {
    svg.append('text')
       .attr('class', 'user-text label')
       .attr('text-anchor', 'end')
       .attr('x', width - margins.labelsRight)
       .attr('y', margins.top + 10 + 18)
       .text('Your Value: ' + d3.round(scope.userNumber));
}

//Draw in text showing the mean
svg.append('text')
   .attr('class', 'mouse-text label')
   .attr('text-anchor', 'end')
   .attr('x', width - margins.labelsRight)
   .attr('y', margins.top + 10 + 18 + 18)
   .text('Current: ')
   .append('tspan')
   .attr('class', 'mouse-text-current')
   .text('0.00');

svg.selectAll('.axis')
   .attr('font-family', '"Source Sans Pro", sans-serif')
   .attr('font-weight', '400')
   .attr('font-size', '18px')
   .attr('letter-spacing', '0.3rem')
   .attr('text-align', 'center')
   .attr('text-transform', 'uppercanse');


var gNorm = element[0];
$(element[0]).on('mousemove', function(e) {
    if (normData.length === 0) { return; }
    if (e.screenX < margins.left + gNorm.offsetLeft) {
        d3.select('.mouse-line').attr('x', 0);
        d3.select('.mouse-circle').attr('y', 0).attr('x', 0);
    } else if (e.screenX > width + margins.right + gNorm.offsetLeft) {
        return;
    } else {
        d3.select('.mouse-line').attr('x', e.screenX - margins.left - gNorm.offsetLeft);
        d3.select('.mouse-circle')
          .attr('cx', e.screenX - margins.left - gNorm.offsetLeft)
          .attr('cy', yScale(bellCurve(xScale.invert(e.screenX - margins.left - gNorm.offsetLeft), mean(data), stddev(data))));
        $('.mouse-text-current').html(d3.round((xScale.invert(e.screenX - margins.left)), 2));
    }
});
