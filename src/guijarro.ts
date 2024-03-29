/// /// <reference types="ol" />

import {changing} from "best-globals";

export type Nodo={
    posicion:[number,number]
    coordinates:[number,number]
    timestamp:number
    more_info?:any
}

export type Opts={
    letter:string, 
    position:string, 
    zoom:number|null, 
    target?:any, 
    handler?:()=>void, 
    classSufix?:string,
    withTouchStartEvent?:boolean
}

export type GuijarroOpts={
    centerZone?:[number,number], 
    currentZoom?:number,
    epsilonShow?:number,
    storePointsFunctions?:{
        get: (storageKey:string)=>Promise<Nodo[]>,
        set: (storageKey:string,nodos:Nodo[])=>Promise<void>,
    } | null
}

export async function guijarro(targetDiv:string, leaveTrace:boolean, opts?:GuijarroOpts):Promise<{
    addMark: (lat: number, long: number, abr: string, title: string, template?: any) => void;
    addLayer: (url: string, stlye?: any) => void;
    colocarNodo: (nodo: Nodo, ultimoNodoColocado: Nodo | null) => Nodo;
    addNodo: (nodo: Nodo) => Promise<void>;
    addButton: (opts: Opts) => void;
    getCenter: () => [number, number];
    getZoom: () => number;
    posiciones: Nodo[];
}>{
    var projectionCoor = ol.proj.get('EPSG:4326');
    var projectionView = ol.proj.get('EPSG:3857');

    function latLon(lat:number, long:number):[number, number]{
        return ol.proj.transform([long, lat],projectionCoor,projectionView);
    }
    const defOptions:GuijarroOpts = {
        epsilonShow:0,
        centerZone: latLon(-34.625, -58.445),
        currentZoom: 12,
        storePointsFunctions:null
    };
    opts = changing(defOptions,opts || {}) as GuijarroOpts;
    
    var { centerZone, currentZoom, epsilonShow, storePointsFunctions } = opts;
    const STORAGE_KEY = "mapa-posiciones";
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
    var baseMap = new ol.layer.Tile({
        source: new ol.source.OSM()
    });

    var globalKmlStyle = new ol.style.Style({
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

    var center = centerZone;
    var zoom = currentZoom;

    var view = new ol.View({
        projection: projectionView,
        center,
        zoom: zoom
    })

    var ubicateInZone = function(){
        view.setCenter(centerZone||center);
    }

    class UbicateControl extends ol.control.Control{
        constructor(opt_options:Opts){
            var options = changing({withTouchStartEvent:true},opt_options);
            var button = document.createElement('button');
            button.textContent = options.letter;
        
            var this_:UbicateControl;

            var handleUbicate = function() {
                this_.getMap().getView().setRotation(0);
                if(opt_options.zoom){
                    view.setZoom(options.zoom);
                }
                if(options.position=='current'){
                    geolocation.setTracking(true);
                    if (posiciones.length) {
                        var coordinates = posiciones[posiciones.length - 1].coordinates;
                        view.setCenter(coordinates);
                    }
                }else if(options.position=='center'){
                    view.setCenter(center);
                }else{
                    ubicateInZone();
                }
            };
        
            button.addEventListener('click', options.handler||handleUbicate, false);
            if(options.withTouchStartEvent){
                button.addEventListener('touchstart', options.handler||handleUbicate, false);
            }
        
            var element = document.createElement('div');
            element.className = 'ol-unselectable ol-control ubicate-control-'+(options.classSufix||options.letter);
            element.appendChild(button);
       
            super({
                element: element,
                target: options.target
            });
            this_ = this;

        }      
    }

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
    var source = new ol.source.Vector({
        wrapX: false
    });
    var vector = new ol.layer.Vector({
        source: source
    });
    vector.setZIndex(9999);
    map.addLayer(vector);
    var ultimaPosicion:[number, number];

    function addButton(opts:Opts){
        map.controls.extend([
            new UbicateControl(opts)
        ]);

    }

    function getCenter(){
        return map.getView().getCenter();
    }

    function getZoom(){
        return map.getView().getZoom();
    }
    
    function mark(lat:number,long:number,abr:string,title:string, className?:string){
        var element = document.createElement("div");
        element.className=className||"mark";
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

    const redStyle = new ol.style.Style({
        image: new ol.style.Circle({
            radius: 4,
            fill: new ol.style.Fill({
                color: '#dd6666',
            }),
            stroke: new ol.style.Stroke({
                color: '#db1b1b',
                width: 1
            })
        }),
        zIndex: 9999
    });

    const blueStyle = new ol.style.Style({
        image: new ol.style.Circle({
            radius: 4,
            fill: new ol.style.Fill({
                color: '#6688DD',
            }),
            stroke: new ol.style.Stroke({
                color: '#0055FF',
                width: 1
            })
        })
    })

    function colocarNodo(nodo:Nodo, ultimoNodoColocado:Nodo|null):Nodo{
        var ignoreEpsilon = !!nodo.more_info;
        if(!ignoreEpsilon && ultimoNodoColocado && Math.abs(nodo.coordinates[0] - ultimoNodoColocado.coordinates[0]) < epsilonShow && Math.abs(nodo.coordinates[1] - ultimoNodoColocado.coordinates[1]) < epsilonShow){
            return ultimoNodoColocado;
        }
        var positionFeature = new ol.Feature();
        var style;
        if(ignoreEpsilon){
            style = redStyle;
        }else{
            style = blueStyle;
        }
        positionFeature.setStyle(style);
        positionFeature.setGeometry(new ol.geom.Point(nodo.coordinates));
        source.addFeature(positionFeature)
        return nodo;
    }

    async function posicionGPS(){
        var coordinates = geolocation.getPosition();
        if(coordinates != null && leaveTrace){
            ultimaPosicion = ol.proj.transform(coordinates,projectionView,projectionCoor);
            var distanciaConNodoAnterior:number;
            if(posiciones.length){
                distanciaConNodoAnterior = Math.sqrt(
                    Math.pow((posiciones[posiciones.length-1].coordinates[0] - coordinates[0]),2) + 
                    Math.pow((posiciones[posiciones.length-1].coordinates[1] - coordinates[1]),2)
                );
                ultimoNodoColocado = colocarNodo(posiciones[posiciones.length-1], ultimoNodoColocado);
            }else{
                distanciaConNodoAnterior = 9999;
            }
            var nodo = {posicion:ultimaPosicion, coordinates:coordinates, timestamp:new Date().getTime()};
            console.log("distancia: ", distanciaConNodoAnterior)
            if(distanciaConNodoAnterior > 1){
                await addNodo(nodo);
            }
        }
    }

    async function addNodo(nodo:Nodo){
        posiciones.push(nodo);
        storePointsFunctions?.set?
            await storePointsFunctions.set(STORAGE_KEY, posiciones)
        :
            localStorage.setItem(STORAGE_KEY,JSON.stringify(posiciones));
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

    function addLayer(url:string, style?:ol.style.Style):void{
        let source = new ol.source.Vector({
            url,
            format: new ol.format.KML({
                extractStyles: false
            })
        });
        let vector = new ol.layer.Vector({map, source, style:style || globalKmlStyle});
        vector.setZIndex(100);
        ubicateInZone = function(){
            var extent = source.getExtent();
            view.setCenter(ol.extent.getCenter(extent));
        }
    }

    var aux = storePointsFunctions?.get?
        await storePointsFunctions.get(STORAGE_KEY)
    :
        localStorage.getItem(STORAGE_KEY)?JSON.parse(localStorage.getItem(STORAGE_KEY)!):null;
    if(aux != null){
        posiciones=aux;
    }
    var ultimoNodoColocado:Nodo|null;
    posiciones.forEach(function(nodo){
        ultimoNodoColocado = colocarNodo(nodo, ultimoNodoColocado);
    })

    return {addMark:mark, addLayer, posiciones:posiciones, colocarNodo:colocarNodo, addNodo:addNodo, addButton:addButton, getCenter:getCenter, getZoom:getZoom};
}

