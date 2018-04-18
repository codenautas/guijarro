declare type Nodo = {
    posicion: [number, number];
    coordinates: [number, number];
    timestamp: number;
};
declare function guijarro(targetDiv: string, centerZone?: [number, number]): {
    addMark: (lat: number, long: number, abr: string, title: string, template?: any) => void;
    addLayer: (url: string, stlye?: any) => void;
    posiciones: Nodo[];
};
