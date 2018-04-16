/// /// <reference types="ol" />

function guijarro(targetDiv:string, centerZone?:[number,number]):{
    addMark:(lat:number,long:number,abr:string,title:string, template?:any)=>void
    addLayer:(url:string, stlye?:any)=>void
    map:ol.Map,
    ol:typeof ol
}{

    var template = {
        strokeColor: "#0000FF",
        strokeOpacity: 1,
        strokeWidth: 3,
        fillColor: "#00AAFF",
        fillOpacity: 1,
        pointRadius: 5,
        pointerEvents: "visiblePainted",
        externalGraphic: "hex-mark.png", //externalGraphic url from attribute url use "${url}"
        graphicXOffset :-16,
        graphicYOffset :-32,
        graphicWidth   : 32,
        graphicHeight  : 32,
        rotation:0,
        label : " ${abr}\n${name}", //label from attribute name
        labelXOffset: -8,
        labelYOffset: 26,
        fontColor: "black",
        fontSize: "12px",
        fontFamily: "Arial",
        fontWeight: "bold",
        labelAlign: "lt"
    };

    var posiciones:Nodo[]=[];

    var projectionCoor = ol.proj.get('EPSG:4326');
    var projectionView = ol.proj.get('EPSG:3857');

    function latLon(lat:number, long:number):[number, number]{
        return ol.proj.transform([long, lat],projectionCoor,projectionView);
    }

    var baseMap = new ol.layer.Tile({
        source: new ol.source.OSM()
    });

    var style = new ol.style.Style({
        fill: new ol.style.Fill({
            color: 'rgba(255, 255, 255, 0.2)'
        }),
        stroke: new ol.style.Stroke({
            color: '#E3193F',
            width: 3
        }),
        text: new ol.style.Text({
            font: '12px Calibri,sans-serif',
            fill: new ol.style.Fill({
                color: '#000'
            }),
            stroke: new ol.style.Stroke({
                color: '#fff',
                width: 3
            })
        })
    });

    var center = latLon(-34.625, -58.445); 

    var view = new ol.View({
        projection: projectionView,
        center,
        zoom: 12
    })

    var ubicateInZone = function(){
        view.setCenter(centerZone||center);
    }

    function UbicateControl(opt_options:{letter:string, position:string, zoom:number|null}) {
        var options = opt_options || {};
        var button = document.createElement('button');
        button.textContent = opt_options.letter;
      
        var this_ = this;
        var handleUbicate = function(e) {
            this_.getMap().getView().setRotation(0);
            if(opt_options.zoom){
                view.setZoom(opt_options.zoom);
            }
            if(opt_options.position=='current'){
                geolocation.setTracking(true);
                if (posiciones.length) {
                    var coordinates = posiciones[posiciones.length - 1].coordinates;
                    view.setCenter(coordinates);
                }
            }else if(opt_options.position=='center'){
                view.setCenter(center);
            }else{
                ubicateInZone();
            }
        };
      
        button.addEventListener('click', handleUbicate, false);
        button.addEventListener('touchstart', handleUbicate, false);
      
        var element = document.createElement('div');
        element.className = 'ol-unselectable ol-control ubicate-control-'+opt_options.letter;
        element.appendChild(button);
      
        ol.control.Control.call(this, {
            element: element,
            target: options.target
        });
      
    };
    ol.inherits(UbicateControl, ol.control.Control);

    var map = new ol.Map({
        controls: ol.control.defaults({
            attributionOptions: /** @type {olx.control.AttributionOptions} */ ({
                collapsible: false
            })
        }).extend([
            new UbicateControl({letter:'Y', position:'current', zoom:null}),
            new UbicateControl({letter:'Z', position:'zone'   , zoom:14  }),
            new UbicateControl({letter:'C', position:'center' , zoom:12  }),
        ]),
        layers:[baseMap],
        target:targetDiv,
        view:view
    });

    function mark(lat:number,long:number,abr:string,title:string, template?:any){
        var element = document.createElement("div");
        element.className="mark";
        var line1 = document.createElement("div");
        line1.innerText=abr;
        var line2 = document.createElement("div");
        line2.innerText=title;
        element.appendChild(line1);
        element.appendChild(line2);
        var marker = new ol.Overlay({
            position: latLon(lat,long),
            positioning: 'center-center',
            element: element,
            stopEvent: false
        });
        map.addOverlay(marker);
    }

    var geolocation = new ol.Geolocation({
        projection: view.getProjection()
    });

    function eid(id:string){
        return document.getElementById(id)!;
    }

    function posi(posicion:number, array:any):number | null{
        if(array == null){
            return null;
        }
        var x = array[posicion];
        console.log(x, array);
        return x as number;
    }

    type Nodo={
        posicion:[number,number]
        coordinates:[number,number]
        timestamp:number
    }

    var ultimaPosicion:[number, number];

    function colocarNodo(nodo:Nodo){
        var positionFeature = new ol.Feature();
        positionFeature.setStyle(new ol.style.Style({
            image: new ol.style.Circle({
                radius: 4,
                fill: new ol.style.Fill({
                    color: '#6688DDFF',
                }),
                stroke: new ol.style.Stroke({
                    color: '#0055FF',
                    width: 1
                })
            })
        }));
        positionFeature.setGeometry(new ol.geom.Point(nodo.coordinates));
        new ol.layer.Vector({
            map: map,
            source: new ol.source.Vector({
                features: [positionFeature]
            })
        });
    }

    function posicionGPS(orden:number){
        var coordinates = geolocation.getPosition();
        if(coordinates != null){
            ultimaPosicion = ol.proj.transform(coordinates,projectionView,projectionCoor);
            if(posiciones.length){
                colocarNodo(posiciones[posiciones.length-1]);
            }
            var nodo = {posicion:ultimaPosicion, coordinates:coordinates, timestamp:new Date().getTime()};
            posiciones.push(nodo);
            localStorage.setItem("mapa-posiciones",JSON.stringify(posiciones));
        }
    }

    function cantidadGPS(){
        return posiciones.length;
    }

    var accuracyFeature = new ol.Feature();
    geolocation.on('change:accuracyGeometry', function() {
        accuracyFeature.setGeometry(geolocation.getAccuracyGeometry());
    });

    var positionFeature = new ol.Feature();
    positionFeature.setStyle(new ol.style.Style({
        image: new ol.style.Circle({
            radius: 8,
            fill: new ol.style.Fill({
                color: '#3399CC'
            }),
            stroke: new ol.style.Stroke({
                color: '#0088DD',
                width: 2
            })
        })
    }));

    geolocation.on('change:position', function() {
        var coordinates = geolocation.getPosition();
        if(coordinates){
            positionFeature.setGeometry(new ol.geom.Point(coordinates));
        }
    });

    geolocation.on('change', function () {
        posicionGPS();
    });

    new ol.layer.Vector({
        map: map,
        source: new ol.source.Vector({
            features: [accuracyFeature, positionFeature]
        })
    });

    function addLayer(url:string, stlye?:any):void{
        let source = new ol.source.Vector({
            url,
            format: new ol.format.KML({
                extractStyles: false
            })
        });
        let vector = new ol.layer.Vector({map, source, style})
        ubicateInZone = function(){
            var extent = source.getExtent();
            view.setCenter(ol.extent.getCenter(extent));
        }
    }

    var aux = localStorage.getItem("mapa-posiciones");
    if(aux != null){
        posiciones=JSON.parse(aux);
    }
    posiciones.forEach(function(nodo){
        colocarNodo(nodo);
    })

    return {addMark:mark, addLayer, map, ol};
}

