"use strict";
/// /// <reference types="ol" />
function guijarro(targetDiv) {
    var template = {
        strokeColor: "#0000FF",
        strokeOpacity: 1,
        strokeWidth: 3,
        fillColor: "#00AAFF",
        fillOpacity: 1,
        pointRadius: 5,
        pointerEvents: "visiblePainted",
        externalGraphic: "hex-mark.png",
        graphicXOffset: -16,
        graphicYOffset: -32,
        graphicWidth: 32,
        graphicHeight: 32,
        rotation: 0,
        label: " ${abr}\n${name}",
        labelXOffset: -8,
        labelYOffset: 26,
        fontColor: "black",
        fontSize: "12px",
        fontFamily: "Arial",
        fontWeight: "bold",
        labelAlign: "lt"
    };
    var projectionCoor = ol.proj.get('EPSG:4326');
    var projectionView = ol.proj.get('EPSG:3857');
    function latLon(lat, long) {
        return ol.proj.transform([long, lat], projectionCoor, projectionView);
    }
    var baseMap = new ol.layer.Tile({
        source: new ol.source.OSM()
    });
    var style = new ol.style.Style({
        fill: new ol.style.Fill({
            color: 'rgba(255, 255, 255, 0.2)'
        }),
        stroke: new ol.style.Stroke({
            color: '#319FD3',
            width: 1
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
    var view = new ol.View({
        projection: projectionView,
        center: latLon(-34.625, -58.445),
        zoom: 12
    });
    var map = new ol.Map({
        layers: [baseMap],
        target: targetDiv,
        view: view
    });
    function mark(lat, long, abr, title, template) {
        var element = document.createElement("div");
        element.className = "mark";
        var line1 = document.createElement("div");
        line1.innerText = abr;
        var line2 = document.createElement("div");
        line2.innerText = title;
        element.appendChild(line1);
        element.appendChild(line2);
        var marker = new ol.Overlay({
            position: latLon(lat, long),
            positioning: 'center-center',
            element: element,
            stopEvent: false
        });
        map.addOverlay(marker);
    }
    var geolocation = new ol.Geolocation({
        projection: view.getProjection()
    });
    function eid(id) {
        return document.getElementById(id);
    }
    window.addEventListener('load', function () {
        eid('gps_confirm').addEventListener('change', function () {
            var gps_encendido = this.checked;
            var aviso_gps = eid('aviso_gps');
            if (gps_encendido) {
                aviso_gps.innerHTML = aviso_gps.innerHTML.replace(/\bserán\b/g, 'son');
                aviso_gps.style.color = 'black';
            }
            else {
                aviso_gps.innerHTML = aviso_gps.innerHTML.replace(/\bson\b/g, 'serán');
                aviso_gps.style.color = 'gray';
            }
            geolocation.setTracking(gps_encendido);
        });
        var aux = localStorage.getItem("mapa-posiciones");
        if (aux != null) {
            posiciones = JSON.parse(aux);
        }
        posiciones.forEach(function (nodo) {
            colocarNodo(nodo);
        });
        document.querySelectorAll('h2')[0].addEventListener('click', function () {
            if (posiciones.length) {
                var coordinates = posiciones[posiciones.length - 1].coordinates;
                view.setCenter(coordinates);
            }
        });
    });
    function posi(posicion, array) {
        if (array == null) {
            return null;
        }
        var x = array[posicion];
        console.log(x, array);
        return x;
    }
    var posiciones = [];
    var ultimaPosicion;
    function colocarNodo(nodo) {
        var positionFeature = new ol.Feature();
        positionFeature.setStyle(new ol.style.Style({
            image: new ol.style.Circle({
                radius: 5,
                fill: new ol.style.Fill({
                    color: '#99CC33'
                }),
                stroke: new ol.style.Stroke({
                    color: '#fa0',
                    width: 2
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
    function posicionGPS(orden) {
        if (orden) {
            var coordinates = geolocation.getPosition();
            if (coordinates != null) {
                ultimaPosicion = ol.proj.transform(coordinates, projectionView, projectionCoor);
                if (posiciones.length) {
                    colocarNodo(posiciones[posiciones.length - 1]);
                }
                var nodo = { posicion: ultimaPosicion, coordinates: coordinates, timestamp: new Date().getTime() };
                posiciones.push(nodo);
                localStorage.setItem("mapa-posiciones", JSON.stringify(posiciones));
            }
        }
        return ultimaPosicion == null ? null : ultimaPosicion[orden];
    }
    function cantidadGPS() {
        return posiciones.length;
    }
    var accuracyFeature = new ol.Feature();
    geolocation.on('change:accuracyGeometry', function () {
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
    geolocation.on('change:position', function () {
        var coordinates = geolocation.getPosition();
        if (coordinates) {
            positionFeature.setGeometry(new ol.geom.Point(coordinates));
        }
    });
    new ol.layer.Vector({
        map: map,
        source: new ol.source.Vector({
            features: [accuracyFeature, positionFeature]
        })
    });
    function addLayer(url, stlye) {
        new ol.layer.Vector({
            map: map,
            source: new ol.source.Vector({
                url: url,
                format: new ol.format.KML({
                    extractStyles: false
                })
            }),
            style: style
        });
    }
    return { addMark: mark, addLayer: addLayer };
}
//# sourceMappingURL=guijarro.js.map