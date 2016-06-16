(function(window) {

    var GraceMap = function(option) {
        var defaultOption = {
            title: {
                text: 'myMap',
                subtext: 'mySubMap',
            },
            legend: {
                orient: 'vertical', //vertical, horizontal
                x: 'bottom', //center, right

            },
            //色值高到低
            colors: ['rgb(25,142,224)', 'rgb(72,160,231)', 'rgb(118,194, 246)', 'rgb(174,219,250)', 'rgb(113,106,190)'],
            scaleRatio: 580,
            centerPosition: [110, 41],
            // centerPosition: [100, 31],
            dataRange: {

                x: 'left',
                y: 'bottom',
                text: ['高', '低'], // 文本，默认为数值文本
                calculable: true,
                pointerText: '销售额'
            },
            tooltip: {
                formatter: function(point) {
                    if (!point) {
                        return;
                    }
                    var tpl = [];
                    tpl.push('排名: ' + point.index);
                    tpl.push('省份: ' + point.name);
                    tpl.push('买家数量: ' + point.value);
                    tpl.push('买家占比: ' + point.ratio);
                    return tpl.join('<br>');
                }
            },
            series: {
                name: '中国',
                data: [{ "name": "天津", "value": 2226.41, "index": 2, "ratio": "71.59%" }, { "name": "北京", "value": 14149, "index": 1, "ratio": "70.54%" }]
            }
        };
        this.options = {};
        this.extend(this.options, defaultOption);
        this.extend(this.options, option);

        var container = document.querySelector('#' + option.render);
        this.width = container.clientWidth;
        this.height = container.clientHeight;

        var centerPosition = this.options.centerPosition;
        var scaleRatio = this.options.scaleRatio;



        var svg = d3.select('#' + option.render).append("svg")
            .attr("width", this.width)
            .attr("height", this.height)
            .append("g")
            .attr("transform", "translate(0,0)");

        this.svg = svg;


        this.tooltip = new Tooltip();
        this.dataRange = new DataRange(this);

        var projection = d3.geo.mercator()
            .center(centerPosition)
            .scale(scaleRatio)
            .translate([this.width / 2, this.height / 2]);

        this.projection = projection;

        var path = d3.geo.path()
            .projection(projection);
        this.path = path;
        var color = d3.scale.category20();
        var gMap = this;
        var orientData = this.options.series.data;

        //获取中国各省份边界数据
        //数据格式包括 type: feature /  geometry:Polygon  几何形状:多边形
        // properties:{id: \d, name: ''}
        d3.json("china_simplify.json", function(error, root) {

            if (error)
                return console.error(error);
            // console.log(root.features);

            var provinces = svg.append('g').attr('class', 'feature')
                .selectAll("path")
                .data(root.features)
                .enter()
                .append("path")
                .attr("stroke", "white")
                .attr("stroke-width", 1)

            .attr("fill", function(d, i) {
                    return "gray";
                })
                .attr("d", path);
            // .on("mouseover",function(d,i){
            //              d3.select(this)
            //                  .attr("fill","yellow");
            //          })
            //          .on("mouseout",function(d,i){
            //              // d3.select(this)
            //              //     .attr("fill",color(i));
            //          });

            gMap.mapData = {};
         
            for (var i = 0; i < orientData.length; i++) {
                var name = orientData[i].name;
                gMap.mapData[name] = orientData[i];
            }

            gMap.markProvinces(gMap, orientData, provinces);


            // gMap.createRange(svg);


            // gMap.markProvinceName(svg);




        }); //china json


        d3.xml("southchinasea.svg", function(error, xmlDocument) {
            svg.html(function(d) {
                return d3.select(this).html() + xmlDocument.getElementsByTagName("g")[0].outerHTML;
            });

            var gSouthSea = d3.select("#southsea");

            gSouthSea.attr("transform", "translate(1040,610)scale(0.5)")
                .attr("class", "southsea");

        });



    }
    GraceMap.prototype = {
            extend: function(target, source) {
                var gMap = this;
                target = target || {};

                for (var key in source) {
                    if (typeof source[key] === 'object' && !(source[key] instanceof Array)) {
                        target[key] = target[key] || {};
                        gMap.extend(target[key], source[key]);
                        continue;
                    } else {
                        target[key] = source[key];
                    }
                }

            },
            /**
             * 标注省份名称
             */
            markProvinceName: function(svg) {
                var gMap = this;
                //标注城市名称
                d3.json('places.json', function(error, pData) {
                    // this.data = pData;
                    var location = svg.selectAll('.location')
                        .data(pData.location)
                        .enter()
                        .append('g')
                        .attr('class', 'location')
                        .attr('transform', function(d, i) {
                            var p = gMap.projection([d.log, d.lat]);
                            return 'translate(' + p[0] + ',' + p[1] + ')'
                        });

                    location.append('circle')
                        .attr('class', 'point')
                        .style('fill', 'blue')


                    .attr('r', 3)
                        .on('mouseover', function() {
                            d3.select(this).transition().duration(100).attr('r', 5).attr('fill', 'red');

                        })
                        .on('mouseout', function() {
                            d3.select(this).transition().duration(100).attr('r', 3).attr('fill', 'blue');

                        });

                    location.append('text')
                        .text(function(d, i) {
                            return d.name;
                        })
                        .attr('x', 0)
                        .attr('y', 0)
                        .attr('z-index', 999)
                        .attr('dy', '1em')
                        .attr('width', 100)
                        .attr('height', 100)
                        .style('font-size', '12px')
                        .style('fill', 'blue');
                }); //place
            },
            /**
             * 标注旅游城市热力图
             */
            markProvinces: function(gMap, orientData, provinces) {
                var values = [],
                    colors = gMap.options.colors;
                for (var i = 0; i < orientData.length; i++) {
                    var name = orientData[i].name;
                    var value = orientData[i].value;
                    values[name] = value;
                }

                var maxvalue = d3.max(orientData, function(d) {
                    return d.value;
                });
                var minvalue = d3.min(orientData, function(d) {
                    return d.value;
                });


                var linear = d3.scale.linear().domain([minvalue, maxvalue]).range([0, 1]);

                provinces
                    .style('fill', function(d, i) {
                        var t = linear(values[d.properties.name]);
                        var index = Math.ceil(t * colors.length);


                        return colors[colors.length - index];
                    })
                    .attr('class', 'provinces')
                    .style('opacity', '0.4');

                gMap.tooltip.init(gMap, provinces, linear, values);
                gMap.dataRange.init(provinces, values, linear);
            }


        }


    
    var DataRange = function(gMap) {
        var colors = gMap.options.colors; //45*24
        var colorRect;
        var offsetX = 20;
        var offsetY = gMap.height - 62;

        this.offsetX = offsetX;
        this.offsetY = offsetY;
        this.gMap = gMap;


    }
    DataRange.prototype = {
    	init: function(provinces, values, linear){
    		var gMap = this.gMap;
    		var dataRange = this;
    		this.addColorBlock();
    		this.addBlockText();
    		this.addPointer();

    		provinces.on('mouseover', function(d, i) {

                var colors = gMap.options.colors;
                var t = linear( values[d.properties.name] ) ;
                var index = Math.ceil( t * colors.length ) ;
				var offestX = dataRange.offsetX + (colors.length - index)*(45+3) + (45/2) ;
				dataRange.pointer.remove();
				dataRange.pointer = dataRange.createPointer(gMap.svg, offestX, dataRange.offsetY+28   ) ;
                dataRange.pointer.style('opacity', 0.4);
									

                dataRange.pointerText.attr('x',  offestX - dataRange.pointerNameLen )
                           .style('opacity', 0.4) ;

            })
            .on('mouseout', function(d, i){
            	dataRange.pointer.remove();
            	dataRange.pointerText.style('opacity', 0);
            });
    	},
        addColorBlock: function() {
        	var svg = this.gMap.svg; 
			var colors = this.gMap.options.colors; //45*24

            for (var i = 0, len = colors.length; i < len; i++) {
                colorRect = svg.append("rect")
                    .attr("x", this.offsetX + i * (45 + 3))
                    .attr("y", this.offsetY)
                    .attr("width", 45)
                    .attr("height", 24)
                    .style("fill", colors[i])
                    .style('opacity', 0.5);
            }
        },
        addBlockText: function() {
        	var svg = this.gMap.svg; 
        	var gMap = this.gMap;
			var colors = this.gMap.options.colors; //45*24

            //添加文字
            var minValueText = svg.append("text")
                .attr("class", "valueText")
                .attr("x", this.offsetX)
                .attr("y", this.offsetY)
                .attr("dy", "15px")
                .attr("dx", "23px")
                .style('fill', 'white')
                .style('opacity', 0.4)
                .text(function() {
                    return gMap.options.dataRange.text[0];
                });

            var maxValueText = svg.append("text")
                .attr("class", "valueText")
                .attr("x", this.offsetX + colors.length * (48))
                .attr("y", this.offsetY)
                .attr("dy", "15px")
                .attr("dx", "-23px")
                .style('fill', 'white')
                .style('opacity', 0.4)
                .text(function() {
                    return gMap.options.dataRange.text[1];
                });
        },
        createPointer: function(svg, pointsStartX, pointsStartY){
        	var points = [];
        	points.push((pointsStartX) + ',' + pointsStartY);
            points.push((pointsStartX - 5) + ',' + (pointsStartY + 5));
            points.push((pointsStartX + 5) + ',' + (pointsStartY + 5));

            var pointer = svg.append("polygon")
                .attr('class', 'polygon')
                .attr("fill", "red")
                .attr('points', points.join(' ') );
            // pointer.attr('opacity', 0.5);

            return pointer;
        },
        addPointer: function() {
        	var gMap = this.gMap;
        	var svg = gMap.svg; 
        	
            // 添加当前数值位置
            var points = [],
                pointsStartX = this.offsetX,
                pointsStartY = this.offsetY + 24 + 4;

            this.pointer = this.createPointer(svg, pointsStartX, pointsStartY);
            this.pointer.style('opacity', 0);

            var pointerName = gMap.options.series.name;
            this.pointerNameLen = (pointerName.length * 27 / 2);

            var pointerTextEl = svg.append('text')
                .attr('class', 'pointer-text')
                .attr("x", pointsStartX - this.pointerNameLen)
                .attr("y", pointsStartY + 5)
                .attr("dy", "15px")
                .attr("dx", "23px")
                .style('opacity', 0)
                .text(function() {
                    return pointerName;
                });
            this.pointerText = pointerTextEl;
        }
    }

    var Tooltip = function() {
        var tooltip = d3.select('body').append('div');
        tooltip.attr('class', 'map-tooltip');
        tooltip.style('opacity', 0);
        this.el = tooltip;
        return this;
    }
    Tooltip.prototype = {
        init: function(gMap, provinces, linear, values) {
            var tTl = this.el;

            provinces.on('mouseover', function(d, i) {

                var tooltipHtml = gMap.options.tooltip.formatter(gMap.mapData[d.properties.name]),
                    colors = gMap.options.colors;

                tTl.style('top', d3.event.pageY + 20);
                tTl.style('left', d3.event.pageX + 20);
                if (tooltipHtml) {
                    tTl.style('opacity', 0.8);
                } else {
                    tTl.style('opacity', 0);
                }
                tTl.html(tooltipHtml);

                // var t = linear(values[d.properties.name]);
                // var index = Math.ceil(t * colors.length);
                // gMap.pointerText.attr('x', )

            })
            provinces.on('mousemove', function(d, i) {
                var event = d3.event;
                tTl.style('top', event.pageY + 20);
                tTl.style('left', event.pageX + 20);


            })
            provinces.on('mouseout', function(d, i) {
                tTl.style('opacity', 0);
                tTl.style('top', '10px');
            });
        }
    }

    window.GraceMap = GraceMap;
    return GraceMap;

})(window);
