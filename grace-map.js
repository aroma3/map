(function(window){

var GraceMap = function(option){
		var defaultOption = {
			title:{
				text: 'myMap',
				subtext: 'mySubMap',
			},
			legend: {
				orient:'vertical',  //vertical, horizontal
				x: 'bottom', //center, right

			},
			dataRange: {
		        min: 0,
		        max: 2500,
		        x: 'left',
		        y: 'bottom',
		        text:['高','低'],           // 文本，默认为数值文本
		        calculable : true
		    },
		};

		var container = document.querySelector('#'+ option.id);
		var width  = container.clientWidth;
		var height =  container.clientHeight;

		var centerPosition = [100, 31];
		var scaleRatio = 850;

		this.setting = {};

		var svg = d3.select('#' + option.id).append("svg")
		    .attr("width", width)
		    .attr("height", height)
		    .append("g")
		    .attr("transform", "translate(0,0)");

		var tooltip = d3.select('body').append('div');
		tooltip.attr('class', 'map-tooltip');
		tooltip.style('opacity', 0);


		this.tooltip = tooltip;

		var projection = d3.geo.mercator()
							.center( centerPosition )
							.scale( scaleRatio )
	    					.translate([width/2, height/2]);
		
		this.projection = projection;

		var path = d3.geo.path()
						.projection(projection);
		this.path = path;
	    var color = d3.scale.category20();
		var gMap = this;
		
		//获取中国各省份边界数据
		//数据格式包括 type: feature /  geometry:Polygon  几何形状:多边形
		// properties:{id: \d, name: ''}
		d3.json("china.json", function(error, root) {
			
			if (error) 
				return console.error(error);
			console.log(root.features);
				
			var provinces = svg.append('g').attr('class', 'feature')
			    .selectAll("path")
				.data( root.features )
				.enter()
				.append("path")
				.attr("stroke","pink")
				.attr("stroke-width",1)
				
				// .attr("fill", function(d,i){
				// 	return color(i);
				// })
				.attr("d", path );
				// .on("mouseover",function(d,i){
	   //              d3.select(this)
	   //                  .attr("fill","yellow");
	   //          })
	   //          .on("mouseout",function(d,i){
	   //              // d3.select(this)
	   //              //     .attr("fill",color(i));
	   //          });

		
	     d3.json('tourism.json', function(error, valData){
	     	    gMap.markTouristNum(gMap, valData, provinces);
	     	  

	            gMap.createLegend(svg, gMap.setting);


			    gMap.markProvinceName(svg);



	     });	 //touriam data

			

		}); //china json

		
	d3.xml("southchinasea.svg", function(error, xmlDocument) {
		svg.html(function(d){
			return d3.select(this).html() + xmlDocument.getElementsByTagName("g")[0].outerHTML;
		});
		
		var gSouthSea = d3.select("#southsea");
		
		gSouthSea.attr("transform","translate(1040,610)scale(0.5)")
			.attr("class","southsea");

	});


	
}
GraceMap.prototype = {
	/**
	* 标注省份名称
	*/
	markProvinceName: function(svg){
		      var gMap = this;
			 //标注城市名称
			   d3.json('places.json', function(error, pData){

			   	  var location = svg.selectAll('.location')
			   	                 .data(pData.location)
			   	                 .enter()
			   	                 .append('g')
			   	                 .attr('class', 'location')
			   	                 .attr('transform', function(d, i){
			   	                 	  var  p = gMap.projection([d.log, d.lat]);
			   	                 	  return 'translate('+ p[0]+','+p[1] +')'
			   	                 });

			   	      location.append('circle')
				   	    .attr('class', 'point')
						.style('fill', 'blue')
				
				
						.attr('r', 3)
						.on('mouseover', function(){
							 d3.select(this).transition().duration(100).attr('r', 5).attr('fill', 'red');

						})
						.on('mouseout', function(){
							 d3.select(this).transition().duration(100).attr('r', 3).attr('fill', 'blue');

						}) ;

				location.append('text') 
						.text(function(d, i){
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
	markTouristNum: function(gMap, valData, provinces){
		var values = [];
	     	    for(var i=0; i<valData.provinces.length; i++){
	     	    	var name = valData.provinces[i].name;
	     	    	var value = valData.provinces[i].value;
	     	    	values[name]= value;
	     	    }

	     	    gMap.setting.maxvalue = d3.max(valData.provinces, function(d){ return d.value; });
	     	    gMap.setting.minvalue = 0;
	     	    
	     	    gMap.setting.startColor = d3.rgb('#000');
	     	    gMap.setting.endColor = d3.rgb('#fff');

	     	    var compute = d3.interpolate(gMap.setting.startColor, gMap.setting.endColor);
	     	    var linear = d3.scale.linear().domain([gMap.setting.minvalue, gMap.setting.maxvalue]).range([0,1]);

	     	    provinces
	     	    .style('fill', function(d, i){
	     	    	var t = linear( values[d.properties.name] ) ;
	     	    	var color = compute(t);
	     	    	
	     	    	return color.toString();
	     	    })
	     	    .attr('class', 'provinces')
	     	    .style('opacity', '0.4')
	     	    .on('mouseover', function(d, i){
	     	    	gMap.tooltip.html( d.properties.name +' : ' + values[d.properties.name]  );
	     	    	gMap.tooltip.style( 'top', d3.event.pageY );
	     	    	gMap.tooltip.style( 'left', d3.event.pageX );
	     	    	gMap.tooltip.style('opacity', 0.5);

	     	    })
	     	    .on('mousemove', function(d, i){
	     	    	var event = d3.event; 
	     	 		gMap.tooltip.style( 'top', event.pageY );
     	    		gMap.tooltip.style( 'left', event.pageX );
	     	    	
	     	  
	     	    })
	     	    .on('mouseout', function(d, i){
	     	    	gMap.tooltip.style('opacity', 0);
     	    		gMap.tooltip.style( 'top', '10px' );
	     	    });
	},

	/**
	*  创建颜色与值对应轴。 legend
	*/
	createLegend: function(svg, setting){
		   //定义一个线性渐变
			var defs = svg.append("defs");

			var linearGradient = defs.append("linearGradient")
									.attr("id","linearColor")
									.attr("x1","0%")
									.attr("y1","0%")
									.attr("x2","100%")
									.attr("y2","0%")
									;

			var stop1 = linearGradient.append("stop")
							.attr("offset","0%")
							.style("stop-color",setting.startColor.toString());

			var stop2 = linearGradient.append("stop")
							.attr("offset","100%")
							.style("stop-color",setting.endColor.toString());

			//添加一个矩形，并应用线性渐变
			var colorRect = svg.append("rect")
						.attr("x", 20)
						.attr("y", 590)
						.attr("width", 140)
						.attr("height", 30)
						.style("fill","url(#" + linearGradient.attr("id") + ")")
						.style('opacity', 0.5);

			//添加文字
			var minValueText = svg.append("text")
						.attr("class","valueText")
						.attr("x", 20)
						.attr("y", 590)
						.attr("dy", "-0.3em")
						.style('fill', 'green')
						.style('opacity',0.4)
						.text(function(){
							return setting.minvalue;
						});

			var maxValueText = svg.append("text")
						.attr("class","valueText")
						.attr("x", 160)
						.attr("y", 590)

						.attr("dy", "-0.3em")
						.style('fill', 'green')
						.style('opacity',0.4)
						.text(function(){
							return setting.maxvalue;
						});
	}
}

window.GraceMap = GraceMap;
return GraceMap;

})(window);
